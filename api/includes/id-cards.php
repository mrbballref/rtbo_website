<?php
declare(strict_types=1);

require_once __DIR__ . '/users.php';
require_once __DIR__ . '/notifications.php';
require_once __DIR__ . '/geo.php';

function rtbo_id_cards_storage_path(): string
{
    ensure_dir(STORAGE_DIR);
    return STORAGE_DIR . '/id-card-selections.json';
}

function rtbo_id_cards_empty_file(): array
{
    return [
        'selections' => [],
        'checkins' => [],
    ];
}

function rtbo_id_cards_file_load(): array
{
    $path = rtbo_id_cards_storage_path();
    if (!is_file($path)) {
        return rtbo_id_cards_empty_file();
    }

    $data = json_decode((string) file_get_contents($path), true);
    if (!is_array($data)) {
        return rtbo_id_cards_empty_file();
    }

    return [
        'selections' => is_array($data['selections'] ?? null) ? $data['selections'] : [],
        'checkins' => is_array($data['checkins'] ?? null) ? $data['checkins'] : [],
    ];
}

function rtbo_id_cards_file_save(array $data): void
{
    file_put_contents(
        rtbo_id_cards_storage_path(),
        json_encode([
            'selections' => array_values($data['selections'] ?? []),
            'checkins' => array_values($data['checkins'] ?? []),
        ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES),
        LOCK_EX
    );
}

function rtbo_id_cards_ensure_tables(): void
{
    db()->exec(
        "CREATE TABLE IF NOT EXISTS id_card_selections (
            id INT AUTO_INCREMENT PRIMARY KEY,
            selection_key VARCHAR(255) NOT NULL UNIQUE,
            user_id INT NOT NULL,
            card_id VARCHAR(190) NOT NULL,
            card_title VARCHAR(190) NOT NULL,
            category_id VARCHAR(120) NOT NULL,
            category_label VARCHAR(190) NOT NULL,
            card_image VARCHAR(500) NOT NULL,
            card_back_image VARCHAR(500) NULL,
            context VARCHAR(80) NOT NULL DEFAULT 'id-card',
            enrollment_id VARCHAR(120) NOT NULL DEFAULT '',
            token VARCHAR(128) NOT NULL,
            profile_snapshot LONGTEXT NULL,
            selected_at DATETIME NOT NULL,
            updated_at DATETIME NOT NULL,
            INDEX idx_id_cards_user (user_id),
            INDEX idx_id_cards_token (token),
            INDEX idx_id_cards_context (context),
            INDEX idx_id_cards_enrollment (enrollment_id)
        )"
    );

    db()->exec(
        "CREATE TABLE IF NOT EXISTS id_card_checkins (
            id INT AUTO_INCREMENT PRIMARY KEY,
            token VARCHAR(128) NOT NULL,
            user_id INT NOT NULL,
            card_id VARCHAR(190) NOT NULL,
            card_title VARCHAR(190) NOT NULL,
            latitude DECIMAL(10,7) NULL,
            longitude DECIMAL(10,7) NULL,
            accuracy_meters DECIMAL(10,2) NULL,
            source VARCHAR(80) NOT NULL DEFAULT 'id_card_qr',
            user_agent VARCHAR(500) NULL,
            arrival_statuses LONGTEXT NULL,
            notification_id INT NULL,
            checked_in_at DATETIME NOT NULL,
            INDEX idx_id_card_checkins_user (user_id),
            INDEX idx_id_card_checkins_token (token),
            INDEX idx_id_card_checkins_checked_in (checked_in_at)
        )"
    );
}

function rtbo_id_cards_db_available(): bool
{
    try {
        rtbo_id_cards_ensure_tables();
        return true;
    } catch (Throwable $error) {
        error_log('RTBO ID cards using file fallback: ' . $error->getMessage());
        return false;
    }
}

function rtbo_id_card_text(mixed $value, int $maxLength = 190): string
{
    return mb_substr(trim((string) $value), 0, $maxLength);
}

function rtbo_id_card_slug_text(mixed $value, int $maxLength = 190): string
{
    return preg_replace('/[^a-zA-Z0-9._:-]+/', '-', rtbo_id_card_text($value, $maxLength)) ?: '';
}

function rtbo_id_card_public_photo(array $user): string
{
    $photo = (string) ($user['profile_photo'] ?? $user['photo'] ?? '');
    if ($photo !== '' && !str_starts_with($photo, 'http') && !str_starts_with($photo, '/api/')) {
        $photo = '/api/profile-photo.php?id=' . (int) ($user['id'] ?? 0);
    }

    return $photo;
}

function rtbo_id_card_role_label(string $role): string
{
    return match ($role) {
        'super_admin' => 'RTBO Super Admin',
        'admin' => 'RTBO Admin',
        'coach' => 'Coach',
        'assistant_coach' => 'Assistant Coach',
        'school_admin' => 'School Admin',
        default => 'Basketball Official',
    };
}

function rtbo_id_card_safe_profile(array $user): array
{
    $userId = (int) ($user['id'] ?? 0);
    $firstName = rtbo_id_card_text($user['first_name'] ?? '', 100);
    $lastName = rtbo_id_card_text($user['last_name'] ?? '', 100);
    $fullName = trim($firstName . ' ' . $lastName);
    if ($fullName === '') {
        $fullName = rtbo_id_card_text($user['name'] ?? 'RTBO Member', 160);
    }

    $role = (string) ($user['role'] ?? 'official');
    $classification = rtbo_id_card_text($user['official_classification'] ?? '', 80);
    $memberTitle = rtbo_id_card_text($user['member_title'] ?? '', 120);
    $organization = rtbo_id_card_text($user['organization'] ?? '', 160);
    $city = rtbo_id_card_text($user['city'] ?? '', 100);
    $state = rtbo_id_card_text($user['state'] ?? '', 80);

    return [
        'id' => $userId,
        'member_id' => 'RTBO-' . str_pad((string) max(0, $userId), 5, '0', STR_PAD_LEFT),
        'full_name' => $fullName,
        'first_name' => $firstName,
        'last_name' => $lastName,
        'role_label' => $classification !== '' ? $classification : rtbo_id_card_role_label($role),
        'member_title' => $memberTitle !== '' ? $memberTitle : ($classification !== '' ? $classification : rtbo_id_card_role_label($role)),
        'official_classification' => $classification,
        'organization' => $organization,
        'city' => $city,
        'state' => $state,
        'photo' => rtbo_id_card_public_photo($user),
    ];
}

function rtbo_id_card_context(array $payload): array
{
    $context = rtbo_id_card_slug_text($payload['context'] ?? 'id-card', 80) ?: 'id-card';
    $enrollmentId = rtbo_id_card_slug_text($payload['enrollment_id'] ?? $payload['enrollmentId'] ?? '', 120);

    return [$context, $enrollmentId];
}

function rtbo_id_card_selection_key(int $userId, string $context, string $enrollmentId, string $cardId): string
{
    return implode(':', [$userId, $context, $enrollmentId, $cardId]);
}

function rtbo_id_card_sanitize_card(array $card): ?array
{
    $id = rtbo_id_card_slug_text($card['id'] ?? $card['card_id'] ?? '', 190);
    $title = rtbo_id_card_text($card['title'] ?? $card['card_title'] ?? '', 190);
    $categoryId = rtbo_id_card_slug_text($card['categoryId'] ?? $card['category_id'] ?? '', 120);
    $categoryLabel = rtbo_id_card_text($card['categoryLabel'] ?? $card['category_label'] ?? '', 190);
    $image = rtbo_id_card_text($card['image'] ?? $card['card_image'] ?? '', 500);
    $backImage = rtbo_id_card_text($card['backImage'] ?? $card['card_back_image'] ?? '', 500);

    if ($id === '' || $title === '' || $categoryId === '' || $categoryLabel === '' || !str_starts_with($image, '/assets/id-cards/cards/')) {
        return null;
    }
    if ($backImage !== '' && !str_starts_with($backImage, '/assets/id-cards/cards/')) {
        $backImage = '';
    }

    return [
        'id' => $id,
        'title' => $title,
        'category_id' => $categoryId,
        'category_label' => $categoryLabel,
        'image' => $image,
        'back_image' => $backImage,
    ];
}

function rtbo_id_card_base_url(): string
{
    $host = trim((string) ($_SERVER['HTTP_X_FORWARDED_HOST'] ?? $_SERVER['HTTP_HOST'] ?? ''));
    if ($host !== '') {
        $scheme = ((!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https'))
            ? 'https'
            : 'http';
        return $scheme . '://' . $host;
    }

    return RTBO_BASE_URL;
}

function rtbo_id_card_checkin_url(string $token): string
{
    return rtbo_id_card_base_url() . '/api/id-card-checkin.php?token=' . rawurlencode($token);
}

function rtbo_id_card_public_selection(array $row): array
{
    $profile = $row['profile_snapshot'] ?? [];
    if (is_string($profile)) {
        $decoded = json_decode($profile, true);
        $profile = is_array($decoded) ? $decoded : [];
    }

    $token = (string) ($row['token'] ?? '');

    return [
        'id' => (int) ($row['id'] ?? 0),
        'card_id' => (string) ($row['card_id'] ?? ''),
        'card_title' => (string) ($row['card_title'] ?? ''),
        'category_id' => (string) ($row['category_id'] ?? ''),
        'category_label' => (string) ($row['category_label'] ?? ''),
        'card_image' => (string) ($row['card_image'] ?? ''),
        'card_back_image' => (string) ($row['card_back_image'] ?? ''),
        'context' => (string) ($row['context'] ?? 'id-card'),
        'enrollment_id' => (string) ($row['enrollment_id'] ?? ''),
        'profile' => $profile,
        'checkin_url' => $token !== '' ? rtbo_id_card_checkin_url($token) : '',
        'selected_at' => (string) ($row['selected_at'] ?? ''),
        'updated_at' => (string) ($row['updated_at'] ?? ''),
    ];
}

function rtbo_id_card_selections_for_user(int $userId): array
{
    if ($userId <= 0) {
        return [];
    }

    if (rtbo_id_cards_db_available()) {
        try {
            $stmt = db()->prepare('SELECT * FROM id_card_selections WHERE user_id = ? ORDER BY updated_at DESC, id DESC');
            $stmt->execute([$userId]);
            return array_map('rtbo_id_card_public_selection', $stmt->fetchAll());
        } catch (Throwable $error) {
            error_log('RTBO ID card database read failed: ' . $error->getMessage());
        }
    }

    $data = rtbo_id_cards_file_load();
    $rows = array_values(array_filter($data['selections'], static fn (array $row): bool => (int) ($row['user_id'] ?? 0) === $userId));
    usort($rows, static fn (array $a, array $b): int => strcmp((string) ($b['updated_at'] ?? ''), (string) ($a['updated_at'] ?? '')));
    return array_map('rtbo_id_card_public_selection', $rows);
}

function rtbo_id_card_save_selections(array $user, array $cards, array $payload = []): array
{
    $userId = (int) ($user['id'] ?? 0);
    if ($userId <= 0) {
        throw new InvalidArgumentException('A signed-in member is required.');
    }

    [$context, $enrollmentId] = rtbo_id_card_context($payload);
    $profile = rtbo_id_card_safe_profile($user);
    $safeCards = array_values(array_filter(array_map(
        static fn (mixed $card): ?array => is_array($card) ? rtbo_id_card_sanitize_card($card) : null,
        $cards
    )));
    $now = date('Y-m-d H:i:s');

    if (rtbo_id_cards_db_available()) {
        try {
            $existingStmt = db()->prepare('SELECT * FROM id_card_selections WHERE user_id = ? AND context = ? AND enrollment_id = ?');
            $existingStmt->execute([$userId, $context, $enrollmentId]);
            $existing = [];
            foreach ($existingStmt->fetchAll() as $row) {
                $existing[(string) $row['card_id']] = $row;
            }

            $keepIds = [];
            foreach ($safeCards as $card) {
                $keepIds[] = $card['id'];
                $token = (string) ($existing[$card['id']]['token'] ?? bin2hex(random_bytes(24)));
                $selectedAt = (string) ($existing[$card['id']]['selected_at'] ?? $now);
                $selectionKey = rtbo_id_card_selection_key($userId, $context, $enrollmentId, $card['id']);
                $stmt = db()->prepare(
                    "INSERT INTO id_card_selections(
                        selection_key, user_id, card_id, card_title, category_id, category_label,
                        card_image, card_back_image, context, enrollment_id, token, profile_snapshot,
                        selected_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON DUPLICATE KEY UPDATE
                        card_title = VALUES(card_title),
                        category_id = VALUES(category_id),
                        category_label = VALUES(category_label),
                        card_image = VALUES(card_image),
                        card_back_image = VALUES(card_back_image),
                        profile_snapshot = VALUES(profile_snapshot),
                        updated_at = VALUES(updated_at)"
                );
                $stmt->execute([
                    $selectionKey,
                    $userId,
                    $card['id'],
                    $card['title'],
                    $card['category_id'],
                    $card['category_label'],
                    $card['image'],
                    $card['back_image'],
                    $context,
                    $enrollmentId,
                    $token,
                    json_encode($profile, JSON_UNESCAPED_SLASHES),
                    $selectedAt,
                    $now,
                ]);
            }

            if ($keepIds === []) {
                $delete = db()->prepare('DELETE FROM id_card_selections WHERE user_id = ? AND context = ? AND enrollment_id = ?');
                $delete->execute([$userId, $context, $enrollmentId]);
            } else {
                $placeholders = implode(',', array_fill(0, count($keepIds), '?'));
                $delete = db()->prepare("DELETE FROM id_card_selections WHERE user_id = ? AND context = ? AND enrollment_id = ? AND card_id NOT IN ({$placeholders})");
                $delete->execute([$userId, $context, $enrollmentId, ...$keepIds]);
            }

            return rtbo_id_card_selections_for_user($userId);
        } catch (Throwable $error) {
            error_log('RTBO ID card database save failed, using file fallback: ' . $error->getMessage());
        }
    }

    $data = rtbo_id_cards_file_load();
    $existing = [];
    foreach ($data['selections'] as $row) {
        if (
            (int) ($row['user_id'] ?? 0) === $userId
            && (string) ($row['context'] ?? '') === $context
            && (string) ($row['enrollment_id'] ?? '') === $enrollmentId
        ) {
            $existing[(string) ($row['card_id'] ?? '')] = $row;
        }
    }

    $keepIds = array_column($safeCards, 'id');
    $data['selections'] = array_values(array_filter($data['selections'], static function (array $row) use ($userId, $context, $enrollmentId, $keepIds): bool {
        if (
            (int) ($row['user_id'] ?? 0) !== $userId
            || (string) ($row['context'] ?? '') !== $context
            || (string) ($row['enrollment_id'] ?? '') !== $enrollmentId
        ) {
            return true;
        }

        return in_array((string) ($row['card_id'] ?? ''), $keepIds, true);
    }));

    foreach ($safeCards as $card) {
        $previous = $existing[$card['id']] ?? [];
        $data['selections'][] = [
            'id' => (int) ($previous['id'] ?? count($data['selections']) + 1),
            'selection_key' => rtbo_id_card_selection_key($userId, $context, $enrollmentId, $card['id']),
            'user_id' => $userId,
            'card_id' => $card['id'],
            'card_title' => $card['title'],
            'category_id' => $card['category_id'],
            'category_label' => $card['category_label'],
            'card_image' => $card['image'],
            'card_back_image' => $card['back_image'],
            'context' => $context,
            'enrollment_id' => $enrollmentId,
            'token' => (string) ($previous['token'] ?? bin2hex(random_bytes(24))),
            'profile_snapshot' => $profile,
            'selected_at' => (string) ($previous['selected_at'] ?? date('c')),
            'updated_at' => date('c'),
        ];
    }

    rtbo_id_cards_file_save($data);
    return rtbo_id_card_selections_for_user($userId);
}

function rtbo_id_card_selection_by_token(string $token): ?array
{
    $token = rtbo_id_card_text($token, 128);
    if ($token === '' || strlen($token) < 24) {
        return null;
    }

    if (rtbo_id_cards_db_available()) {
        try {
            $stmt = db()->prepare('SELECT * FROM id_card_selections WHERE token = ? LIMIT 1');
            $stmt->execute([$token]);
            $row = $stmt->fetch();
            if ($row) {
                return $row;
            }
        } catch (Throwable $error) {
            error_log('RTBO ID card token lookup failed: ' . $error->getMessage());
        }
    }

    foreach (rtbo_id_cards_file_load()['selections'] as $row) {
        if (hash_equals((string) ($row['token'] ?? ''), $token)) {
            return $row;
        }
    }

    return null;
}

function rtbo_id_card_user_by_id(int $userId): ?array
{
    if ($userId <= 0) {
        return null;
    }

    try {
        ensure_users_table();
        $stmt = db()->prepare('SELECT * FROM users WHERE id = ? LIMIT 1');
        $stmt->execute([$userId]);
        $user = $stmt->fetch();
        return $user ?: null;
    } catch (Throwable $error) {
        error_log('RTBO ID card user lookup failed: ' . $error->getMessage());
        return null;
    }
}

function rtbo_id_card_record_checkin(string $token, array $payload = []): array
{
    $selection = rtbo_id_card_selection_by_token($token);
    if (!$selection) {
        throw new InvalidArgumentException('This ID Card check-in link is not valid.');
    }

    $userId = (int) ($selection['user_id'] ?? 0);
    $user = rtbo_id_card_user_by_id($userId);
    $profile = $user ? rtbo_id_card_safe_profile($user) : (array) (is_array($selection['profile_snapshot'] ?? null) ? $selection['profile_snapshot'] : json_decode((string) ($selection['profile_snapshot'] ?? '{}'), true));
    $latitude = filter_var($payload['latitude'] ?? null, FILTER_VALIDATE_FLOAT);
    $longitude = filter_var($payload['longitude'] ?? null, FILTER_VALIDATE_FLOAT);
    $accuracy = filter_var($payload['accuracy_meters'] ?? $payload['accuracy'] ?? null, FILTER_VALIDATE_FLOAT);
    $arrivalStatuses = [];

    if ($latitude !== false && $longitude !== false && abs((float) $latitude) <= 90 && abs((float) $longitude) <= 180) {
        try {
            rtbo_geo_upsert_location($userId, [
                'latitude' => (float) $latitude,
                'longitude' => (float) $longitude,
                'accuracy_meters' => $accuracy === false ? null : (float) $accuracy,
                'source' => 'id_card_qr',
            ]);
            $arrivalStatuses = rtbo_geo_arrival_statuses_for_official($userId);
        } catch (Throwable $error) {
            error_log('RTBO ID card geo check-in failed: ' . $error->getMessage());
        }
    }

    $name = rtbo_id_card_text($profile['full_name'] ?? 'An RTBO member', 160);
    $cardTitle = rtbo_id_card_text($selection['card_title'] ?? 'ID Card', 190);
    $verifiedArrivals = array_values(array_filter($arrivalStatuses, static fn (array $status): bool => (string) ($status['arrival_verified_at'] ?? '') !== ''));
    $locationSummary = $verifiedArrivals !== []
        ? ' Arrival was matched to ' . count($verifiedArrivals) . ' accepted assignment(s).'
        : (($latitude !== false && $longitude !== false) ? ' Location was captured from the QR scan.' : ' The scan was received without browser location permission.');

    $notifications = rtbo_notify_admins([
        'type' => 'id_card_arrival_checkin',
        'title' => 'Official ID Card check-in received',
        'body' => $name . ' scanned their ' . $cardTitle . ' for an RTBO event-site arrival.' . $locationSummary,
        'related_type' => 'id_card_selection',
        'metadata' => [
            'user_id' => $userId,
            'member_id' => (string) ($profile['member_id'] ?? ''),
            'member_name' => $name,
            'card_id' => (string) ($selection['card_id'] ?? ''),
            'card_title' => $cardTitle,
            'latitude' => $latitude === false ? null : (float) $latitude,
            'longitude' => $longitude === false ? null : (float) $longitude,
            'accuracy_meters' => $accuracy === false ? null : (float) $accuracy,
            'arrival_statuses' => $arrivalStatuses,
        ],
    ]);
    $notificationId = (int) ($notifications[0]['id'] ?? 0);
    $checkedInAt = date('Y-m-d H:i:s');
    $checkin = [
        'token' => $token,
        'user_id' => $userId,
        'card_id' => (string) ($selection['card_id'] ?? ''),
        'card_title' => $cardTitle,
        'latitude' => $latitude === false ? null : (float) $latitude,
        'longitude' => $longitude === false ? null : (float) $longitude,
        'accuracy_meters' => $accuracy === false ? null : (float) $accuracy,
        'source' => 'id_card_qr',
        'user_agent' => rtbo_id_card_text($_SERVER['HTTP_USER_AGENT'] ?? '', 500),
        'arrival_statuses' => $arrivalStatuses,
        'notification_id' => $notificationId,
        'checked_in_at' => $checkedInAt,
    ];

    if (rtbo_id_cards_db_available()) {
        try {
            $stmt = db()->prepare(
                "INSERT INTO id_card_checkins(
                    token, user_id, card_id, card_title, latitude, longitude, accuracy_meters,
                    source, user_agent, arrival_statuses, notification_id, checked_in_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
            );
            $stmt->execute([
                $checkin['token'],
                $checkin['user_id'],
                $checkin['card_id'],
                $checkin['card_title'],
                $checkin['latitude'],
                $checkin['longitude'],
                $checkin['accuracy_meters'],
                $checkin['source'],
                $checkin['user_agent'],
                json_encode($arrivalStatuses, JSON_UNESCAPED_SLASHES),
                $notificationId ?: null,
                $checkedInAt,
            ]);
        } catch (Throwable $error) {
            error_log('RTBO ID card check-in database write failed: ' . $error->getMessage());
        }
    } else {
        $data = rtbo_id_cards_file_load();
        $checkin['id'] = count($data['checkins']) + 1;
        $data['checkins'][] = $checkin;
        rtbo_id_cards_file_save($data);
    }

    return [
        'selection' => rtbo_id_card_public_selection($selection),
        'checkin' => $checkin,
        'message' => 'Your RTBO arrival check-in has been sent.',
    ];
}

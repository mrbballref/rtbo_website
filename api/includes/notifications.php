<?php
declare(strict_types=1);

require_once __DIR__ . '/sms.php';

function rtbo_notifications_storage_path(): string
{
    return STORAGE_DIR . '/notifications.json';
}

function rtbo_notifications_empty_file(): array
{
    return [
        'next_id' => 1,
        'notifications' => [],
        'reads' => [],
    ];
}

function rtbo_notifications_file_load(): array
{
    $path = rtbo_notifications_storage_path();
    if (!is_file($path)) {
        return rtbo_notifications_empty_file();
    }

    $data = json_decode((string) file_get_contents($path), true);
    if (!is_array($data)) {
        return rtbo_notifications_empty_file();
    }

    $empty = rtbo_notifications_empty_file();
    return [
        'next_id' => max(1, (int) ($data['next_id'] ?? 1)),
        'notifications' => is_array($data['notifications'] ?? null) ? $data['notifications'] : $empty['notifications'],
        'reads' => is_array($data['reads'] ?? null) ? $data['reads'] : $empty['reads'],
    ];
}

function rtbo_notifications_file_save(array $data): void
{
    ensure_dir(dirname(rtbo_notifications_storage_path()));
    file_put_contents(
        rtbo_notifications_storage_path(),
        json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES),
        LOCK_EX
    );
}

function rtbo_ensure_notifications_tables(): void
{
    db()->exec(
        "CREATE TABLE IF NOT EXISTS notifications (
            id INT AUTO_INCREMENT PRIMARY KEY,
            audience VARCHAR(50) NOT NULL DEFAULT 'user',
            target_user_id INT NULL,
            target_role VARCHAR(80) NULL,
            type VARCHAR(100) NOT NULL,
            title VARCHAR(190) NOT NULL,
            body TEXT NULL,
            related_type VARCHAR(80) NULL,
            related_id INT NULL,
            actor_id INT NULL,
            actor_name VARCHAR(190) NULL,
            metadata JSON NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_notifications_user (target_user_id),
            INDEX idx_notifications_role (target_role),
            INDEX idx_notifications_audience (audience),
            INDEX idx_notifications_created (created_at)
        )"
    );

    db()->exec(
        "CREATE TABLE IF NOT EXISTS notification_reads (
            notification_id INT NOT NULL,
            user_id INT NOT NULL,
            read_at DATETIME NOT NULL,
            PRIMARY KEY (notification_id, user_id),
            INDEX idx_notification_reads_user (user_id)
        )"
    );
}

function rtbo_notifications_db_available(): bool
{
    try {
        rtbo_ensure_notifications_tables();
        return true;
    } catch (Throwable $error) {
        error_log('RTBO notifications using file fallback: ' . $error->getMessage());
        return false;
    }
}

function rtbo_notification_clean_audience(string $audience): string
{
    $audience = strtolower(trim($audience));
    return in_array($audience, ['user', 'role', 'admins', 'officials', 'coaches', 'school_admins', 'everyone'], true)
        ? $audience
        : 'user';
}

function rtbo_notification_actor(?array $actor = null): array
{
    $actor ??= current_user();
    if (!$actor) {
        return ['actor_id' => null, 'actor_name' => 'System'];
    }

    $name = trim((string) ($actor['name'] ?? (($actor['first_name'] ?? '') . ' ' . ($actor['last_name'] ?? ''))));
    return [
        'actor_id' => isset($actor['id']) ? (int) $actor['id'] : null,
        'actor_name' => $name !== '' ? $name : (string) ($actor['email'] ?? 'System'),
    ];
}

function rtbo_notification_normalize(array $row, ?int $viewerId = null, ?string $readAt = null): array
{
    $metadata = $row['metadata'] ?? [];
    if (is_string($metadata)) {
        $decoded = json_decode($metadata, true);
        $metadata = is_array($decoded) ? $decoded : [];
    }

    return [
        'id' => (int) ($row['id'] ?? 0),
        'audience' => rtbo_notification_clean_audience((string) ($row['audience'] ?? 'user')),
        'target_user_id' => isset($row['target_user_id']) && $row['target_user_id'] !== '' ? (int) $row['target_user_id'] : null,
        'target_role' => (string) ($row['target_role'] ?? ''),
        'type' => (string) ($row['type'] ?? ''),
        'title' => (string) ($row['title'] ?? ''),
        'body' => (string) ($row['body'] ?? ''),
        'related_type' => (string) ($row['related_type'] ?? ''),
        'related_id' => isset($row['related_id']) && $row['related_id'] !== '' ? (int) $row['related_id'] : null,
        'actor_id' => isset($row['actor_id']) && $row['actor_id'] !== '' ? (int) $row['actor_id'] : null,
        'actor_name' => (string) ($row['actor_name'] ?? 'System'),
        'metadata' => $metadata,
        'read_at' => $readAt ?? (string) ($row['read_at'] ?? ''),
        'is_read' => ($readAt ?? (string) ($row['read_at'] ?? '')) !== '',
        'viewer_id' => $viewerId,
        'created_at' => (string) ($row['created_at'] ?? date('c')),
    ];
}

function rtbo_notification_matches_user(array $notification, array $user): bool
{
    $userId = (int) ($user['id'] ?? 0);
    $role = (string) ($user['role'] ?? '');
    $audience = rtbo_notification_clean_audience((string) ($notification['audience'] ?? 'user'));
    $targetUserId = (int) ($notification['target_user_id'] ?? 0);
    $targetRole = (string) ($notification['target_role'] ?? '');

    if ($audience === 'everyone') {
        return true;
    }
    if ($audience === 'user') {
        return $userId > 0 && $targetUserId === $userId;
    }
    if ($audience === 'role') {
        return $targetRole !== '' && $targetRole === $role;
    }
    if ($audience === 'admins') {
        return in_array($role, ['super_admin', 'admin'], true);
    }
    if ($audience === 'officials') {
        return $role === 'official';
    }
    if ($audience === 'coaches') {
        return in_array($role, ['coach', 'assistant_coach'], true);
    }
    if ($audience === 'school_admins') {
        return in_array($role, [
            'school_admin',
            'athletic_director',
            'assistant_athletic_director',
            'sports_information_director',
            'conference_commissioner',
            'game_day_admin',
        ], true);
    }

    return false;
}

function rtbo_notification_create(array $notification): array
{
    $actor = rtbo_notification_actor(is_array($notification['actor'] ?? null) ? $notification['actor'] : null);
    $record = [
        'audience' => rtbo_notification_clean_audience((string) ($notification['audience'] ?? 'user')),
        'target_user_id' => isset($notification['target_user_id']) ? (int) $notification['target_user_id'] : null,
        'target_role' => trim((string) ($notification['target_role'] ?? '')),
        'type' => trim((string) ($notification['type'] ?? 'general')),
        'title' => trim((string) ($notification['title'] ?? 'Notification')),
        'body' => trim((string) ($notification['body'] ?? '')),
        'related_type' => trim((string) ($notification['related_type'] ?? '')),
        'related_id' => isset($notification['related_id']) ? (int) $notification['related_id'] : null,
        'actor_id' => $actor['actor_id'],
        'actor_name' => $actor['actor_name'],
        'metadata' => is_array($notification['metadata'] ?? null) ? $notification['metadata'] : [],
        'created_at' => date('c'),
    ];

    if ($record['title'] === '') {
        $record['title'] = 'Notification';
    }

    if (!rtbo_notifications_db_available()) {
        $data = rtbo_notifications_file_load();
        $record['id'] = (int) $data['next_id'];
        $data['next_id'] = $record['id'] + 1;
        array_unshift($data['notifications'], $record);
        rtbo_notifications_file_save($data);
        $created = rtbo_notification_normalize($record);
        rtbo_notification_dispatch_sms($created);
        return $created;
    }

    $stmt = db()->prepare(
        "INSERT INTO notifications(
            audience, target_user_id, target_role, type, title, body, related_type, related_id,
            actor_id, actor_name, metadata
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    );
    $stmt->execute([
        $record['audience'],
        $record['target_user_id'],
        $record['target_role'] !== '' ? $record['target_role'] : null,
        $record['type'],
        $record['title'],
        $record['body'],
        $record['related_type'] !== '' ? $record['related_type'] : null,
        $record['related_id'],
        $record['actor_id'],
        $record['actor_name'],
        json_encode($record['metadata'], JSON_UNESCAPED_SLASHES),
    ]);

    $record['id'] = (int) db()->lastInsertId();
    $created = rtbo_notification_normalize($record);
    rtbo_notification_dispatch_sms($created);
    return $created;
}

function rtbo_notification_dispatch_sms(array $notification): void
{
    try {
        rtbo_sms_dispatch_notification($notification);
    } catch (Throwable $error) {
        error_log('RTBO SMS dispatch failed: ' . $error->getMessage());
    }
}

function rtbo_notify_users(array $userIds, array $notification): array
{
    $created = [];
    foreach (array_values(array_unique(array_filter(array_map('intval', $userIds)))) as $userId) {
        $created[] = rtbo_notification_create([
            ...$notification,
            'audience' => 'user',
            'target_user_id' => $userId,
        ]);
    }

    return $created;
}

function rtbo_notify_role(string $role, array $notification): array
{
    return [rtbo_notification_create([
        ...$notification,
        'audience' => 'role',
        'target_role' => $role,
    ])];
}

function rtbo_notify_admins(array $notification): array
{
    return [rtbo_notification_create([...$notification, 'audience' => 'admins'])];
}

function rtbo_notify_officials(array $notification): array
{
    return [rtbo_notification_create([...$notification, 'audience' => 'officials'])];
}

function rtbo_notify_coaches(array $notification): array
{
    return [rtbo_notification_create([...$notification, 'audience' => 'coaches'])];
}

function rtbo_notify_school_admins(array $notification): array
{
    return [rtbo_notification_create([...$notification, 'audience' => 'school_admins'])];
}

function rtbo_notify_everyone(array $notification): array
{
    return [rtbo_notification_create([...$notification, 'audience' => 'everyone'])];
}

function rtbo_notifications_for_user(array $user, int $limit = 50, bool $includeRead = true): array
{
    $userId = (int) ($user['id'] ?? 0);
    if ($userId <= 0) {
        return [];
    }

    $limit = max(1, min(100, $limit));

    if (!rtbo_notifications_db_available()) {
        $data = rtbo_notifications_file_load();
        $reads = is_array($data['reads'][(string) $userId] ?? null) ? $data['reads'][(string) $userId] : [];
        $records = [];

        foreach ($data['notifications'] as $notification) {
            if (!is_array($notification) || !rtbo_notification_matches_user($notification, $user)) {
                continue;
            }
            $readAt = (string) ($reads[(string) ($notification['id'] ?? 0)] ?? '');
            if (!$includeRead && $readAt !== '') {
                continue;
            }
            $records[] = rtbo_notification_normalize($notification, $userId, $readAt);
        }

        usort($records, static fn (array $a, array $b): int => strcmp((string) ($b['created_at'] ?? ''), (string) ($a['created_at'] ?? '')));
        return array_slice($records, 0, $limit);
    }

    $role = (string) ($user['role'] ?? '');
    $conditions = [
        '(n.audience = "everyone")',
        '(n.audience = "user" AND n.target_user_id = :user_id)',
        '(n.audience = "role" AND n.target_role = :role)',
    ];

    if (in_array($role, ['super_admin', 'admin'], true)) {
        $conditions[] = '(n.audience = "admins")';
    }
    if ($role === 'official') {
        $conditions[] = '(n.audience = "officials")';
    }
    if (in_array($role, ['coach', 'assistant_coach'], true)) {
        $conditions[] = '(n.audience = "coaches")';
    }
    if (in_array($role, ['school_admin', 'athletic_director', 'assistant_athletic_director', 'sports_information_director', 'conference_commissioner', 'game_day_admin'], true)) {
        $conditions[] = '(n.audience = "school_admins")';
    }

    $readFilter = $includeRead ? '' : 'AND nr.read_at IS NULL';
    $sql = "SELECT n.*, nr.read_at
            FROM notifications n
            LEFT JOIN notification_reads nr ON nr.notification_id = n.id AND nr.user_id = :read_user_id
            WHERE (" . implode(' OR ', $conditions) . ")
            {$readFilter}
            ORDER BY n.created_at DESC, n.id DESC
            LIMIT {$limit}";
    $stmt = db()->prepare($sql);
    $stmt->execute([
        ':user_id' => $userId,
        ':read_user_id' => $userId,
        ':role' => $role,
    ]);

    return array_map(
        static fn (array $row): array => rtbo_notification_normalize($row, $userId, (string) ($row['read_at'] ?? '')),
        $stmt->fetchAll()
    );
}

function rtbo_notifications_unread_count(array $user): int
{
    return count(rtbo_notifications_for_user($user, 100, false));
}

function rtbo_notification_mark_read(int $notificationId, int $userId): void
{
    if ($notificationId <= 0 || $userId <= 0) {
        throw new RuntimeException('A valid notification and user are required.');
    }

    if (!rtbo_notifications_db_available()) {
        $data = rtbo_notifications_file_load();
        $data['reads'][(string) $userId][(string) $notificationId] = date('c');
        rtbo_notifications_file_save($data);
        return;
    }

    $stmt = db()->prepare(
        "INSERT INTO notification_reads(notification_id, user_id, read_at)
         VALUES (?, ?, NOW())
         ON DUPLICATE KEY UPDATE read_at = VALUES(read_at)"
    );
    $stmt->execute([$notificationId, $userId]);
}

function rtbo_notification_mark_all_read(array $user): int
{
    $notifications = rtbo_notifications_for_user($user, 100, false);
    foreach ($notifications as $notification) {
        rtbo_notification_mark_read((int) ($notification['id'] ?? 0), (int) ($user['id'] ?? 0));
    }

    return count($notifications);
}

function rtbo_notifications_payload(array $user): array
{
    $notifications = rtbo_notifications_for_user($user);
    return [
        'notifications' => $notifications,
        'notification_unread_count' => count(array_filter($notifications, static fn (array $item): bool => !($item['is_read'] ?? false))),
    ];
}

function rtbo_notification_game_summary(array $game): string
{
    $matchup = trim((string) ($game['away_team'] ?? '') . ' at ' . (string) ($game['home_team'] ?? ''));
    $matchup = trim($matchup) !== 'at' ? $matchup : 'Assigned game';
    $date = trim((string) ($game['game_date'] ?? ''));
    $time = trim((string) ($game['game_time'] ?? ''));
    $location = trim((string) ($game['location_name'] ?? ''));

    return trim($matchup . ($date !== '' ? " on {$date}" : '') . ($time !== '' ? " at {$time}" : '') . ($location !== '' ? " / {$location}" : ''));
}

function rtbo_notify_game_film_available(array $officialIds, array $game, string $title = 'Game film is available'): array
{
    return rtbo_notify_users($officialIds, [
        'type' => 'game_film_available',
        'title' => $title,
        'body' => rtbo_notification_game_summary($game) . ' now has game film available for download.',
        'related_type' => 'game',
        'related_id' => (int) ($game['id'] ?? 0),
    ]);
}

function rtbo_notify_evaluation_available(int $officialId, array $evaluation): array
{
    return rtbo_notify_users([$officialId], [
        'type' => 'evaluation_available',
        'title' => 'Evaluation available to view',
        'body' => 'An evaluator or observer evaluation has been released to your profile.',
        'related_type' => 'evaluation',
        'related_id' => (int) ($evaluation['id'] ?? 0),
        'metadata' => $evaluation,
    ]);
}

function rtbo_notify_game_report_due(array $officialIds, array $game): array
{
    return rtbo_notify_users($officialIds, [
        'type' => 'game_report_due',
        'title' => 'Game report due',
        'body' => 'A post-game report is due for ' . rtbo_notification_game_summary($game) . '.',
        'related_type' => 'game',
        'related_id' => (int) ($game['id'] ?? 0),
    ]);
}

<?php
declare(strict_types=1);

require_once __DIR__ . '/users.php';
require_once __DIR__ . '/email.php';

function rtbo_locker_room_ensure_tables(): void
{
    db()->exec(
        "CREATE TABLE IF NOT EXISTS locker_room_teams (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(190) NOT NULL,
            slug VARCHAR(190) NOT NULL,
            created_by INT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NULL,
            UNIQUE KEY uniq_locker_room_team_slug (slug),
            INDEX idx_locker_room_team_created_by (created_by)
        )"
    );

    db()->exec(
        "CREATE TABLE IF NOT EXISTS locker_room_team_members (
            team_id INT NOT NULL,
            user_id INT NOT NULL,
            role VARCHAR(40) NOT NULL DEFAULT 'viewer',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (team_id, user_id),
            INDEX idx_locker_room_member_user (user_id),
            INDEX idx_locker_room_member_role (role)
        )"
    );

    db()->exec(
        "CREATE TABLE IF NOT EXISTS locker_room_films (
            id INT AUTO_INCREMENT PRIMARY KEY,
            team_id INT NOT NULL,
            title VARCHAR(220) NOT NULL,
            opponent VARCHAR(190) NULL,
            game_date DATE NULL,
            venue VARCHAR(190) NULL,
            competition_level VARCHAR(160) NULL,
            storage_path VARCHAR(255) NOT NULL,
            caption_path VARCHAR(255) NULL,
            original_filename VARCHAR(255) NOT NULL,
            mime_type VARCHAR(120) NULL,
            size_bytes BIGINT NOT NULL DEFAULT 0,
            duration_seconds DECIMAL(12,2) NULL,
            status VARCHAR(40) NOT NULL DEFAULT 'ready',
            download_enabled TINYINT(1) NOT NULL DEFAULT 1,
            view_count BIGINT NOT NULL DEFAULT 0,
            download_count BIGINT NOT NULL DEFAULT 0,
            uploaded_by INT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NULL,
            last_viewed_at DATETIME NULL,
            INDEX idx_locker_room_films_team (team_id, status, created_at),
            INDEX idx_locker_room_films_uploaded_by (uploaded_by)
        )"
    );

    db()->exec(
        "CREATE TABLE IF NOT EXISTS locker_room_events (
            id INT AUTO_INCREMENT PRIMARY KEY,
            film_id INT NULL,
            team_id INT NULL,
            actor_id INT NULL,
            event_type VARCHAR(40) NOT NULL,
            metadata LONGTEXT NULL,
            ip_address VARCHAR(80) NULL,
            user_agent VARCHAR(255) NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_locker_room_events_film (film_id, event_type, created_at),
            INDEX idx_locker_room_events_team (team_id, event_type, created_at)
        )"
    );

    db()->exec(
        "CREATE TABLE IF NOT EXISTS locker_room_notification_recipients (
            id INT AUTO_INCREMENT PRIMARY KEY,
            team_id INT NOT NULL,
            email VARCHAR(190) NOT NULL,
            events VARCHAR(255) NOT NULL DEFAULT 'upload,view,download',
            enabled TINYINT(1) NOT NULL DEFAULT 1,
            created_by INT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NULL,
            UNIQUE KEY uniq_locker_room_recipient (team_id, email),
            INDEX idx_locker_room_recipient_team (team_id, enabled)
        )"
    );
}

function rtbo_locker_room_current_user(): ?array
{
    $databaseUser = current_database_user();
    if (is_array($databaseUser)) {
        return public_auth_user($databaseUser);
    }

    $sessionUser = current_user();
    return is_array($sessionUser) ? $sessionUser : null;
}

function rtbo_locker_room_json(array $payload, int $status = 200): never
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_SLASHES);
    exit;
}

function rtbo_locker_room_require_user(): array
{
    $user = rtbo_locker_room_current_user();
    if (!$user || empty($user['id'])) {
        rtbo_locker_room_json([
            'success' => false,
            'message' => 'Sign in or create an RTBO account to access The Locker Room.',
        ], 401);
    }

    return $user;
}

function rtbo_locker_room_text(mixed $value, int $maxLength = 500): string
{
    $text = trim(strip_tags((string) $value));
    return $maxLength > 0 && strlen($text) > $maxLength ? substr($text, 0, $maxLength) : $text;
}

function rtbo_locker_room_slug(string $value, string $fallback = 'team-room'): string
{
    $slug = strtolower(rtbo_locker_room_text($value, 140));
    $slug = preg_replace('/[^a-z0-9]+/', '-', $slug) ?: '';
    $slug = trim($slug, '-');
    return substr($slug !== '' ? $slug : $fallback, 0, 120);
}

function rtbo_locker_room_unique_slug(string $name): string
{
    $base = rtbo_locker_room_slug($name);
    $slug = $base;
    $index = 2;
    $stmt = db()->prepare('SELECT COUNT(*) FROM locker_room_teams WHERE slug = ?');
    while (true) {
        $stmt->execute([$slug]);
        if ((int) $stmt->fetchColumn() === 0) {
            return $slug;
        }
        $slug = substr($base, 0, 110) . '-' . $index;
        $index++;
    }
}

function rtbo_locker_room_is_team_member(int $teamId, array $user): bool
{
    if (is_admin_user($user)) {
        return true;
    }

    $stmt = db()->prepare('SELECT COUNT(*) FROM locker_room_team_members WHERE team_id = ? AND user_id = ?');
    $stmt->execute([$teamId, (int) $user['id']]);

    return (int) $stmt->fetchColumn() > 0;
}

function rtbo_locker_room_can_upload(int $teamId, array $user): bool
{
    if (is_admin_user($user)) {
        return true;
    }

    $stmt = db()->prepare("SELECT role FROM locker_room_team_members WHERE team_id = ? AND user_id = ? LIMIT 1");
    $stmt->execute([$teamId, (int) $user['id']]);
    $role = (string) ($stmt->fetchColumn() ?: '');

    return in_array($role, ['owner', 'admin', 'uploader'], true);
}

function rtbo_locker_room_create_team(array $input, array $user): array
{
    $name = rtbo_locker_room_text($input['name'] ?? '', 190);
    if (strlen($name) < 2) {
        throw new RuntimeException('Enter a team room name.');
    }

    $slug = rtbo_locker_room_unique_slug($name);
    $stmt = db()->prepare('INSERT INTO locker_room_teams(name, slug, created_by, updated_at) VALUES(?, ?, ?, NOW())');
    $stmt->execute([$name, $slug, (int) $user['id']]);
    $teamId = (int) db()->lastInsertId();

    $member = db()->prepare('INSERT INTO locker_room_team_members(team_id, user_id, role) VALUES(?, ?, ?)');
    $member->execute([$teamId, (int) $user['id'], 'owner']);

    rtbo_locker_room_log_event(null, $teamId, $user, 'team_created', ['name' => $name]);

    return rtbo_locker_room_team_by_id($teamId, $user);
}

function rtbo_locker_room_team_by_id(int $teamId, array $user): array
{
    $stmt = db()->prepare(
        "SELECT t.*, COALESCE(tm.role, 'admin') AS member_role
         FROM locker_room_teams t
         LEFT JOIN locker_room_team_members tm ON tm.team_id = t.id AND tm.user_id = ?
         WHERE t.id = ?
         LIMIT 1"
    );
    $stmt->execute([(int) $user['id'], $teamId]);
    $row = $stmt->fetch();
    if (!$row || !rtbo_locker_room_is_team_member((int) $row['id'], $user)) {
        throw new RuntimeException('Team room could not be found.');
    }

    return rtbo_locker_room_team_public($row, $user);
}

function rtbo_locker_room_team_public(array $row, array $user): array
{
    return [
        'id' => (int) $row['id'],
        'name' => (string) $row['name'],
        'slug' => (string) $row['slug'],
        'role' => is_admin_user($user) ? 'owner' : (string) ($row['member_role'] ?? 'viewer'),
        'createdAt' => (string) ($row['created_at'] ?? ''),
        'updatedAt' => (string) ($row['updated_at'] ?? ''),
    ];
}

function rtbo_locker_room_load_teams(array $user): array
{
    if (is_admin_user($user)) {
        $rows = db()->query(
            "SELECT t.*, 'owner' AS member_role
             FROM locker_room_teams t
             ORDER BY t.updated_at DESC, t.created_at DESC, t.id DESC"
        )->fetchAll();
    } else {
        $stmt = db()->prepare(
            "SELECT t.*, tm.role AS member_role
             FROM locker_room_teams t
             INNER JOIN locker_room_team_members tm ON tm.team_id = t.id
             WHERE tm.user_id = ?
             ORDER BY t.updated_at DESC, t.created_at DESC, t.id DESC"
        );
        $stmt->execute([(int) $user['id']]);
        $rows = $stmt->fetchAll();
    }

    return array_map(static fn(array $row): array => rtbo_locker_room_team_public($row, $user), $rows);
}

function rtbo_locker_room_film_public(array $row): array
{
    $id = (int) $row['id'];
    $captionPath = (string) ($row['caption_path'] ?? '');

    return [
        'id' => $id,
        'teamId' => (int) $row['team_id'],
        'title' => (string) $row['title'],
        'opponent' => (string) ($row['opponent'] ?? ''),
        'gameDate' => (string) ($row['game_date'] ?? ''),
        'venue' => (string) ($row['venue'] ?? ''),
        'competitionLevel' => (string) ($row['competition_level'] ?? ''),
        'originalFilename' => (string) $row['original_filename'],
        'mimeType' => (string) ($row['mime_type'] ?? 'video/mp4'),
        'sizeBytes' => (int) ($row['size_bytes'] ?? 0),
        'durationSeconds' => $row['duration_seconds'] !== null ? (float) $row['duration_seconds'] : null,
        'status' => (string) $row['status'],
        'downloadEnabled' => (int) ($row['download_enabled'] ?? 1) === 1,
        'viewCount' => (int) ($row['view_count'] ?? 0),
        'downloadCount' => (int) ($row['download_count'] ?? 0),
        'createdAt' => (string) ($row['created_at'] ?? ''),
        'updatedAt' => (string) ($row['updated_at'] ?? ''),
        'lastViewedAt' => (string) ($row['last_viewed_at'] ?? ''),
        'videoUrl' => '/api/locker-room-media.php?film=' . $id,
        'downloadUrl' => '/api/locker-room-media.php?film=' . $id . '&download=1',
        'tracks' => $captionPath !== '' ? [[
            'kind' => 'captions',
            'src' => '/api/locker-room-media.php?film=' . $id . '&asset=caption',
            'srcLang' => 'en',
            'label' => 'English',
        ]] : [],
    ];
}

function rtbo_locker_room_load_films(array $user, int $teamId = 0): array
{
    $teams = rtbo_locker_room_load_teams($user);
    $teamIds = array_map(static fn(array $team): int => (int) $team['id'], $teams);
    if ($teamId > 0) {
        if (!in_array($teamId, $teamIds, true)) {
            throw new RuntimeException('You do not have access to that team room.');
        }
        $teamIds = [$teamId];
    }
    if ($teamIds === []) {
        return [];
    }

    $placeholders = implode(',', array_fill(0, count($teamIds), '?'));
    $stmt = db()->prepare(
        "SELECT *
         FROM locker_room_films
         WHERE team_id IN ($placeholders) AND status <> 'deleted'
         ORDER BY created_at DESC, id DESC"
    );
    $stmt->execute($teamIds);

    return array_map('rtbo_locker_room_film_public', $stmt->fetchAll());
}

function rtbo_locker_room_log_event(?int $filmId, ?int $teamId, ?array $user, string $type, array $metadata = []): void
{
    rtbo_locker_room_ensure_tables();
    $stmt = db()->prepare(
        "INSERT INTO locker_room_events(film_id, team_id, actor_id, event_type, metadata, ip_address, user_agent)
         VALUES(?, ?, ?, ?, ?, ?, ?)"
    );
    $stmt->execute([
        $filmId ?: null,
        $teamId ?: null,
        isset($user['id']) ? (int) $user['id'] : null,
        $type,
        $metadata ? json_encode($metadata, JSON_UNESCAPED_SLASHES) : null,
        substr((string) ($_SERVER['REMOTE_ADDR'] ?? ''), 0, 80),
        substr((string) ($_SERVER['HTTP_USER_AGENT'] ?? ''), 0, 255),
    ]);
}

function rtbo_locker_room_notification_recipients(int $teamId): array
{
    $stmt = db()->prepare('SELECT email FROM locker_room_notification_recipients WHERE team_id = ? AND enabled = 1');
    $stmt->execute([$teamId]);
    $teamRecipients = array_map(static fn(array $row): string => (string) $row['email'], $stmt->fetchAll());

    return rtbo_normalize_email_list(array_merge(rtbo_super_admin_recipients(), $teamRecipients));
}

function rtbo_locker_room_notify(int $teamId, string $subject, string $message, string $replyTo = ''): void
{
    foreach (rtbo_locker_room_notification_recipients($teamId) as $recipient) {
        rtbo_send_mail($recipient, $subject, $message, rtbo_plain_email_headers($replyTo));
    }
}

function rtbo_locker_room_upload_dir(): string
{
    $dir = STORAGE_DIR . '/locker-room/films';
    ensure_dir($dir);
    return $dir;
}

function rtbo_locker_room_detect_file_type(array $upload): string
{
    $mimeType = '';
    if (!empty($upload['tmp_name']) && function_exists('finfo_open')) {
        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        if ($finfo !== false) {
            $detected = finfo_file($finfo, (string) $upload['tmp_name']);
            finfo_close($finfo);
            $mimeType = is_string($detected) ? $detected : '';
        }
    }

    return $mimeType ?: (string) ($upload['type'] ?? '');
}

function rtbo_locker_room_video_extension(string $mimeType, string $originalName): string
{
    $allowed = [
        'video/mp4' => 'mp4',
        'video/webm' => 'webm',
        'video/quicktime' => 'mov',
        'video/x-m4v' => 'm4v',
    ];
    $extension = $allowed[$mimeType] ?? strtolower((string) pathinfo($originalName, PATHINFO_EXTENSION));

    return in_array($extension, ['mp4', 'webm', 'mov', 'm4v'], true) ? $extension : '';
}

function rtbo_locker_room_caption_extension(string $mimeType, string $originalName): string
{
    $extension = strtolower((string) pathinfo($originalName, PATHINFO_EXTENSION));
    if ($extension === 'vtt' || in_array($mimeType, ['text/vtt', 'text/plain'], true)) {
        return 'vtt';
    }

    return '';
}

function rtbo_locker_room_save_upload(array $upload, string $prefix, string $extension): string
{
    $targetName = $prefix . '-' . gmdate('Ymd-His') . '-' . bin2hex(random_bytes(8)) . '.' . $extension;
    $targetPath = rtbo_locker_room_upload_dir() . '/' . $targetName;
    if (!move_uploaded_file((string) $upload['tmp_name'], $targetPath)) {
        throw new RuntimeException('The file could not be saved. Please try again.');
    }

    return $targetName;
}

function rtbo_locker_room_upload_film(array $input, array $files, array $user): array
{
    $teamId = (int) ($input['teamId'] ?? 0);
    if ($teamId <= 0 || !rtbo_locker_room_can_upload($teamId, $user)) {
        throw new RuntimeException('You do not have upload permission for that team room.');
    }

    $title = rtbo_locker_room_text($input['title'] ?? '', 220);
    if (strlen($title) < 2) {
        throw new RuntimeException('Enter a film title.');
    }

    $video = $files['video'] ?? null;
    if (!is_array($video) || (int) ($video['error'] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_NO_FILE) {
        throw new RuntimeException('Choose a real game film video file.');
    }
    if ((int) ($video['error'] ?? UPLOAD_ERR_OK) !== UPLOAD_ERR_OK || !is_uploaded_file((string) ($video['tmp_name'] ?? ''))) {
        throw new RuntimeException('The selected video could not be uploaded. Check the server upload size limit and try again.');
    }
    if ((int) ($video['size'] ?? 0) > 2 * 1024 * 1024 * 1024) {
        throw new RuntimeException('Locker Room film uploads must be 2GB or smaller.');
    }

    $mimeType = rtbo_locker_room_detect_file_type($video);
    $extension = rtbo_locker_room_video_extension($mimeType, (string) ($video['name'] ?? ''));
    if ($extension === '') {
        throw new RuntimeException('Locker Room film must be MP4, WebM, MOV, or M4V.');
    }

    $storagePath = rtbo_locker_room_save_upload($video, 'locker-room-film-' . $teamId, $extension);
    $captionPath = null;
    $caption = $files['caption'] ?? null;
    if (is_array($caption) && (int) ($caption['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_NO_FILE) {
        if ((int) ($caption['error'] ?? UPLOAD_ERR_OK) !== UPLOAD_ERR_OK || !is_uploaded_file((string) ($caption['tmp_name'] ?? ''))) {
            throw new RuntimeException('The selected caption file could not be uploaded.');
        }
        $captionMime = rtbo_locker_room_detect_file_type($caption);
        $captionExtension = rtbo_locker_room_caption_extension($captionMime, (string) ($caption['name'] ?? ''));
        if ($captionExtension === '') {
            throw new RuntimeException('Captions must be uploaded as a WebVTT .vtt file.');
        }
        $captionPath = rtbo_locker_room_save_upload($caption, 'locker-room-caption-' . $teamId, $captionExtension);
    }

    $gameDate = rtbo_locker_room_text($input['gameDate'] ?? '', 30);
    $gameDateValue = preg_match('/^\d{4}-\d{2}-\d{2}$/', $gameDate) ? $gameDate : null;
    $stmt = db()->prepare(
        "INSERT INTO locker_room_films(team_id, title, opponent, game_date, venue, competition_level, storage_path, caption_path, original_filename, mime_type, size_bytes, duration_seconds, status, download_enabled, uploaded_by, updated_at)
         VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ready', ?, ?, NOW())"
    );
    $stmt->execute([
        $teamId,
        $title,
        rtbo_locker_room_text($input['opponent'] ?? '', 190) ?: null,
        $gameDateValue,
        rtbo_locker_room_text($input['venue'] ?? '', 190) ?: null,
        rtbo_locker_room_text($input['competitionLevel'] ?? '', 160) ?: null,
        $storagePath,
        $captionPath,
        basename((string) ($video['name'] ?? 'Locker Room Film')),
        $mimeType,
        (int) ($video['size'] ?? 0),
        is_numeric($input['durationSeconds'] ?? null) ? (float) $input['durationSeconds'] : null,
        !empty($input['downloadEnabled']) ? 1 : 0,
        (int) $user['id'],
    ]);
    $filmId = (int) db()->lastInsertId();
    rtbo_locker_room_log_event($filmId, $teamId, $user, 'upload', ['title' => $title]);
    rtbo_locker_room_notify(
        $teamId,
        'Locker Room Film Uploaded',
        "A new Locker Room film has been uploaded.\n\nTitle: {$title}\nUploaded by: " . ($user['name'] ?? $user['email'] ?? 'RTBO user') . "\nTeam room ID: {$teamId}",
        (string) ($user['email'] ?? '')
    );

    return rtbo_locker_room_film_by_id($filmId, $user);
}

function rtbo_locker_room_film_by_id(int $filmId, array $user): array
{
    $stmt = db()->prepare('SELECT * FROM locker_room_films WHERE id = ? AND status <> "deleted" LIMIT 1');
    $stmt->execute([$filmId]);
    $film = $stmt->fetch();
    if (!$film || !rtbo_locker_room_is_team_member((int) $film['team_id'], $user)) {
        throw new RuntimeException('Film could not be found.');
    }

    return rtbo_locker_room_film_public($film);
}

function rtbo_locker_room_record_film_event(int $filmId, string $eventType, array $user, array $metadata = []): array
{
    if (!in_array($eventType, ['view', 'recording'], true)) {
        throw new RuntimeException('Unsupported Locker Room event.');
    }

    $film = rtbo_locker_room_film_by_id($filmId, $user);
    if ($eventType === 'view') {
        $stmt = db()->prepare('UPDATE locker_room_films SET view_count = view_count + 1, last_viewed_at = NOW(), updated_at = NOW() WHERE id = ?');
        $stmt->execute([$filmId]);
    }
    rtbo_locker_room_log_event($filmId, (int) $film['teamId'], $user, $eventType, $metadata);

    return rtbo_locker_room_film_by_id($filmId, $user);
}

function rtbo_locker_room_media_record(int $filmId, array $user): array
{
    $stmt = db()->prepare('SELECT * FROM locker_room_films WHERE id = ? AND status = "ready" LIMIT 1');
    $stmt->execute([$filmId]);
    $film = $stmt->fetch();
    if (!$film || !rtbo_locker_room_is_team_member((int) $film['team_id'], $user)) {
        http_response_code(404);
        exit;
    }

    return $film;
}

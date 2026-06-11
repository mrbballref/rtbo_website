<?php
declare(strict_types=1);

require_once __DIR__ . '/admin-schools.php';
require_once __DIR__ . '/admin-members.php';
require_once __DIR__ . '/notifications.php';
require_once __DIR__ . '/availability-rules.php';

function admin_games_storage_path(): string
{
    return STORAGE_DIR . '/admin-games.json';
}

function admin_game_tba_requests_storage_path(): string
{
    return STORAGE_DIR . '/admin-tba-requests.json';
}

function admin_games_table_column_exists(string $table, string $column): bool
{
    try {
        $stmt = db()->prepare(
            "SELECT COUNT(*)
             FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE()
               AND TABLE_NAME = ?
               AND COLUMN_NAME = ?"
        );
        $stmt->execute([$table, $column]);
        return (int) $stmt->fetchColumn() > 0;
    } catch (Throwable $error) {
        error_log('RTBO table column lookup failed: ' . $error->getMessage());
        return false;
    }
}

function admin_games_column_exists(string $column): bool
{
    return admin_games_table_column_exists('games', $column);
}

function ensure_admin_games_table(): void
{
    db()->exec(
        "CREATE TABLE IF NOT EXISTS games (
            id INT AUTO_INCREMENT PRIMARY KEY,
            game_date DATE,
            game_time TIME,
            level VARCHAR(120),
            home_team VARCHAR(190),
            away_team VARCHAR(190),
            location_name VARCHAR(190),
            location_address TEXT,
            location_lat DECIMAL(10,7) NULL,
            location_lng DECIMAL(10,7) NULL,
            fee_per_official DECIMAL(10,2),
            status VARCHAR(50) DEFAULT 'scheduled',
            published TINYINT(1) NOT NULL DEFAULT 0,
            tba_visible TINYINT(1) NOT NULL DEFAULT 0,
            tba_sent_at DATETIME NULL,
            cancellation_reason VARCHAR(120),
            school_event_center_id INT NULL,
            home_team_id INT NULL,
            away_team_id INT NULL,
            court_number INT NULL,
            court_label VARCHAR(190) NULL,
            games_per_night INT NOT NULL DEFAULT 1,
            officials_required INT NOT NULL DEFAULT 3,
            required_position_ids TEXT NULL,
            notes TEXT NULL,
            schedule_changed_at DATETIME NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )"
    );

    foreach ([
        'published' => "ALTER TABLE games ADD COLUMN published TINYINT(1) NOT NULL DEFAULT 0",
        'tba_visible' => "ALTER TABLE games ADD COLUMN tba_visible TINYINT(1) NOT NULL DEFAULT 0 AFTER published",
        'tba_sent_at' => "ALTER TABLE games ADD COLUMN tba_sent_at DATETIME NULL AFTER tba_visible",
        'location_lat' => "ALTER TABLE games ADD COLUMN location_lat DECIMAL(10,7) NULL",
        'location_lng' => "ALTER TABLE games ADD COLUMN location_lng DECIMAL(10,7) NULL",
        'school_event_center_id' => "ALTER TABLE games ADD COLUMN school_event_center_id INT NULL",
        'home_team_id' => "ALTER TABLE games ADD COLUMN home_team_id INT NULL",
        'away_team_id' => "ALTER TABLE games ADD COLUMN away_team_id INT NULL",
        'court_number' => "ALTER TABLE games ADD COLUMN court_number INT NULL",
        'court_label' => "ALTER TABLE games ADD COLUMN court_label VARCHAR(190) NULL AFTER court_number",
        'games_per_night' => "ALTER TABLE games ADD COLUMN games_per_night INT NOT NULL DEFAULT 1",
        'officials_required' => "ALTER TABLE games ADD COLUMN officials_required INT NOT NULL DEFAULT 3 AFTER games_per_night",
        'required_position_ids' => "ALTER TABLE games ADD COLUMN required_position_ids TEXT NULL AFTER officials_required",
        'notes' => "ALTER TABLE games ADD COLUMN notes TEXT NULL",
        'schedule_changed_at' => "ALTER TABLE games ADD COLUMN schedule_changed_at DATETIME NULL AFTER notes",
    ] as $column => $sql) {
        if (!admin_games_column_exists($column)) {
            db()->exec($sql);
        }
    }

    foreach ([
        'background_check_expires_at' => "ALTER TABLE users ADD COLUMN background_check_expires_at DATE NULL AFTER official_rank",
        'safesport_expires_at' => "ALTER TABLE users ADD COLUMN safesport_expires_at DATE NULL AFTER background_check_expires_at",
        'default_pay_rate' => "ALTER TABLE users ADD COLUMN default_pay_rate DECIMAL(10,2) NULL AFTER safesport_expires_at",
        'evaluation_score' => "ALTER TABLE users ADD COLUMN evaluation_score DECIMAL(5,2) NULL AFTER default_pay_rate",
    ] as $column => $sql) {
        if (!admin_games_table_column_exists('users', $column)) {
            db()->exec($sql);
        }
    }

    db()->exec(
        "CREATE TABLE IF NOT EXISTS positions (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            sort_order INT NOT NULL DEFAULT 0
        )"
    );

    $stmt = db()->query('SELECT COUNT(*) FROM positions');
    if ((int) $stmt->fetchColumn() === 0) {
        $insert = db()->prepare('INSERT INTO positions(name, sort_order) VALUES(?, ?)');
        foreach ([['Referee', 1], ['Umpire 1', 2], ['Umpire 2', 3], ['Alternate', 4], ['Observer / Evaluator', 5]] as $position) {
            $insert->execute($position);
        }
    }

    $positionExists = db()->prepare('SELECT id FROM positions WHERE LOWER(name) = LOWER(?) LIMIT 1');
    $positionInsert = db()->prepare('INSERT INTO positions(name, sort_order) VALUES(?, ?)');
    foreach ([['Alternate', 4], ['Observer / Evaluator', 5]] as $position) {
        $positionExists->execute([$position[0]]);
        if (!$positionExists->fetchColumn()) {
            $positionInsert->execute($position);
        }
    }

    db()->exec(
        "CREATE TABLE IF NOT EXISTS assignments (
            id INT AUTO_INCREMENT PRIMARY KEY,
            game_id INT NOT NULL,
            official_id INT NOT NULL,
            position_id INT NOT NULL,
            crew_designation VARCHAR(60) NOT NULL DEFAULT 'official',
            assignor_notes TEXT NULL,
            status VARCHAR(50) DEFAULT 'pending',
            decline_reason TEXT NULL,
            responded_at DATETIME NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_assignments_game (game_id),
            INDEX idx_assignments_official (official_id),
            INDEX idx_assignments_position (position_id)
        )"
    );

    foreach ([
        'game_id' => "ALTER TABLE assignments ADD COLUMN game_id INT NOT NULL AFTER id",
        'official_id' => "ALTER TABLE assignments ADD COLUMN official_id INT NOT NULL AFTER game_id",
        'position_id' => "ALTER TABLE assignments ADD COLUMN position_id INT NOT NULL AFTER official_id",
        'crew_designation' => "ALTER TABLE assignments ADD COLUMN crew_designation VARCHAR(60) NOT NULL DEFAULT 'official' AFTER position_id",
        'assignor_notes' => "ALTER TABLE assignments ADD COLUMN assignor_notes TEXT NULL AFTER crew_designation",
        'status' => "ALTER TABLE assignments ADD COLUMN status VARCHAR(50) DEFAULT 'pending' AFTER position_id",
        'decline_reason' => "ALTER TABLE assignments ADD COLUMN decline_reason TEXT NULL AFTER status",
        'responded_at' => "ALTER TABLE assignments ADD COLUMN responded_at DATETIME NULL AFTER decline_reason",
        'created_at' => "ALTER TABLE assignments ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP",
    ] as $column => $sql) {
        if (!admin_games_table_column_exists('assignments', $column)) {
            db()->exec($sql);
        }
    }

    db()->exec(
        "CREATE TABLE IF NOT EXISTS crew_messages (
            id INT AUTO_INCREMENT PRIMARY KEY,
            game_id INT NOT NULL,
            sender_user_id INT NULL,
            sender_name VARCHAR(190) NOT NULL,
            message TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_crew_messages_game (game_id),
            INDEX idx_crew_messages_created (created_at)
        )"
    );

    db()->exec(
        "CREATE TABLE IF NOT EXISTS tba_requests (
            id INT AUTO_INCREMENT PRIMARY KEY,
            game_id INT NOT NULL,
            official_id INT NOT NULL,
            status VARCHAR(50) NOT NULL DEFAULT 'pending',
            note TEXT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NULL,
            INDEX idx_tba_requests_game (game_id),
            INDEX idx_tba_requests_official (official_id),
            UNIQUE KEY uq_tba_game_official (game_id, official_id)
        )"
    );

    foreach ([
        'game_id' => "ALTER TABLE tba_requests ADD COLUMN game_id INT NOT NULL AFTER id",
        'official_id' => "ALTER TABLE tba_requests ADD COLUMN official_id INT NOT NULL AFTER game_id",
        'status' => "ALTER TABLE tba_requests ADD COLUMN status VARCHAR(50) NOT NULL DEFAULT 'pending' AFTER official_id",
        'note' => "ALTER TABLE tba_requests ADD COLUMN note TEXT NULL AFTER status",
        'created_at' => "ALTER TABLE tba_requests ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP",
        'updated_at' => "ALTER TABLE tba_requests ADD COLUMN updated_at DATETIME NULL",
    ] as $column => $sql) {
        if (!admin_games_table_column_exists('tba_requests', $column)) {
            db()->exec($sql);
        }
    }
}

function admin_games_db_available(): bool
{
    try {
        ensure_admin_games_table();
        return true;
    } catch (Throwable $error) {
        error_log('RTBO games database unavailable: ' . $error->getMessage());
        return false;
    }
}

function admin_games_read_file(): array
{
    $path = admin_games_storage_path();
    if (!is_file($path)) {
        return [];
    }

    $decoded = json_decode((string) file_get_contents($path), true);
    return is_array($decoded) ? array_values($decoded) : [];
}

function admin_games_write_file(array $records): void
{
    ensure_dir(dirname(admin_games_storage_path()));
    file_put_contents(
        admin_games_storage_path(),
        json_encode(array_values($records), JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES),
        LOCK_EX
    );
}

function admin_game_tba_requests_read_file(): array
{
    $path = admin_game_tba_requests_storage_path();
    if (!is_file($path)) {
        return [];
    }

    $decoded = json_decode((string) file_get_contents($path), true);
    return is_array($decoded) ? array_values($decoded) : [];
}

function admin_game_tba_requests_write_file(array $records): void
{
    ensure_dir(dirname(admin_game_tba_requests_storage_path()));
    file_put_contents(
        admin_game_tba_requests_storage_path(),
        json_encode(array_values($records), JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES),
        LOCK_EX
    );
}

function admin_game_records_by_type(string $type): array
{
    return array_values(array_filter(
        admin_schools_list(),
        static fn (array $record): bool => ($record['record_type'] ?? '') === $type && ($record['status'] ?? 'active') === 'active'
    ));
}

function admin_game_venue_records(): array
{
    return array_values(array_filter(
        admin_schools_list(),
        static fn (array $record): bool => in_array(($record['record_type'] ?? ''), ['school', 'event_center'], true)
            && ($record['status'] ?? 'active') === 'active'
    ));
}

function admin_game_positions_list(): array
{
    $fallback = [
        ['id' => 1, 'name' => 'Referee', 'sort_order' => 1],
        ['id' => 2, 'name' => 'Umpire 1', 'sort_order' => 2],
        ['id' => 3, 'name' => 'Umpire 2', 'sort_order' => 3],
        ['id' => 4, 'name' => 'Alternate', 'sort_order' => 4],
    ];

    if (!admin_games_db_available()) {
        return $fallback;
    }

    $stmt = db()->query('SELECT id, name, sort_order FROM positions ORDER BY sort_order ASC, name ASC');
    $positions = array_map(static fn (array $row): array => [
        'id' => (int) ($row['id'] ?? 0),
        'name' => (string) ($row['name'] ?? ''),
        'sort_order' => (int) ($row['sort_order'] ?? 0),
    ], $stmt->fetchAll());

    return $positions ?: $fallback;
}

function admin_game_assigned_official_ids(array $game): array
{
    $ids = [];
    foreach (($game['assignments'] ?? []) as $assignment) {
        $status = strtolower((string) ($assignment['status'] ?? 'pending'));
        $officialId = (int) ($assignment['official_id'] ?? 0);
        if ($officialId > 0 && !in_array($status, ['removed', 'declined'], true)) {
            $ids[] = $officialId;
        }
    }

    return array_values(array_unique($ids));
}

function admin_game_notification_metadata(array $game, array $extra = []): array
{
    return [
        'game_id' => (int) ($game['id'] ?? 0),
        'game_date' => (string) ($game['game_date'] ?? ''),
        'game_time' => (string) ($game['game_time'] ?? ''),
        'level' => (string) ($game['level'] ?? ''),
        'home_team' => (string) ($game['home_team'] ?? ''),
        'away_team' => (string) ($game['away_team'] ?? ''),
        'location_name' => (string) ($game['location_name'] ?? ''),
        'location_address' => (string) ($game['location_address'] ?? ''),
        'published' => (bool) ($game['published'] ?? false),
        'status' => (string) ($game['status'] ?? ''),
        ...$extra,
    ];
}

function admin_game_notify_users_safe(array $userIds, array $notification): void
{
    $userIds = array_values(array_unique(array_filter(array_map('intval', $userIds))));
    if (!$userIds) {
        return;
    }

    try {
        rtbo_notify_users($userIds, $notification);
    } catch (Throwable $error) {
        error_log('RTBO game notification failed: ' . $error->getMessage());
    }
}

function admin_game_notify_admins_safe(array $notification): void
{
    try {
        rtbo_notify_admins($notification);
    } catch (Throwable $error) {
        error_log('RTBO admin notification failed: ' . $error->getMessage());
    }
}

function admin_game_notify_assigned_safe(array $game, string $type, string $title, string $body, array $metadata = []): void
{
    admin_game_notify_users_safe(admin_game_assigned_official_ids($game), [
        'type' => $type,
        'title' => $title,
        'body' => $body,
        'related_type' => 'game',
        'related_id' => (int) ($game['id'] ?? 0),
        'metadata' => admin_game_notification_metadata($game, $metadata),
    ]);
}

function admin_game_notification_reason(array $payload, string $fallback = ''): string
{
    foreach (['reason', 'change_reason', 'cancellation_reason', 'delete_reason', 'admin_reason', 'notes'] as $key) {
        $value = trim((string) ($payload[$key] ?? ''));
        if ($value !== '') {
            return $value;
        }
    }

    return $fallback;
}

function admin_game_changed_fields(array $before, array $after): array
{
    $labels = [
        'game_date' => 'date',
        'game_time' => 'time',
        'level' => 'game type',
        'home_team' => 'home team',
        'away_team' => 'visiting team',
        'location_name' => 'location',
        'location_address' => 'gym address',
        'court_label' => 'court',
        'fee_per_official' => 'official fee',
        'notes' => 'notes',
    ];
    $changed = [];

    foreach ($labels as $key => $label) {
        $oldValue = (string) ($before[$key] ?? '');
        $newValue = (string) ($after[$key] ?? '');
        if ($oldValue !== $newValue) {
            $changed[] = $label;
        }
    }

    return $changed;
}

function admin_game_send_publish_notifications(array $game): void
{
    admin_game_notify_assigned_safe(
        $game,
        'game_published_assigned',
        'Published game assigned to you',
        rtbo_notification_game_summary($game) . ' has been published to your schedule.',
        ['event' => 'publish']
    );
}

function admin_game_send_unpublish_notifications(array $game): void
{
    admin_game_notify_assigned_safe(
        $game,
        'assigned_game_changed',
        'Assigned game unpublished for editing',
        rtbo_notification_game_summary($game) . ' was unpublished for editing. It will be visible again after the Super Admin republishes it.',
        ['event' => 'unpublish', 'reason' => 'Unpublished for editing']
    );
}

function admin_game_notify_update_changes(array $before, array $after, array $payload): void
{
    if (!(bool) ($after['published'] ?? false)) {
        return;
    }

    $changedFields = admin_game_changed_fields($before, $after);
    if (!$changedFields) {
        return;
    }

    $reason = admin_game_notification_reason($payload, 'Game details were updated by the Super Admin.');
    $teamFields = array_intersect($changedFields, ['home team', 'visiting team']);
    if ($teamFields) {
        admin_game_notify_assigned_safe(
            $after,
            'assigned_game_team_changed',
            'Team changed in assigned game',
            rtbo_notification_game_summary($after) . ' had a team change. Reason: ' . $reason,
            ['event' => 'team_change', 'changed_fields' => array_values($teamFields), 'reason' => $reason]
        );
    }

    admin_game_notify_assigned_safe(
        $after,
        'assigned_game_changed',
        'Assigned game changed',
        rtbo_notification_game_summary($after) . ' was updated. Reason: ' . $reason,
        ['event' => 'game_update', 'changed_fields' => $changedFields, 'reason' => $reason]
    );
}

function admin_game_allowed_status_reasons(): array
{
    return [
        'visiting team canceled',
        'home team canceled',
        'game rescheduled',
        'postponed',
        'schedule conflict',
    ];
}

function admin_game_validate_status_reason(string $reason): string
{
    $reason = trim($reason);
    if ($reason === '') {
        throw new RuntimeException('A reason is required.');
    }

    $normalized = strtolower((string) preg_replace('/\s+/', ' ', $reason));
    if (!in_array($normalized, admin_game_allowed_status_reasons(), true)) {
        throw new RuntimeException('Select a valid reason: visiting team canceled, home team canceled, game rescheduled, postponed, or schedule conflict.');
    }

    return $reason;
}

function admin_game_position_map(): array
{
    $positions = admin_game_positions_list();
    $map = [];
    foreach ($positions as $position) {
        $map[(int) $position['id']] = $position;
    }
    return $map;
}

function admin_game_position_id_from_payload(array $payload): int
{
    $positionId = (int) ($payload['position_id'] ?? 0);
    $positions = admin_game_positions_list();
    foreach ($positions as $position) {
        if ($positionId > 0 && (int) $position['id'] === $positionId) {
            return $positionId;
        }
    }

    $positionName = strtolower(trim((string) ($payload['position_name'] ?? $payload['position'] ?? '')));
    if ($positionName !== '') {
        foreach ($positions as $position) {
            if (strtolower((string) $position['name']) === $positionName) {
                return (int) $position['id'];
            }
        }
    }

    throw new RuntimeException('Please select a valid officiating position.');
}

function admin_game_position_id_by_name(string $name): int
{
    $wanted = strtolower(trim($name));
    foreach (admin_game_positions_list() as $position) {
        if (strtolower((string) ($position['name'] ?? '')) === $wanted) {
            return (int) ($position['id'] ?? 0);
        }
    }

    return 0;
}

function admin_game_core_position_ids(int $officialsRequired = 3): array
{
    $names = ['Referee', 'Umpire 1'];
    if ($officialsRequired >= 3) {
        $names[] = 'Umpire 2';
    }

    return array_values(array_filter(array_map(
        static fn (string $name): int => admin_game_position_id_by_name($name),
        $names
    )));
}

function admin_game_default_required_position_ids(int $officialsRequired = 3): array
{
    $ids = admin_game_core_position_ids($officialsRequired);
    if ($officialsRequired >= 4) {
        $alternateId = admin_game_position_id_by_name('Alternate');
        if ($alternateId > 0) {
            $ids[] = $alternateId;
        }
    }

    return array_values(array_unique(array_filter($ids)));
}

function admin_game_required_position_ids_from_record(array $record): array
{
    $raw = $record['required_position_ids'] ?? $record['requiredPositionIds'] ?? null;
    if (is_string($raw)) {
        $decoded = json_decode($raw, true);
        $raw = is_array($decoded) ? $decoded : preg_split('/\s*,\s*/', $raw);
    }

    $ids = is_array($raw) ? array_values(array_filter(array_map('intval', $raw))) : [];
    if (!$ids) {
        $ids = admin_game_default_required_position_ids((int) ($record['officials_required'] ?? $record['officialsRequired'] ?? 3));
    }

    $validPositions = admin_game_position_map();
    return array_values(array_unique(array_filter($ids, static fn (int $id): bool => isset($validPositions[$id]))));
}

function admin_game_official_availability_map(array $officialIds): array
{
    $officialIds = array_values(array_unique(array_filter(array_map('intval', $officialIds))));
    if (!$officialIds || !admin_games_db_available()) {
        return [];
    }

    foreach (['official_availability', 'availability'] as $table) {
        try {
            $officialColumn = null;
            foreach (['official_id', 'user_id', 'member_id'] as $candidate) {
                if (admin_games_table_column_exists($table, $candidate)) {
                    $officialColumn = $candidate;
                    break;
                }
            }
            $dateColumn = null;
            foreach (['availability_date', 'date', 'available_date'] as $candidate) {
                if (admin_games_table_column_exists($table, $candidate)) {
                    $dateColumn = $candidate;
                    break;
                }
            }
            if ($officialColumn === null || $dateColumn === null) {
                continue;
            }

            $statusSelect = admin_games_table_column_exists($table, 'status') ? 'status' : "'available' AS status";
            $reasonSelect = admin_games_table_column_exists($table, 'reason') ? 'reason' : "'' AS reason";
            $notesSelect = admin_games_table_column_exists($table, 'notes') ? 'notes' : "'' AS notes";
            $gameLocationSelect = admin_games_table_column_exists($table, 'game_location')
                ? 'game_location'
                : (admin_games_table_column_exists($table, 'game_city') ? 'game_city AS game_location' : "'' AS game_location");
            $contactRequiredSelect = admin_games_table_column_exists($table, 'contact_required') ? 'contact_required' : '0 AS contact_required';
            $placeholders = implode(',', array_fill(0, count($officialIds), '?'));
            $stmt = db()->prepare(
                "SELECT {$officialColumn} AS official_id, {$dateColumn} AS availability_date, {$statusSelect}, {$reasonSelect}, {$notesSelect}, {$gameLocationSelect}, {$contactRequiredSelect}
                 FROM {$table}
                 WHERE {$officialColumn} IN ({$placeholders})"
            );
            $stmt->execute($officialIds);
            $map = [];
            foreach ($stmt->fetchAll() as $row) {
                $officialId = (int) ($row['official_id'] ?? 0);
                $map[$officialId][] = [
                    'date' => (string) ($row['availability_date'] ?? ''),
                    'status' => strtolower((string) ($row['status'] ?? 'available')) ?: 'available',
                    'reason' => (string) ($row['reason'] ?? ''),
                    'notes' => (string) ($row['notes'] ?? ''),
                    'game_location' => (string) ($row['game_location'] ?? ''),
                    'contact_required' => (bool) ((int) ($row['contact_required'] ?? 0)),
                ];
            }
            return $map;
        } catch (Throwable $error) {
            error_log("RTBO official availability lookup failed for {$table}: " . $error->getMessage());
        }
    }

    return [];
}

function admin_game_officials_list(bool $activeOnly = true): array
{
    $officials = array_values(array_filter(array_map(static function (array $member): array {
        return [
            'id' => (int) ($member['id'] ?? 0),
            'name' => trim((string) ($member['name'] ?? '')) ?: trim((string) ($member['first_name'] ?? '') . ' ' . (string) ($member['last_name'] ?? '')),
            'first_name' => (string) ($member['first_name'] ?? ''),
            'last_name' => (string) ($member['last_name'] ?? ''),
            'email' => (string) ($member['email'] ?? ''),
            'phone' => rtbo_format_phone_number((string) ($member['phone'] ?? '')),
            'sex' => (string) ($member['sex'] ?? ''),
            'race' => (string) ($member['race'] ?? ''),
            'city' => (string) ($member['city'] ?? ''),
            'state' => (string) ($member['state'] ?? ''),
            'zip' => (string) ($member['zip'] ?? ''),
            'address_line1' => (string) ($member['address_line1'] ?? ''),
            'address_line2' => (string) ($member['address_line2'] ?? ''),
            'photo' => (string) ($member['photo'] ?? ''),
            'status' => (string) ($member['status'] ?? 'active'),
            'role' => (string) ($member['role'] ?? ''),
            'official_rank' => $member['official_rank'] ?? null,
            'official_classification' => (string) ($member['official_classification'] ?? ''),
            'conferences' => (string) ($member['conferences'] ?? ''),
            'experience' => (string) ($member['experience'] ?? ''),
            'background_check_expires_at' => (string) ($member['background_check_expires_at'] ?? ''),
            'safesport_expires_at' => (string) ($member['safesport_expires_at'] ?? ''),
            'default_pay_rate' => isset($member['default_pay_rate']) ? (float) $member['default_pay_rate'] : null,
            'evaluation_score' => isset($member['evaluation_score']) ? (float) $member['evaluation_score'] : null,
        ];
    }, admin_members_list()), static function (array $member) use ($activeOnly): bool {
        if ((int) ($member['id'] ?? 0) <= 0 || ($member['role'] ?? '') !== 'official') {
            return false;
        }
        return !$activeOnly || ($member['status'] ?? '') === 'active';
    }));

    $availability = admin_game_official_availability_map(array_column($officials, 'id'));
    return array_map(static function (array $official) use ($availability): array {
        $official['availability'] = $availability[(int) ($official['id'] ?? 0)] ?? [];
        return $official;
    }, $officials);
}

function admin_game_official_map(bool $activeOnly = false): array
{
    $map = [];
    foreach (admin_game_officials_list($activeOnly) as $official) {
        $map[(int) $official['id']] = $official;
    }
    return $map;
}

function admin_game_find_record(array $records, int $id): ?array
{
    foreach ($records as $record) {
        if ((int) ($record['id'] ?? 0) === $id) {
            return $record;
        }
    }

    return null;
}

function admin_game_location_address(array $school): string
{
    $cityLine = trim(implode(', ', array_filter([
        (string) ($school['city'] ?? ''),
        (string) ($school['state'] ?? ''),
    ])));

    return trim(implode(' ', array_filter([
        (string) ($school['address_line1'] ?? ''),
        $cityLine,
        (string) ($school['zip'] ?? ''),
    ])));
}

function admin_game_date_key(array $game): string
{
    return (string) ($game['game_date'] ?? '');
}

function admin_game_time_minutes(array $game): ?int
{
    $time = substr((string) ($game['game_time'] ?? ''), 0, 5);
    if (!preg_match('/^(\d{1,2}):(\d{2})$/', $time, $matches)) {
        return null;
    }
    return ((int) $matches[1] * 60) + (int) $matches[2];
}

function admin_game_week_key(array $game): string
{
    $date = admin_game_date_key($game);
    if ($date === '') {
        return '';
    }
    $timestamp = strtotime($date);
    return $timestamp ? date('o-W', $timestamp) : '';
}

function admin_game_school_key(array $game): string
{
    return strtolower(trim(implode(' ', array_filter([
        (string) ($game['school_event_center_id'] ?? ''),
        (string) ($game['location_name'] ?? ''),
        (string) ($game['home_team'] ?? ''),
    ]))));
}

function admin_game_distance_miles_between(array $first, array $second): ?float
{
    foreach ([$first, $second] as $game) {
        if (($game['location_lat'] ?? null) === null || ($game['location_lng'] ?? null) === null) {
            return null;
        }
    }

    $earthRadius = 3958.8;
    $lat1 = deg2rad((float) $first['location_lat']);
    $lng1 = deg2rad((float) $first['location_lng']);
    $lat2 = deg2rad((float) $second['location_lat']);
    $lng2 = deg2rad((float) $second['location_lng']);
    $latDelta = $lat2 - $lat1;
    $lngDelta = $lng2 - $lng1;
    $angle = (sin($latDelta / 2) ** 2) + cos($lat1) * cos($lat2) * (sin($lngDelta / 2) ** 2);
    return round($earthRadius * 2 * atan2(sqrt($angle), sqrt(1 - $angle)), 1);
}

function admin_game_issue(string $code, string $severity, string $title, string $message, array $extra = []): array
{
    return [
        'code' => $code,
        'severity' => in_array($severity, ['critical', 'warning', 'info'], true) ? $severity : 'warning',
        'title' => $title,
        'message' => $message,
        ...$extra,
    ];
}

function admin_game_official_label(array $official): string
{
    return trim((string) ($official['name'] ?? '')) ?: trim((string) ($official['first_name'] ?? '') . ' ' . (string) ($official['last_name'] ?? '')) ?: (string) ($official['email'] ?? 'Official');
}

function admin_game_official_rules_map(array $officialIds): array
{
    $officialIds = array_values(array_unique(array_filter(array_map('intval', $officialIds))));
    if (!$officialIds || !admin_games_db_available()) {
        return [];
    }

    try {
        rtbo_ensure_availability_rules_table();
        $placeholders = implode(',', array_fill(0, count($officialIds), '?'));
        $stmt = db()->prepare(
            "SELECT *
             FROM official_availability_rules
             WHERE official_id IN ({$placeholders})
               AND is_active = 1
             ORDER BY official_id ASC, id ASC"
        );
        $stmt->execute($officialIds);
        $rules = [];
        foreach ($stmt->fetchAll() as $row) {
            $officialId = (int) ($row['official_id'] ?? 0);
            $rules[$officialId][] = rtbo_availability_rule_public($row);
        }
        return $rules;
    } catch (Throwable $error) {
        error_log('RTBO assignment rule lookup failed: ' . $error->getMessage());
        return [];
    }
}

function admin_game_rule_applies_to_game_day(array $rule, array $game): bool
{
    $days = array_map('strtolower', (array) ($rule['days'] ?? []));
    if (!$days) {
        return true;
    }
    $timestamp = strtotime((string) ($game['game_date'] ?? ''));
    if (!$timestamp) {
        return false;
    }
    return in_array(strtolower(date('D', $timestamp)), $days, true) || in_array(strtolower(date('l', $timestamp)), $days, true);
}

function admin_game_official_certifications(array $official): array
{
    $values = [];
    foreach (['official_classification', 'conferences', 'experience'] as $field) {
        $raw = trim((string) ($official[$field] ?? ''));
        if ($raw !== '') {
            $values[] = strtolower($raw);
        }
    }
    return $values;
}

function admin_game_official_has_required_certification(array $official, array $game): bool
{
    $level = strtolower(trim((string) ($game['level'] ?? '')));
    if ($level === '') {
        return true;
    }
    $certifications = admin_game_official_certifications($official);
    if (!$certifications) {
        return false;
    }
    foreach ($certifications as $certification) {
        if (str_contains($certification, $level) || str_contains($level, $certification)) {
            return true;
        }
    }
    foreach (['varsity', 'high school', 'nfhs'] as $nfhsTerm) {
        if (str_contains($level, $nfhsTerm) && array_filter($certifications, static fn (string $cert): bool => str_contains($cert, 'nfhs') || str_contains($cert, 'high school') || str_contains($cert, 'varsity'))) {
            return true;
        }
    }
    return false;
}

function admin_game_expiration_issue(array $official, string $field, string $label): ?array
{
    if (!array_key_exists($field, $official) || trim((string) ($official[$field] ?? '')) === '') {
        return admin_game_issue($field . '_missing', 'warning', "{$label} not on file", admin_game_official_label($official) . " does not have {$label} date recorded.");
    }
    $timestamp = strtotime((string) $official[$field]);
    if (!$timestamp || $timestamp < strtotime('today')) {
        return admin_game_issue($field . '_expired', 'critical', "{$label} expired", admin_game_official_label($official) . " has an expired {$label} record.");
    }
    return null;
}

function admin_game_official_schedule_stats(int $officialId, array $game, array $allGames): array
{
    $date = admin_game_date_key($game);
    $week = admin_game_week_key($game);
    $schoolKey = admin_game_school_key($game);
    $daily = 0;
    $weekly = 0;
    $schoolCount = 0;
    $total = 0;
    foreach ($allGames as $candidate) {
        if ((string) ($candidate['id'] ?? '') === (string) ($game['id'] ?? '')) {
            continue;
        }
        if (in_array(strtolower((string) ($candidate['status'] ?? '')), ['deleted', 'cancelled', 'canceled', 'postponed'], true)) {
            continue;
        }
        $assigned = false;
        foreach ((array) ($candidate['assignments'] ?? []) as $assignment) {
            if ((int) ($assignment['official_id'] ?? 0) === $officialId && strtolower((string) ($assignment['status'] ?? '')) !== 'declined') {
                $assigned = true;
                break;
            }
        }
        if (!$assigned) {
            continue;
        }
        $total++;
        if (admin_game_date_key($candidate) === $date) {
            $daily++;
        }
        if (admin_game_week_key($candidate) === $week) {
            $weekly++;
        }
        if ($schoolKey !== '' && admin_game_school_key($candidate) === $schoolKey) {
            $schoolCount++;
        }
    }
    return ['daily' => $daily, 'weekly' => $weekly, 'school' => $schoolCount, 'total' => $total];
}

function admin_game_normalize(array $record): array
{
    $status = strtolower(trim((string) ($record['status'] ?? 'scheduled'))) ?: 'scheduled';
    if (!in_array($status, ['scheduled', 'published', 'cancelled', 'canceled', 'postponed', 'rescheduled', 'deleted'], true)) {
        $status = 'scheduled';
    }
    $officialsRequired = max(2, min(4, (int) ($record['officials_required'] ?? $record['officialsRequired'] ?? 3)));
    $requiredPositionIds = admin_game_required_position_ids_from_record([
        ...$record,
        'officials_required' => $officialsRequired,
    ]);
    if (count($requiredPositionIds) > $officialsRequired) {
        $officialsRequired = count($requiredPositionIds);
    }

    return [
        'id' => (int) ($record['id'] ?? 0),
        'game_date' => (string) ($record['game_date'] ?? $record['gameDate'] ?? ''),
        'game_time' => substr((string) ($record['game_time'] ?? $record['gameTime'] ?? ''), 0, 5),
        'level' => trim((string) ($record['level'] ?? '')),
        'school_event_center_id' => (int) ($record['school_event_center_id'] ?? $record['schoolEventCenterId'] ?? 0),
        'home_team_id' => (int) ($record['home_team_id'] ?? $record['homeTeamId'] ?? 0),
        'away_team_id' => (int) ($record['away_team_id'] ?? $record['awayTeamId'] ?? $record['visitingTeamId'] ?? 0),
        'home_team' => trim((string) ($record['home_team'] ?? $record['homeTeam'] ?? '')),
        'away_team' => trim((string) ($record['away_team'] ?? $record['awayTeam'] ?? $record['visitingTeam'] ?? '')),
        'location_name' => trim((string) ($record['location_name'] ?? $record['locationName'] ?? '')),
        'location_address' => trim((string) ($record['location_address'] ?? $record['locationAddress'] ?? '')),
        'location_lat' => isset($record['location_lat']) && $record['location_lat'] !== null ? (float) $record['location_lat'] : null,
        'location_lng' => isset($record['location_lng']) && $record['location_lng'] !== null ? (float) $record['location_lng'] : null,
        'court_number' => max(1, (int) ($record['court_number'] ?? $record['courtNumber'] ?? 1)),
        'court_label' => trim((string) ($record['court_label'] ?? $record['courtLabel'] ?? '')),
        'games_per_night' => max(1, (int) ($record['games_per_night'] ?? $record['gamesPerNight'] ?? 1)),
        'officials_required' => $officialsRequired,
        'required_position_ids' => $requiredPositionIds,
        'fee_per_official' => isset($record['fee_per_official']) ? (float) $record['fee_per_official'] : (float) ($record['feePerOfficial'] ?? 0),
        'status' => $status,
        'published' => (bool) ($record['published'] ?? false),
        'tba_visible' => (bool) ($record['tba_visible'] ?? $record['tbaVisible'] ?? false),
        'tba_sent_at' => (string) ($record['tba_sent_at'] ?? $record['tbaSentAt'] ?? ''),
        'cancellation_reason' => trim((string) ($record['cancellation_reason'] ?? $record['cancellationReason'] ?? '')),
        'notes' => trim((string) ($record['notes'] ?? '')),
        'schedule_changed_at' => (string) ($record['schedule_changed_at'] ?? $record['scheduleChangedAt'] ?? ''),
        'created_at' => (string) ($record['created_at'] ?? ''),
        'assignments' => array_values(is_array($record['assignments'] ?? null) ? $record['assignments'] : []),
    ];
}

function admin_game_assignment_normalize(array $record, array $officialsById = [], array $positionsById = []): array
{
    $officialId = (int) ($record['official_id'] ?? 0);
    $positionId = (int) ($record['position_id'] ?? 0);
    $official = $officialsById[$officialId] ?? [];
    $position = $positionsById[$positionId] ?? [];
    $positionName = trim((string) ($record['position_name'] ?? $position['name'] ?? ''));

    if (!$official && $officialId > 0) {
        $name = trim((string) ($record['first_name'] ?? '') . ' ' . (string) ($record['last_name'] ?? ''));
        $official = [
            'id' => $officialId,
            'name' => $name ?: (string) ($record['email'] ?? 'Official'),
            'first_name' => (string) ($record['first_name'] ?? ''),
            'last_name' => (string) ($record['last_name'] ?? ''),
            'email' => (string) ($record['email'] ?? ''),
            'phone' => rtbo_format_phone_number((string) ($record['phone'] ?? '')),
            'sex' => (string) ($record['sex'] ?? ''),
            'photo' => (string) ($record['profile_photo'] ?? $record['photo'] ?? ''),
        ];
    }

    return [
        'id' => (int) ($record['id'] ?? $record['assignment_id'] ?? 0),
        'assignment_id' => (int) ($record['id'] ?? $record['assignment_id'] ?? 0),
        'game_id' => (int) ($record['game_id'] ?? 0),
        'official_id' => $officialId,
        'position_id' => $positionId,
        'position_name' => $positionName,
        'position' => $positionName,
        'crew_designation' => strtolower(trim((string) ($record['crew_designation'] ?? 'official'))) ?: 'official',
        'assignor_notes' => (string) ($record['assignor_notes'] ?? ''),
        'status' => strtolower(trim((string) ($record['status'] ?? 'pending'))) ?: 'pending',
        'decline_reason' => (string) ($record['decline_reason'] ?? ''),
        'responded_at' => (string) ($record['responded_at'] ?? ''),
        'official' => $official,
    ];
}

function admin_game_crew_messages_for_game_ids(array $gameIds): array
{
    $gameIds = array_values(array_unique(array_filter(array_map('intval', $gameIds))));
    if (!$gameIds || !admin_games_db_available()) {
        return [];
    }

    $placeholders = implode(',', array_fill(0, count($gameIds), '?'));
    $stmt = db()->prepare(
        "SELECT id, game_id, sender_user_id, sender_name, message, created_at
         FROM crew_messages
         WHERE game_id IN ({$placeholders})
         ORDER BY created_at ASC, id ASC"
    );
    $stmt->execute($gameIds);

    $grouped = [];
    foreach ($stmt->fetchAll() as $row) {
        $gameId = (int) ($row['game_id'] ?? 0);
        $grouped[$gameId][] = [
            'id' => (int) ($row['id'] ?? 0),
            'game_id' => $gameId,
            'sender_user_id' => (int) ($row['sender_user_id'] ?? 0),
            'sender_name' => (string) ($row['sender_name'] ?? ''),
            'message' => (string) ($row['message'] ?? ''),
            'created_at' => (string) ($row['created_at'] ?? ''),
        ];
    }

    return $grouped;
}

function admin_game_assignments_for_game_ids(array $gameIds): array
{
    $gameIds = array_values(array_unique(array_filter(array_map('intval', $gameIds))));
    if (!$gameIds || !admin_games_db_available()) {
        return [];
    }

    $officialsById = admin_game_official_map(false);
    $positionsById = admin_game_position_map();
    $placeholders = implode(',', array_fill(0, count($gameIds), '?'));
    $stmt = db()->prepare(
        "SELECT a.*, p.name AS position_name
         FROM assignments a
         LEFT JOIN positions p ON p.id = a.position_id
         WHERE a.game_id IN ({$placeholders})
         ORDER BY a.game_id ASC, COALESCE(p.sort_order, a.position_id) ASC, a.id ASC"
    );
    $stmt->execute($gameIds);

    $grouped = [];
    foreach ($stmt->fetchAll() as $row) {
        $gameId = (int) ($row['game_id'] ?? 0);
        $grouped[$gameId][] = admin_game_assignment_normalize($row, $officialsById, $positionsById);
    }
    return $grouped;
}

function admin_game_attach_assignments(array $games): array
{
    $assignmentMap = admin_game_assignments_for_game_ids(array_column($games, 'id'));
    $messageMap = admin_game_crew_messages_for_game_ids(array_column($games, 'id'));
    foreach ($games as &$game) {
        $game['assignments'] = $assignmentMap[(int) ($game['id'] ?? 0)] ?? ($game['assignments'] ?? []);
        $game['crew_messages'] = $messageMap[(int) ($game['id'] ?? 0)] ?? ($game['crew_messages'] ?? []);
    }
    unset($game);
    return $games;
}

function admin_game_require_valid(array $record): array
{
    $game = admin_game_normalize($record);

    if ($game['game_date'] === '') {
        throw new RuntimeException('Game date is required.');
    }
    if ($game['game_time'] === '') {
        throw new RuntimeException('Game time is required.');
    }
    if ($game['level'] === '') {
        throw new RuntimeException('Game type or level is required.');
    }
    if ($game['home_team_id'] <= 0 || $game['away_team_id'] <= 0) {
        throw new RuntimeException('Home team and visiting team are required.');
    }
    if ($game['home_team_id'] === $game['away_team_id']) {
        throw new RuntimeException('Home team and visiting team must be different teams.');
    }
    if ($game['school_event_center_id'] <= 0) {
        throw new RuntimeException('School or event center is required.');
    }
    $requiredDefaultPositionIds = admin_game_default_required_position_ids($game['officials_required']);
    $missingCoreIds = array_diff($requiredDefaultPositionIds, $game['required_position_ids']);
    if ($missingCoreIds || count($game['required_position_ids']) < $game['officials_required']) {
        $positionMap = admin_game_position_map();
        $positionNames = array_map(
            static fn (int $positionId): string => (string) (($positionMap[$positionId]['name'] ?? 'Position ' . $positionId)),
            $requiredDefaultPositionIds
        );
        throw new RuntimeException('Required positions are missing: ' . implode(', ', array_filter($positionNames)) . '.');
    }

    $venues = admin_game_venue_records();
    $teams = admin_game_records_by_type('team');
    $venue = admin_game_find_record($venues, $game['school_event_center_id']);
    $home = admin_game_find_record($teams, $game['home_team_id']);
    $away = admin_game_find_record($teams, $game['away_team_id']);

    if (!$venue) {
        throw new RuntimeException('Selected school/event center could not be found.');
    }
    if (!$home || !$away) {
        throw new RuntimeException('Selected home or visiting team could not be found.');
    }

    $courtOptions = array_values(array_filter((array) ($venue['court_options'] ?? [])));
    if (!$courtOptions) {
        $venueCourts = max(1, (int) ($venue['courts'] ?? 1));
        $courtOptions = array_map(static fn (int $number): string => 'Court ' . $number, range(1, $venueCourts));
    }
    $selectedCourt = $game['court_label'];
    if ($selectedCourt === '' && $game['court_number'] > 0) {
        $selectedCourt = $courtOptions[$game['court_number'] - 1] ?? '';
    }
    if ($selectedCourt === '') {
        $selectedCourt = $courtOptions[0] ?? 'Main';
    }
    if (!in_array($selectedCourt, $courtOptions, true)) {
        throw new RuntimeException('Please select a valid court for the selected school or event center.');
    }

    $game['court_label'] = $selectedCourt;
    $game['court_number'] = max(1, array_search($selectedCourt, $courtOptions, true) + 1);
    $game['home_team'] = (string) ($home['name'] ?? '');
    $game['away_team'] = (string) ($away['name'] ?? '');
    $game['location_name'] = (string) (($venue['gym_name'] ?? '') ?: ($venue['name'] ?? ''));
    $game['location_address'] = admin_game_location_address($venue);
    $game['published'] = (bool) $game['published'];
    $game['status'] = $game['published'] ? 'published' : 'scheduled';
    $game['officials_required'] = count($game['required_position_ids']);

    return $game;
}

function admin_games_list(): array
{
    if (!admin_games_db_available()) {
        return array_map('admin_game_normalize', array_filter(
            admin_games_read_file(),
            static fn (array $record): bool => ($record['status'] ?? '') !== 'deleted'
        ));
    }

    $stmt = db()->query(
        "SELECT *
         FROM games
         WHERE status IS NULL OR status <> 'deleted'
         ORDER BY game_date DESC, game_time DESC, id DESC"
    );

    return admin_game_attach_assignments(array_map('admin_game_normalize', $stmt->fetchAll()));
}

function admin_game_conflict_review(array $game, ?array $allGames = null, ?array $officialsById = null, ?array $rulesByOfficial = null): array
{
    $allGames ??= admin_games_list();
    $officialsById ??= admin_game_official_map(false);
    $rulesByOfficial ??= admin_game_official_rules_map(array_keys($officialsById));
    $positions = admin_game_position_map();
    $issues = [];
    $assignments = array_values(array_filter((array) ($game['assignments'] ?? []), static fn (array $assignment): bool => (int) ($assignment['official_id'] ?? 0) > 0 && strtolower((string) ($assignment['status'] ?? '')) !== 'declined'));
    $requiredPositionIds = array_values(array_filter(array_map('intval', $game['required_position_ids'] ?? [])));

    foreach ($requiredPositionIds as $positionId) {
        $hasAssignment = array_filter($assignments, static fn (array $assignment): bool => (int) ($assignment['position_id'] ?? 0) === $positionId);
        if (!$hasAssignment) {
            $issues[] = admin_game_issue('missing_required_position', 'critical', 'Missing required position', 'Assign ' . (string) ($positions[$positionId]['name'] ?? 'required position') . ' before publishing.', ['position_id' => $positionId]);
        }
    }

    if (!array_filter($assignments, static fn (array $assignment): bool => strtolower((string) ($assignment['crew_designation'] ?? '')) === 'crew_chief')) {
        $issues[] = admin_game_issue('missing_crew_chief', 'critical', 'Missing crew chief', 'Designate one assigned official as crew chief before publishing.');
    }

    if ((float) ($game['fee_per_official'] ?? 0) <= 0) {
        $issues[] = admin_game_issue('payment_rate_missing', 'critical', 'Payment rate missing', 'Enter the fee per official before publishing this assignment.');
    }

    $assignedIds = [];
    foreach ($assignments as $assignment) {
        $officialId = (int) ($assignment['official_id'] ?? 0);
        $official = $officialsById[$officialId] ?? ($assignment['official'] ?? []);
        $officialName = admin_game_official_label($official);
        if (in_array($officialId, $assignedIds, true)) {
            $issues[] = admin_game_issue('crew_member_conflict', 'critical', 'Crew member duplicated', "{$officialName} is assigned to more than one position on this game.", ['official_id' => $officialId]);
        }
        $assignedIds[] = $officialId;

        $availabilityRecord = null;
        foreach ((array) ($official['availability'] ?? []) as $record) {
            if ((string) ($record['date'] ?? '') === admin_game_date_key($game)) {
                $availabilityRecord = $record;
                break;
            }
        }
        if ($availabilityRecord && in_array(strtolower((string) ($availabilityRecord['status'] ?? '')), ['unavailable', 'blocked', 'closed'], true)) {
            $issues[] = admin_game_issue('official_blocked_out', 'critical', 'Official blocked out', "{$officialName} is marked unavailable for this date.", ['official_id' => $officialId]);
        }

        foreach ((array) ($rulesByOfficial[$officialId] ?? []) as $rule) {
            if (!admin_game_rule_applies_to_game_day($rule, $game)) {
                continue;
            }
            $type = (string) ($rule['rule_type'] ?? '');
            $schoolName = strtolower(trim((string) ($rule['school_name'] ?? '')));
            $level = strtolower(trim((string) ($rule['game_level'] ?? '')));
            if ($type === 'weekly_unavailable') {
                $issues[] = admin_game_issue('official_blocked_rule', 'critical', 'Standing availability conflict', "{$officialName} has a standing unavailable rule for this game day.", ['official_id' => $officialId, 'rule_id' => $rule['id'] ?? null]);
            }
            if (in_array($type, ['school_block', 'school_conflict_block'], true) && $schoolName !== '') {
                $gameSchool = strtolower(trim(($game['location_name'] ?? '') . ' ' . ($game['home_team'] ?? '') . ' ' . ($game['away_team'] ?? '')));
                if (str_contains($gameSchool, $schoolName)) {
                    $issues[] = admin_game_issue('school_conflict', 'critical', 'School conflict', "{$officialName} has a school conflict rule for {$rule['school_name']}.", ['official_id' => $officialId, 'rule_id' => $rule['id'] ?? null]);
                }
            }
            if ($type === 'game_level' && $level !== '' && !str_contains(strtolower((string) ($game['level'] ?? '')), $level)) {
                $issues[] = admin_game_issue('game_level_rule', 'warning', 'Game level preference mismatch', "{$officialName} has a saved game-level rule that does not match this game.", ['official_id' => $officialId]);
            }
            if ($type === 'do_not_pair') {
                $blockedPartnerId = (int) ($rule['partner_member_id'] ?? 0);
                $blockedPartnerName = strtolower(trim((string) ($rule['partner_name'] ?? '')));
                foreach ($assignments as $crewAssignment) {
                    $crewOfficialId = (int) ($crewAssignment['official_id'] ?? 0);
                    $crewOfficial = $officialsById[$crewOfficialId] ?? ($crewAssignment['official'] ?? []);
                    $crewOfficialName = admin_game_official_label($crewOfficial);
                    if (
                        ($blockedPartnerId > 0 && $crewOfficialId === $blockedPartnerId)
                        || ($blockedPartnerName !== '' && strtolower($crewOfficialName) === $blockedPartnerName)
                    ) {
                        $issues[] = admin_game_issue('crew_member_conflict', 'critical', 'Do-not-pair conflict', "{$officialName} has a do-not-pair rule with {$crewOfficialName}.", ['official_id' => $officialId]);
                    }
                }
            }
        }

        if (!admin_game_official_has_required_certification($official, $game)) {
            $issues[] = admin_game_issue('missing_required_certification', 'critical', 'Missing required certification level', "{$officialName} does not have a recorded certification/classification matching {$game['level']}.", ['official_id' => $officialId]);
        }
        foreach ([
            ['background_check_expires_at', 'Background check'],
            ['safesport_expires_at', 'SafeSport'],
        ] as [$field, $label]) {
            $issue = admin_game_expiration_issue($official, $field, $label);
            if ($issue) {
                $issue['official_id'] = $officialId;
                $issues[] = $issue;
            }
        }

        $stats = admin_game_official_schedule_stats($officialId, $game, $allGames);
        foreach ((array) ($rulesByOfficial[$officialId] ?? []) as $rule) {
            if (($rule['rule_type'] ?? '') !== 'max_games' || !admin_game_rule_applies_to_game_day($rule, $game)) {
                continue;
            }
            $maxDay = (int) ($rule['max_games_per_day'] ?? 0);
            $maxWeek = (int) ($rule['max_games_per_week'] ?? 0);
            if ($maxDay > 0 && $stats['daily'] + 1 > $maxDay) {
                $issues[] = admin_game_issue('too_many_games_day', 'critical', 'Maximum games per day exceeded', "{$officialName} set a {$maxDay}-game daily limit.", ['official_id' => $officialId]);
            }
            if ($maxWeek > 0 && $stats['weekly'] + 1 > $maxWeek) {
                $issues[] = admin_game_issue('too_many_games_week', 'critical', 'Maximum games per week exceeded', "{$officialName} set a {$maxWeek}-game weekly limit.", ['official_id' => $officialId]);
            }
        }
        if ($stats['daily'] >= 3) {
            $issues[] = admin_game_issue('too_many_games_day', 'critical', 'Too many games in one day', "{$officialName} already has {$stats['daily']} other game assignments on this date.", ['official_id' => $officialId]);
        }
        if ($stats['school'] >= 3) {
            $issues[] = admin_game_issue('school_overuse', 'warning', 'School overuse risk', "{$officialName} has already worked this school/site {$stats['school']} time(s).", ['official_id' => $officialId]);
        }

        if (strtolower((string) ($assignment['status'] ?? '')) === 'accepted' && !empty($game['schedule_changed_at']) && !empty($assignment['responded_at']) && strtotime((string) $game['schedule_changed_at']) > strtotime((string) $assignment['responded_at'])) {
            $issues[] = admin_game_issue('accepted_schedule_changed', 'critical', 'Accepted assignment changed later', "{$officialName} accepted this assignment before the schedule was changed. Reconfirm before publishing.", ['official_id' => $officialId]);
        }

        foreach ($allGames as $candidate) {
            if ((string) ($candidate['id'] ?? '') === (string) ($game['id'] ?? '') || admin_game_date_key($candidate) !== admin_game_date_key($game)) {
                continue;
            }
            $candidateAssignment = array_filter((array) ($candidate['assignments'] ?? []), static fn (array $item): bool => (int) ($item['official_id'] ?? 0) === $officialId && strtolower((string) ($item['status'] ?? '')) !== 'declined');
            if (!$candidateAssignment) {
                continue;
            }
            $targetTime = admin_game_time_minutes($game);
            $candidateTime = admin_game_time_minutes($candidate);
            if ($targetTime === null || $candidateTime === null) {
                continue;
            }
            $gap = abs($targetTime - $candidateTime);
            if ($gap === 0) {
                $issues[] = admin_game_issue('same_time_assignment', 'critical', 'Already assigned at same time', "{$officialName} is already assigned to {$candidate['away_team']} at {$candidate['home_team']} at the same time.", ['official_id' => $officialId, 'conflict_game_id' => $candidate['id'] ?? null]);
                continue;
            }
            $distance = admin_game_distance_miles_between($game, $candidate);
            if ($distance !== null) {
                $travelMinutes = (int) ceil(($distance / 45) * 60) + 30;
                if ($gap < $travelMinutes) {
                    $issues[] = admin_game_issue('travel_time_conflict', 'critical', 'Travel time conflict', "{$officialName} has {$gap} minutes between sites about {$distance} miles apart.", ['official_id' => $officialId, 'conflict_game_id' => $candidate['id'] ?? null, 'distance_miles' => $distance]);
                }
            }
        }
    }

    $critical = count(array_filter($issues, static fn (array $issue): bool => $issue['severity'] === 'critical'));
    $warnings = count(array_filter($issues, static fn (array $issue): bool => $issue['severity'] === 'warning'));
    return [
        'status' => $critical > 0 ? 'blocked' : ($warnings > 0 ? 'needs_review' : 'clear'),
        'critical_count' => $critical,
        'warning_count' => $warnings,
        'issues' => $issues,
    ];
}

function admin_game_auto_assign_recommendations(array $game, ?array $allGames = null, ?array $officials = null, ?array $rulesByOfficial = null): array
{
    $allGames ??= admin_games_list();
    $officials ??= admin_game_officials_list(true);
    $rulesByOfficial ??= admin_game_official_rules_map(array_column($officials, 'id'));
    $recommendations = [];
    $assignedIds = array_map(static fn (array $assignment): int => (int) ($assignment['official_id'] ?? 0), (array) ($game['assignments'] ?? []));
    $requiredPositions = admin_game_missing_required_positions($game);
    if (!$requiredPositions) {
        $requiredPositions = array_values(array_filter(admin_game_position_map(), static fn (array $position): bool => in_array((int) ($position['id'] ?? 0), array_map('intval', $game['required_position_ids'] ?? []), true)));
    }

    foreach ($requiredPositions as $position) {
        $candidates = [];
        foreach ($officials as $official) {
            $officialId = (int) ($official['id'] ?? 0);
            if ($officialId <= 0 || in_array($officialId, $assignedIds, true)) {
                continue;
            }
            $score = 100;
            $reasons = [];
            $stats = admin_game_official_schedule_stats($officialId, $game, $allGames);
            $conflictReview = admin_game_conflict_review([...$game, 'assignments' => [[
                'official_id' => $officialId,
                'position_id' => $position['id'] ?? 0,
                'crew_designation' => 'official',
                'status' => 'pending',
                'official' => $official,
            ]]], $allGames, [$officialId => $official], $rulesByOfficial);
            $blockingCandidateIssues = array_filter(
                (array) ($conflictReview['issues'] ?? []),
                static fn (array $issue): bool => ($issue['severity'] ?? '') === 'critical'
                    && !in_array((string) ($issue['code'] ?? ''), ['missing_required_position', 'missing_crew_chief', 'payment_rate_missing'], true)
            );
            if ($blockingCandidateIssues) {
                continue;
            }
            foreach ((array) ($official['availability'] ?? []) as $availability) {
                if ((string) ($availability['date'] ?? '') === admin_game_date_key($game)) {
                    if (strtolower((string) ($availability['status'] ?? '')) === 'available') {
                        $score += 18;
                        $reasons[] = 'Available on game date';
                    }
                    if (!empty($availability['contact_required'])) {
                        $score -= 6;
                        $reasons[] = 'Contact before assignment';
                    }
                }
            }
            if (admin_game_official_has_required_certification($official, $game)) {
                $score += 15;
                $reasons[] = 'Certification/level match';
            }
            if ((int) ($official['official_rank'] ?? 0) > 0) {
                $score += max(0, 12 - (int) $official['official_rank']);
                $reasons[] = 'Official rank on file';
            }
            if (isset($official['evaluation_score']) && $official['evaluation_score'] !== null) {
                $score += min(15, max(0, (float) $official['evaluation_score']));
                $reasons[] = 'Evaluation score included';
            }
            $score -= min(20, $stats['daily'] * 8);
            $score -= min(18, $stats['school'] * 6);
            $score -= min(15, $stats['total']);
            if ($stats['daily'] === 0) {
                $reasons[] = 'No same-day assignment load';
            }
            if ($stats['school'] === 0) {
                $reasons[] = 'Avoids school overuse';
            }
            foreach ((array) ($rulesByOfficial[$officialId] ?? []) as $rule) {
                if (!admin_game_rule_applies_to_game_day($rule, $game)) {
                    continue;
                }
                if (($rule['rule_type'] ?? '') === 'preferred_partner') {
                    $score += 4;
                    $reasons[] = 'Preferred partner rule available';
                }
                if (($rule['rule_type'] ?? '') === 'travel_limit' && (int) ($rule['max_miles'] ?? 0) > 0) {
                    $reasons[] = 'Travel limit checked';
                }
            }
            $candidates[] = [
                'official_id' => $officialId,
                'official' => $official,
                'score' => max(0, round($score, 1)),
                'reasons' => array_values(array_unique(array_slice($reasons, 0, 5))),
                'daily_assignments' => $stats['daily'],
                'total_assignments' => $stats['total'],
            ];
        }
        usort($candidates, static fn (array $a, array $b): int => $b['score'] <=> $a['score']);
        $recommendations[] = [
            'position_id' => (int) ($position['id'] ?? 0),
            'position_name' => (string) ($position['name'] ?? 'Position'),
            'candidates' => array_slice($candidates, 0, 5),
        ];
    }

    return $recommendations;
}

function admin_game_attach_conflicts_and_recommendations(array $games): array
{
    $officials = admin_game_officials_list(true);
    $officialsById = [];
    foreach ($officials as $official) {
        $officialsById[(int) ($official['id'] ?? 0)] = $official;
    }
    $rulesByOfficial = admin_game_official_rules_map(array_column($officials, 'id'));
    foreach ($games as &$game) {
        $game['conflict_review'] = admin_game_conflict_review($game, $games, $officialsById, $rulesByOfficial);
        $game['auto_assign_recommendations'] = admin_game_auto_assign_recommendations($game, $games, $officials, $rulesByOfficial);
    }
    unset($game);
    return $games;
}

function admin_game_create(array $record): array
{
    $game = admin_game_require_valid($record);

    if (!admin_games_db_available()) {
        $records = admin_games_read_file();
        $game['id'] = (int) (max(array_map(static fn ($row) => (int) ($row['id'] ?? 0), $records ?: [['id' => 0]])) + 1);
        $game['created_at'] = date('c');
        $records[] = $game;
        admin_games_write_file($records);
        return $game;
    }

    $stmt = db()->prepare(
        "INSERT INTO games(
            game_date, game_time, level, home_team, away_team, location_name, location_address,
            location_lat, location_lng, fee_per_official, status, published, tba_visible, tba_sent_at, cancellation_reason,
            school_event_center_id, home_team_id, away_team_id, court_number, court_label,
            games_per_night, officials_required, required_position_ids, notes
        ) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    );
    $stmt->execute([
        $game['game_date'],
        $game['game_time'],
        $game['level'],
        $game['home_team'],
        $game['away_team'],
        $game['location_name'],
        $game['location_address'],
        $game['location_lat'],
        $game['location_lng'],
        $game['fee_per_official'] > 0 ? $game['fee_per_official'] : null,
        $game['status'],
        $game['published'] ? 1 : 0,
        $game['tba_visible'] ? 1 : 0,
        $game['tba_sent_at'] ?: null,
        $game['cancellation_reason'],
        $game['school_event_center_id'],
        $game['home_team_id'],
        $game['away_team_id'],
        $game['court_number'],
        $game['court_label'],
        $game['games_per_night'],
        $game['officials_required'],
        json_encode($game['required_position_ids'], JSON_UNESCAPED_SLASHES),
        $game['notes'],
    ]);

    $fresh = db()->prepare('SELECT * FROM games WHERE id = ? LIMIT 1');
    $fresh->execute([(int) db()->lastInsertId()]);
    return admin_game_attach_assignments([admin_game_normalize($fresh->fetch() ?: [])])[0];
}

function admin_game_update(int $id, array $record): array
{
    if ($id <= 0) {
        throw new RuntimeException('A valid game id is required.');
    }

    $before = null;
    try {
        $before = admin_game_fetch($id);
    } catch (Throwable $error) {
        $before = null;
    }

    $game = admin_game_require_valid(['id' => $id, ...$record]);
    $acceptedAssignmentsExist = false;
    $scheduleChangedAfterAcceptance = false;
    if ($before) {
        foreach ((array) ($before['assignments'] ?? []) as $assignment) {
            if (strtolower((string) ($assignment['status'] ?? '')) === 'accepted') {
                $acceptedAssignmentsExist = true;
                break;
            }
        }
        foreach (['game_date', 'game_time', 'location_name', 'location_address', 'court_label', 'home_team', 'away_team'] as $field) {
            if ((string) ($before[$field] ?? '') !== (string) ($game[$field] ?? '')) {
                $scheduleChangedAfterAcceptance = true;
                break;
            }
        }
    }

    if (!admin_games_db_available()) {
        $records = admin_games_read_file();
        foreach ($records as $index => $existing) {
            if ((int) ($existing['id'] ?? 0) === $id) {
                $records[$index] = [...$existing, ...$game, 'id' => $id];
                admin_games_write_file($records);
                $updated = admin_game_normalize($records[$index]);
                if ($before) {
                    admin_game_notify_update_changes($before, $updated, $record);
                }
                return $updated;
            }
        }
        throw new RuntimeException('Game assignment not found.');
    }

    $scheduleChangedAtSql = $acceptedAssignmentsExist && $scheduleChangedAfterAcceptance ? 'NOW()' : 'schedule_changed_at';
    $stmt = db()->prepare(
        "UPDATE games
         SET game_date = ?, game_time = ?, level = ?, home_team = ?, away_team = ?, location_name = ?,
             location_address = ?, location_lat = ?, location_lng = ?, fee_per_official = ?, status = ?,
             published = ?, tba_visible = ?, tba_sent_at = ?, cancellation_reason = ?, school_event_center_id = ?, home_team_id = ?,
             away_team_id = ?, court_number = ?, court_label = ?, games_per_night = ?,
             officials_required = ?, required_position_ids = ?, notes = ?, schedule_changed_at = {$scheduleChangedAtSql}
         WHERE id = ?"
    );
    $stmt->execute([
        $game['game_date'],
        $game['game_time'],
        $game['level'],
        $game['home_team'],
        $game['away_team'],
        $game['location_name'],
        $game['location_address'],
        $game['location_lat'],
        $game['location_lng'],
        $game['fee_per_official'] > 0 ? $game['fee_per_official'] : null,
        $game['status'],
        $game['published'] ? 1 : 0,
        $game['tba_visible'] ? 1 : 0,
        $game['tba_sent_at'] ?: null,
        $game['cancellation_reason'],
        $game['school_event_center_id'],
        $game['home_team_id'],
        $game['away_team_id'],
        $game['court_number'],
        $game['court_label'],
        $game['games_per_night'],
        $game['officials_required'],
        json_encode($game['required_position_ids'], JSON_UNESCAPED_SLASHES),
        $game['notes'],
        $id,
    ]);

    $fresh = db()->prepare('SELECT * FROM games WHERE id = ? LIMIT 1');
    $fresh->execute([$id]);
    $freshRecord = $fresh->fetch();
    if (!$freshRecord) {
        throw new RuntimeException('Game assignment not found.');
    }
    $updated = admin_game_attach_assignments([admin_game_normalize($freshRecord)])[0];
    if ($before) {
        admin_game_notify_update_changes($before, $updated, $record);
    }
    return $updated;
}

function admin_game_set_published(int $id, bool $published): array
{
    if ($id <= 0) {
        throw new RuntimeException('A valid game id is required.');
    }

    if ($published) {
        $game = admin_game_fetch($id);
        $missingPositions = admin_game_missing_required_positions($game);
        if ($missingPositions) {
            throw new RuntimeException('Assign all required crew positions before publishing: ' . implode(', ', array_column($missingPositions, 'name')) . '.');
        }
        $review = admin_game_conflict_review($game);
        if ((int) ($review['critical_count'] ?? 0) > 0) {
            $firstIssue = $review['issues'][0]['title'] ?? 'Assignment conflict';
            throw new RuntimeException("Resolve the Master Schedule Conflict Review before publishing. First issue: {$firstIssue}.");
        }
    }

    if (!admin_games_db_available()) {
        $records = admin_games_read_file();
        foreach ($records as $index => $existing) {
            if ((int) ($existing['id'] ?? 0) === $id) {
                $records[$index]['published'] = $published;
                $records[$index]['status'] = $published ? 'published' : 'scheduled';
                if ($published) {
                    $records[$index]['tba_visible'] = false;
                }
                admin_games_write_file($records);
                $updated = admin_game_normalize($records[$index]);
                if ($published) {
                    admin_game_send_publish_notifications($updated);
                } else {
                    admin_game_send_unpublish_notifications($updated);
                }
                return $updated;
            }
        }
        throw new RuntimeException('Game assignment not found.');
    }

    $stmt = db()->prepare('UPDATE games SET published = ?, status = ?, tba_visible = CASE WHEN ? = 1 THEN 0 ELSE tba_visible END WHERE id = ?');
    $stmt->execute([$published ? 1 : 0, $published ? 'published' : 'scheduled', $published ? 1 : 0, $id]);

    $fresh = db()->prepare('SELECT * FROM games WHERE id = ? LIMIT 1');
    $fresh->execute([$id]);
    $freshRecord = $fresh->fetch();
    if (!$freshRecord) {
        throw new RuntimeException('Game assignment not found.');
    }
    $updated = admin_game_attach_assignments([admin_game_normalize($freshRecord)])[0];
    if ($published) {
        admin_game_send_publish_notifications($updated);
    } else {
        admin_game_send_unpublish_notifications($updated);
    }
    return $updated;
}

function admin_game_set_status_with_reason(int $id, string $status, string $reason): array
{
    if ($id <= 0) {
        throw new RuntimeException('A valid game id is required.');
    }

    $status = strtolower(trim($status));
    if (!in_array($status, ['cancelled', 'canceled', 'postponed', 'rescheduled', 'deleted'], true)) {
        throw new RuntimeException('A valid game status is required.');
    }
    $reason = admin_game_validate_status_reason($reason);
    $before = admin_game_fetch($id);

    if (!admin_games_db_available()) {
        $records = admin_games_read_file();
        foreach ($records as $index => $record) {
            if ((int) ($record['id'] ?? 0) !== $id) {
                continue;
            }
            $records[$index]['status'] = $status;
            $records[$index]['published'] = false;
            $records[$index]['tba_visible'] = false;
            $records[$index]['cancellation_reason'] = $reason;
            admin_games_write_file($records);
            $updated = admin_game_normalize($records[$index]);
            admin_game_notify_assigned_safe(
                $before,
                $status === 'deleted' ? 'assigned_game_deleted' : 'assigned_game_cancelled',
                $status === 'deleted' ? 'Assigned game deleted' : 'Assigned game status changed',
                rtbo_notification_game_summary($before) . ' was ' . format_game_status_for_notification($status) . '. Reason: ' . $reason,
                ['event' => $status, 'reason' => $reason]
            );
            return $updated;
        }
        throw new RuntimeException('Game assignment not found.');
    }

    $stmt = db()->prepare(
        'UPDATE games
         SET status = ?, published = 0, tba_visible = 0, cancellation_reason = ?
         WHERE id = ?'
    );
    $stmt->execute([$status, $reason, $id]);

    $fresh = db()->prepare('SELECT * FROM games WHERE id = ? LIMIT 1');
    $fresh->execute([$id]);
    $freshRecord = $fresh->fetch();
    if (!$freshRecord) {
        throw new RuntimeException('Game assignment not found.');
    }
    $updated = admin_game_attach_assignments([admin_game_normalize($freshRecord)])[0];
    admin_game_notify_assigned_safe(
        $before,
        $status === 'deleted' ? 'assigned_game_deleted' : 'assigned_game_cancelled',
        $status === 'deleted' ? 'Assigned game deleted' : 'Assigned game status changed',
        rtbo_notification_game_summary($before) . ' was ' . format_game_status_for_notification($status) . '. Reason: ' . $reason,
        ['event' => $status, 'reason' => $reason]
    );
    return $updated;
}

function format_game_status_for_notification(string $status): string
{
    return match (strtolower($status)) {
        'cancelled', 'canceled' => 'cancelled',
        'postponed' => 'postponed',
        'rescheduled' => 'marked for rescheduling',
        'deleted' => 'deleted',
        default => 'updated',
    };
}

function admin_game_missing_required_positions(array $game): array
{
    $positions = admin_game_position_map();
    $assignments = is_array($game['assignments'] ?? null) ? $game['assignments'] : [];
    $missing = [];
    foreach (($game['required_position_ids'] ?? admin_game_default_required_position_ids()) as $positionId) {
        $assignment = null;
        foreach ($assignments as $candidate) {
            if ((int) ($candidate['position_id'] ?? 0) === (int) $positionId) {
                $assignment = $candidate;
                break;
            }
        }
        if (
            !$assignment
            || (int) ($assignment['official_id'] ?? 0) <= 0
            || strtolower((string) ($assignment['status'] ?? 'pending')) === 'declined'
        ) {
            $missing[] = $positions[(int) $positionId] ?? ['id' => (int) $positionId, 'name' => 'Position ' . (int) $positionId];
        }
    }

    return $missing;
}

function admin_game_tba_request_normalize(array $record, array $gamesById = [], array $officialsById = []): array
{
    $gameId = (int) ($record['game_id'] ?? 0);
    $officialId = (int) ($record['official_id'] ?? 0);
    $game = $gamesById[$gameId] ?? [];
    $official = $officialsById[$officialId] ?? [];

    return [
        'id' => (int) ($record['id'] ?? 0),
        'game_id' => $gameId,
        'official_id' => $officialId,
        'status' => strtolower(trim((string) ($record['status'] ?? 'pending'))) ?: 'pending',
        'note' => trim((string) ($record['note'] ?? '')),
        'created_at' => (string) ($record['created_at'] ?? ''),
        'updated_at' => (string) ($record['updated_at'] ?? ''),
        'game' => $game,
        'official' => $official,
    ];
}

function admin_game_is_tba_eligible(array $game): bool
{
    $status = strtolower((string) ($game['status'] ?? 'scheduled'));
    if ((bool) ($game['published'] ?? false)) {
        return false;
    }
    if (in_array($status, ['deleted', 'cancelled', 'canceled', 'postponed'], true)) {
        return false;
    }

    return count(admin_game_missing_required_positions($game)) > 0;
}

function admin_game_tba_requests_list(): array
{
    $games = admin_games_list();
    $gamesById = [];
    foreach ($games as $game) {
        $gamesById[(int) ($game['id'] ?? 0)] = $game;
    }
    $officialsById = admin_game_official_map(false);

    if (!admin_games_db_available()) {
        return array_values(array_map(
            static fn (array $record): array => admin_game_tba_request_normalize($record, $gamesById, $officialsById),
            array_filter(admin_game_tba_requests_read_file(), static fn (array $record): bool => (string) ($record['status'] ?? '') !== 'deleted')
        ));
    }

    $stmt = db()->query(
        "SELECT *
         FROM tba_requests
         WHERE status IS NULL OR status <> 'deleted'
         ORDER BY created_at DESC, id DESC"
    );

    return array_values(array_map(
        static fn (array $record): array => admin_game_tba_request_normalize($record, $gamesById, $officialsById),
        $stmt->fetchAll()
    ));
}

function admin_game_add_tba_request_counts(array $games): array
{
    $counts = [];
    foreach (admin_game_tba_requests_list() as $request) {
        if (in_array((string) ($request['status'] ?? 'pending'), ['deleted', 'withdrawn'], true)) {
            continue;
        }
        $gameId = (int) ($request['game_id'] ?? 0);
        $counts[$gameId] = ($counts[$gameId] ?? 0) + 1;
    }

    foreach ($games as &$game) {
        $gameId = (int) ($game['id'] ?? 0);
        $game['tba_request_count'] = $counts[$gameId] ?? 0;
        $game['tba_open'] = (bool) ($game['tba_visible'] ?? false) && admin_game_is_tba_eligible($game);
    }
    unset($game);

    return $games;
}

function admin_game_send_tba_list(): array
{
    $games = admin_games_list();
    $eligibleIds = array_values(array_map(
        static fn (array $game): int => (int) ($game['id'] ?? 0),
        array_filter($games, 'admin_game_is_tba_eligible')
    ));
    $sentAt = date('Y-m-d H:i:s');

    if (!$eligibleIds) {
        return [
            'sent_count' => 0,
            'games' => [],
            'message' => 'There are no unassigned games ready for the TBA list.',
        ];
    }

    if (!admin_games_db_available()) {
        $records = admin_games_read_file();
        foreach ($records as &$record) {
            if (in_array((int) ($record['id'] ?? 0), $eligibleIds, true)) {
                $record['tba_visible'] = true;
                $record['tba_sent_at'] = $sentAt;
            }
        }
        unset($record);
        admin_games_write_file($records);
    } else {
        $placeholders = implode(',', array_fill(0, count($eligibleIds), '?'));
        $stmt = db()->prepare("UPDATE games SET tba_visible = 1, tba_sent_at = ? WHERE id IN ({$placeholders})");
        $stmt->execute([$sentAt, ...$eligibleIds]);
    }

    $updatedGames = array_values(array_filter(
        admin_game_add_tba_request_counts(admin_games_list()),
        static fn (array $game): bool => in_array((int) ($game['id'] ?? 0), $eligibleIds, true)
    ));
    $emailResult = function_exists('send_tba_game_list_notification')
        ? send_tba_game_list_notification(admin_game_officials_list(true), $updatedGames)
        : ['sent' => false, 'recipient_count' => 0];
    try {
        rtbo_notify_officials([
            'type' => 'tba_requests_published',
            'title' => 'TBA games available to request',
            'body' => count($eligibleIds) === 1
                ? 'A TBA game has been released for officials to request.'
                : count($eligibleIds) . ' TBA games have been released for officials to request.',
            'related_type' => 'tba_list',
            'metadata' => [
                'game_ids' => $eligibleIds,
                'sent_at' => $sentAt,
            ],
        ]);
    } catch (Throwable $error) {
        error_log('RTBO TBA notification failed: ' . $error->getMessage());
    }
    $baseMessage = count($eligibleIds) === 1
        ? 'TBA list sent with 1 unassigned game.'
        : 'TBA list sent with ' . count($eligibleIds) . ' unassigned games.';

    if (($emailResult['recipient_count'] ?? 0) > 0) {
        $baseMessage .= ($emailResult['sent'] ?? false)
            ? ' Email notifications were sent to active officials.'
            : ' The in-platform list is live, but email could not be sent from this environment.';
    }

    return [
        'sent_count' => count($eligibleIds),
        'email_sent' => (bool) ($emailResult['sent'] ?? false),
        'recipient_count' => (int) ($emailResult['recipient_count'] ?? 0),
        'games' => $updatedGames,
        'message' => $baseMessage,
    ];
}

function admin_game_official_already_assigned(array $game, int $officialId): bool
{
    foreach (($game['assignments'] ?? []) as $assignment) {
        if (
            (int) ($assignment['official_id'] ?? 0) === $officialId
            && !in_array(strtolower((string) ($assignment['status'] ?? 'pending')), ['declined', 'removed'], true)
        ) {
            return true;
        }
    }

    return false;
}

function admin_game_tba_open_games_for_official(int $officialId): array
{
    if ($officialId <= 0) {
        return [];
    }

    $requestsByGame = [];
    foreach (admin_game_tba_requests_list() as $request) {
        if ((int) ($request['official_id'] ?? 0) === $officialId) {
            $requestsByGame[(int) ($request['game_id'] ?? 0)] = $request;
        }
    }

    $games = [];
    foreach (admin_game_add_tba_request_counts(admin_games_list()) as $game) {
        if (!(bool) ($game['tba_visible'] ?? false) || !admin_game_is_tba_eligible($game)) {
            continue;
        }
        if (admin_game_official_already_assigned($game, $officialId)) {
            continue;
        }

        $request = $requestsByGame[(int) ($game['id'] ?? 0)] ?? null;
        $game['request'] = $request;
        $game['tba_request_status'] = $request['status'] ?? '';
        $games[] = $game;
    }

    return $games;
}

function admin_game_tba_request_create(int $gameId, int $officialId, string $note = ''): array
{
    if ($gameId <= 0) {
        throw new RuntimeException('Please select a valid TBA game.');
    }
    if ($officialId <= 0) {
        throw new RuntimeException('Please sign in with an active official profile before requesting a TBA game.');
    }

    $officials = admin_game_official_map(true);
    if (!isset($officials[$officialId])) {
        throw new RuntimeException('Only active officials can request TBA games.');
    }

    $game = admin_game_fetch($gameId);
    if (!(bool) ($game['tba_visible'] ?? false) || !admin_game_is_tba_eligible($game)) {
        throw new RuntimeException('This game is not currently available on the TBA list.');
    }
    if (admin_game_official_already_assigned($game, $officialId)) {
        throw new RuntimeException('You are already assigned to this game.');
    }

    $note = trim($note);
    if (!admin_games_db_available()) {
        $records = admin_game_tba_requests_read_file();
        foreach ($records as $record) {
            if ((int) ($record['game_id'] ?? 0) === $gameId && (int) ($record['official_id'] ?? 0) === $officialId) {
                return admin_game_tba_request_normalize($record, [$gameId => $game], admin_game_official_map(false));
            }
        }

        $request = [
            'id' => (int) (max(array_map(static fn ($row) => (int) ($row['id'] ?? 0), $records ?: [['id' => 0]])) + 1),
            'game_id' => $gameId,
            'official_id' => $officialId,
            'status' => 'pending',
            'note' => $note,
            'created_at' => date('c'),
            'updated_at' => '',
        ];
        $records[] = $request;
        admin_game_tba_requests_write_file($records);
        return admin_game_tba_request_normalize($request, [$gameId => $game], admin_game_official_map(false));
    }

    $existing = db()->prepare('SELECT * FROM tba_requests WHERE game_id = ? AND official_id = ? LIMIT 1');
    $existing->execute([$gameId, $officialId]);
    $existingRequest = $existing->fetch();
    if ($existingRequest) {
        return admin_game_tba_request_normalize($existingRequest, [$gameId => $game], admin_game_official_map(false));
    }

    $stmt = db()->prepare(
        "INSERT INTO tba_requests(game_id, official_id, status, note, updated_at)
         VALUES(?, ?, 'pending', ?, NOW())"
    );
    $stmt->execute([$gameId, $officialId, $note]);

    $fresh = db()->prepare('SELECT * FROM tba_requests WHERE id = ? LIMIT 1');
    $fresh->execute([(int) db()->lastInsertId()]);
    return admin_game_tba_request_normalize($fresh->fetch() ?: [], [$gameId => $game], admin_game_official_map(false));
}

function admin_game_tba_request_mark_assigned(int $gameId, int $officialId): void
{
    if ($gameId <= 0 || $officialId <= 0) {
        return;
    }

    if (!admin_games_db_available()) {
        $records = admin_game_tba_requests_read_file();
        $changed = false;
        foreach ($records as &$record) {
            if ((int) ($record['game_id'] ?? 0) === $gameId && (int) ($record['official_id'] ?? 0) === $officialId) {
                $record['status'] = 'assigned';
                $record['updated_at'] = date('c');
                $changed = true;
            }
        }
        unset($record);
        if ($changed) {
            admin_game_tba_requests_write_file($records);
        }
        return;
    }

    $stmt = db()->prepare("UPDATE tba_requests SET status = 'assigned', updated_at = NOW() WHERE game_id = ? AND official_id = ?");
    $stmt->execute([$gameId, $officialId]);
}

function admin_game_fetch(int $id): array
{
    if ($id <= 0) {
        throw new RuntimeException('A valid game id is required.');
    }

    if (!admin_games_db_available()) {
        foreach (admin_games_read_file() as $record) {
            if ((int) ($record['id'] ?? 0) === $id && ($record['status'] ?? '') !== 'deleted') {
                return admin_game_normalize($record);
            }
        }
        throw new RuntimeException('Game assignment not found.');
    }

    $stmt = db()->prepare('SELECT * FROM games WHERE id = ? AND (status IS NULL OR status <> "deleted") LIMIT 1');
    $stmt->execute([$id]);
    $game = $stmt->fetch();
    if (!$game) {
        throw new RuntimeException('Game assignment not found.');
    }
    return admin_game_attach_assignments([admin_game_normalize($game)])[0];
}

function admin_game_assignment_conflict(int $gameId, int $officialId, array $game): ?array
{
    if (!admin_games_db_available()) {
        foreach (admin_games_read_file() as $record) {
            if ((int) ($record['id'] ?? 0) === $gameId || ($record['status'] ?? '') === 'deleted') {
                continue;
            }
            if (
                (string) ($record['game_date'] ?? '') !== (string) ($game['game_date'] ?? '')
                || substr((string) ($record['game_time'] ?? ''), 0, 5) !== substr((string) ($game['game_time'] ?? ''), 0, 5)
            ) {
                continue;
            }
            foreach (($record['assignments'] ?? []) as $assignment) {
                if ((int) ($assignment['official_id'] ?? 0) === $officialId && !in_array((string) ($assignment['status'] ?? ''), ['declined'], true)) {
                    return admin_game_normalize($record);
                }
            }
        }
        return null;
    }

    $stmt = db()->prepare(
        "SELECT g.*
         FROM assignments a
         INNER JOIN games g ON g.id = a.game_id
         WHERE a.official_id = ?
           AND g.id <> ?
           AND g.game_date = ?
           AND SUBSTRING(g.game_time, 1, 5) = ?
           AND (g.status IS NULL OR g.status NOT IN ('deleted', 'cancelled', 'canceled', 'postponed'))
           AND (a.status IS NULL OR a.status <> 'declined')
         LIMIT 1"
    );
    $stmt->execute([
        $officialId,
        $gameId,
        (string) ($game['game_date'] ?? ''),
        substr((string) ($game['game_time'] ?? ''), 0, 5),
    ]);
    $conflict = $stmt->fetch();
    return $conflict ? admin_game_normalize($conflict) : null;
}

function admin_game_assign_official(int $gameId, array $payload): array
{
    $game = admin_game_fetch($gameId);
    $officialId = (int) ($payload['official_id'] ?? 0);
    $officials = admin_game_official_map(true);
    if ($officialId <= 0 || !isset($officials[$officialId])) {
        throw new RuntimeException('Please select an active official from the officials database.');
    }

    $positionId = admin_game_position_id_from_payload($payload);
    $positions = admin_game_position_map();
    $positionName = (string) ($positions[$positionId]['name'] ?? 'Selected position');
    $conflict = admin_game_assignment_conflict($gameId, $officialId, $game);
    if ($conflict) {
        throw new RuntimeException('This official is already assigned to ' . ($conflict['away_team'] ?: 'a visiting team') . ' at ' . ($conflict['home_team'] ?: 'a home team') . ' at the same date and time.');
    }

    if (!admin_games_db_available()) {
        $records = admin_games_read_file();
        foreach ($records as $index => $record) {
            if ((int) ($record['id'] ?? 0) !== $gameId) {
                continue;
            }
            $replacedOfficialId = 0;
            foreach (is_array($record['assignments'] ?? null) ? $record['assignments'] : [] as $existingAssignment) {
                if ((int) ($existingAssignment['position_id'] ?? 0) === $positionId) {
                    $replacedOfficialId = (int) ($existingAssignment['official_id'] ?? 0);
                    break;
                }
            }
            $assignments = array_values(array_filter(
                is_array($record['assignments'] ?? null) ? $record['assignments'] : [],
                static fn (array $assignment): bool => (int) ($assignment['position_id'] ?? 0) !== $positionId && (int) ($assignment['official_id'] ?? 0) !== $officialId
            ));
            $assignments[] = [
                'id' => time(),
                'assignment_id' => time(),
                'game_id' => $gameId,
                'official_id' => $officialId,
                'position_id' => $positionId,
                'position_name' => $positionName,
                'status' => 'pending',
                'official' => $officials[$officialId],
            ];
            $records[$index]['assignments'] = $assignments;
            admin_games_write_file($records);
            admin_game_tba_request_mark_assigned($gameId, $officialId);
            $updated = admin_game_normalize($records[$index]);
            if ($replacedOfficialId > 0 && $replacedOfficialId !== $officialId) {
                admin_game_notify_users_safe([$replacedOfficialId], [
                    'type' => 'removed_from_game',
                    'title' => 'Removed from assigned game',
                    'body' => rtbo_notification_game_summary($updated) . " no longer has you assigned as {$positionName}.",
                    'related_type' => 'game',
                    'related_id' => $gameId,
                    'metadata' => admin_game_notification_metadata($updated, ['position' => $positionName]),
                ]);
            }
            if ((bool) ($updated['published'] ?? false)) {
                admin_game_notify_users_safe([$officialId], [
                    'type' => 'game_published_assigned',
                    'title' => 'Published game assigned to you',
                    'body' => rtbo_notification_game_summary($updated) . " has been assigned to you as {$positionName}.",
                    'related_type' => 'game',
                    'related_id' => $gameId,
                    'metadata' => admin_game_notification_metadata($updated, ['position' => $positionName]),
                ]);
            }
            return $updated;
        }
        throw new RuntimeException('Game assignment not found.');
    }

    $removeDuplicate = db()->prepare('DELETE FROM assignments WHERE game_id = ? AND official_id = ? AND position_id <> ?');
    $removeDuplicate->execute([$gameId, $officialId, $positionId]);

    $existing = db()->prepare('SELECT id, official_id FROM assignments WHERE game_id = ? AND position_id = ? LIMIT 1');
    $existing->execute([$gameId, $positionId]);
    $existingAssignment = $existing->fetch() ?: [];
    $assignmentId = (int) ($existingAssignment['id'] ?? 0);
    $replacedOfficialId = (int) ($existingAssignment['official_id'] ?? 0);

    if ($assignmentId > 0) {
        $stmt = db()->prepare(
            "UPDATE assignments
             SET official_id = ?, status = 'pending', decline_reason = NULL, responded_at = NULL
             WHERE id = ?"
        );
        $stmt->execute([$officialId, $assignmentId]);
    } else {
        $stmt = db()->prepare(
            "INSERT INTO assignments(game_id, official_id, position_id, status)
             VALUES(?, ?, ?, 'pending')"
        );
        $stmt->execute([$gameId, $officialId, $positionId]);
    }

    admin_game_tba_request_mark_assigned($gameId, $officialId);
    $updated = admin_game_fetch($gameId);
    if ($replacedOfficialId > 0 && $replacedOfficialId !== $officialId) {
        admin_game_notify_users_safe([$replacedOfficialId], [
            'type' => 'removed_from_game',
            'title' => 'Removed from assigned game',
            'body' => rtbo_notification_game_summary($updated) . " no longer has you assigned as {$positionName}.",
            'related_type' => 'game',
            'related_id' => $gameId,
            'metadata' => admin_game_notification_metadata($updated, ['position' => $positionName]),
        ]);
    }
    if ((bool) ($updated['published'] ?? false)) {
        admin_game_notify_users_safe([$officialId], [
            'type' => 'game_published_assigned',
            'title' => 'Published game assigned to you',
            'body' => rtbo_notification_game_summary($updated) . " has been assigned to you as {$positionName}.",
            'related_type' => 'game',
            'related_id' => $gameId,
            'metadata' => admin_game_notification_metadata($updated, ['position' => $positionName]),
        ]);
    }
    return $updated;
}

function admin_game_normalize_crew_designation(string $value, string $positionName = ''): string
{
    $normalized = strtolower(trim((string) preg_replace('/[\s-]+/', '_', $value)));
    if (in_array($normalized, ['crew_chief', 'alternate', 'observer_evaluator', 'official'], true)) {
        return $normalized;
    }

    $position = strtolower($positionName);
    if (str_contains($position, 'alternate')) {
        return 'alternate';
    }
    if (str_contains($position, 'observer') || str_contains($position, 'evaluator')) {
        return 'observer_evaluator';
    }

    return 'official';
}

function admin_game_assign_crew(int $gameId, array $payload): array
{
    $game = admin_game_fetch($gameId);
    $positions = admin_game_position_map();
    $officials = admin_game_official_map(true);
    $rawAssignments = is_array($payload['assignments'] ?? null) ? $payload['assignments'] : $payload;
    $incomingByPosition = [];

    foreach ($rawAssignments as $assignment) {
        if (!is_array($assignment)) {
            continue;
        }
        $positionId = admin_game_position_id_from_payload($assignment);
        $officialId = (int) ($assignment['official_id'] ?? 0);
        if ($officialId > 0) {
            $positionName = (string) ($positions[$positionId]['name'] ?? '');
            $incomingByPosition[$positionId] = [
                'official_id' => $officialId,
                'crew_designation' => admin_game_normalize_crew_designation((string) ($assignment['crew_designation'] ?? ''), $positionName),
                'assignor_notes' => trim((string) ($assignment['assignor_notes'] ?? '')),
            ];
        }
    }

    $requiredPositionIds = array_values(array_filter(array_map('intval', $game['required_position_ids'] ?? admin_game_default_required_position_ids())));
    foreach ($requiredPositionIds as $positionId) {
        if (empty($incomingByPosition[$positionId]['official_id'])) {
            $positionName = (string) ($positions[$positionId]['name'] ?? 'required position');
            throw new RuntimeException("Select an official for {$positionName} before saving this crew.");
        }
    }

    $selectedOfficialIds = array_map(static fn (array $assignment): int => (int) $assignment['official_id'], array_values($incomingByPosition));
    if (count($selectedOfficialIds) !== count(array_unique($selectedOfficialIds))) {
        throw new RuntimeException('Each required crew position must be assigned to a different official.');
    }

    $crewChiefCount = count(array_filter($incomingByPosition, static fn (array $assignment): bool => ($assignment['crew_designation'] ?? '') === 'crew_chief'));
    if ($crewChiefCount !== 1) {
        throw new RuntimeException('Designate exactly one crew chief before saving this crew.');
    }

    foreach ($incomingByPosition as $positionId => $assignment) {
        $officialId = (int) $assignment['official_id'];
        if (!isset($officials[$officialId])) {
            throw new RuntimeException('Every crew member must be selected from the active officials database.');
        }
        if (!isset($positions[$positionId])) {
            throw new RuntimeException('Every crew member must have a valid officiating position.');
        }
        $conflict = admin_game_assignment_conflict($gameId, $officialId, $game);
        if ($conflict) {
            $officialName = $officials[$officialId]['name'] ?: $officials[$officialId]['email'];
            throw new RuntimeException($officialName . ' is already assigned to ' . ($conflict['away_team'] ?: 'a visiting team') . ' at ' . ($conflict['home_team'] ?: 'a home team') . ' at the same date and time.');
        }
    }

    if (!admin_games_db_available()) {
        throw new RuntimeException('The database is required for the Crew Builder.');
    }

    $deleteMissing = db()->prepare('DELETE FROM assignments WHERE game_id = ? AND position_id = ?');
    foreach (array_keys($positions) as $positionId) {
        if (!isset($incomingByPosition[(int) $positionId])) {
            $deleteMissing->execute([$gameId, (int) $positionId]);
        }
    }

    $upsertExisting = db()->prepare('SELECT id, official_id FROM assignments WHERE game_id = ? AND position_id = ? LIMIT 1');
    $update = db()->prepare(
        "UPDATE assignments
         SET official_id = ?, crew_designation = ?, assignor_notes = ?, status = 'pending', decline_reason = NULL, responded_at = NULL
         WHERE id = ?"
    );
    $insert = db()->prepare(
        "INSERT INTO assignments(game_id, official_id, position_id, crew_designation, assignor_notes, status)
         VALUES(?, ?, ?, ?, ?, 'pending')"
    );

    foreach ($incomingByPosition as $positionId => $assignment) {
        $officialId = (int) $assignment['official_id'];
        $upsertExisting->execute([$gameId, (int) $positionId]);
        $existingAssignment = $upsertExisting->fetch() ?: [];
        $assignmentId = (int) ($existingAssignment['id'] ?? 0);
        if ($assignmentId > 0) {
            $update->execute([
                $officialId,
                $assignment['crew_designation'],
                $assignment['assignor_notes'] !== '' ? $assignment['assignor_notes'] : null,
                $assignmentId,
            ]);
        } else {
            $insert->execute([
                $gameId,
                $officialId,
                (int) $positionId,
                $assignment['crew_designation'],
                $assignment['assignor_notes'] !== '' ? $assignment['assignor_notes'] : null,
            ]);
        }
        admin_game_tba_request_mark_assigned($gameId, $officialId);
    }

    return admin_game_fetch($gameId);
}

function admin_game_save_crew_message(int $gameId, string $message, ?array $actor = null): array
{
    $game = admin_game_fetch($gameId);
    $message = trim($message);
    if ($message === '') {
        throw new RuntimeException('Enter a crew message before sending.');
    }
    if (strlen($message) > 2000) {
        throw new RuntimeException('Crew messages must be 2,000 characters or less.');
    }
    if (!admin_games_db_available()) {
        throw new RuntimeException('The database is required for crew communication threads.');
    }

    $actor ??= current_user();
    $senderName = trim((string) ($actor['name'] ?? ''));
    if ($senderName === '') {
        $senderName = trim((string) ($actor['first_name'] ?? '') . ' ' . (string) ($actor['last_name'] ?? ''));
    }
    if ($senderName === '') {
        $senderName = (string) ($actor['email'] ?? 'RTBO Admin');
    }

    $stmt = db()->prepare(
        "INSERT INTO crew_messages(game_id, sender_user_id, sender_name, message)
         VALUES(?, ?, ?, ?)"
    );
    $stmt->execute([
        $gameId,
        isset($actor['id']) ? (int) $actor['id'] : null,
        $senderName,
        $message,
    ]);

    admin_game_notify_assigned_safe(
        $game,
        'crew_thread_message',
        'New crew message',
        rtbo_notification_game_summary($game) . ' has a new crew message from ' . $senderName . '.',
        ['event' => 'crew_message']
    );

    return admin_game_fetch($gameId);
}

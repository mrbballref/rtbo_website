<?php
declare(strict_types=1);

require_once __DIR__ . '/admin-schools.php';
require_once __DIR__ . '/admin-members.php';
require_once __DIR__ . '/notifications.php';

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
    ] as $column => $sql) {
        if (!admin_games_column_exists($column)) {
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
        foreach ([['Referee', 1], ['Umpire 1', 2], ['Umpire 2', 3], ['Alternate', 4]] as $position) {
            $insert->execute($position);
        }
    }

    db()->exec(
        "CREATE TABLE IF NOT EXISTS assignments (
            id INT AUTO_INCREMENT PRIMARY KEY,
            game_id INT NOT NULL,
            official_id INT NOT NULL,
            position_id INT NOT NULL,
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

function admin_game_core_position_ids(): array
{
    return array_values(array_filter(array_map(
        static fn (string $name): int => admin_game_position_id_by_name($name),
        ['Referee', 'Umpire 1', 'Umpire 2']
    )));
}

function admin_game_default_required_position_ids(int $officialsRequired = 3): array
{
    $ids = admin_game_core_position_ids();
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

function admin_game_normalize(array $record): array
{
    $status = strtolower(trim((string) ($record['status'] ?? 'scheduled'))) ?: 'scheduled';
    if (!in_array($status, ['scheduled', 'published', 'cancelled', 'canceled', 'postponed', 'rescheduled', 'deleted'], true)) {
        $status = 'scheduled';
    }
    $officialsRequired = max(3, min(4, (int) ($record['officials_required'] ?? $record['officialsRequired'] ?? 3)));
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
        'status' => strtolower(trim((string) ($record['status'] ?? 'pending'))) ?: 'pending',
        'decline_reason' => (string) ($record['decline_reason'] ?? ''),
        'responded_at' => (string) ($record['responded_at'] ?? ''),
        'official' => $official,
    ];
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
    foreach ($games as &$game) {
        $game['assignments'] = $assignmentMap[(int) ($game['id'] ?? 0)] ?? ($game['assignments'] ?? []);
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
    $corePositionIds = admin_game_core_position_ids();
    $missingCoreIds = array_diff($corePositionIds, $game['required_position_ids']);
    if ($missingCoreIds || count($game['required_position_ids']) < 3) {
        throw new RuntimeException('Referee, Umpire 1, and Umpire 2 are required before a game assignment can be saved.');
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

    $stmt = db()->prepare(
        "UPDATE games
         SET game_date = ?, game_time = ?, level = ?, home_team = ?, away_team = ?, location_name = ?,
             location_address = ?, location_lat = ?, location_lng = ?, fee_per_official = ?, status = ?,
             published = ?, tba_visible = ?, tba_sent_at = ?, cancellation_reason = ?, school_event_center_id = ?, home_team_id = ?,
             away_team_id = ?, court_number = ?, court_label = ?, games_per_night = ?,
             officials_required = ?, required_position_ids = ?, notes = ?
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
            $incomingByPosition[$positionId] = $officialId;
        }
    }

    $requiredPositionIds = array_values(array_filter(array_map('intval', $game['required_position_ids'] ?? admin_game_default_required_position_ids())));
    foreach ($requiredPositionIds as $positionId) {
        if (empty($incomingByPosition[$positionId])) {
            $positionName = (string) ($positions[$positionId]['name'] ?? 'required position');
            throw new RuntimeException("Select an official for {$positionName} before saving this crew.");
        }
    }

    $selectedOfficialIds = array_values($incomingByPosition);
    if (count($selectedOfficialIds) !== count(array_unique($selectedOfficialIds))) {
        throw new RuntimeException('Each required crew position must be assigned to a different official.');
    }

    foreach ($incomingByPosition as $positionId => $officialId) {
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

    foreach ($requiredPositionIds as $positionId) {
        admin_game_assign_official($gameId, [
            'official_id' => $incomingByPosition[$positionId],
            'position_id' => $positionId,
        ]);
    }

    return admin_game_fetch($gameId);
}

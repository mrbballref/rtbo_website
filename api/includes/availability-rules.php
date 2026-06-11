<?php
declare(strict_types=1);

function rtbo_availability_rules_column_exists(string $column): bool
{
    try {
        $stmt = db()->prepare(
            "SELECT COUNT(*)
             FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE()
               AND TABLE_NAME = 'official_availability_rules'
               AND COLUMN_NAME = ?"
        );
        $stmt->execute([$column]);

        return (int) $stmt->fetchColumn() > 0;
    } catch (Throwable $error) {
        error_log('RTBO availability rules column lookup failed: ' . $error->getMessage());

        return false;
    }
}

function rtbo_ensure_availability_rules_table(): void
{
    db()->exec(
        "CREATE TABLE IF NOT EXISTS official_availability_rules (
            id INT AUTO_INCREMENT PRIMARY KEY,
            official_id INT NOT NULL,
            rule_type VARCHAR(60) NOT NULL,
            title VARCHAR(190) NOT NULL,
            days_json TEXT NULL,
            starts_at TIME NULL,
            ends_at TIME NULL,
            max_miles INT NULL,
            game_level VARCHAR(120) NULL,
            partner_member_id INT NULL,
            partner_name VARCHAR(190) NULL,
            school_name VARCHAR(190) NULL,
            max_games_per_day INT NULL,
            max_games_per_week INT NULL,
            notes TEXT NULL,
            is_active TINYINT(1) NOT NULL DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NULL,
            INDEX idx_availability_rules_official (official_id),
            INDEX idx_availability_rules_type (rule_type),
            INDEX idx_availability_rules_active (is_active)
        )"
    );

    foreach ([
        'official_id' => "ALTER TABLE official_availability_rules ADD COLUMN official_id INT NOT NULL AFTER id",
        'rule_type' => "ALTER TABLE official_availability_rules ADD COLUMN rule_type VARCHAR(60) NOT NULL AFTER official_id",
        'title' => "ALTER TABLE official_availability_rules ADD COLUMN title VARCHAR(190) NOT NULL AFTER rule_type",
        'days_json' => "ALTER TABLE official_availability_rules ADD COLUMN days_json TEXT NULL AFTER title",
        'starts_at' => "ALTER TABLE official_availability_rules ADD COLUMN starts_at TIME NULL AFTER days_json",
        'ends_at' => "ALTER TABLE official_availability_rules ADD COLUMN ends_at TIME NULL AFTER starts_at",
        'max_miles' => "ALTER TABLE official_availability_rules ADD COLUMN max_miles INT NULL AFTER ends_at",
        'game_level' => "ALTER TABLE official_availability_rules ADD COLUMN game_level VARCHAR(120) NULL AFTER max_miles",
        'partner_member_id' => "ALTER TABLE official_availability_rules ADD COLUMN partner_member_id INT NULL AFTER game_level",
        'partner_name' => "ALTER TABLE official_availability_rules ADD COLUMN partner_name VARCHAR(190) NULL AFTER partner_member_id",
        'school_name' => "ALTER TABLE official_availability_rules ADD COLUMN school_name VARCHAR(190) NULL AFTER partner_name",
        'max_games_per_day' => "ALTER TABLE official_availability_rules ADD COLUMN max_games_per_day INT NULL AFTER school_name",
        'max_games_per_week' => "ALTER TABLE official_availability_rules ADD COLUMN max_games_per_week INT NULL AFTER max_games_per_day",
        'notes' => "ALTER TABLE official_availability_rules ADD COLUMN notes TEXT NULL AFTER max_games_per_week",
        'is_active' => "ALTER TABLE official_availability_rules ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1 AFTER notes",
        'created_at' => "ALTER TABLE official_availability_rules ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP",
        'updated_at' => "ALTER TABLE official_availability_rules ADD COLUMN updated_at DATETIME NULL",
    ] as $column => $sql) {
        if (!rtbo_availability_rules_column_exists($column)) {
            db()->exec($sql);
        }
    }
}

function rtbo_availability_rule_types(): array
{
    return [
        'weekly_available' => 'Weekly Available Window',
        'weekly_unavailable' => 'Weekly Unavailable Day',
        'travel_limit' => 'Travel Limit',
        'game_level' => 'Game Level Restriction',
        'training_only' => 'Training Schools Only',
        'school_conflict_block' => 'School Conflict Block',
        'preferred_partner' => 'Preferred Partner',
        'do_not_pair' => 'Do-Not-Pair Official',
        'school_block' => 'Blocked School',
        'max_games' => 'Maximum Games',
    ];
}

function rtbo_availability_rule_days(array $value): array
{
    $allowed = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    $days = array_values(array_unique(array_map(static fn ($day): string => strtolower(trim((string) $day)), $value)));

    return array_values(array_filter($days, static fn (string $day): bool => in_array($day, $allowed, true)));
}

function rtbo_availability_rule_time(?string $value): ?string
{
    $value = trim((string) $value);
    if ($value === '') {
        return null;
    }
    if (!preg_match('/^\d{2}:\d{2}$/', $value)) {
        throw new RuntimeException('Use a valid HH:MM time for availability rule windows.');
    }

    return $value . ':00';
}

function rtbo_availability_rule_public(array $row): array
{
    $days = [];
    $decodedDays = json_decode((string) ($row['days_json'] ?? '[]'), true);
    if (is_array($decodedDays)) {
        $days = rtbo_availability_rule_days($decodedDays);
    }

    return [
        'id' => (int) ($row['id'] ?? 0),
        'official_id' => (int) ($row['official_id'] ?? 0),
        'rule_type' => (string) ($row['rule_type'] ?? ''),
        'type_label' => rtbo_availability_rule_types()[(string) ($row['rule_type'] ?? '')] ?? 'Availability Rule',
        'title' => (string) ($row['title'] ?? ''),
        'days' => $days,
        'starts_at' => substr((string) ($row['starts_at'] ?? ''), 0, 5),
        'ends_at' => substr((string) ($row['ends_at'] ?? ''), 0, 5),
        'max_miles' => $row['max_miles'] !== null ? (int) $row['max_miles'] : null,
        'game_level' => (string) ($row['game_level'] ?? ''),
        'partner_member_id' => $row['partner_member_id'] !== null ? (int) $row['partner_member_id'] : null,
        'partner_name' => (string) ($row['partner_name'] ?? ''),
        'school_name' => (string) ($row['school_name'] ?? ''),
        'max_games_per_day' => $row['max_games_per_day'] !== null ? (int) $row['max_games_per_day'] : null,
        'max_games_per_week' => $row['max_games_per_week'] !== null ? (int) $row['max_games_per_week'] : null,
        'notes' => (string) ($row['notes'] ?? ''),
        'is_active' => (int) ($row['is_active'] ?? 1) === 1,
        'created_at' => (string) ($row['created_at'] ?? ''),
        'updated_at' => (string) ($row['updated_at'] ?? ''),
    ];
}

function rtbo_availability_rules_for_official(int $officialId): array
{
    rtbo_ensure_availability_rules_table();
    $stmt = db()->prepare(
        "SELECT *
         FROM official_availability_rules
         WHERE official_id = ?
         ORDER BY is_active DESC, updated_at DESC, created_at DESC, id DESC"
    );
    $stmt->execute([$officialId]);

    return array_map('rtbo_availability_rule_public', $stmt->fetchAll());
}

function rtbo_availability_rule_validate(array $input): array
{
    $types = rtbo_availability_rule_types();
    $ruleType = trim((string) ($input['rule_type'] ?? ''));
    if (!isset($types[$ruleType])) {
        throw new RuntimeException('Choose a valid availability rule type.');
    }

    $title = trim((string) ($input['title'] ?? $types[$ruleType]));
    if ($title === '') {
        throw new RuntimeException('Name this availability rule before saving it.');
    }

    $days = rtbo_availability_rule_days((array) ($input['days'] ?? []));
    $startsAt = rtbo_availability_rule_time($input['starts_at'] ?? null);
    $endsAt = rtbo_availability_rule_time($input['ends_at'] ?? null);
    $maxMiles = isset($input['max_miles']) && $input['max_miles'] !== '' ? max(0, min(1000, (int) $input['max_miles'])) : null;
    $gameLevel = trim((string) ($input['game_level'] ?? ''));
    $partnerMemberId = isset($input['partner_member_id']) && $input['partner_member_id'] !== '' ? max(0, (int) $input['partner_member_id']) : null;
    $partnerName = trim((string) ($input['partner_name'] ?? ''));
    $schoolName = trim((string) ($input['school_name'] ?? ''));
    $maxGamesPerDay = isset($input['max_games_per_day']) && $input['max_games_per_day'] !== '' ? max(0, min(20, (int) $input['max_games_per_day'])) : null;
    $maxGamesPerWeek = isset($input['max_games_per_week']) && $input['max_games_per_week'] !== '' ? max(0, min(80, (int) $input['max_games_per_week'])) : null;
    $notes = trim((string) ($input['notes'] ?? ''));
    $isActive = !array_key_exists('is_active', $input) || (bool) $input['is_active'];

    if (in_array($ruleType, ['weekly_available', 'weekly_unavailable', 'travel_limit'], true) && count($days) === 0) {
        throw new RuntimeException('Choose at least one day for this availability rule.');
    }
    if ($ruleType === 'weekly_available' && (!$startsAt || !$endsAt)) {
        throw new RuntimeException('Available windows require a start and end time.');
    }
    if ($ruleType === 'travel_limit' && $maxMiles === null) {
        throw new RuntimeException('Travel limit rules require a mileage limit.');
    }
    if ($ruleType === 'game_level' && $gameLevel === '') {
        throw new RuntimeException('Game level rules require a level such as varsity, junior varsity, or college.');
    }
    if (in_array($ruleType, ['preferred_partner', 'do_not_pair'], true) && $partnerName === '' && !$partnerMemberId) {
        throw new RuntimeException('Partner rules require an official name or member ID.');
    }
    if (in_array($ruleType, ['school_conflict_block', 'school_block'], true) && $schoolName === '') {
        throw new RuntimeException('School rules require a school name.');
    }
    if ($ruleType === 'max_games' && $maxGamesPerDay === null && $maxGamesPerWeek === null) {
        throw new RuntimeException('Maximum game rules require a daily or weekly limit.');
    }

    return [
        'rule_type' => $ruleType,
        'title' => mb_substr($title, 0, 190),
        'days_json' => json_encode($days, JSON_UNESCAPED_SLASHES),
        'starts_at' => $startsAt,
        'ends_at' => $endsAt,
        'max_miles' => $maxMiles,
        'game_level' => mb_substr($gameLevel, 0, 120),
        'partner_member_id' => $partnerMemberId,
        'partner_name' => mb_substr($partnerName, 0, 190),
        'school_name' => mb_substr($schoolName, 0, 190),
        'max_games_per_day' => $maxGamesPerDay,
        'max_games_per_week' => $maxGamesPerWeek,
        'notes' => $notes,
        'is_active' => $isActive ? 1 : 0,
    ];
}

function rtbo_save_availability_rule(int $officialId, array $input): array
{
    rtbo_ensure_availability_rules_table();
    $id = (int) ($input['id'] ?? 0);
    $rule = rtbo_availability_rule_validate($input);

    if ($id > 0) {
        $stmt = db()->prepare(
            "UPDATE official_availability_rules
             SET rule_type = :rule_type,
                 title = :title,
                 days_json = :days_json,
                 starts_at = :starts_at,
                 ends_at = :ends_at,
                 max_miles = :max_miles,
                 game_level = :game_level,
                 partner_member_id = :partner_member_id,
                 partner_name = :partner_name,
                 school_name = :school_name,
                 max_games_per_day = :max_games_per_day,
                 max_games_per_week = :max_games_per_week,
                 notes = :notes,
                 is_active = :is_active,
                 updated_at = NOW()
             WHERE id = :id AND official_id = :official_id"
        );
        $stmt->execute([':id' => $id, ':official_id' => $officialId, ...array_combine(array_map(static fn ($key): string => ':' . $key, array_keys($rule)), array_values($rule))]);
    } else {
        $stmt = db()->prepare(
            "INSERT INTO official_availability_rules
                (official_id, rule_type, title, days_json, starts_at, ends_at, max_miles, game_level, partner_member_id, partner_name, school_name, max_games_per_day, max_games_per_week, notes, is_active)
             VALUES
                (:official_id, :rule_type, :title, :days_json, :starts_at, :ends_at, :max_miles, :game_level, :partner_member_id, :partner_name, :school_name, :max_games_per_day, :max_games_per_week, :notes, :is_active)"
        );
        $stmt->execute([':official_id' => $officialId, ...array_combine(array_map(static fn ($key): string => ':' . $key, array_keys($rule)), array_values($rule))]);
        $id = (int) db()->lastInsertId();
    }

    $stmt = db()->prepare("SELECT * FROM official_availability_rules WHERE id = ? AND official_id = ? LIMIT 1");
    $stmt->execute([$id, $officialId]);
    $row = $stmt->fetch();
    if (!$row) {
        throw new RuntimeException('Availability rule could not be saved.');
    }

    return rtbo_availability_rule_public($row);
}

function rtbo_delete_availability_rule(int $officialId, int $id): void
{
    rtbo_ensure_availability_rules_table();
    $stmt = db()->prepare("DELETE FROM official_availability_rules WHERE id = ? AND official_id = ?");
    $stmt->execute([$id, $officialId]);
}

function rtbo_toggle_availability_rule(int $officialId, int $id, bool $active): array
{
    rtbo_ensure_availability_rules_table();
    $stmt = db()->prepare("UPDATE official_availability_rules SET is_active = ?, updated_at = NOW() WHERE id = ? AND official_id = ?");
    $stmt->execute([$active ? 1 : 0, $id, $officialId]);

    $stmt = db()->prepare("SELECT * FROM official_availability_rules WHERE id = ? AND official_id = ? LIMIT 1");
    $stmt->execute([$id, $officialId]);
    $row = $stmt->fetch();
    if (!$row) {
        throw new RuntimeException('Availability rule could not be found.');
    }

    return rtbo_availability_rule_public($row);
}

function rtbo_availability_rules_summary(array $rules): array
{
    $active = array_values(array_filter($rules, static fn (array $rule): bool => (bool) ($rule['is_active'] ?? false)));
    $byType = [];
    foreach ($active as $rule) {
        $type = (string) ($rule['rule_type'] ?? 'rule');
        $byType[$type] = ($byType[$type] ?? 0) + 1;
    }

    return [
        'active_rules' => count($active),
        'inactive_rules' => max(0, count($rules) - count($active)),
        'assignment_engine_inputs' => $byType,
        'conflict_controls' => ($byType['school_conflict_block'] ?? 0) + ($byType['school_block'] ?? 0) + ($byType['do_not_pair'] ?? 0),
    ];
}

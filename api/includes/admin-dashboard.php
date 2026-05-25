<?php
declare(strict_types=1);

function ensure_admin_dashboard_tables(): void
{
    db()->exec(
        "CREATE TABLE IF NOT EXISTS dashboard_records (
            id INT AUTO_INCREMENT PRIMARY KEY,
            section_key VARCHAR(80) NOT NULL,
            field0 TEXT NULL,
            field1 TEXT NULL,
            field2 TEXT NULL,
            field3 TEXT NULL,
            field4 TEXT NULL,
            created_by INT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX dashboard_records_section_idx (section_key)
        )"
    );

    db()->exec(
        "CREATE TABLE IF NOT EXISTS dashboard_audit_log (
            id INT AUTO_INCREMENT PRIMARY KEY,
            actor_id INT NULL,
            actor_email VARCHAR(190) NULL,
            action VARCHAR(80) NOT NULL,
            section_key VARCHAR(80) NOT NULL,
            record_id INT NULL,
            details JSON NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX dashboard_audit_section_idx (section_key),
            INDEX dashboard_audit_actor_idx (actor_id)
        )"
    );
}

function dashboard_allowed_sections(): array
{
    return [
        'registrations',
        'contacts',
        'reviews',
        'newsletters',
        'payments',
        'schoolsTeams',
        'education',
        'reports',
    ];
}

function dashboard_file_path(): string
{
    ensure_dir(STORAGE_DIR);
    return STORAGE_DIR . '/dashboard-records.json';
}

function dashboard_file_empty(): array
{
    $records = [];
    foreach (dashboard_allowed_sections() as $section) {
        $records[$section] = [];
    }

    return ['next_id' => 1, 'records' => $records, 'audit' => []];
}

function dashboard_file_load(): array
{
    $path = dashboard_file_path();
    if (!is_file($path)) {
        return dashboard_file_empty();
    }

    $data = json_decode((string) file_get_contents($path), true);
    if (!is_array($data)) {
        return dashboard_file_empty();
    }

    $empty = dashboard_file_empty();
    $data['next_id'] = max(1, (int) ($data['next_id'] ?? 1));
    $data['records'] = is_array($data['records'] ?? null) ? array_merge($empty['records'], $data['records']) : $empty['records'];
    $data['audit'] = is_array($data['audit'] ?? null) ? $data['audit'] : [];

    return $data;
}

function dashboard_file_save(array $data): void
{
    file_put_contents(dashboard_file_path(), json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES), LOCK_EX);
}

function dashboard_file_audit(array &$data, ?array $user, string $action, string $section, ?int $recordId, array $details = []): void
{
    $data['audit'][] = [
        'actor_id' => isset($user['id']) ? (int) $user['id'] : null,
        'actor_email' => (string) ($user['email'] ?? ''),
        'action' => $action,
        'section_key' => $section,
        'record_id' => $recordId,
        'details' => $details,
        'created_at' => date('c'),
    ];
}

function dashboard_file_list_records(string $section): array
{
    $section = dashboard_validate_section($section);
    $data = dashboard_file_load();
    return array_values($data['records'][$section] ?? []);
}

function dashboard_file_records_by_section(): array
{
    return dashboard_file_load()['records'];
}

function dashboard_file_save_record(string $section, array $record, ?array $user = null): array
{
    $section = dashboard_validate_section($section);
    $data = dashboard_file_load();
    $id = (int) $data['next_id'];
    $data['next_id'] = $id + 1;

    $saved = [
        'id' => $id,
        'source' => 'dashboard_records',
        'field0' => trim((string) ($record['field0'] ?? '')),
        'field1' => trim((string) ($record['field1'] ?? '')),
        'field2' => trim((string) ($record['field2'] ?? '')),
        'field3' => trim((string) ($record['field3'] ?? '')),
        'field4' => trim((string) ($record['field4'] ?? '')),
    ];

    array_unshift($data['records'][$section], $saved);
    dashboard_file_audit($data, $user, 'create', $section, $id, $saved);
    dashboard_file_save($data);

    return $saved;
}

function dashboard_file_update_record(string $section, int $id, array $record, ?array $user = null): array
{
    $section = dashboard_validate_section($section);
    $data = dashboard_file_load();

    foreach ($data['records'][$section] as &$existing) {
        if ((int) ($existing['id'] ?? 0) !== $id) {
            continue;
        }
        for ($index = 0; $index < 5; $index++) {
            $existing['field' . $index] = trim((string) ($record['field' . $index] ?? ''));
        }
        $existing['source'] = 'dashboard_records';
        dashboard_file_audit($data, $user, 'update', $section, $id, $existing);
        dashboard_file_save($data);
        return $existing;
    }

    throw new RuntimeException('The dashboard record could not be found.');
}

function dashboard_file_delete_record(string $section, int $id, ?array $user = null): void
{
    $section = dashboard_validate_section($section);
    $data = dashboard_file_load();
    $deleted = null;
    $data['records'][$section] = array_values(array_filter(
        $data['records'][$section],
        static function (array $record) use ($id, &$deleted): bool {
            if ((int) ($record['id'] ?? 0) === $id) {
                $deleted = $record;
                return false;
            }
            return true;
        }
    ));

    if (!$deleted) {
        throw new RuntimeException('The dashboard record could not be found.');
    }

    dashboard_file_audit($data, $user, 'delete', $section, $id, $deleted);
    dashboard_file_save($data);
}

function dashboard_validate_section(string $section): string
{
    if (!in_array($section, dashboard_allowed_sections(), true)) {
        throw new RuntimeException('This dashboard section is not available.');
    }

    return $section;
}

function dashboard_record_from_row(array $row): array
{
    return [
        'id' => (int) $row['id'],
        'source' => 'dashboard_records',
        'field0' => (string) ($row['field0'] ?? ''),
        'field1' => (string) ($row['field1'] ?? ''),
        'field2' => (string) ($row['field2'] ?? ''),
        'field3' => (string) ($row['field3'] ?? ''),
        'field4' => (string) ($row['field4'] ?? ''),
    ];
}

function dashboard_list_records(string $section): array
{
    $section = dashboard_validate_section($section);

    try {
        ensure_admin_dashboard_tables();
        $stmt = db()->prepare(
            "SELECT id, field0, field1, field2, field3, field4
             FROM dashboard_records
             WHERE section_key = ?
             ORDER BY updated_at DESC, id DESC"
        );
        $stmt->execute([$section]);

        return array_map('dashboard_record_from_row', $stmt->fetchAll());
    } catch (Throwable $error) {
        error_log('RTBO dashboard list using file fallback: ' . $error->getMessage());
        return dashboard_file_list_records($section);
    }
}

function dashboard_records_by_section(): array
{
    $records = [];
    foreach (dashboard_allowed_sections() as $section) {
        $records[$section] = [];
    }

    try {
        ensure_admin_dashboard_tables();
        $stmt = db()->query(
            "SELECT id, section_key, field0, field1, field2, field3, field4
             FROM dashboard_records
             ORDER BY section_key ASC, updated_at DESC, id DESC"
        );

        foreach ($stmt->fetchAll() as $row) {
            $section = (string) $row['section_key'];
            if (!array_key_exists($section, $records)) {
                continue;
            }
            $records[$section][] = dashboard_record_from_row($row);
        }

        return $records;
    } catch (Throwable $error) {
        error_log('RTBO dashboard records using file fallback: ' . $error->getMessage());
        return dashboard_file_records_by_section();
    }
}

function dashboard_audit(?array $user, string $action, string $section, ?int $recordId, array $details = []): void
{
    ensure_admin_dashboard_tables();
    $stmt = db()->prepare(
        "INSERT INTO dashboard_audit_log(actor_id, actor_email, action, section_key, record_id, details)
         VALUES (?, ?, ?, ?, ?, ?)"
    );
    $stmt->execute([
        isset($user['id']) ? (int) $user['id'] : null,
        (string) ($user['email'] ?? ''),
        $action,
        $section,
        $recordId,
        json_encode($details, JSON_UNESCAPED_SLASHES),
    ]);
}

function dashboard_save_record(string $section, array $record, ?array $user = null): array
{
    $section = dashboard_validate_section($section);

    $fields = [];
    for ($index = 0; $index < 5; $index++) {
        $fields['field' . $index] = trim((string) ($record['field' . $index] ?? ''));
    }

    try {
        ensure_admin_dashboard_tables();
        $stmt = db()->prepare(
            "INSERT INTO dashboard_records(section_key, field0, field1, field2, field3, field4, created_by)
             VALUES (:section_key, :field0, :field1, :field2, :field3, :field4, :created_by)"
        );
        $stmt->execute([
            ':section_key' => $section,
            ':field0' => $fields['field0'],
            ':field1' => $fields['field1'],
            ':field2' => $fields['field2'],
            ':field3' => $fields['field3'],
            ':field4' => $fields['field4'],
            ':created_by' => isset($user['id']) ? (int) $user['id'] : null,
        ]);

        $id = (int) db()->lastInsertId();
        dashboard_audit($user, 'create', $section, $id, $fields);

        return dashboard_get_record($section, $id);
    } catch (Throwable $error) {
        error_log('RTBO dashboard create using file fallback: ' . $error->getMessage());
        return dashboard_file_save_record($section, $fields, $user);
    }
}

function dashboard_get_record(string $section, int $id): array
{
    ensure_admin_dashboard_tables();
    $section = dashboard_validate_section($section);

    $stmt = db()->prepare(
        "SELECT id, field0, field1, field2, field3, field4
         FROM dashboard_records
         WHERE section_key = ? AND id = ?
         LIMIT 1"
    );
    $stmt->execute([$section, $id]);
    $row = $stmt->fetch();
    if (!$row) {
        throw new RuntimeException('The dashboard record could not be found.');
    }

    return dashboard_record_from_row($row);
}

function dashboard_update_record(string $section, int $id, array $record, ?array $user = null): array
{
    $section = dashboard_validate_section($section);

    $fields = [];
    for ($index = 0; $index < 5; $index++) {
        $fields['field' . $index] = trim((string) ($record['field' . $index] ?? ''));
    }

    try {
        ensure_admin_dashboard_tables();
        $stmt = db()->prepare(
            "UPDATE dashboard_records
             SET field0 = :field0,
                 field1 = :field1,
                 field2 = :field2,
                 field3 = :field3,
                 field4 = :field4
             WHERE section_key = :section_key AND id = :id"
        );
        $stmt->execute([
            ':field0' => $fields['field0'],
            ':field1' => $fields['field1'],
            ':field2' => $fields['field2'],
            ':field3' => $fields['field3'],
            ':field4' => $fields['field4'],
            ':section_key' => $section,
            ':id' => $id,
        ]);

        if ($stmt->rowCount() === 0) {
            dashboard_get_record($section, $id);
        }

        dashboard_audit($user, 'update', $section, $id, $fields);

        return dashboard_get_record($section, $id);
    } catch (Throwable $error) {
        error_log('RTBO dashboard update using file fallback: ' . $error->getMessage());
        return dashboard_file_update_record($section, $id, $fields, $user);
    }
}

function dashboard_delete_record(string $section, int $id, ?array $user = null): void
{
    $section = dashboard_validate_section($section);

    try {
        ensure_admin_dashboard_tables();
        $existing = dashboard_get_record($section, $id);
        $stmt = db()->prepare("DELETE FROM dashboard_records WHERE section_key = ? AND id = ?");
        $stmt->execute([$section, $id]);

        dashboard_audit($user, 'delete', $section, $id, $existing);
    } catch (Throwable $error) {
        error_log('RTBO dashboard delete using file fallback: ' . $error->getMessage());
        dashboard_file_delete_record($section, $id, $user);
    }
}

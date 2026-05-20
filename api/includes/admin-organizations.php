<?php
declare(strict_types=1);

require_once __DIR__ . '/admin-members.php';
require_once __DIR__ . '/admin-schools.php';

function admin_organization_defaults(): array
{
    return [
        'High School Jr. High Girls',
        'High School Jr. High Boys',
        'High School Jr. Varsity Girls',
        'High School Jr. Varsity Boys',
        'Varsity Girls',
        'Varsity Boys',
        'NJCAA Women',
        'NJCAA Men',
        'NAIA Women',
        'NAIA Men',
        'NCAA DIII Men',
        'NCAA DIII Women',
        'NCAA DII Men',
        'NCAA DII Women',
        'NCAA DI Men',
        'NCAA DI Women',
        'Pro-Am Men',
        'Pro-Am Women',
    ];
}

function admin_organization_storage_path(): string
{
    return STORAGE_DIR . '/admin-organization-classifications.json';
}

function admin_official_classification_links_storage_path(): string
{
    return STORAGE_DIR . '/admin-official-classification-links.json';
}

function admin_official_classification_conferences_storage_path(): string
{
    return STORAGE_DIR . '/admin-official-classification-conferences.json';
}

function ensure_organization_classifications_table(): void
{
    db()->exec(
        "CREATE TABLE IF NOT EXISTS organization_classifications (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(190) NOT NULL UNIQUE,
            status VARCHAR(40) NOT NULL DEFAULT 'active',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )"
    );

    $stmt = db()->query('SELECT COUNT(*) FROM organization_classifications');
    if ((int) $stmt->fetchColumn() === 0) {
        $insert = db()->prepare('INSERT INTO organization_classifications(name, status) VALUES(?, "active")');
        foreach (admin_organization_defaults() as $name) {
            $insert->execute([$name]);
        }
    }

    db()->exec(
        "CREATE TABLE IF NOT EXISTS official_classification_links (
            official_id INT NOT NULL,
            classification_id INT NOT NULL,
            conference VARCHAR(190) NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (official_id, classification_id),
            INDEX idx_official_classification_links_classification (classification_id)
        )"
    );

    try {
        $column = db()->query("SHOW COLUMNS FROM official_classification_links LIKE 'conference'")->fetch();
        if (!$column) {
            db()->exec('ALTER TABLE official_classification_links ADD COLUMN conference VARCHAR(190) NULL AFTER classification_id');
        }
    } catch (Throwable $error) {
        error_log('RTBO official classification conference column check failed: ' . $error->getMessage());
    }
}

function admin_organizations_db_available(): bool
{
    try {
        ensure_organization_classifications_table();
        return true;
    } catch (Throwable $error) {
        error_log('RTBO organization classifications database unavailable: ' . $error->getMessage());
        return false;
    }
}

function admin_organization_normalize(array $record): array
{
    return [
        'id' => (int) ($record['id'] ?? 0),
        'name' => trim((string) ($record['name'] ?? '')),
        'status' => in_array((string) ($record['status'] ?? 'active'), ['active', 'inactive', 'deleted'], true) ? (string) ($record['status'] ?? 'active') : 'active',
        'created_at' => (string) ($record['created_at'] ?? ''),
    ];
}

function admin_organizations_read_file(): array
{
    $path = admin_organization_storage_path();
    if (!is_file($path)) {
        $defaults = [];
        foreach (admin_organization_defaults() as $index => $name) {
            $defaults[] = ['id' => $index + 1, 'name' => $name, 'status' => 'active', 'created_at' => date('c')];
        }
        admin_organizations_write_file($defaults);
        return $defaults;
    }

    $decoded = json_decode((string) file_get_contents($path), true);
    return is_array($decoded) ? array_values($decoded) : [];
}

function admin_organizations_write_file(array $records): void
{
    ensure_dir(dirname(admin_organization_storage_path()));
    file_put_contents(
        admin_organization_storage_path(),
        json_encode(array_values($records), JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES),
        LOCK_EX
    );
}

function admin_organizations_list(): array
{
    if (!admin_organizations_db_available()) {
        return array_values(array_filter(
            array_map('admin_organization_normalize', admin_organizations_read_file()),
            static fn (array $record): bool => ($record['status'] ?? '') === 'active'
        ));
    }

    $stmt = db()->query(
        "SELECT *
         FROM organization_classifications
         WHERE status = 'active'
         ORDER BY name"
    );
    return array_map('admin_organization_normalize', $stmt->fetchAll());
}

function admin_organization_officials_list(): array
{
    return array_values(array_filter(
        admin_members_list(),
        static fn (array $member): bool => ($member['role'] ?? '') === 'official' && ($member['status'] ?? '') !== 'deleted'
    ));
}

function admin_organization_entity_groups(): array
{
    $members = array_values(array_filter(
        admin_members_list(),
        static fn (array $member): bool => ($member['status'] ?? '') !== 'deleted'
    ));
    $memberItems = static fn (array $rows): array => array_values(array_map(static fn (array $member): array => [
        'id' => (int) ($member['id'] ?? 0),
        'name' => (string) ($member['name'] ?? ''),
        'email' => (string) ($member['email'] ?? ''),
        'status' => (string) ($member['status'] ?? ''),
    ], $rows));
    $roleGroup = static fn (string $key, string $label, array $roles) => [
        'key' => $key,
        'label' => $label,
        'items' => $memberItems(array_filter($members, static fn (array $member): bool => in_array((string) ($member['role'] ?? ''), $roles, true))),
    ];

    $schools = [];
    try {
        $schools = array_values(array_filter(
            admin_schools_list(),
            static fn (array $record): bool => ($record['status'] ?? '') === 'active'
        ));
    } catch (Throwable $error) {
        error_log('RTBO classification school/team list failed: ' . $error->getMessage());
    }

    return [
        $roleGroup('officials', 'Officials', ['official']),
        $roleGroup('coaches', 'Coaches', ['coach', 'assistant_coach']),
        $roleGroup('athletic_directors', 'Athletic Directors', ['athletic_director', 'assistant_athletic_director']),
        $roleGroup('sports_information_directors', 'Sports Information Directors', ['sports_information_director']),
        $roleGroup('conference_commissioners', 'Conference Commissioners', ['conference_commissioner']),
        $roleGroup('game_day_admins', 'Game Day Admins', ['game_day_admin']),
        $roleGroup('evaluators', 'Evaluators', ['evaluator']),
        $roleGroup('observers', 'Observers', ['observer']),
        $roleGroup('admins', 'Admins', ['admin']),
        [
            'key' => 'teams_schools',
            'label' => 'Teams / Schools',
            'items' => array_values(array_map(static fn (array $record): array => [
                'id' => (int) ($record['id'] ?? 0),
                'name' => (string) ($record['name'] ?? ''),
                'email' => '',
            ], $schools)),
        ],
    ];
}

function admin_official_classification_links_read_file(): array
{
    $path = admin_official_classification_links_storage_path();
    if (!is_file($path)) {
        return [];
    }

    $decoded = json_decode((string) file_get_contents($path), true);
    if (!is_array($decoded)) {
        return [];
    }

    $links = [];
    foreach ($decoded as $officialId => $classificationIds) {
        if (!is_array($classificationIds)) {
            continue;
        }
        $links[(string) (int) $officialId] = array_values(array_unique(array_map('intval', $classificationIds)));
    }
    return $links;
}

function admin_official_classification_links_write_file(array $links): void
{
    ensure_dir(dirname(admin_official_classification_links_storage_path()));
    file_put_contents(
        admin_official_classification_links_storage_path(),
        json_encode($links, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES),
        LOCK_EX
    );
}

function admin_official_classification_conferences_read_file(): array
{
    $path = admin_official_classification_conferences_storage_path();
    if (!is_file($path)) {
        return [];
    }

    $decoded = json_decode((string) file_get_contents($path), true);
    if (!is_array($decoded)) {
        return [];
    }

    $links = [];
    foreach ($decoded as $officialId => $classificationConferences) {
        if (!is_array($classificationConferences)) {
            continue;
        }
        $officialKey = (string) (int) $officialId;
        $links[$officialKey] = [];
        foreach ($classificationConferences as $classificationId => $conference) {
            $conference = trim((string) $conference);
            if ($conference === '') {
                continue;
            }
            $links[$officialKey][(string) (int) $classificationId] = substr($conference, 0, 190);
        }
    }
    return $links;
}

function admin_official_classification_conferences_write_file(array $links): void
{
    ensure_dir(dirname(admin_official_classification_conferences_storage_path()));
    file_put_contents(
        admin_official_classification_conferences_storage_path(),
        json_encode($links, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES),
        LOCK_EX
    );
}

function admin_official_classification_links_list(): array
{
    if (!admin_organizations_db_available()) {
        return admin_official_classification_links_read_file();
    }

    $stmt = db()->query(
        "SELECT official_id, classification_id
         FROM official_classification_links
         ORDER BY official_id, classification_id"
    );

    $links = [];
    foreach ($stmt->fetchAll() as $row) {
        $officialId = (string) (int) $row['official_id'];
        $links[$officialId] ??= [];
        $links[$officialId][] = (int) $row['classification_id'];
    }
    return $links;
}

function admin_official_classification_conferences_list(): array
{
    if (!admin_organizations_db_available()) {
        return admin_official_classification_conferences_read_file();
    }

    $stmt = db()->query(
        "SELECT official_id, classification_id, conference
         FROM official_classification_links
         WHERE conference IS NOT NULL AND conference <> ''
         ORDER BY official_id, classification_id"
    );

    $links = [];
    foreach ($stmt->fetchAll() as $row) {
        $officialId = (string) (int) $row['official_id'];
        $classificationId = (string) (int) $row['classification_id'];
        $conference = trim((string) ($row['conference'] ?? ''));
        if ($conference === '') {
            continue;
        }
        $links[$officialId] ??= [];
        $links[$officialId][$classificationId] = $conference;
    }
    return $links;
}

function admin_official_classifications_save(int $officialId, array $classificationIds, array $classificationConferences = []): array
{
    if ($officialId <= 0) {
        throw new RuntimeException('A valid official is required.');
    }

    $classificationIds = array_values(array_unique(array_filter(
        array_map('intval', $classificationIds),
        static fn (int $id): bool => $id > 0
    )));

    $conferenceByClassificationId = [];
    foreach ($classificationConferences as $classificationId => $conference) {
        $classificationId = (int) $classificationId;
        $conference = substr(trim((string) $conference), 0, 190);
        if ($classificationId > 0 && $conference !== '') {
            $conferenceByClassificationId[$classificationId] = $conference;
        }
    }

    if (!admin_organizations_db_available()) {
        $officialExists = false;
        foreach (admin_organization_officials_list() as $official) {
            if ((int) ($official['id'] ?? 0) === $officialId) {
                $officialExists = true;
                break;
            }
        }
        if (!$officialExists) {
            throw new RuntimeException('Official not found.');
        }

        $validClassificationIds = array_map(static fn (array $record): int => (int) $record['id'], admin_organizations_list());
        $classificationIds = array_values(array_intersect($classificationIds, $validClassificationIds));
        $links = admin_official_classification_links_read_file();
        $links[(string) $officialId] = $classificationIds;
        admin_official_classification_links_write_file($links);
        $conferenceLinks = admin_official_classification_conferences_read_file();
        $conferenceLinks[(string) $officialId] = [];
        foreach ($classificationIds as $classificationId) {
            if (isset($conferenceByClassificationId[$classificationId])) {
                $conferenceLinks[(string) $officialId][(string) $classificationId] = $conferenceByClassificationId[$classificationId];
            }
        }
        if (!$conferenceLinks[(string) $officialId]) {
            unset($conferenceLinks[(string) $officialId]);
        }
        admin_official_classification_conferences_write_file($conferenceLinks);
        return $classificationIds;
    }

    $official = db()->prepare("SELECT id FROM users WHERE id = ? AND role = 'official' AND status <> 'deleted' LIMIT 1");
    $official->execute([$officialId]);
    if (!$official->fetchColumn()) {
        throw new RuntimeException('Official not found.');
    }

    if ($classificationIds) {
        $placeholders = implode(',', array_fill(0, count($classificationIds), '?'));
        $valid = db()->prepare("SELECT id FROM organization_classifications WHERE id IN ({$placeholders}) AND status = 'active'");
        $valid->execute($classificationIds);
        $classificationIds = array_map('intval', $valid->fetchAll(PDO::FETCH_COLUMN));
    }

    $conferenceByClassificationId = array_intersect_key($conferenceByClassificationId, array_flip($classificationIds));

    db()->beginTransaction();
    try {
        $delete = db()->prepare('DELETE FROM official_classification_links WHERE official_id = ?');
        $delete->execute([$officialId]);

        if ($classificationIds) {
            $insert = db()->prepare('INSERT INTO official_classification_links(official_id, classification_id, conference) VALUES(?, ?, ?)');
            foreach ($classificationIds as $classificationId) {
                $insert->execute([$officialId, $classificationId, $conferenceByClassificationId[$classificationId] ?? null]);
            }
        }
        db()->commit();
    } catch (Throwable $error) {
        db()->rollBack();
        throw $error;
    }

    return $classificationIds;
}

function admin_organization_require_valid(array $record): array
{
    $normalized = admin_organization_normalize($record);
    if ($normalized['name'] === '') {
        throw new RuntimeException('Classification name is required.');
    }
    $normalized['status'] = 'active';
    return $normalized;
}

function admin_organization_create(array $record): array
{
    $normalized = admin_organization_require_valid($record);

    if (!admin_organizations_db_available()) {
        $records = admin_organizations_read_file();
        $normalized['id'] = (int) (max(array_map(static fn ($row) => (int) ($row['id'] ?? 0), $records ?: [['id' => 0]])) + 1);
        $normalized['created_at'] = date('c');
        $records[] = $normalized;
        admin_organizations_write_file($records);
        return $normalized;
    }

    $stmt = db()->prepare('INSERT INTO organization_classifications(name, status) VALUES(?, ?)');
    $stmt->execute([$normalized['name'], $normalized['status']]);

    $fresh = db()->prepare('SELECT * FROM organization_classifications WHERE id = ? LIMIT 1');
    $fresh->execute([(int) db()->lastInsertId()]);
    return admin_organization_normalize($fresh->fetch() ?: []);
}

function admin_organization_update(int $id, array $record): array
{
    if ($id <= 0) {
        throw new RuntimeException('A valid classification id is required.');
    }
    $normalized = admin_organization_require_valid(['id' => $id, ...$record]);

    if (!admin_organizations_db_available()) {
        $records = admin_organizations_read_file();
        foreach ($records as $index => $existing) {
            if ((int) ($existing['id'] ?? 0) === $id) {
                $records[$index] = [...$existing, ...$normalized, 'id' => $id];
                admin_organizations_write_file($records);
                return admin_organization_normalize($records[$index]);
            }
        }
        throw new RuntimeException('Classification not found.');
    }

    $stmt = db()->prepare('UPDATE organization_classifications SET name = ?, status = ? WHERE id = ?');
    $stmt->execute([$normalized['name'], $normalized['status'], $id]);

    $fresh = db()->prepare('SELECT * FROM organization_classifications WHERE id = ? LIMIT 1');
    $fresh->execute([$id]);
    $freshRecord = $fresh->fetch();
    if (!$freshRecord) {
        throw new RuntimeException('Classification not found.');
    }
    return admin_organization_normalize($freshRecord);
}

function admin_organization_delete(int $id): void
{
    if ($id <= 0) {
        throw new RuntimeException('A valid classification id is required.');
    }

    if (!admin_organizations_db_available()) {
        admin_organizations_write_file(array_values(array_filter(
            admin_organizations_read_file(),
            static fn ($record) => (int) ($record['id'] ?? 0) !== $id
        )));
        $links = admin_official_classification_links_read_file();
        foreach ($links as $officialId => $classificationIds) {
            $links[$officialId] = array_values(array_filter(
                $classificationIds,
                static fn (int $classificationId): bool => $classificationId !== $id
            ));
        }
        admin_official_classification_links_write_file($links);
        return;
    }

    $stmt = db()->prepare("UPDATE organization_classifications SET status = 'deleted' WHERE id = ?");
    $stmt->execute([$id]);

    $links = db()->prepare('DELETE FROM official_classification_links WHERE classification_id = ?');
    $links->execute([$id]);
}

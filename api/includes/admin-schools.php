<?php
declare(strict_types=1);

function admin_schools_storage_path(): string
{
    return STORAGE_DIR . '/admin-schools-teams.json';
}

function ensure_schools_teams_table(): void
{
    db()->exec(
        "CREATE TABLE IF NOT EXISTS schools_teams (
            id INT AUTO_INCREMENT PRIMARY KEY,
            record_type VARCHAR(30) NOT NULL DEFAULT 'school',
            name VARCHAR(190) NOT NULL,
            school_id INT NULL,
            school_name VARCHAR(190),
            athletic_website_url VARCHAR(255),
            logo_url VARCHAR(255),
            logo_source VARCHAR(255),
            logo_scraped_at DATETIME NULL,
            gym_name VARCHAR(190),
            address_line1 VARCHAR(190),
            city VARCHAR(120),
            state VARCHAR(80),
            zip VARCHAR(30),
            location_lat DECIMAL(10,7) NULL,
            location_lng DECIMAL(10,7) NULL,
            courts INT NOT NULL DEFAULT 1,
            court_labels TEXT NULL,
            head_coach_name VARCHAR(190),
            head_coach_email VARCHAR(190),
            head_coach_phone VARCHAR(60),
            status VARCHAR(40) NOT NULL DEFAULT 'active',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )"
    );

    foreach ([
        'school_id' => "ALTER TABLE schools_teams ADD COLUMN school_id INT NULL AFTER name",
        'athletic_website_url' => "ALTER TABLE schools_teams ADD COLUMN athletic_website_url VARCHAR(255) NULL AFTER school_name",
        'logo_url' => "ALTER TABLE schools_teams ADD COLUMN logo_url VARCHAR(255) NULL AFTER athletic_website_url",
        'logo_source' => "ALTER TABLE schools_teams ADD COLUMN logo_source VARCHAR(255) NULL AFTER logo_url",
        'logo_scraped_at' => "ALTER TABLE schools_teams ADD COLUMN logo_scraped_at DATETIME NULL AFTER logo_source",
        'location_lat' => "ALTER TABLE schools_teams ADD COLUMN location_lat DECIMAL(10,7) NULL AFTER zip",
        'location_lng' => "ALTER TABLE schools_teams ADD COLUMN location_lng DECIMAL(10,7) NULL AFTER location_lat",
        'court_labels' => "ALTER TABLE schools_teams ADD COLUMN court_labels TEXT NULL AFTER courts",
        'head_coach_name' => "ALTER TABLE schools_teams ADD COLUMN head_coach_name VARCHAR(190) NULL AFTER courts",
        'head_coach_email' => "ALTER TABLE schools_teams ADD COLUMN head_coach_email VARCHAR(190) NULL AFTER head_coach_name",
        'head_coach_phone' => "ALTER TABLE schools_teams ADD COLUMN head_coach_phone VARCHAR(60) NULL AFTER head_coach_email",
    ] as $column => $sql) {
        $stmt = db()->prepare(
            "SELECT COUNT(*)
             FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE()
               AND TABLE_NAME = 'schools_teams'
               AND COLUMN_NAME = ?"
        );
        $stmt->execute([$column]);
        if ((int) $stmt->fetchColumn() === 0) {
            db()->exec($sql);
        }
    }
}

function admin_schools_db_available(): bool
{
    try {
        ensure_schools_teams_table();
        return true;
    } catch (Throwable $error) {
        error_log('RTBO schools/teams database unavailable: ' . $error->getMessage());
        return false;
    }
}

function admin_school_normalize(array $record): array
{
    $type = strtolower(trim((string) ($record['record_type'] ?? $record['type'] ?? 'school')));
    if (!in_array($type, ['school', 'event_center', 'team'], true)) {
        $type = 'school';
    }
    $typeLabel = match ($type) {
        'team' => 'Team',
        'event_center' => 'Event Center',
        default => 'School',
    };

    $normalized = [
        'id' => (int) ($record['id'] ?? 0),
        'record_type' => $type,
        'type_label' => $typeLabel,
        'name' => trim((string) ($record['name'] ?? '')),
        'school_id' => (int) ($record['school_id'] ?? $record['schoolId'] ?? $record['linked_school_id'] ?? $record['linkedSchoolId'] ?? 0),
        'school_name' => trim((string) ($record['school_name'] ?? $record['schoolName'] ?? '')),
        'athletic_website_url' => trim((string) ($record['athletic_website_url'] ?? $record['athleticWebsiteUrl'] ?? '')),
        'logo_url' => trim((string) ($record['logo_url'] ?? $record['logoUrl'] ?? '')),
        'logo_source' => trim((string) ($record['logo_source'] ?? $record['logoSource'] ?? '')),
        'logo_scraped_at' => (string) ($record['logo_scraped_at'] ?? ''),
        'gym_name' => trim((string) ($record['gym_name'] ?? $record['gymName'] ?? '')),
        'address_line1' => trim((string) ($record['address_line1'] ?? $record['addressLine1'] ?? '')),
        'city' => trim((string) ($record['city'] ?? '')),
        'state' => trim((string) ($record['state'] ?? '')),
        'zip' => trim((string) ($record['zip'] ?? '')),
        'location_lat' => isset($record['location_lat']) && $record['location_lat'] !== null && $record['location_lat'] !== '' ? (float) $record['location_lat'] : null,
        'location_lng' => isset($record['location_lng']) && $record['location_lng'] !== null && $record['location_lng'] !== '' ? (float) $record['location_lng'] : null,
        'courts' => max(1, (int) ($record['courts'] ?? 1)),
        'court_labels' => trim((string) ($record['court_labels'] ?? $record['courtLabels'] ?? '')),
        'head_coach_name' => trim((string) ($record['head_coach_name'] ?? $record['headCoachName'] ?? '')),
        'head_coach_email' => trim((string) ($record['head_coach_email'] ?? $record['headCoachEmail'] ?? '')),
        'head_coach_phone' => rtbo_format_phone_number((string) ($record['head_coach_phone'] ?? $record['headCoachPhone'] ?? '')),
        'status' => in_array((string) ($record['status'] ?? 'active'), ['active', 'inactive'], true) ? (string) ($record['status'] ?? 'active') : 'active',
        'created_at' => (string) ($record['created_at'] ?? ''),
    ];
    $normalized['court_options'] = admin_school_court_options($normalized);

    return $normalized;
}

function admin_school_court_options(array $record): array
{
    $labels = preg_split('/[\r\n,]+/', (string) ($record['court_labels'] ?? '')) ?: [];
    $options = array_values(array_unique(array_filter(array_map(
        static fn ($label): string => trim((string) $label),
        $labels
    ))));

    if ($options) {
        return $options;
    }

    $courtCount = max(1, (int) ($record['courts'] ?? 1));
    if ($courtCount === 1) {
        return [trim((string) ($record['gym_name'] ?? '')) ?: 'Main'];
    }

    return array_map(
        static fn (int $number): string => 'Court ' . $number,
        range(1, $courtCount)
    );
}

function admin_schools_read_file(): array
{
    $path = admin_schools_storage_path();
    if (!is_file($path)) {
        return [];
    }

    $decoded = json_decode((string) file_get_contents($path), true);
    return is_array($decoded) ? array_values($decoded) : [];
}

function admin_schools_write_file(array $records): void
{
    ensure_dir(dirname(admin_schools_storage_path()));
    file_put_contents(
        admin_schools_storage_path(),
        json_encode(array_values($records), JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES),
        LOCK_EX
    );
}

function admin_schools_list(): array
{
    if (!admin_schools_db_available()) {
        return array_map('admin_school_normalize', admin_schools_read_file());
    }

    $stmt = db()->query(
        "SELECT *
         FROM schools_teams
         WHERE status <> 'deleted'
         ORDER BY record_type, name"
    );
    return array_map('admin_school_normalize', $stmt->fetchAll());
}

function admin_school_require_valid(array $record): array
{
    $normalized = admin_school_normalize($record);
    if ($normalized['name'] === '') {
        throw new RuntimeException('School or team name is required.');
    }
    if ($normalized['record_type'] === 'team' && $normalized['school_id'] <= 0) {
        throw new RuntimeException('A team must be linked to a school.');
    }
    if ($normalized['record_type'] !== 'team') {
        $normalized['school_id'] = 0;
    }
    foreach (['athletic_website_url', 'logo_url'] as $urlField) {
        if ($normalized[$urlField] !== '' && !filter_var($normalized[$urlField], FILTER_VALIDATE_URL)) {
            throw new RuntimeException('Please enter a valid URL for ' . str_replace('_', ' ', $urlField) . '.');
        }
    }
    if ($normalized['head_coach_email'] !== '' && !filter_var($normalized['head_coach_email'], FILTER_VALIDATE_EMAIL)) {
        throw new RuntimeException('Please enter a valid head coach email address.');
    }
    if ($normalized['logo_url'] === '' && $normalized['athletic_website_url'] !== '') {
        $scrapedLogo = admin_school_scrape_logo_url($normalized['athletic_website_url']);
        if ($scrapedLogo !== '') {
            $normalized['logo_url'] = $scrapedLogo;
            $normalized['logo_source'] = $normalized['athletic_website_url'];
            $normalized['logo_scraped_at'] = date('Y-m-d H:i:s');
        }
    }

    if ($normalized['record_type'] === 'team') {
        $linkedSchool = admin_school_find_active_by_id($normalized['school_id'], 'school');
        if (!$linkedSchool) {
            throw new RuntimeException('Selected school could not be found for this team.');
        }
        if ($normalized['school_name'] === '') {
            $normalized['school_name'] = (string) ($linkedSchool['name'] ?? '');
        }
        if ($normalized['gym_name'] === '') {
            $normalized['gym_name'] = (string) ($linkedSchool['gym_name'] ?? '');
        }
        if ($normalized['address_line1'] === '') {
            $normalized['address_line1'] = (string) ($linkedSchool['address_line1'] ?? '');
            $normalized['city'] = $normalized['city'] ?: (string) ($linkedSchool['city'] ?? '');
            $normalized['state'] = $normalized['state'] ?: (string) ($linkedSchool['state'] ?? '');
            $normalized['zip'] = $normalized['zip'] ?: (string) ($linkedSchool['zip'] ?? '');
        }
    }

    return $normalized;
}

function admin_school_find_active_by_id(int $id, ?string $type = null): ?array
{
    if ($id <= 0) {
        return null;
    }

    foreach (admin_schools_list() as $record) {
        if ((int) ($record['id'] ?? 0) === $id
            && ($record['status'] ?? 'active') === 'active'
            && ($type === null || ($record['record_type'] ?? '') === $type)
        ) {
            return $record;
        }
    }

    return null;
}

function admin_school_public_url(string $url): string
{
    $url = trim($url);
    if ($url === '' || !filter_var($url, FILTER_VALIDATE_URL)) {
        return '';
    }

    $parts = parse_url($url);
    $scheme = strtolower((string) ($parts['scheme'] ?? ''));
    $host = strtolower((string) ($parts['host'] ?? ''));
    if (!in_array($scheme, ['http', 'https'], true) || $host === '' || in_array($host, ['localhost', '127.0.0.1', '::1'], true)) {
        return '';
    }

    if (filter_var($host, FILTER_VALIDATE_IP)) {
        $flags = FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE;
        if (!filter_var($host, FILTER_VALIDATE_IP, $flags)) {
            return '';
        }
    }

    return $url;
}

function admin_school_resolve_url(string $baseUrl, string $assetUrl): string
{
    $assetUrl = trim(html_entity_decode($assetUrl, ENT_QUOTES));
    if ($assetUrl === '') {
        return '';
    }
    if (str_starts_with($assetUrl, '//')) {
        $scheme = parse_url($baseUrl, PHP_URL_SCHEME) ?: 'https';
        return admin_school_public_url($scheme . ':' . $assetUrl);
    }
    if (filter_var($assetUrl, FILTER_VALIDATE_URL)) {
        return admin_school_public_url($assetUrl);
    }

    $parts = parse_url($baseUrl);
    $scheme = (string) ($parts['scheme'] ?? 'https');
    $host = (string) ($parts['host'] ?? '');
    if ($host === '') {
        return '';
    }
    $path = str_starts_with($assetUrl, '/')
        ? $assetUrl
        : rtrim(dirname((string) ($parts['path'] ?? '/')), '/') . '/' . $assetUrl;

    return admin_school_public_url($scheme . '://' . $host . '/' . ltrim($path, '/'));
}

function admin_school_scrape_logo_url(string $athleticWebsiteUrl): string
{
    $safeUrl = admin_school_public_url($athleticWebsiteUrl);
    if ($safeUrl === '') {
        return '';
    }

    $html = @file_get_contents($safeUrl, false, stream_context_create([
        'http' => [
            'timeout' => 4,
            'max_redirects' => 3,
            'user_agent' => 'RTBOLogoScraper/1.0',
        ],
    ]));
    if (!is_string($html) || $html === '') {
        return '';
    }

    $patterns = [
        '/<meta[^>]+property=["\']og:image["\'][^>]+content=["\']([^"\']+)["\']/i',
        '/<meta[^>]+content=["\']([^"\']+)["\'][^>]+property=["\']og:image["\']/i',
        '/<link[^>]+rel=["\'][^"\']*(?:apple-touch-icon|icon)[^"\']*["\'][^>]+href=["\']([^"\']+)["\']/i',
        '/<link[^>]+href=["\']([^"\']+)["\'][^>]+rel=["\'][^"\']*(?:apple-touch-icon|icon)[^"\']*["\']/i',
    ];

    foreach ($patterns as $pattern) {
        if (preg_match($pattern, $html, $matches)) {
            $resolved = admin_school_resolve_url($safeUrl, $matches[1]);
            if ($resolved !== '') {
                return $resolved;
            }
        }
    }

    return '';
}

function admin_school_create(array $record): array
{
    $normalized = admin_school_require_valid($record);

    if (!admin_schools_db_available()) {
        $records = admin_schools_read_file();
        $normalized['id'] = (int) (max(array_map(static fn ($row) => (int) ($row['id'] ?? 0), $records ?: [['id' => 0]])) + 1);
        $normalized['created_at'] = date('c');
        $records[] = $normalized;
        admin_schools_write_file($records);
        return $normalized;
    }

    $stmt = db()->prepare(
        "INSERT INTO schools_teams(record_type, name, school_id, school_name, athletic_website_url, logo_url, logo_source, logo_scraped_at, gym_name, address_line1, city, state, zip, location_lat, location_lng, courts, court_labels, head_coach_name, head_coach_email, head_coach_phone, status)
         VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    );
    $stmt->execute([
        $normalized['record_type'],
        $normalized['name'],
        $normalized['school_id'] > 0 ? $normalized['school_id'] : null,
        $normalized['school_name'],
        $normalized['athletic_website_url'],
        $normalized['logo_url'],
        $normalized['logo_source'],
        $normalized['logo_scraped_at'] ?: null,
        $normalized['gym_name'],
        $normalized['address_line1'],
        $normalized['city'],
        $normalized['state'],
        $normalized['zip'],
        $normalized['location_lat'],
        $normalized['location_lng'],
        $normalized['courts'],
        $normalized['court_labels'],
        $normalized['head_coach_name'],
        $normalized['head_coach_email'],
        $normalized['head_coach_phone'],
        $normalized['status'],
    ]);

    $fresh = db()->prepare('SELECT * FROM schools_teams WHERE id = ? LIMIT 1');
    $fresh->execute([(int) db()->lastInsertId()]);
    return admin_school_normalize($fresh->fetch() ?: []);
}

function admin_school_update(int $id, array $record): array
{
    if ($id <= 0) {
        throw new RuntimeException('A valid school/team id is required.');
    }
    $normalized = admin_school_require_valid(['id' => $id, ...$record]);

    if (!admin_schools_db_available()) {
        $records = admin_schools_read_file();
        foreach ($records as $index => $existing) {
            if ((int) ($existing['id'] ?? 0) === $id) {
                $records[$index] = [...$existing, ...$normalized, 'id' => $id];
                admin_schools_write_file($records);
                return admin_school_normalize($records[$index]);
            }
        }
        throw new RuntimeException('School/team not found.');
    }

    $stmt = db()->prepare(
        "UPDATE schools_teams
         SET record_type = ?, name = ?, school_id = ?, school_name = ?, athletic_website_url = ?, logo_url = ?, logo_source = ?, logo_scraped_at = ?, gym_name = ?, address_line1 = ?, city = ?, state = ?, zip = ?, location_lat = ?, location_lng = ?, courts = ?, court_labels = ?, head_coach_name = ?, head_coach_email = ?, head_coach_phone = ?, status = ?
         WHERE id = ?"
    );
    $stmt->execute([
        $normalized['record_type'],
        $normalized['name'],
        $normalized['school_id'] > 0 ? $normalized['school_id'] : null,
        $normalized['school_name'],
        $normalized['athletic_website_url'],
        $normalized['logo_url'],
        $normalized['logo_source'],
        $normalized['logo_scraped_at'] ?: null,
        $normalized['gym_name'],
        $normalized['address_line1'],
        $normalized['city'],
        $normalized['state'],
        $normalized['zip'],
        $normalized['location_lat'],
        $normalized['location_lng'],
        $normalized['courts'],
        $normalized['court_labels'],
        $normalized['head_coach_name'],
        $normalized['head_coach_email'],
        $normalized['head_coach_phone'],
        $normalized['status'],
        $id,
    ]);

    $fresh = db()->prepare('SELECT * FROM schools_teams WHERE id = ? LIMIT 1');
    $fresh->execute([$id]);
    $freshRecord = $fresh->fetch();
    if (!$freshRecord) {
        throw new RuntimeException('School/team not found.');
    }
    return admin_school_normalize($freshRecord);
}

function admin_school_delete(int $id): void
{
    if ($id <= 0) {
        throw new RuntimeException('A valid school/team id is required.');
    }

    if (!admin_schools_db_available()) {
        admin_schools_write_file(array_values(array_filter(
            admin_schools_read_file(),
            static fn ($record) => (int) ($record['id'] ?? 0) !== $id
        )));
        return;
    }

    $stmt = db()->prepare("UPDATE schools_teams SET status = 'deleted' WHERE id = ?");
    $stmt->execute([$id]);
}

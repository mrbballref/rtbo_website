<?php
declare(strict_types=1);

function rtbo_geo_column_exists(string $table, string $column): bool
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
        error_log('RTBO geo column lookup failed: ' . $error->getMessage());
        return false;
    }
}

function rtbo_ensure_geo_tables(): void
{
    db()->exec(
        "CREATE TABLE IF NOT EXISTS member_geo_locations (
            user_id INT PRIMARY KEY,
            latitude DECIMAL(10,7) NOT NULL,
            longitude DECIMAL(10,7) NOT NULL,
            accuracy_meters DECIMAL(10,2) NULL,
            heading DECIMAL(10,2) NULL,
            speed_mps DECIMAL(10,2) NULL,
            source VARCHAR(50) NOT NULL DEFAULT 'browser',
            consent_enabled TINYINT(1) NOT NULL DEFAULT 1,
            updated_at DATETIME NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_member_geo_locations_updated (updated_at)
        )"
    );

    db()->exec(
        "CREATE TABLE IF NOT EXISTS assignment_arrival_status (
            assignment_id INT PRIMARY KEY,
            game_id INT NOT NULL,
            official_id INT NOT NULL,
            current_distance_miles DECIMAL(8,2) NULL,
            inside_radius TINYINT(1) NOT NULL DEFAULT 0,
            arrival_radius_miles DECIMAL(5,2) NOT NULL DEFAULT 0.25,
            arrival_verified_at DATETIME NULL,
            last_inside_radius_at DATETIME NULL,
            left_site_at DATETIME NULL,
            last_seen_at DATETIME NOT NULL,
            updated_at DATETIME NOT NULL,
            INDEX idx_assignment_arrival_game (game_id),
            INDEX idx_assignment_arrival_official (official_id),
            INDEX idx_assignment_arrival_verified (arrival_verified_at)
        )"
    );
}

function rtbo_ensure_game_geo_columns(): void
{
    try {
        if (!rtbo_geo_column_exists('games', 'published')) {
            db()->exec('ALTER TABLE games ADD COLUMN published TINYINT(1) NOT NULL DEFAULT 0 AFTER status');
        }
        if (!rtbo_geo_column_exists('games', 'location_lat')) {
            db()->exec('ALTER TABLE games ADD COLUMN location_lat DECIMAL(10,7) NULL AFTER location_address');
        }
        if (!rtbo_geo_column_exists('games', 'location_lng')) {
            db()->exec('ALTER TABLE games ADD COLUMN location_lng DECIMAL(10,7) NULL AFTER location_lat');
        }
    } catch (Throwable $error) {
        error_log('RTBO game geo column setup failed: ' . $error->getMessage());
    }
}

function rtbo_geo_distance_miles(float $lat1, float $lng1, float $lat2, float $lng2): float
{
    $earthRadiusMiles = 3958.7613;
    $latDelta = deg2rad($lat2 - $lat1);
    $lngDelta = deg2rad($lng2 - $lng1);
    $a = sin($latDelta / 2) ** 2
        + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($lngDelta / 2) ** 2;
    $c = 2 * atan2(sqrt($a), sqrt(1 - $a));
    return $earthRadiusMiles * $c;
}

function rtbo_geo_public_location(array $row): array
{
    return [
        'user_id' => (int) ($row['user_id'] ?? 0),
        'latitude' => isset($row['latitude']) ? (float) $row['latitude'] : null,
        'longitude' => isset($row['longitude']) ? (float) $row['longitude'] : null,
        'accuracy_meters' => isset($row['accuracy_meters']) ? (float) $row['accuracy_meters'] : null,
        'heading' => isset($row['heading']) ? (float) $row['heading'] : null,
        'speed_mps' => isset($row['speed_mps']) ? (float) $row['speed_mps'] : null,
        'source' => (string) ($row['source'] ?? ''),
        'consent_enabled' => (bool) ($row['consent_enabled'] ?? false),
        'updated_at' => (string) ($row['updated_at'] ?? ''),
    ];
}

function rtbo_geo_profile_photo_url(array $row): string
{
    $photo = (string) ($row['profile_photo'] ?? $row['photo'] ?? '');
    if ($photo !== '' && !str_starts_with($photo, 'http') && !str_starts_with($photo, '/api/')) {
        $photo = '/api/profile-photo.php?id=' . (int) ($row['id'] ?? 0);
    }

    return $photo;
}

function rtbo_geo_location_for_user(int $userId): ?array
{
    if ($userId <= 0) {
        return null;
    }

    try {
        rtbo_ensure_geo_tables();
        $stmt = db()->prepare('SELECT * FROM member_geo_locations WHERE user_id = ? LIMIT 1');
        $stmt->execute([$userId]);
        $row = $stmt->fetch();
        return $row ? rtbo_geo_public_location($row) : null;
    } catch (Throwable $error) {
        error_log('RTBO geo location lookup failed: ' . $error->getMessage());
        return null;
    }
}

function rtbo_geo_upsert_location(int $userId, array $payload): array
{
    $latitude = filter_var($payload['latitude'] ?? null, FILTER_VALIDATE_FLOAT);
    $longitude = filter_var($payload['longitude'] ?? null, FILTER_VALIDATE_FLOAT);

    if ($userId <= 0 || $latitude === false || $longitude === false || abs((float) $latitude) > 90 || abs((float) $longitude) > 180) {
        throw new InvalidArgumentException('A valid live location is required.');
    }

    $accuracy = filter_var($payload['accuracy_meters'] ?? null, FILTER_VALIDATE_FLOAT);
    $heading = filter_var($payload['heading'] ?? null, FILTER_VALIDATE_FLOAT);
    $speed = filter_var($payload['speed_mps'] ?? null, FILTER_VALIDATE_FLOAT);
    $source = substr(trim((string) ($payload['source'] ?? 'browser')), 0, 50) ?: 'browser';

    rtbo_ensure_geo_tables();
    $stmt = db()->prepare(
        "INSERT INTO member_geo_locations (user_id, latitude, longitude, accuracy_meters, heading, speed_mps, source, consent_enabled, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 1, NOW())
         ON DUPLICATE KEY UPDATE
            latitude = VALUES(latitude),
            longitude = VALUES(longitude),
            accuracy_meters = VALUES(accuracy_meters),
            heading = VALUES(heading),
            speed_mps = VALUES(speed_mps),
            source = VALUES(source),
            consent_enabled = 1,
            updated_at = NOW()"
    );
    $stmt->execute([
        $userId,
        (float) $latitude,
        (float) $longitude,
        $accuracy === false ? null : $accuracy,
        $heading === false ? null : $heading,
        $speed === false ? null : $speed,
        $source,
    ]);

    $location = rtbo_geo_location_for_user($userId) ?? [];
    rtbo_geo_update_assignment_arrivals($userId, (float) $latitude, (float) $longitude);

    return $location;
}

function rtbo_geo_stop_sharing(int $userId): void
{
    if ($userId <= 0) {
        return;
    }

    try {
        rtbo_ensure_geo_tables();
        $stmt = db()->prepare('UPDATE member_geo_locations SET consent_enabled = 0, updated_at = NOW() WHERE user_id = ?');
        $stmt->execute([$userId]);
    } catch (Throwable $error) {
        error_log('RTBO geo stop sharing failed: ' . $error->getMessage());
    }
}

function rtbo_geo_update_assignment_arrivals(int $officialId, float $latitude, float $longitude, float $radiusMiles = 0.25): array
{
    if ($officialId <= 0) {
        return [];
    }

    rtbo_ensure_geo_tables();
    rtbo_ensure_game_geo_columns();

    $stmt = db()->prepare(
        "SELECT
            a.id AS assignment_id,
            a.game_id,
            a.status AS assignment_status,
            g.location_lat,
            g.location_lng,
            g.location_name,
            g.location_address,
            g.home_team,
            g.away_team,
            s.arrival_verified_at,
            s.inside_radius AS previous_inside_radius,
            s.left_site_at
         FROM assignments a
         INNER JOIN games g ON g.id = a.game_id
         LEFT JOIN assignment_arrival_status s ON s.assignment_id = a.id
         WHERE a.official_id = ?
           AND LOWER(a.status) = 'accepted'
           AND g.location_lat IS NOT NULL
           AND g.location_lng IS NOT NULL
         ORDER BY g.game_date ASC, g.game_time ASC
         LIMIT 100"
    );
    $stmt->execute([$officialId]);

    $statuses = [];
    foreach ($stmt->fetchAll() as $row) {
        $distance = rtbo_geo_distance_miles($latitude, $longitude, (float) $row['location_lat'], (float) $row['location_lng']);
        $inside = $distance <= $radiusMiles;
        $previousInside = (int) ($row['previous_inside_radius'] ?? 0) === 1;
        $arrivalVerifiedAt = (string) ($row['arrival_verified_at'] ?? '');
        $leftSiteAt = (string) ($row['left_site_at'] ?? '');
        $now = date('Y-m-d H:i:s');

        if ($inside && $arrivalVerifiedAt === '') {
            $arrivalVerifiedAt = $now;
        }

        $lastInsideAt = $inside ? $now : null;
        if (!$inside && $previousInside && $arrivalVerifiedAt !== '') {
            $leftSiteAt = $now;
        }

        $upsert = db()->prepare(
            "INSERT INTO assignment_arrival_status
                (assignment_id, game_id, official_id, current_distance_miles, inside_radius, arrival_radius_miles, arrival_verified_at, last_inside_radius_at, left_site_at, last_seen_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
             ON DUPLICATE KEY UPDATE
                current_distance_miles = VALUES(current_distance_miles),
                inside_radius = VALUES(inside_radius),
                arrival_radius_miles = VALUES(arrival_radius_miles),
                arrival_verified_at = COALESCE(assignment_arrival_status.arrival_verified_at, VALUES(arrival_verified_at)),
                last_inside_radius_at = COALESCE(VALUES(last_inside_radius_at), assignment_arrival_status.last_inside_radius_at),
                left_site_at = COALESCE(VALUES(left_site_at), assignment_arrival_status.left_site_at),
                last_seen_at = NOW(),
                updated_at = NOW()"
        );
        $upsert->execute([
            (int) $row['assignment_id'],
            (int) $row['game_id'],
            $officialId,
            round($distance, 2),
            $inside ? 1 : 0,
            $radiusMiles,
            $arrivalVerifiedAt !== '' ? $arrivalVerifiedAt : null,
            $lastInsideAt,
            $leftSiteAt !== '' ? $leftSiteAt : null,
        ]);

        $statuses[] = [
            'assignment_id' => (int) $row['assignment_id'],
            'game_id' => (int) $row['game_id'],
            'distance_miles' => round($distance, 2),
            'inside_radius' => $inside,
            'arrival_radius_miles' => $radiusMiles,
            'arrival_verified_at' => $arrivalVerifiedAt,
            'left_site_at' => $leftSiteAt,
            'location_name' => (string) ($row['location_name'] ?? ''),
            'location_address' => (string) ($row['location_address'] ?? ''),
            'matchup' => trim((string) ($row['away_team'] ?? '') . ' at ' . (string) ($row['home_team'] ?? '')),
        ];
    }

    return $statuses;
}

function rtbo_geo_arrival_statuses_for_official(int $officialId): array
{
    if ($officialId <= 0) {
        return [];
    }

    try {
        rtbo_ensure_geo_tables();
        $stmt = db()->prepare('SELECT * FROM assignment_arrival_status WHERE official_id = ? ORDER BY updated_at DESC');
        $stmt->execute([$officialId]);
    } catch (Throwable $error) {
        error_log('RTBO geo arrival status lookup failed: ' . $error->getMessage());
        return [];
    }

    $statuses = [];
    foreach ($stmt->fetchAll() as $row) {
        $statuses[(int) $row['assignment_id']] = [
            'assignment_id' => (int) $row['assignment_id'],
            'game_id' => (int) $row['game_id'],
            'current_distance_miles' => $row['current_distance_miles'] !== null ? (float) $row['current_distance_miles'] : null,
            'inside_radius' => (bool) ($row['inside_radius'] ?? false),
            'arrival_radius_miles' => $row['arrival_radius_miles'] !== null ? (float) $row['arrival_radius_miles'] : null,
            'arrival_verified_at' => (string) ($row['arrival_verified_at'] ?? ''),
            'last_inside_radius_at' => (string) ($row['last_inside_radius_at'] ?? ''),
            'left_site_at' => (string) ($row['left_site_at'] ?? ''),
            'last_seen_at' => (string) ($row['last_seen_at'] ?? ''),
        ];
    }

    return $statuses;
}

function rtbo_geo_games_for_map(): array
{
    try {
        rtbo_ensure_game_geo_columns();
        $stmt = db()->query(
            "SELECT id, game_date, game_time, level, home_team, away_team, location_name, location_address, location_lat, location_lng, status
             FROM games
             WHERE status IS NULL OR status NOT IN ('deleted', 'cancelled', 'canceled')
             ORDER BY game_date ASC, game_time ASC, id ASC
             LIMIT 150"
        );
    } catch (Throwable $error) {
        error_log('RTBO geo games map lookup failed: ' . $error->getMessage());
        return [];
    }

    return array_map(static function (array $row): array {
        return [
            'id' => (int) ($row['id'] ?? 0),
            'game_date' => (string) ($row['game_date'] ?? ''),
            'game_time' => (string) ($row['game_time'] ?? ''),
            'level' => (string) ($row['level'] ?? ''),
            'home_team' => (string) ($row['home_team'] ?? ''),
            'away_team' => (string) ($row['away_team'] ?? ''),
            'location_name' => (string) ($row['location_name'] ?? ''),
            'location_address' => (string) ($row['location_address'] ?? ''),
            'location_lat' => $row['location_lat'] !== null ? (float) $row['location_lat'] : null,
            'location_lng' => $row['location_lng'] !== null ? (float) $row['location_lng'] : null,
            'status' => (string) ($row['status'] ?? ''),
        ];
    }, $stmt->fetchAll());
}

function rtbo_geo_game_target(int $gameId): ?array
{
    if ($gameId <= 0) {
        return null;
    }

    try {
        rtbo_ensure_game_geo_columns();
        $stmt = db()->prepare(
            "SELECT id, game_date, game_time, level, home_team, away_team, location_name, location_address, location_lat, location_lng, status
             FROM games
             WHERE id = ?
             LIMIT 1"
        );
        $stmt->execute([$gameId]);
        $row = $stmt->fetch();
    } catch (Throwable $error) {
        error_log('RTBO geo game target lookup failed: ' . $error->getMessage());
        return null;
    }

    if (!$row || $row['location_lat'] === null || $row['location_lng'] === null) {
        return null;
    }

    return [
        'id' => (int) $row['id'],
        'latitude' => (float) $row['location_lat'],
        'longitude' => (float) $row['location_lng'],
        'label' => trim((string) ($row['away_team'] ?? '') . ' at ' . (string) ($row['home_team'] ?? '')),
        'location_name' => (string) ($row['location_name'] ?? ''),
        'location_address' => (string) ($row['location_address'] ?? ''),
        'game_date' => (string) ($row['game_date'] ?? ''),
        'game_time' => (string) ($row['game_time'] ?? ''),
    ];
}

function rtbo_geo_assignment_statuses_for_game(int $gameId): array
{
    if ($gameId <= 0) {
        return [];
    }

    try {
        rtbo_ensure_geo_tables();
        $stmt = db()->prepare(
            "SELECT a.id AS assignment_id, a.official_id, a.status AS assignment_status, p.name AS position_name, s.*
             FROM assignments a
             LEFT JOIN positions p ON p.id = a.position_id
             LEFT JOIN assignment_arrival_status s ON s.assignment_id = a.id
             WHERE a.game_id = ?"
        );
        $stmt->execute([$gameId]);
    } catch (Throwable $error) {
        error_log('RTBO geo assignment status lookup failed: ' . $error->getMessage());
        return [];
    }

    $statuses = [];
    foreach ($stmt->fetchAll() as $row) {
        $statuses[(int) $row['official_id']] = [
            'assignment_id' => (int) ($row['assignment_id'] ?? 0),
            'official_id' => (int) ($row['official_id'] ?? 0),
            'assignment_status' => (string) ($row['assignment_status'] ?? ''),
            'position' => (string) ($row['position_name'] ?? ''),
            'current_distance_miles' => $row['current_distance_miles'] !== null ? (float) $row['current_distance_miles'] : null,
            'inside_radius' => (bool) ($row['inside_radius'] ?? false),
            'arrival_radius_miles' => $row['arrival_radius_miles'] !== null ? (float) $row['arrival_radius_miles'] : null,
            'arrival_verified_at' => (string) ($row['arrival_verified_at'] ?? ''),
            'last_inside_radius_at' => (string) ($row['last_inside_radius_at'] ?? ''),
            'left_site_at' => (string) ($row['left_site_at'] ?? ''),
            'last_seen_at' => (string) ($row['last_seen_at'] ?? ''),
        ];
    }

    return $statuses;
}

function rtbo_geo_admin_locations(?float $targetLat = null, ?float $targetLng = null, int $targetGameId = 0): array
{
    try {
        ensure_users_table();
        rtbo_ensure_geo_tables();
        $arrivalStatusByOfficial = $targetGameId > 0 ? rtbo_geo_assignment_statuses_for_game($targetGameId) : [];

        $stmt = db()->query(
            "SELECT
                u.id,
                u.role,
                u.first_name,
                u.last_name,
                u.email,
                u.phone,
                u.sex,
                u.race,
                u.profile_photo,
                u.city,
                u.state,
                u.status,
                g.latitude,
                g.longitude,
                g.accuracy_meters,
                g.heading,
                g.speed_mps,
                g.source,
                g.consent_enabled,
                g.updated_at
             FROM users u
             LEFT JOIN member_geo_locations g ON g.user_id = u.id
             WHERE u.role = 'official'
               AND (u.status IS NULL OR u.status <> 'deleted')
             ORDER BY g.updated_at DESC, u.last_name ASC, u.first_name ASC"
        );
    } catch (Throwable $error) {
        error_log('RTBO geo admin location lookup failed: ' . $error->getMessage());
        return [];
    }

    $officials = [];
    foreach ($stmt->fetchAll() as $row) {
        $geoRow = $row;
        $geoRow['user_id'] = $row['id'];
        $location = rtbo_geo_public_location($geoRow);
        $distance = null;
        if (
            $targetLat !== null
            && $targetLng !== null
            && $location['latitude'] !== null
            && $location['longitude'] !== null
            && $location['consent_enabled']
        ) {
            $distance = rtbo_geo_distance_miles($targetLat, $targetLng, (float) $location['latitude'], (float) $location['longitude']);
        }

        $officials[] = [
            'id' => (int) $row['id'],
            'name' => trim((string) ($row['first_name'] ?? '') . ' ' . (string) ($row['last_name'] ?? '')),
            'first_name' => (string) ($row['first_name'] ?? ''),
            'last_name' => (string) ($row['last_name'] ?? ''),
            'email' => (string) ($row['email'] ?? ''),
            'phone' => rtbo_format_phone_number((string) ($row['phone'] ?? '')),
            'sex' => (string) ($row['sex'] ?? ''),
            'race' => (string) ($row['race'] ?? ''),
            'city' => (string) ($row['city'] ?? ''),
            'state' => (string) ($row['state'] ?? ''),
            'photo' => rtbo_geo_profile_photo_url($row),
            'status' => (string) ($row['status'] ?? ''),
            'location' => $location,
            'distance_miles' => $distance,
            'arrival_status' => $arrivalStatusByOfficial[(int) $row['id']] ?? null,
        ];
    }

    usort($officials, static function (array $a, array $b): int {
        $aDistance = $a['distance_miles'];
        $bDistance = $b['distance_miles'];
        if ($aDistance !== null && $bDistance !== null) {
            return $aDistance <=> $bDistance;
        }
        if ($aDistance !== null) return -1;
        if ($bDistance !== null) return 1;
        return strcmp((string) ($a['name'] ?? ''), (string) ($b['name'] ?? ''));
    });

    return $officials;
}

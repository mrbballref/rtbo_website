<?php
declare(strict_types=1);

function ensure_users_table(): void
{
    db()->exec(
        "CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            role VARCHAR(50) NOT NULL DEFAULT 'official',
            member_title VARCHAR(120),
            first_name VARCHAR(100) NOT NULL,
            last_name VARCHAR(100) NOT NULL,
            email VARCHAR(190) NOT NULL UNIQUE,
            phone VARCHAR(50),
            sex VARCHAR(40),
            race VARCHAR(120),
            organization VARCHAR(190),
            school_id INT NULL,
            address_line1 VARCHAR(190),
            address_line2 VARCHAR(190),
            city VARCHAR(120),
            state VARCHAR(80),
            zip VARCHAR(30),
            conferences TEXT,
            experience TEXT,
            official_rank INT NULL,
            password_hash VARCHAR(255) NOT NULL,
            profile_photo VARCHAR(255),
            status VARCHAR(50) NOT NULL DEFAULT 'active',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )"
    );

    foreach ([
        'member_title' => "ALTER TABLE users ADD COLUMN member_title VARCHAR(120) NULL AFTER role",
        'address_line1' => "ALTER TABLE users ADD COLUMN address_line1 VARCHAR(190) NULL AFTER phone",
        'sex' => "ALTER TABLE users ADD COLUMN sex VARCHAR(40) NULL AFTER phone",
        'race' => "ALTER TABLE users ADD COLUMN race VARCHAR(120) NULL AFTER sex",
        'organization' => "ALTER TABLE users ADD COLUMN organization VARCHAR(190) NULL AFTER phone",
        'school_id' => "ALTER TABLE users ADD COLUMN school_id INT NULL AFTER organization",
        'address_line2' => "ALTER TABLE users ADD COLUMN address_line2 VARCHAR(190) NULL AFTER address_line1",
        'city' => "ALTER TABLE users ADD COLUMN city VARCHAR(120) NULL AFTER address_line2",
        'state' => "ALTER TABLE users ADD COLUMN state VARCHAR(80) NULL AFTER city",
        'zip' => "ALTER TABLE users ADD COLUMN zip VARCHAR(30) NULL AFTER state",
        'conferences' => "ALTER TABLE users ADD COLUMN conferences TEXT NULL AFTER zip",
        'experience' => "ALTER TABLE users ADD COLUMN experience TEXT NULL AFTER conferences",
        'official_rank' => "ALTER TABLE users ADD COLUMN official_rank INT NULL AFTER experience",
    ] as $column => $sql) {
        $stmt = db()->prepare(
            "SELECT COUNT(*)
             FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE()
               AND TABLE_NAME = 'users'
               AND COLUMN_NAME = ?"
        );
        $stmt->execute([$column]);
        if ((int) $stmt->fetchColumn() === 0) {
            db()->exec($sql);
        }
    }
}

function public_auth_user(array $user): array
{
    $photo = (string) ($user['profile_photo'] ?? '');
    if ($photo !== '' && !str_starts_with($photo, 'http') && !str_starts_with($photo, '/api/')) {
        $version = is_file($photo) ? (string) filemtime($photo) : '';
        $photo = '/api/profile-photo.php?id=' . (int) $user['id'] . ($version !== '' ? '&v=' . rawurlencode($version) : '');
    }

    return [
        'id' => (int) $user['id'],
        'name' => trim(($user['first_name'] ?? '') . ' ' . ($user['last_name'] ?? '')),
        'first_name' => (string) ($user['first_name'] ?? ''),
        'last_name' => (string) ($user['last_name'] ?? ''),
        'email' => (string) $user['email'],
        'role' => (string) $user['role'],
        'member_title' => (string) ($user['member_title'] ?? ''),
        'phone' => rtbo_format_phone_number((string) ($user['phone'] ?? '')),
        'sex' => (string) ($user['sex'] ?? $user['gender'] ?? ''),
        'race' => (string) ($user['race'] ?? ''),
        'organization' => (string) ($user['organization'] ?? ''),
        'school_id' => (int) ($user['school_id'] ?? 0),
        'address' => trim((string) ($user['address_line1'] ?? '') . ' ' . (string) ($user['address_line2'] ?? '')),
        'address_line1' => (string) ($user['address_line1'] ?? ''),
        'address_line2' => (string) ($user['address_line2'] ?? ''),
        'city' => (string) ($user['city'] ?? ''),
        'state' => (string) ($user['state'] ?? ''),
        'zip' => (string) ($user['zip'] ?? ''),
        'conferences' => (string) ($user['conferences'] ?? ''),
        'experience' => (string) ($user['experience'] ?? ''),
        'photo' => $photo,
        'status' => (string) ($user['status'] ?? 'active'),
    ];
}

function current_database_user(): ?array
{
    $sessionUser = current_user();
    if (!$sessionUser || empty($sessionUser['id'])) {
        return null;
    }

    try {
        ensure_users_table();
        $stmt = db()->prepare('SELECT * FROM users WHERE id = ? LIMIT 1');
        $stmt->execute([(int) $sessionUser['id']]);
        $user = $stmt->fetch();
    } catch (Throwable $error) {
        error_log('RTBO current database user lookup failed: ' . $error->getMessage());
        return null;
    }

    if (!$user || ($user['status'] ?? 'active') === 'deleted') {
        return null;
    }

    return $user;
}

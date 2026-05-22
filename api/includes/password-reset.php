<?php
declare(strict_types=1);

require_once __DIR__ . '/users.php';
require_once __DIR__ . '/admin-members.php';
require_once __DIR__ . '/email.php';

function rtbo_password_reset_storage_path(): string
{
    return STORAGE_DIR . '/password-resets.json';
}

function rtbo_password_reset_hash(string $token): string
{
    return hash('sha256', $token);
}

function rtbo_password_reset_expiry(): string
{
    return date('Y-m-d H:i:s', time() + 3600);
}

function rtbo_password_reset_read_file(): array
{
    $path = rtbo_password_reset_storage_path();
    if (!is_file($path)) {
        return [];
    }

    $decoded = json_decode((string) file_get_contents($path), true);
    return is_array($decoded) ? array_values($decoded) : [];
}

function rtbo_password_reset_write_file(array $records): void
{
    ensure_dir(dirname(rtbo_password_reset_storage_path()));
    file_put_contents(
        rtbo_password_reset_storage_path(),
        json_encode(array_values($records), JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES),
        LOCK_EX
    );
}

function rtbo_password_resets_db_available(): bool
{
    try {
        ensure_users_table();
        db()->exec(
            "CREATE TABLE IF NOT EXISTS password_resets (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NULL,
                account_source VARCHAR(20) NOT NULL DEFAULT 'database',
                email VARCHAR(190) NOT NULL,
                token_hash CHAR(64) NOT NULL UNIQUE,
                expires_at DATETIME NOT NULL,
                used_at DATETIME NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_password_resets_email (email),
                INDEX idx_password_resets_expires (expires_at),
                INDEX idx_password_resets_used (used_at)
            )"
        );
        return true;
    } catch (Throwable $error) {
        error_log('RTBO password reset database unavailable: ' . $error->getMessage());
        return false;
    }
}

function rtbo_password_reset_find_account(string $email): ?array
{
    $email = strtolower(trim($email));
    if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        return null;
    }

    foreach (admin_member_read_file() as $member) {
        if (strtolower((string) ($member['email'] ?? '')) !== $email) {
            continue;
        }
        if (($member['status'] ?? 'active') === 'deleted') {
            return null;
        }
        if ((string) ($member['password_hash'] ?? '') === '') {
            return null;
        }

        $name = trim((string) (($member['first_name'] ?? '') . ' ' . ($member['last_name'] ?? '')));
        return [
            'source' => 'file',
            'id' => (int) ($member['id'] ?? 0),
            'email' => $email,
            'name' => $name !== '' ? $name : $email,
            'phone' => (string) ($member['phone'] ?? ''),
        ];
    }

    if (!rtbo_password_resets_db_available()) {
        return null;
    }

    $stmt = db()->prepare("SELECT id, first_name, last_name, email, phone FROM users WHERE LOWER(email) = ? AND status <> 'deleted' LIMIT 1");
    $stmt->execute([$email]);
    $user = $stmt->fetch();
    if (!$user) {
        return null;
    }

    $name = trim((string) (($user['first_name'] ?? '') . ' ' . ($user['last_name'] ?? '')));
    return [
        'source' => 'database',
        'id' => (int) $user['id'],
        'email' => strtolower((string) $user['email']),
        'name' => $name !== '' ? $name : strtolower((string) $user['email']),
        'phone' => (string) ($user['phone'] ?? ''),
    ];
}

function rtbo_password_reset_create_token(array $account): string
{
    $token = rtrim(strtr(base64_encode(random_bytes(32)), '+/', '-_'), '=');
    $record = [
        'id' => bin2hex(random_bytes(8)),
        'user_id' => (int) ($account['id'] ?? 0),
        'account_source' => (string) ($account['source'] ?? 'database'),
        'email' => strtolower((string) ($account['email'] ?? '')),
        'token_hash' => rtbo_password_reset_hash($token),
        'expires_at' => rtbo_password_reset_expiry(),
        'used_at' => null,
        'created_at' => date('Y-m-d H:i:s'),
    ];

    if ($record['account_source'] === 'database' && rtbo_password_resets_db_available()) {
        $delete = db()->prepare("DELETE FROM password_resets WHERE email = ? OR expires_at < NOW() OR used_at IS NOT NULL");
        $delete->execute([$record['email']]);
        $insert = db()->prepare(
            "INSERT INTO password_resets(user_id, account_source, email, token_hash, expires_at)
             VALUES(?, ?, ?, ?, ?)"
        );
        $insert->execute([
            $record['user_id'] > 0 ? $record['user_id'] : null,
            $record['account_source'],
            $record['email'],
            $record['token_hash'],
            $record['expires_at'],
        ]);
        return $token;
    }

    $records = array_values(array_filter(
        rtbo_password_reset_read_file(),
        static fn (array $row): bool => ($row['email'] ?? '') !== $record['email']
            && empty($row['used_at'])
            && strtotime((string) ($row['expires_at'] ?? '')) > time()
    ));
    $records[] = $record;
    rtbo_password_reset_write_file($records);

    return $token;
}

function rtbo_password_reset_url(string $token): string
{
    return RTBO_BASE_URL . '/?reset_token=' . rawurlencode($token);
}

function rtbo_password_reset_find_token(string $token): ?array
{
    $tokenHash = rtbo_password_reset_hash($token);

    if (rtbo_password_resets_db_available()) {
        $stmt = db()->prepare(
            "SELECT * FROM password_resets
             WHERE token_hash = ?
               AND used_at IS NULL
               AND expires_at >= NOW()
             LIMIT 1"
        );
        $stmt->execute([$tokenHash]);
        $record = $stmt->fetch();
        if ($record) {
            return [
                'storage' => 'database',
                'id' => (int) $record['id'],
                'user_id' => (int) ($record['user_id'] ?? 0),
                'account_source' => (string) ($record['account_source'] ?? 'database'),
                'email' => strtolower((string) $record['email']),
            ];
        }
    }

    foreach (rtbo_password_reset_read_file() as $record) {
        if (!hash_equals((string) ($record['token_hash'] ?? ''), $tokenHash)) {
            continue;
        }
        if (!empty($record['used_at']) || strtotime((string) ($record['expires_at'] ?? '')) < time()) {
            return null;
        }

        return [
            'storage' => 'file',
            'id' => (string) ($record['id'] ?? ''),
            'user_id' => (int) ($record['user_id'] ?? 0),
            'account_source' => (string) ($record['account_source'] ?? 'file'),
            'email' => strtolower((string) ($record['email'] ?? '')),
        ];
    }

    return null;
}

function rtbo_password_reset_mark_used(array $reset): void
{
    if (($reset['storage'] ?? '') === 'database' && rtbo_password_resets_db_available()) {
        $stmt = db()->prepare('UPDATE password_resets SET used_at = NOW() WHERE id = ?');
        $stmt->execute([(int) ($reset['id'] ?? 0)]);
        return;
    }

    $records = rtbo_password_reset_read_file();
    foreach ($records as $index => $record) {
        if ((string) ($record['id'] ?? '') === (string) ($reset['id'] ?? '')) {
            $records[$index]['used_at'] = date('Y-m-d H:i:s');
            break;
        }
    }
    rtbo_password_reset_write_file($records);
}

function rtbo_password_reset_update_password(array $reset, string $newPassword): void
{
    if (($reset['account_source'] ?? '') === 'file') {
        $members = admin_member_read_file();
        foreach ($members as $index => $member) {
            $sameId = (int) ($member['id'] ?? 0) === (int) ($reset['user_id'] ?? 0);
            $sameEmail = strtolower((string) ($member['email'] ?? '')) === strtolower((string) ($reset['email'] ?? ''));
            if (($sameId || $sameEmail) && ($member['status'] ?? 'active') !== 'deleted') {
                $members[$index]['password_hash'] = password_hash($newPassword, PASSWORD_DEFAULT);
                admin_member_write_file($members);
                rtbo_password_reset_mark_used($reset);
                return;
            }
        }
        throw new RuntimeException('Account record not found.');
    }

    if (!rtbo_password_resets_db_available()) {
        throw new RuntimeException('Database unavailable.');
    }

    $stmt = db()->prepare("UPDATE users SET password_hash = ? WHERE id = ? AND LOWER(email) = ? AND status <> 'deleted'");
    $stmt->execute([
        password_hash($newPassword, PASSWORD_DEFAULT),
        (int) ($reset['user_id'] ?? 0),
        strtolower((string) ($reset['email'] ?? '')),
    ]);

    if ($stmt->rowCount() < 1) {
        throw new RuntimeException('Account record not found.');
    }

    rtbo_password_reset_mark_used($reset);
}

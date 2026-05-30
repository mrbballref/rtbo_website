<?php
declare(strict_types=1);

require_once __DIR__ . '/includes/bootstrap.php';
require_once __DIR__ . '/includes/users.php';
require_once __DIR__ . '/includes/admin-members.php';
require_once __DIR__ . '/includes/session-tracking.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'POST required.']);
    exit;
}

function read_json_body(): array
{
    $raw = file_get_contents('php://input') ?: '';
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

$input = array_merge($_POST, read_json_body());
$email = strtolower(trim((string) ($input['email'] ?? '')));
$password = (string) ($input['password'] ?? '');

function rtbo_is_local_auth_host(): bool
{
    $host = strtolower((string) ($_SERVER['HTTP_HOST'] ?? ''));
    $serverName = strtolower((string) ($_SERVER['SERVER_NAME'] ?? ''));
    $hostName = strtolower((string) (parse_url('http://' . $host, PHP_URL_HOST) ?: $host));
    $localHosts = ['127.0.0.1', 'localhost', '::1', '0.0.0.0', '::ffff:127.0.0.1'];

    return in_array($hostName, $localHosts, true)
        || in_array($serverName, $localHosts, true);
}

function rtbo_is_local_database_host(): bool
{
    $host = strtolower(trim((string) DB_HOST));
    if ($host === '') {
        return false;
    }

    $hostName = strtolower((string) (parse_url('mysql://' . $host, PHP_URL_HOST) ?: $host));
    $hostName = trim($hostName, '[]');

    return in_array($hostName, ['127.0.0.1', 'localhost', '::1', '0.0.0.0', '::ffff:127.0.0.1'], true);
}

function rtbo_local_auth_enabled(): bool
{
    if (!rtbo_is_local_auth_host()) {
        return false;
    }

    return strtolower(env_value('RTBO_LOCAL_AUTH_ENABLED', 'false')) === 'true'
        || (rtbo_frontend_staging_login_enabled() && rtbo_local_admin_password() !== '');
}

function rtbo_frontend_env(): array
{
    static $env = null;

    if (is_array($env)) {
        return $env;
    }

    $env = [];
    foreach ([
        __DIR__ . '/../frontend/.env',
        __DIR__ . '/../frontend/.env.local',
        __DIR__ . '/../frontend/.env.development',
        __DIR__ . '/../frontend/.env.development.local',
    ] as $path) {
        if (!is_file($path) || !is_readable($path)) {
            continue;
        }

        foreach (file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [] as $line) {
            $line = trim($line);
            if ($line === '' || str_starts_with($line, '#') || !str_contains($line, '=')) {
                continue;
            }

            [$key, $value] = array_map('trim', explode('=', $line, 2));
            if ($key !== '') {
                $env[$key] = trim($value, "\"'");
            }
        }
    }

    return $env;
}

function rtbo_frontend_env_value(string $key): string
{
    $env = rtbo_frontend_env();
    return (string) ($env[$key] ?? '');
}

function rtbo_frontend_staging_login_enabled(): bool
{
    return strtolower(rtbo_frontend_env_value('VITE_ENABLE_STAGING_LOGIN')) === 'true';
}

function rtbo_local_admin_password(): string
{
    $password = env_value('RTBO_LOCAL_ADMIN_PASSWORD', '');
    if ($password !== '') {
        return $password;
    }

    if (rtbo_is_local_auth_host() && rtbo_frontend_staging_login_enabled()) {
        return rtbo_frontend_env_value('VITE_RTBO_TEST_PASSWORD');
    }

    return '';
}

function rtbo_local_test_password_matches(string $password): bool
{
    if (!rtbo_local_auth_enabled()) {
        return false;
    }

    $candidate = rtbo_local_admin_password();
    return $candidate !== '' && hash_equals($candidate, $password);
}

function rtbo_local_super_admin_emails(): array
{
    return array_values(array_unique(array_map('strtolower', array_filter([
        RTBO_SUPER_ADMIN_EMAIL,
        RTBO_ADMIN_EMAIL,
        rtbo_super_admin_database_email(),
        rtbo_super_admin_file_email(),
        'admin@rtbofficiating.com',
        'admin@rtboofficiating.com',
        'admin@rtbofficating.com',
        'montrel.simmons@rtboofficiating.com',
        'montrel.simmons@rtbofficiating.com',
        'mrbballref1775@yahoo.com',
    ]))));
}

function rtbo_local_super_admin_login(string $email, string $password): ?array
{
    if (!rtbo_local_auth_enabled()) {
        return null;
    }

    if (!rtbo_local_test_password_matches($password) || !in_array($email, rtbo_local_super_admin_emails(), true)) {
        return null;
    }

    return [
        'id' => 1,
        'name' => 'Montrel Simmons',
        'first_name' => 'Montrel',
        'last_name' => 'Simmons',
        'email' => $email,
        'role' => 'super_admin',
        'phone' => '(501) 240-4961',
        'address' => '815 Technology Dr., Box 241445',
        'address_line1' => '815 Technology Dr., Box 241445',
        'address_line2' => '',
        'city' => 'Little Rock',
        'state' => 'AR',
        'zip' => '',
        'conferences' => '',
        'experience' => 'Super Admin',
        'photo' => '/assets/images/montrel_simmons_trainer_card.jpg',
        'status' => 'active',
    ];
}

function rtbo_repair_local_super_admin_account(array $localUser, string $password): ?array
{
    if (!rtbo_is_local_auth_host() || !rtbo_is_local_database_host()) {
        return null;
    }

    if (strtolower(env_value('RTBO_LOCAL_AUTH_REPAIR_SUPER_ADMIN', 'true')) !== 'true') {
        return null;
    }

    try {
        ensure_users_table();
        $stmt = db()->prepare(
            "INSERT INTO users(role, first_name, last_name, email, phone, address_line1, address_line2, city, state, zip, conferences, experience, password_hash, profile_photo, status)
             VALUES('super_admin', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
             ON DUPLICATE KEY UPDATE
                role = 'super_admin',
                first_name = VALUES(first_name),
                last_name = VALUES(last_name),
                phone = VALUES(phone),
                address_line1 = VALUES(address_line1),
                address_line2 = VALUES(address_line2),
                city = VALUES(city),
                state = VALUES(state),
                zip = VALUES(zip),
                conferences = VALUES(conferences),
                experience = VALUES(experience),
                password_hash = VALUES(password_hash),
                profile_photo = VALUES(profile_photo),
                status = 'active'"
        );
        $stmt->execute([
            (string) ($localUser['first_name'] ?? 'Montrel'),
            (string) ($localUser['last_name'] ?? 'Simmons'),
            (string) ($localUser['email'] ?? RTBO_SUPER_ADMIN_EMAIL),
            (string) ($localUser['phone'] ?? ''),
            (string) ($localUser['address_line1'] ?? ''),
            (string) ($localUser['address_line2'] ?? ''),
            (string) ($localUser['city'] ?? ''),
            (string) ($localUser['state'] ?? ''),
            (string) ($localUser['zip'] ?? ''),
            (string) ($localUser['conferences'] ?? ''),
            (string) ($localUser['experience'] ?? 'Super Admin'),
            password_hash($password, PASSWORD_DEFAULT),
            (string) ($localUser['photo'] ?? ''),
        ]);

        $lookup = db()->prepare('SELECT * FROM users WHERE LOWER(email) = ? LIMIT 1');
        $lookup->execute([strtolower((string) ($localUser['email'] ?? ''))]);
        $databaseUser = $lookup->fetch();

        return $databaseUser ?: null;
    } catch (Throwable $error) {
        error_log('RTBO local super admin repair skipped: ' . $error->getMessage());
        return null;
    }
}

function rtbo_local_super_admin_session_user(array $localUser, string $password): array
{
    $databaseUser = rtbo_repair_local_super_admin_account($localUser, $password);
    return $databaseUser ? public_auth_user($databaseUser) : $localUser;
}

function rtbo_file_member_login(string $email, string $password): ?array
{
    foreach (admin_member_read_file() as $member) {
        if (strtolower((string) ($member['email'] ?? '')) !== $email) {
            continue;
        }
        if (($member['status'] ?? 'active') === 'deleted') {
            return null;
        }
        $hash = (string) ($member['password_hash'] ?? '');
        if (($hash === '' || !password_verify($password, $hash)) && !rtbo_local_test_password_matches($password)) {
            return null;
        }
        return public_auth_user($member);
    }
    return null;
}

if ($email === '' || $password === '') {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Email and password are required.']);
    exit;
}
require_same_origin_request();

if (rtbo_local_auth_enabled() && rtbo_local_admin_password() === '') {
    http_response_code(503);
    echo json_encode([
        'success' => false,
        'message' => 'Local login is enabled, but no local admin password is configured. Set RTBO_LOCAL_ADMIN_PASSWORD in api/.env or VITE_RTBO_TEST_PASSWORD in frontend/.env.development.',
    ]);
    exit;
}

try {
    ensure_users_table();
    $statement = db()->prepare('SELECT * FROM users WHERE LOWER(email) = ? LIMIT 1');
    $statement->execute([$email]);
    $user = $statement->fetch();

    if ($user) {
        if (!password_verify($password, (string) $user['password_hash'])) {
            http_response_code(401);
            echo json_encode(['success' => false, 'message' => 'Invalid email or password.']);
            exit;
        }

        if (($user['status'] ?? 'active') === 'deleted') {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'This account is not available.']);
            exit;
        }

        db()->prepare('UPDATE users SET last_login_at = NOW(), updated_at = NOW() WHERE id = ?')->execute([(int) $user['id']]);
        $fresh = db()->prepare('SELECT * FROM users WHERE id = ? LIMIT 1');
        $fresh->execute([(int) $user['id']]);
        $user = $fresh->fetch() ?: $user;

        session_regenerate_id(true);
        $_SESSION['user'] = public_auth_user($user);
        rtbo_login_session_start($_SESSION['user']);

        echo json_encode(['success' => true, 'user' => $_SESSION['user']], JSON_UNESCAPED_SLASHES);
        exit;
    }

    $localUser = rtbo_local_super_admin_login($email, $password);
    if ($localUser) {
        session_regenerate_id(true);
        $_SESSION['user'] = rtbo_local_super_admin_session_user($localUser, $password);
        rtbo_login_session_start($_SESSION['user']);
        echo json_encode(['success' => true, 'user' => $_SESSION['user']], JSON_UNESCAPED_SLASHES);
        exit;
    }

    $fileUser = rtbo_file_member_login($email, $password);
    if ($fileUser) {
        session_regenerate_id(true);
        $_SESSION['user'] = $fileUser;
        rtbo_login_session_start($_SESSION['user']);
        echo json_encode(['success' => true, 'user' => $_SESSION['user']], JSON_UNESCAPED_SLASHES);
        exit;
    }

    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Invalid email or password.']);
} catch (Throwable $error) {
    $localUser = rtbo_local_super_admin_login($email, $password);
    if ($localUser) {
        session_regenerate_id(true);
        $_SESSION['user'] = rtbo_local_super_admin_session_user($localUser, $password);
        rtbo_login_session_start($_SESSION['user']);
        echo json_encode(['success' => true, 'user' => $_SESSION['user']], JSON_UNESCAPED_SLASHES);
        exit;
    }

    $fileUser = rtbo_file_member_login($email, $password);
    if ($fileUser) {
        session_regenerate_id(true);
        $_SESSION['user'] = $fileUser;
        rtbo_login_session_start($_SESSION['user']);
        echo json_encode(['success' => true, 'user' => $_SESSION['user']], JSON_UNESCAPED_SLASHES);
        exit;
    }

    error_log('RTBO auth login failed: ' . $error->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Unable to sign in right now.']);
}

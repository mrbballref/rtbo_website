<?php
declare(strict_types=1);

require_once __DIR__ . '/includes/bootstrap.php';
require_once __DIR__ . '/includes/users.php';
require_once __DIR__ . '/includes/admin-members.php';

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

    return in_array($hostName, ['127.0.0.1', 'localhost', '::1'], true)
        || in_array($serverName, ['127.0.0.1', 'localhost', '::1'], true);
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

function rtbo_local_super_admin_login(string $email, string $password): ?array
{
    $allowedEmails = array_map('strtolower', array_filter([
        RTBO_SUPER_ADMIN_EMAIL,
        RTBO_ADMIN_EMAIL,
        'admin@rtbofficiating.com',
        'admin@rtboofficiating.com',
        'admin@rtbofficating.com',
        'montrel.simmons@rtboofficiating.com',
        'montrel.simmons@rtbofficiating.com',
        'mrbballref1775@yahoo.com',
    ]));

    if (!rtbo_local_auth_enabled()) {
        return null;
    }

    if (!in_array($email, $allowedEmails, true) || !rtbo_local_test_password_matches($password)) {
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
    $localUser = rtbo_local_super_admin_login($email, $password);
    if ($localUser) {
        session_regenerate_id(true);
        $_SESSION['user'] = $localUser;
        echo json_encode(['success' => true, 'user' => $_SESSION['user']], JSON_UNESCAPED_SLASHES);
        exit;
    }

    $fileUser = rtbo_file_member_login($email, $password);
    if ($fileUser) {
        session_regenerate_id(true);
        $_SESSION['user'] = $fileUser;
        echo json_encode(['success' => true, 'user' => $_SESSION['user']], JSON_UNESCAPED_SLASHES);
        exit;
    }

    ensure_users_table();
    $statement = db()->prepare('SELECT * FROM users WHERE LOWER(email) = ? LIMIT 1');
    $statement->execute([$email]);
    $user = $statement->fetch();

    if (!$user || !password_verify($password, (string) $user['password_hash'])) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Invalid email or password.']);
        exit;
    }

    if (($user['status'] ?? 'active') === 'deleted') {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'This account is not available.']);
        exit;
    }

    session_regenerate_id(true);
    $_SESSION['user'] = public_auth_user($user);

    echo json_encode(['success' => true, 'user' => $_SESSION['user']], JSON_UNESCAPED_SLASHES);
} catch (Throwable $error) {
    $localUser = rtbo_local_super_admin_login($email, $password);
    if ($localUser) {
        session_regenerate_id(true);
        $_SESSION['user'] = $localUser;
        echo json_encode(['success' => true, 'user' => $_SESSION['user']], JSON_UNESCAPED_SLASHES);
        exit;
    }

    $fileUser = rtbo_file_member_login($email, $password);
    if ($fileUser) {
        session_regenerate_id(true);
        $_SESSION['user'] = $fileUser;
        echo json_encode(['success' => true, 'user' => $_SESSION['user']], JSON_UNESCAPED_SLASHES);
        exit;
    }

    error_log('RTBO auth login failed: ' . $error->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Unable to sign in right now.']);
}

<?php
declare(strict_types=1);

require_once __DIR__ . '/includes/bootstrap.php';
require_once __DIR__ . '/includes/users.php';

header('Content-Type: application/json');

function setup_input(): array
{
    $raw = file_get_contents('php://input') ?: '';
    $json = json_decode($raw, true);
    return array_merge($_POST, is_array($json) ? $json : []);
}

$setupEnabled = strtolower(env_value('RTBO_SETUP_ENABLED', 'false')) === 'true';
$setupToken = env_value('RTBO_SETUP_TOKEN', '');

if (!$setupEnabled || $setupToken === '') {
    http_response_code(404);
    echo json_encode(['success' => false, 'message' => 'Setup is not enabled.']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'POST required.']);
    exit;
}
require_same_origin_request();

$input = setup_input();
$providedToken = (string) ($input['setup_token'] ?? ($_SERVER['HTTP_X_RTBO_SETUP_TOKEN'] ?? ''));
if (!hash_equals($setupToken, $providedToken)) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Invalid setup token.']);
    exit;
}

$email = strtolower(trim((string) ($input['email'] ?? RTBO_SUPER_ADMIN_EMAIL)));
$password = (string) ($input['password'] ?? '');
$firstName = trim((string) ($input['first_name'] ?? 'Montrel'));
$lastName = trim((string) ($input['last_name'] ?? 'Simmons'));

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(422);
    echo json_encode(['success' => false, 'message' => 'A valid email is required.']);
    exit;
}

if (strlen($password) < 12) {
    http_response_code(422);
    echo json_encode(['success' => false, 'message' => 'Password must be at least 12 characters.']);
    exit;
}

try {
    ensure_users_table();

    $stmt = db()->prepare(
        "INSERT INTO users(role, first_name, last_name, email, password_hash, status)
         VALUES('super_admin', ?, ?, ?, ?, 'active')
         ON DUPLICATE KEY UPDATE
            role = 'super_admin',
            first_name = VALUES(first_name),
            last_name = VALUES(last_name),
            password_hash = VALUES(password_hash),
            status = 'active'"
    );
    $stmt->execute([
        $firstName,
        $lastName,
        $email,
        password_hash($password, PASSWORD_DEFAULT),
    ]);

    echo json_encode([
        'success' => true,
        'message' => 'Super admin account is ready. Disable RTBO_SETUP_ENABLED after confirming login.',
        'email' => $email,
    ]);
} catch (Throwable $error) {
    error_log('RTBO super admin setup failed: ' . $error->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Super admin setup failed.']);
}

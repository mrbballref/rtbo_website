<?php
declare(strict_types=1);

require_once __DIR__ . '/includes/bootstrap.php';
require_once __DIR__ . '/includes/users.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'POST required.']);
    exit;
}
require_same_origin_request();

function read_json_body(): array
{
    $raw = file_get_contents('php://input') ?: '';
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

$input = array_merge($_POST, read_json_body());
$firstName = trim((string) ($input['first_name'] ?? $input['firstName'] ?? ''));
$lastName = trim((string) ($input['last_name'] ?? $input['lastName'] ?? ''));
$email = strtolower(trim((string) ($input['email'] ?? '')));
$phone = rtbo_format_phone_number((string) ($input['phone'] ?? ''));
$password = (string) ($input['password'] ?? '');

if ($firstName === '' || $lastName === '' || $email === '' || $password === '') {
    http_response_code(422);
    echo json_encode(['success' => false, 'message' => 'First name, last name, email, and password are required.']);
    exit;
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(422);
    echo json_encode(['success' => false, 'message' => 'Please enter a valid email address.']);
    exit;
}

if (strlen($password) < 10) {
    http_response_code(422);
    echo json_encode(['success' => false, 'message' => 'Password must be at least 10 characters.']);
    exit;
}

try {
    ensure_users_table();

    $existing = db()->prepare('SELECT id FROM users WHERE LOWER(email) = ? LIMIT 1');
    $existing->execute([$email]);
    if ($existing->fetch()) {
        http_response_code(409);
        echo json_encode(['success' => false, 'message' => 'An account already exists for this email. Please sign in.']);
        exit;
    }

    $stmt = db()->prepare(
        "INSERT INTO users(role, first_name, last_name, email, phone, password_hash, status)
         VALUES('official', ?, ?, ?, ?, ?, 'active')"
    );
    $stmt->execute([
        $firstName,
        $lastName,
        $email,
        $phone,
        password_hash($password, PASSWORD_DEFAULT),
    ]);

    $userId = (int) db()->lastInsertId();
    $fresh = db()->prepare('SELECT * FROM users WHERE id = ? LIMIT 1');
    $fresh->execute([$userId]);
    $user = $fresh->fetch();

    session_regenerate_id(true);
    $_SESSION['user'] = public_auth_user($user);

    echo json_encode(['success' => true, 'user' => $_SESSION['user']], JSON_UNESCAPED_SLASHES);
} catch (Throwable $error) {
    error_log('RTBO account registration failed: ' . $error->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Unable to create the account right now.']);
}

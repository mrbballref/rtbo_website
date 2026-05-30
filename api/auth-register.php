<?php
declare(strict_types=1);

require_once __DIR__ . '/includes/bootstrap.php';
require_once __DIR__ . '/includes/users.php';
require_once __DIR__ . '/includes/email.php';
require_once __DIR__ . '/includes/notifications.php';
require_once __DIR__ . '/includes/session-tracking.php';

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
$requestedRole = strtolower(trim((string) ($input['role'] ?? 'official')));
$allowedRoles = ['official', 'school_admin', 'vendor', 'evaluator'];
$role = in_array($requestedRole, $allowedRoles, true) ? $requestedRole : 'official';

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
        "INSERT INTO users(role, first_name, last_name, email, phone, password_hash, status, registered_at, updated_at)
         VALUES(?, ?, ?, ?, ?, ?, 'inactive', NOW(), NOW())"
    );
    $stmt->execute([
        $role,
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

    $emailSent = false;
    try {
        $emailSent = is_array($user) && send_account_registration_confirmation_email($user);
        if ($emailSent) {
            db()->prepare('UPDATE users SET registration_confirmation_sent_at = NOW(), updated_at = NOW() WHERE id = ?')->execute([$userId]);
            $fresh->execute([$userId]);
            $user = $fresh->fetch() ?: $user;
        }
        send_super_admin_user_registered_email(is_array($user) ? $user : [
            'first_name' => $firstName,
            'last_name' => $lastName,
            'email' => $email,
            'role' => $role,
            'status' => 'inactive',
        ]);
        rtbo_notify_admins([
            'type' => 'user_registered',
            'title' => 'New user registered',
            'body' => trim($firstName . ' ' . $lastName) . ' registered for an RTBO account and must complete their profile.',
            'related_type' => 'member',
            'related_id' => $userId,
            'metadata' => [
                'email' => $email,
                'role' => $role,
                'status' => 'inactive',
                'confirmation_email_sent' => $emailSent,
            ],
        ]);
        rtbo_notify_users([$userId], [
            'type' => 'profile_completion_required',
            'title' => 'Complete your profile',
            'body' => 'Your RTBO account was created. Complete your profile before gaining access to all website features.',
            'related_type' => 'member',
            'related_id' => $userId,
            'metadata' => ['confirmation_email_sent' => $emailSent],
        ]);
    } catch (Throwable $notificationError) {
        error_log('RTBO account registration notification failed: ' . $notificationError->getMessage());
    }

    session_regenerate_id(true);
    $_SESSION['user'] = public_auth_user($user);
    rtbo_login_session_start($_SESSION['user']);

    echo json_encode(['success' => true, 'user' => $_SESSION['user']], JSON_UNESCAPED_SLASHES);
} catch (Throwable $error) {
    error_log('RTBO account registration failed: ' . $error->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Unable to create the account right now.']);
}

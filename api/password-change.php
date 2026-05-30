<?php
declare(strict_types=1);

require_once __DIR__ . '/includes/bootstrap.php';
require_once __DIR__ . '/includes/users.php';
require_once __DIR__ . '/includes/admin-members.php';

header('Content-Type: application/json');

function password_input(): array
{
    $raw = file_get_contents('php://input') ?: '';
    $json = json_decode($raw, true);
    return array_merge($_POST, is_array($json) ? $json : []);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'POST required.']);
    exit;
}
require_same_origin_request();

$user = current_database_user();
$usingFileFallback = false;
if (!$user && current_user()) {
    foreach (admin_member_read_file() as $member) {
        if ((int) ($member['id'] ?? 0) === (int) (current_user()['id'] ?? 0) && ($member['status'] ?? 'active') !== 'deleted') {
            $user = $member;
            $usingFileFallback = true;
            break;
        }
    }
}
if (!$user) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Sign-in is required.']);
    exit;
}

$input = password_input();
$currentPassword = (string) ($input['current_password'] ?? '');
$newPassword = (string) ($input['new_password'] ?? '');
$confirmPassword = (string) ($input['confirm_password'] ?? '');

if (!password_verify($currentPassword, (string) $user['password_hash'])) {
    http_response_code(422);
    echo json_encode(['success' => false, 'message' => 'Current password is incorrect.']);
    exit;
}

if (strlen($newPassword) < 12 || $newPassword !== $confirmPassword) {
    http_response_code(422);
    echo json_encode(['success' => false, 'message' => 'New password must be at least 12 characters and must match confirmation.']);
    exit;
}

try {
    if ($usingFileFallback) {
        $members = admin_member_read_file();
        foreach ($members as $index => $member) {
            if ((int) ($member['id'] ?? 0) === (int) $user['id']) {
                $members[$index]['password_hash'] = password_hash($newPassword, PASSWORD_DEFAULT);
                $members[$index]['password_is_temporary'] = false;
                $members[$index]['temporary_password_created_at'] = '';
                $members[$index]['password_changed_at'] = date('c');
                admin_member_write_file($members);
                $_SESSION['user'] = public_auth_user($members[$index]);
                echo json_encode(['success' => true, 'message' => 'Password changed.', 'user' => $_SESSION['user']], JSON_UNESCAPED_SLASHES);
                exit;
            }
        }
        throw new RuntimeException('Profile record not found.');
    }

    $stmt = db()->prepare(
        'UPDATE users
         SET password_hash = ?, password_is_temporary = 0, temporary_password_created_at = NULL, password_changed_at = NOW(), updated_at = NOW()
         WHERE id = ?'
    );
    $stmt->execute([password_hash($newPassword, PASSWORD_DEFAULT), (int) $user['id']]);
    $fresh = db()->prepare('SELECT * FROM users WHERE id = ? LIMIT 1');
    $fresh->execute([(int) $user['id']]);
    $freshUser = $fresh->fetch();
    $_SESSION['user'] = $freshUser ? public_auth_user($freshUser) : public_auth_user([...$user, 'password_is_temporary' => 0]);
    echo json_encode(['success' => true, 'message' => 'Password changed.', 'user' => $_SESSION['user']], JSON_UNESCAPED_SLASHES);
} catch (Throwable $error) {
    error_log('RTBO password change failed: ' . $error->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Unable to change password right now.']);
}

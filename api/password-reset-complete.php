<?php
declare(strict_types=1);

require_once __DIR__ . '/includes/bootstrap.php';
require_once __DIR__ . '/includes/password-reset.php';

header('Content-Type: application/json');

function rtbo_password_reset_complete_input(): array
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

$input = rtbo_password_reset_complete_input();
$token = trim((string) ($input['token'] ?? ''));
$newPassword = (string) ($input['new_password'] ?? '');
$confirmPassword = (string) ($input['confirm_password'] ?? '');

if ($token === '') {
    http_response_code(422);
    echo json_encode(['success' => false, 'message' => 'Password reset token is missing.']);
    exit;
}

if (strlen($newPassword) < 12 || $newPassword !== $confirmPassword) {
    http_response_code(422);
    echo json_encode(['success' => false, 'message' => 'New password must be at least 12 characters and must match confirmation.']);
    exit;
}

try {
    $reset = rtbo_password_reset_find_token($token);
    if (!$reset) {
        http_response_code(422);
        echo json_encode(['success' => false, 'message' => 'This password reset link is invalid or has expired.']);
        exit;
    }

    rtbo_password_reset_update_password($reset, $newPassword);
    echo json_encode(['success' => true, 'message' => 'Your password has been reset. You can sign in with your new password.']);
} catch (Throwable $error) {
    error_log('RTBO password reset completion failed: ' . $error->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Unable to reset password right now.']);
}

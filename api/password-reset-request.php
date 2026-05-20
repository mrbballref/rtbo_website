<?php
declare(strict_types=1);

require_once __DIR__ . '/includes/bootstrap.php';
require_once __DIR__ . '/includes/password-reset.php';

header('Content-Type: application/json');

function rtbo_password_reset_input(): array
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

$input = rtbo_password_reset_input();
$email = strtolower(trim((string) ($input['email'] ?? '')));

if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(422);
    echo json_encode(['success' => false, 'message' => 'Please enter a valid email address.']);
    exit;
}

$successMessage = 'If an account exists for that email, password reset instructions have been sent.';

try {
    $account = rtbo_password_reset_find_account($email);
    if (!$account) {
        echo json_encode(['success' => true, 'message' => $successMessage]);
        exit;
    }

    $token = rtbo_password_reset_create_token($account);
    if (!send_password_reset_email($account, rtbo_password_reset_url($token))) {
        throw new RuntimeException('Mail function returned false.');
    }

    echo json_encode(['success' => true, 'message' => $successMessage]);
} catch (Throwable $error) {
    error_log('RTBO password reset request failed: ' . $error->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Password reset email could not be sent right now.']);
}

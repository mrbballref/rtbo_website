<?php
declare(strict_types=1);

require_once __DIR__ . '/includes/bootstrap.php';
require_once __DIR__ . '/includes/password-reset.php';
require_once __DIR__ . '/includes/sms.php';

header('Content-Type: application/json');

function rtbo_phone_reset_input(): array
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

$input = rtbo_phone_reset_input();
$email = strtolower(trim((string) ($input['email'] ?? '')));

if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(422);
    echo json_encode(['success' => false, 'message' => 'Please enter a valid email address.']);
    exit;
}

if (!RTBO_SMS_ENABLED) {
    http_response_code(501);
    echo json_encode([
        'success' => false,
        'message' => 'Phone reset is not configured yet. Enable SMS settings in api/.env to send reset links by text.',
    ]);
    exit;
}

$successMessage = 'If the account has a phone number, reset instructions have been sent by text.';

try {
    $account = rtbo_password_reset_find_account($email);
    if (!$account || trim((string) ($account['phone'] ?? '')) === '') {
        echo json_encode(['success' => true, 'message' => $successMessage]);
        exit;
    }

    $token = rtbo_password_reset_create_token($account);
    $resetUrl = rtbo_password_reset_url($token);
    $phone = rtbo_sms_normalize_phone((string) ($account['phone'] ?? ''));
    if ($phone === '') {
        echo json_encode(['success' => true, 'message' => $successMessage]);
        exit;
    }

    $delivery = rtbo_sms_send_twilio(
        $phone,
        'RTBO password reset: use this secure link within 60 minutes: ' . $resetUrl
    );

    if (!in_array((string) ($delivery['status'] ?? ''), ['sent', 'dry_run'], true)) {
        throw new RuntimeException((string) ($delivery['error'] ?? 'SMS provider did not accept the reset message.'));
    }

    echo json_encode(['success' => true, 'message' => $successMessage]);
} catch (Throwable $error) {
    error_log('RTBO phone password reset failed: ' . $error->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Password reset text could not be sent right now.']);
}

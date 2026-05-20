<?php
declare(strict_types=1);

require_once __DIR__ . '/includes/bootstrap.php';
require_once __DIR__ . '/includes/newsletter.php';
require_once __DIR__ . '/includes/email.php';
require_once __DIR__ . '/includes/notifications.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'POST required.']);
    exit;
}
require_same_origin_request();

$email = clean('email');
$firstName = clean('first_name');
$lastName = clean('last_name');

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(422);
    echo json_encode(['success' => false, 'message' => 'Please enter a valid email address.']);
    exit;
}

subscribe_newsletter($email, $firstName, $lastName);
send_newsletter_signup_notification($email, $firstName, $lastName);

try {
    $subscriberName = trim($firstName . ' ' . $lastName) ?: $email;
    rtbo_notify_admins([
        'type' => 'newsletter_signup',
        'title' => 'New newsletter signup',
        'body' => "{$subscriberName} subscribed to RTBO updates.",
        'related_type' => 'newsletter_subscriber',
        'metadata' => [
            'email' => $email,
            'first_name' => $firstName,
            'last_name' => $lastName,
        ],
    ]);
} catch (Throwable $notificationError) {
    error_log('RTBO newsletter signup notification event failed: ' . $notificationError->getMessage());
}

echo json_encode(['success' => true, 'message' => 'Thank you for subscribing to Raising The Bar Officiating updates.']);

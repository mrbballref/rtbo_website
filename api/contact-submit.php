<?php
declare(strict_types=1);

require_once __DIR__ . '/includes/bootstrap.php';
require_once __DIR__ . '/includes/contact.php';
require_once __DIR__ . '/includes/pdf.php';
require_once __DIR__ . '/includes/email.php';
require_once __DIR__ . '/includes/notifications.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'POST required.']);
    exit;
}
require_same_origin_request();

$first = trim((string) ($_POST['first_name'] ?? ''));
$last = trim((string) ($_POST['last_name'] ?? ''));
$email = trim((string) ($_POST['email'] ?? ''));
$phone = rtbo_format_phone_number((string) ($_POST['phone'] ?? ''));
$message = trim((string) ($_POST['message'] ?? ''));

if ($first === '' || $last === '' || $email === '' || $phone === '' || $message === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(422);
    echo json_encode(['success' => false, 'message' => 'Please complete every contact field.']);
    exit;
}

$name = preg_replace('/[\r\n]+/', ' ', $first . ' ' . $last);
$submittedAt = date('c');
$contactMessage = [
    'contact_id' => bin2hex(random_bytes(12)),
    'submitted_at' => $submittedAt,
    'first_name' => $first,
    'last_name' => $last,
    'full_name' => $name,
    'email' => $email,
    'phone' => $phone,
    'message' => $message,
];

try {
    save_contact_message($contactMessage);
} catch (Throwable $error) {
    error_log('RTBO contact database save failed: ' . $error->getMessage());
}

try {
    $contactMessage['pdf_path'] = build_contact_pdf($contactMessage);
} catch (Throwable $error) {
    error_log('RTBO contact PDF generation failed: ' . $error->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Your message could not be prepared for email. Please contact RTBO directly.']);
    exit;
}

if (!send_contact_message_notification($contactMessage)) {
    error_log('RTBO contact email failed for recipient(s): ' . implode(', ', rtbo_contact_recipients()));
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Your message could not be sent. Please contact RTBO directly.']);
    exit;
}

try {
    rtbo_notify_admins([
        'type' => 'contact_message_submitted',
        'title' => 'New contact message',
        'body' => "{$name} sent a contact message from the RTBO website.",
        'related_type' => 'contact_message',
        'metadata' => [
            'contact_id' => $contactMessage['contact_id'],
            'email' => $email,
            'phone' => $phone,
        ],
    ]);
} catch (Throwable $notificationError) {
    error_log('RTBO contact notification event failed: ' . $notificationError->getMessage());
}

echo json_encode(['success' => true, 'message' => 'Your message was sent successfully.']);

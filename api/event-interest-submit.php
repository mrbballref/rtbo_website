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
$availability = trim((string) ($_POST['availability'] ?? ''));

if ($first === '' || $last === '' || $email === '' || $phone === '' || $availability === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(422);
    echo json_encode(['success' => false, 'message' => 'Please complete every event interest field.']);
    exit;
}

function rtbo_event_interest_text(array $input, string $key, string $fallback, int $maxLength = 160): string
{
    $value = trim((string) ($input[$key] ?? ''));
    $value = preg_replace('/[\r\n\t]+/', ' ', $value) ?? '';
    $value = trim($value);
    if ($value === '') {
        return $fallback;
    }
    return substr($value, 0, $maxLength);
}

$eventName = rtbo_event_interest_text($_POST, 'event_name', 'Big Miller Event Team Camp', 120);
$eventDate = rtbo_event_interest_text($_POST, 'event_date', 'June 8-9, 2026', 80);
$eventAddress = rtbo_event_interest_text($_POST, 'event_address', '1500 Christy Lane. Alexander, AR 72002', 180);
$venue = rtbo_event_interest_text($_POST, 'event_venue', 'Summer Wood Sports Complex', 120);
$courts = rtbo_event_interest_text($_POST, 'event_courts', 'Three courts', 80);
$crews = rtbo_event_interest_text($_POST, 'event_crews', '3-man crews', 80);
$gameFee = rtbo_event_interest_text($_POST, 'event_game_fee', '$30.00 per game per referee', 100);
$eventSummary = "Event: {$eventName}\n";
$eventSummary .= "Date: {$eventDate}\n";
$eventSummary .= "Venue: {$venue}\n";
$eventSummary .= "Address: {$eventAddress}\n";
$eventSummary .= "Courts: {$courts}\n";
$eventSummary .= "Crew System: {$crews}\n";
$eventSummary .= "Game Fee: {$gameFee}\n\n";
$eventSummary .= "Availability:\n{$availability}";

$name = preg_replace('/[\r\n]+/', ' ', $first . ' ' . $last);
$submittedAt = date('c');
$eventInterest = [
    'contact_id' => 'event_' . bin2hex(random_bytes(10)),
    'submitted_at' => $submittedAt,
    'first_name' => $first,
    'last_name' => $last,
    'full_name' => $name,
    'email' => $email,
    'phone' => $phone,
    'availability' => $availability,
    'message' => $eventSummary,
    'event_name' => $eventName,
    'event_date' => $eventDate,
    'event_address' => $eventAddress,
    'pdf_title' => 'Paid Event Interest Submission',
    'pdf_note' => 'Generated for Super Admin review, crew planning, and RTBO records.',
    'source_label' => "RTBO {$eventName} interest form",
    'message_section_title' => 'Event Availability',
    'message_field_label' => 'Availability and Event Details',
    'recommended_next_step' => "Review the official availability and follow up with crew assignments for {$eventName}.",
    'pdf_file_prefix' => 'event_interest',
];

try {
    save_contact_message($eventInterest);
} catch (Throwable $error) {
    error_log('RTBO event interest database save failed: ' . $error->getMessage());
}

try {
    $eventInterest['pdf_path'] = build_contact_pdf($eventInterest);
} catch (Throwable $error) {
    error_log('RTBO event interest PDF generation failed: ' . $error->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Your availability could not be prepared for email. Please contact RTBO directly.']);
    exit;
}

if (!send_event_interest_notification($eventInterest)) {
    error_log('RTBO event interest email failed for recipient(s): ' . implode(', ', rtbo_contact_recipients()));
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Your availability could not be sent. Please contact RTBO directly.']);
    exit;
}

try {
    rtbo_notify_admins([
        'type' => 'event_interest_submitted',
        'title' => 'New paid event availability',
        'body' => "{$name} submitted availability for {$eventName}.",
        'related_type' => 'contact_message',
        'metadata' => [
            'contact_id' => $eventInterest['contact_id'],
            'event_name' => $eventName,
            'email' => $email,
            'phone' => $phone,
        ],
    ]);
} catch (Throwable $notificationError) {
    error_log('RTBO event interest notification event failed: ' . $notificationError->getMessage());
}

echo json_encode(['success' => true, 'message' => 'Your availability was sent successfully.']);

<?php
declare(strict_types=1);

require_once __DIR__ . '/includes/bootstrap.php';
require_once __DIR__ . '/includes/contact.php';
require_once __DIR__ . '/includes/pdf.php';
require_once __DIR__ . '/includes/email.php';
require_once __DIR__ . '/includes/notifications.php';

header('Content-Type: application/json');

function rtbo_resume_request_json(array $payload, int $status = 200): never
{
    http_response_code($status);
    echo json_encode($payload);
    exit;
}

function rtbo_resume_request_input(): array
{
    $contentType = strtolower((string) ($_SERVER['CONTENT_TYPE'] ?? ''));
    if (str_contains($contentType, 'application/json')) {
        $decoded = json_decode((string) file_get_contents('php://input'), true);
        if (is_array($decoded)) {
            return $decoded;
        }
    }

    return $_POST;
}

function rtbo_resume_request_text(array $input, string $key, int $maxLength = 500): string
{
    $value = trim((string) ($input[$key] ?? ''));
    $value = preg_replace('/[\x00-\x1F\x7F]+/u', ' ', $value) ?? '';
    $value = preg_replace('/\s+/', ' ', $value) ?? '';

    return trim(substr($value, 0, $maxLength));
}

function rtbo_resume_request_option(string $value, array $allowed): string
{
    return in_array($value, $allowed, true) ? $value : '';
}

function rtbo_resume_request_positive_number(string $value, int $max = 999): string
{
    $number = (int) preg_replace('/\D+/', '', $value);
    if ($number < 1 || $number > $max) {
        return '';
    }

    return (string) $number;
}

function rtbo_resume_request_fee(string $value): string
{
    $value = trim($value);
    $amount = preg_replace('/[^0-9.]/', '', $value) ?? '';
    if ($amount === '') {
        return '';
    }
    $numeric = (float) $amount;
    if ($numeric <= 0) {
        return '';
    }

    return '$' . number_format($numeric, 2);
}

function rtbo_official_request_recipients(): array
{
    return rtbo_normalize_email_list([
        'admin@rtboofficiating.com',
        'mrbballref1775@yahoo.com',
    ]);
}

function rtbo_official_request_details(array $request): string
{
    $rows = [
        'Requested By' => $request['full_name'],
        'Email Address' => $request['email'],
        'Phone Number' => $request['phone'],
        'Courts Used' => $request['courts_used'],
        'Event Days' => $request['event_days'],
        'Games Per Floor' => $request['games_per_floor'],
        'Crew System' => $request['crew_type'],
        'Current Game Fee Per Ref' => $request['game_fee_per_ref'],
        'Payment Method' => $request['payment_method'],
        'Payment Timeline' => $request['payment_timeline'],
        'Branded Merchandise Required' => $request['branded_merch_required'],
        'Branded Merchandise Provided' => $request['branded_merch_provided'],
        'Submitted' => $request['submitted_at'],
        'Request ID' => $request['contact_id'],
    ];

    $lines = [];
    foreach ($rows as $label => $value) {
        $lines[] = $label . ': ' . pdf_value($value);
    }

    return implode("\n", $lines);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    rtbo_resume_request_json(['success' => false, 'message' => 'POST required.'], 405);
}

require_same_origin_request();

$input = rtbo_resume_request_input();
$first = rtbo_resume_request_text($input, 'first_name', 100);
$last = rtbo_resume_request_text($input, 'last_name', 100);
$email = rtbo_safe_header_email(rtbo_resume_request_text($input, 'email', 190));
$phone = rtbo_format_phone_number(rtbo_resume_request_text($input, 'phone', 80));
$courtsUsed = rtbo_resume_request_option(rtbo_resume_request_text($input, 'courts_used', 10), ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10+']);
$eventDays = rtbo_resume_request_positive_number(rtbo_resume_request_text($input, 'event_days', 20), 365);
$gamesPerFloor = rtbo_resume_request_positive_number(rtbo_resume_request_text($input, 'games_per_floor', 20), 999);
$crewType = rtbo_resume_request_option(rtbo_resume_request_text($input, 'crew_type', 20), ['2-man', '3-man']);
$gameFee = rtbo_resume_request_fee(rtbo_resume_request_text($input, 'game_fee_per_ref', 40));
$paymentMethod = rtbo_resume_request_option(rtbo_resume_request_text($input, 'payment_method', 40), ['Cash', 'Direct Deposit', 'Check']);
$paymentTimeline = rtbo_resume_request_text($input, 'payment_timeline', 220);
$merchRequired = rtbo_resume_request_option(rtbo_resume_request_text($input, 'branded_merch_required', 10), ['Yes', 'No']);
$merchProvided = rtbo_resume_request_option(rtbo_resume_request_text($input, 'branded_merch_provided', 10), ['Yes', 'No']);

if ($paymentMethod === 'Cash' && $paymentTimeline === '') {
    $paymentTimeline = 'Not applicable because payment method is Cash.';
}

if (
    $first === ''
    || $last === ''
    || $email === ''
    || $phone === ''
    || $courtsUsed === ''
    || $eventDays === ''
    || $gamesPerFloor === ''
    || $crewType === ''
    || $gameFee === ''
    || $paymentMethod === ''
    || (in_array($paymentMethod, ['Direct Deposit', 'Check'], true) && $paymentTimeline === '')
    || $merchRequired === ''
    || $merchProvided === ''
) {
    rtbo_resume_request_json(['success' => false, 'message' => 'Please complete every required official request field.'], 422);
}

$fullName = preg_replace('/[\r\n]+/', ' ', trim($first . ' ' . $last)) ?: 'Website visitor';
$submittedAt = date('c');
$officialRequest = [
    'contact_id' => 'official_request_' . bin2hex(random_bytes(10)),
    'submitted_at' => $submittedAt,
    'first_name' => $first,
    'last_name' => $last,
    'full_name' => $fullName,
    'email' => $email,
    'phone' => $phone,
    'courts_used' => $courtsUsed,
    'event_days' => $eventDays,
    'games_per_floor' => $gamesPerFloor,
    'crew_type' => $crewType,
    'game_fee_per_ref' => $gameFee,
    'payment_method' => $paymentMethod,
    'payment_timeline' => $paymentTimeline,
    'branded_merch_required' => $merchRequired,
    'branded_merch_provided' => $merchProvided,
    'pdf_title' => 'Official Staffing Request',
    'pdf_note' => 'Generated for Super Admin review, event staffing, and RTBO records.',
    'source_label' => 'RTBO digital resume Request Officials form',
    'message_section_title' => 'Event Staffing Details',
    'message_field_label' => 'Official Request Details',
    'recommended_next_step' => 'Review staffing details, confirm event coverage needs, and follow up with the requester before assigning officials.',
    'pdf_file_prefix' => 'official_request',
];
$officialRequest['message'] = rtbo_official_request_details($officialRequest);

try {
    save_contact_message($officialRequest);
} catch (Throwable $error) {
    error_log('RTBO official request database save failed: ' . $error->getMessage());
}

try {
    $officialRequest['pdf_path'] = build_contact_pdf($officialRequest);
} catch (Throwable $error) {
    error_log('RTBO official request PDF generation failed: ' . $error->getMessage());
    rtbo_resume_request_json(['success' => false, 'message' => 'Your official request could not be prepared for email. Please contact RTBO directly.'], 500);
}

$recipients = rtbo_official_request_recipients();
$emailBody = "A new request for officials was submitted from the RTBO digital resume page.\n\n";
$emailBody .= rtbo_official_request_details($officialRequest) . "\n\n";
$emailBody .= "A branded PDF copy is attached for RTBO records.";

if (!rtbo_mail_with_pdf(
    $recipients,
    'New RTBO Official Staffing Request - ' . $fullName,
    $emailBody,
    (string) $officialRequest['pdf_path'],
    $email
)) {
    error_log('RTBO official request email failed for recipient(s): ' . implode(', ', $recipients) . ' | ' . rtbo_mail_last_error());
    rtbo_resume_request_json(['success' => false, 'message' => 'Your official request could not be sent. Please contact RTBO directly.'], 500);
}

try {
    rtbo_notify_admins([
        'type' => 'official_request_submitted',
        'title' => 'New official staffing request',
        'body' => "{$fullName} submitted an official staffing request from the digital resume page.",
        'related_type' => 'contact_message',
        'metadata' => [
            'contact_id' => $officialRequest['contact_id'],
            'email' => $email,
            'phone' => $phone,
            'courts_used' => $courtsUsed,
            'event_days' => $eventDays,
        ],
    ]);
} catch (Throwable $notificationError) {
    error_log('RTBO official request notification event failed: ' . $notificationError->getMessage());
}

rtbo_resume_request_json(['success' => true, 'message' => 'Your official request was sent to RTBO successfully. A branded PDF copy was generated for review.']);

<?php
declare(strict_types=1);

require_once __DIR__ . '/includes/bootstrap.php';
require_once __DIR__ . '/includes/payments.php';
require_once __DIR__ . '/includes/pdf.php';
require_once __DIR__ . '/includes/email.php';
require_once __DIR__ . '/includes/got-u-nex-ref-sync.php';
require_once __DIR__ . '/includes/registration-store.php';
require_once __DIR__ . '/includes/users.php';
require_once __DIR__ . '/includes/notifications.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'POST required.']);
    exit;
}
require_same_origin_request();

$accountUser = current_database_user();
if (!$accountUser) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Please create an account or sign in before submitting the registration form.']);
    exit;
}

$requiredFields = [
    'first_name' => 'First name',
    'last_name' => 'Last name',
    'email' => 'Email address',
    'phone' => 'Phone number',
    'address_1' => 'Address',
    'city' => 'City',
    'state' => 'State',
    'zip' => 'ZIP code',
    'experience' => 'Years of officiating experience',
    'sex' => 'Sex',
    'printed_signature' => 'Printed signature',
    'signature' => 'Signature',
];

foreach ($requiredFields as $field => $label) {
    if (clean($field) === '') {
        http_response_code(422);
        echo json_encode(['success' => false, 'message' => $label . ' is required.']);
        exit;
    }
}

if (!filter_var(clean('email'), FILTER_VALIDATE_EMAIL)) {
    http_response_code(422);
    echo json_encode(['success' => false, 'message' => 'Please enter a valid email address.']);
    exit;
}

$sessions = $_POST['sessions'] ?? $_POST['sessions_'] ?? $_POST['sessions__'] ?? $_POST['sessions[]'] ?? [];
if (!is_array($sessions)) {
    $sessions = [$sessions];
}
$sessions = array_values(array_filter(array_map('trim', $sessions)));

if (!$sessions) {
    http_response_code(422);
    echo json_encode(['success' => false, 'message' => 'Please select at least one school session.']);
    exit;
}

if ((string) ($_POST['waiver_agreement'] ?? '') !== 'Agree') {
    http_response_code(422);
    echo json_encode(['success' => false, 'message' => 'You must agree to the waiver before submitting.']);
    exit;
}

function rtbo_session_price_cents(string $session): int
{
    $normalized = strtolower($session);

    if (str_contains($normalized, 'session 2') || str_contains($normalized, 'central arkansas') || str_contains($normalized, 'conway')) {
        return 12500;
    }

    return 22500;
}

$amountCents = array_sum(array_map('rtbo_session_price_cents', $sessions));
$sex = clean('sex') ?: clean('gender');
$levels = $_POST['levels'] ?? $_POST['levels[]'] ?? [];
if (!is_array($levels)) {
    $levels = [$levels];
}
$levels = array_values(array_filter(array_map('trim', $levels)));

$paymentProvider = clean('payment_provider') ?: clean('payment_method') ?: 'stripe';
if (!in_array($paymentProvider, ['stripe', 'paypal'], true)) {
    http_response_code(422);
    echo json_encode(['success' => false, 'message' => 'Please choose Stripe or PayPal as the payment method.']);
    exit;
}

$profilePhotoPath = '';
if (empty($_FILES['profile_photo']['tmp_name']) || !is_uploaded_file((string) $_FILES['profile_photo']['tmp_name'])) {
    http_response_code(422);
    echo json_encode(['success' => false, 'message' => 'Please upload a professional profile picture.']);
    exit;
}

if (!empty($_FILES['profile_photo']['tmp_name']) && is_uploaded_file((string) $_FILES['profile_photo']['tmp_name'])) {
    if ((int) ($_FILES['profile_photo']['size'] ?? 0) > 5 * 1024 * 1024) {
        http_response_code(422);
        echo json_encode(['success' => false, 'message' => 'Profile photo must be 5MB or smaller.']);
        exit;
    }

    $mimeType = '';
    if (function_exists('finfo_open')) {
        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        if ($finfo !== false) {
            $detected = finfo_file($finfo, (string) $_FILES['profile_photo']['tmp_name']);
            finfo_close($finfo);
            $mimeType = is_string($detected) ? $detected : '';
        }
    }

    if ($mimeType === '') {
        $mimeType = (string) ($_FILES['profile_photo']['type'] ?? '');
    }

    $extension = match ($mimeType) {
        'image/jpeg' => 'jpg',
        'image/png' => 'png',
        'image/webp' => 'webp',
        default => '',
    };

    if ($extension === '') {
        http_response_code(422);
        echo json_encode(['success' => false, 'message' => 'Profile photo must be a JPG, PNG, or WebP image.']);
        exit;
    }

    ensure_dir(PROFILE_PHOTO_DIR);
    $profilePhotoPath = PROFILE_PHOTO_DIR . '/' . bin2hex(random_bytes(12)) . '.' . $extension;
    if (!move_uploaded_file((string) $_FILES['profile_photo']['tmp_name'], $profilePhotoPath)) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Profile photo could not be saved. Please try again.']);
        exit;
    }
}

$registration = [
    'id' => bin2hex(random_bytes(16)),
    'user_id' => (int) $accountUser['id'],
    'submitted_at' => date('c'),
    'first_name' => clean('first_name'),
    'last_name' => clean('last_name'),
    'full_name' => trim(clean('first_name') . ' ' . clean('last_name')),
    'email' => strtolower(clean('email')),
    'phone' => rtbo_format_phone_number(clean('phone')),
    'address' => trim(clean('address_1') . ' ' . clean('address_2') . ', ' . clean('city') . ', ' . clean('state') . ' ' . clean('zip')),
    'address_1' => clean('address_1'),
    'address_2' => clean('address_2'),
    'city' => clean('city'),
    'state' => clean('state'),
    'zip' => clean('zip'),
    'experience' => clean('experience'),
    'gender' => $sex,
    'sex' => $sex,
    'race' => clean('race'),
    'levels' => $levels,
    'current_conferences' => clean('current_conferences'),
    'referred' => clean('referred'),
    'referral_name' => clean('referral_name'),
    'goals' => clean('goals'),
    'sessions' => $sessions,
    'amount_cents' => $amountCents,
    'payment_provider' => $paymentProvider,
    'payment_status' => 'pending',
    'waiver_agreement' => clean('waiver_agreement'),
    'printed_signature' => clean('printed_signature') ?: trim(clean('first_name') . ' ' . clean('last_name')),
    'signature' => clean('signature'),
    'profile_photo_path' => $profilePhotoPath,
];

ensure_dir(REGISTRATION_DIR);
$registrationPath = REGISTRATION_DIR . '/' . $registration['id'] . '.json';
file_put_contents($registrationPath, json_encode($registration, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES), LOCK_EX);

$pdfPath = build_registration_pdf($registration);
$registration['pdf_path'] = $pdfPath;
file_put_contents($registrationPath, json_encode($registration, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES), LOCK_EX);
send_school_registration_notification($registration);

try {
    rtbo_notify_admins([
        'type' => 'school_registration_submitted',
        'title' => 'New school registration submitted',
        'body' => $registration['full_name'] . ' submitted an RTBO school registration for ' . implode(', ', $registration['sessions']) . '.',
        'related_type' => 'school_registration',
        'related_id' => 0,
        'target_user_id' => null,
        'metadata' => [
            'registration_id' => $registration['id'],
            'applicant_email' => $registration['email'],
            'sessions' => $registration['sessions'],
            'amount_cents' => $registration['amount_cents'],
            'payment_provider' => $registration['payment_provider'],
        ],
        'actor' => public_auth_user($accountUser),
    ]);
    rtbo_notify_users([(int) $accountUser['id']], [
        'type' => 'registration_confirmation',
        'title' => 'Registration received',
        'body' => 'Your RTBO registration was received. Your professional profile PDF has been generated and payment checkout is next.',
        'related_type' => 'school_registration',
        'metadata' => ['registration_id' => $registration['id']],
        'actor' => public_auth_user($accountUser),
    ]);
} catch (Throwable $notificationError) {
    error_log('RTBO registration notification event failed: ' . $notificationError->getMessage());
}

$registration['got_u_nex_ref_sync'] = sync_registration_to_got_u_nex_ref($registration);
file_put_contents($registrationPath, json_encode($registration, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES), LOCK_EX);

try {
    save_school_registration_record($registration);
} catch (Throwable $error) {
    error_log('RTBO registration database save failed: ' . $error->getMessage());
}

try {
    ensure_users_table();
    $profile = db()->prepare(
        "UPDATE users
         SET role = 'official',
             first_name = ?,
             last_name = ?,
             email = ?,
             phone = ?,
             sex = ?,
             race = ?,
             address_line1 = ?,
             address_line2 = ?,
             city = ?,
             state = ?,
             zip = ?,
             conferences = ?,
             experience = ?,
             profile_photo = ?,
             status = 'active'
         WHERE id = ?"
    );
    $profile->execute([
        $registration['first_name'],
        $registration['last_name'],
        $registration['email'],
        $registration['phone'],
        $registration['sex'],
        $registration['race'],
        $registration['address_1'],
        $registration['address_2'],
        $registration['city'],
        $registration['state'],
        $registration['zip'],
        $registration['current_conferences'],
        $registration['experience'],
        $registration['profile_photo_path'],
        (int) $accountUser['id'],
    ]);
} catch (Throwable $error) {
    error_log('RTBO registration user profile sync failed: ' . $error->getMessage());
}

try {
    $redirect = create_payment_checkout($registration);
} catch (Throwable $error) {
    http_response_code(503);
    echo json_encode(['success' => false, 'message' => $error->getMessage()]);
    exit;
}

echo json_encode([
    'success' => true,
    'message' => 'Application submitted. Continue to payment.',
    'registration_id' => $registration['id'],
    'got_u_nex_ref_sync' => $registration['got_u_nex_ref_sync']['status'] ?? 'queued',
    'redirect' => $redirect,
]);

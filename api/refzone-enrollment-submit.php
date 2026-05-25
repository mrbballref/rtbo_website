<?php
declare(strict_types=1);

require_once __DIR__ . '/includes/bootstrap.php';
require_once __DIR__ . '/includes/payments.php';
require_once __DIR__ . '/includes/email.php';
require_once __DIR__ . '/includes/notifications.php';
require_once __DIR__ . '/includes/refzone-enrollments.php';
require_once __DIR__ . '/includes/users.php';

header('Content-Type: application/json');

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'POST required.']);
    exit;
}

require_same_origin_request();

function rtbo_refzone_json(array $payload, int $status = 200): never
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_SLASHES);
    exit;
}

function rtbo_refzone_post(string $key, int $maxLength = 1000): string
{
    return substr(trim((string) ($_POST[$key] ?? '')), 0, $maxLength);
}

function rtbo_refzone_course_tracks(): array
{
    return [
        'nfhs' => 'NFHS High School Track',
        'njcaa' => 'NJCAA Track',
        'naia' => 'NAIA Track',
        'ncaa' => 'NCAA Track',
        'pro' => 'NBA/WNBA Development Track',
    ];
}

$accountUser = current_database_user();
if (!$accountUser) {
    rtbo_refzone_json([
        'success' => false,
        'message' => 'Create an account or sign in before enrolling in RefZone University.',
    ], 401);
}

function rtbo_refzone_create_stripe_checkout(array $enrollment, array $package): array
{
    $lineItem = [
        'name' => 'RefZone University - ' . (string) ($package['name'] ?? 'Membership'),
        'quantity' => 1,
    ];

    $priceId = trim((string) ($package['stripe_price_id'] ?? ''));
    if ($priceId !== '') {
        $lineItem['price'] = $priceId;
    } else {
        $lineItem['amount_cents'] = (int) ($package['amount_cents'] ?? 0);
        $lineItem['currency'] = strtolower((string) ($package['currency'] ?? 'usd'));
        $lineItem['recurring_interval'] = 'month';
    }

    return create_stripe_checkout_session([
        'mode' => 'subscription',
        'success_url' => RTBO_BASE_URL . '/payment-success.php?provider=stripe&type=refzone&enrollment=' . rawurlencode((string) $enrollment['id']) . '&session_id={CHECKOUT_SESSION_ID}',
        'cancel_url' => RTBO_BASE_URL . '/payment-cancel.php?type=refzone&enrollment=' . rawurlencode((string) $enrollment['id']),
        'customer_email' => (string) $enrollment['email'],
        'client_reference_id' => (string) $enrollment['id'],
        'line_items' => [$lineItem],
        'metadata' => [
            'type' => 'refzone_university',
            'enrollment_id' => (string) $enrollment['id'],
            'package_id' => (string) $enrollment['package_id'],
            'package_name' => (string) $enrollment['package_name'],
            'course_id' => (string) ($enrollment['course_id'] ?? ''),
            'email' => (string) $enrollment['email'],
        ],
        'subscription_metadata' => [
            'type' => 'refzone_university',
            'enrollment_id' => (string) $enrollment['id'],
            'package_id' => (string) $enrollment['package_id'],
            'course_id' => (string) ($enrollment['course_id'] ?? ''),
            'email' => (string) $enrollment['email'],
        ],
    ]);
}

function rtbo_refzone_send_enrollment_notice(array $enrollment): void
{
    $body = "New RefZone University enrollment started.\n\n";
    $body .= 'Name: ' . (string) ($enrollment['full_name'] ?? '') . "\n";
    $body .= 'Email: ' . (string) ($enrollment['email'] ?? '') . "\n";
    $body .= 'Phone: ' . (string) ($enrollment['phone'] ?? '') . "\n";
    $body .= 'Package: ' . (string) ($enrollment['package_name'] ?? '') . "\n";
    $body .= 'Amount: $' . number_format(((int) ($enrollment['amount_cents'] ?? 0)) / 100, 2) . " monthly\n";
    $body .= 'Course Track: ' . (string) ($enrollment['course_track_label'] ?? $enrollment['course_track'] ?? '') . "\n";
    $body .= 'Course Access: ' . (string) ($enrollment['course_id'] ?? '') . "\n";
    $body .= 'Payment Provider: ' . strtoupper((string) ($enrollment['payment_provider'] ?? '')) . "\n";
    $body .= 'Enrollment ID: ' . (string) ($enrollment['id'] ?? '') . "\n";

    try {
        rtbo_send_mail(
            implode(', ', rtbo_registration_recipients()),
            'New RefZone University Enrollment',
            $body,
            rtbo_plain_email_headers((string) ($enrollment['email'] ?? ''))
        );
    } catch (Throwable $error) {
        error_log('RTBO RefZone enrollment email failed: ' . $error->getMessage());
    }
}

try {
    $accountPublicUser = public_auth_user($accountUser);
    $accountEmail = strtolower(trim((string) ($accountPublicUser['email'] ?? '')));
    $accountFullName = trim((string) ($accountPublicUser['name'] ?? ''));
    $accountPhone = rtbo_format_phone_number((string) ($accountPublicUser['phone'] ?? ''));
    $package = rtbo_refzone_membership_package(rtbo_refzone_post('package_id', 80));
    if (!$package) {
        throw new RuntimeException('Choose a valid RefZone University membership package.');
    }

    $tracks = rtbo_refzone_course_tracks();
    $courseTrack = strtolower(rtbo_refzone_post('course_track', 80));
    if (!isset($tracks[$courseTrack])) {
        throw new RuntimeException('Choose a valid RefZone University course track.');
    }

    $fullName = rtbo_refzone_post('full_name', 200) ?: $accountFullName;
    $email = strtolower(rtbo_refzone_post('email', 190) ?: $accountEmail);
    $phone = rtbo_format_phone_number(rtbo_refzone_post('phone', 60) ?: $accountPhone);
    $experienceLevel = rtbo_refzone_post('experience_level', 120);
    $membershipGoal = rtbo_refzone_post('membership_goal', 255);
    $developmentNotes = rtbo_refzone_post('development_notes', 1000);
    $paymentProvider = strtolower(rtbo_refzone_post('payment_provider', 40));
    $courseId = rtbo_refzone_course_id_for_package((string) $package['id'], $courseTrack);
    $courseUrl = RTBO_BASE_URL . '/#education/course/' . rawurlencode($courseId);

    foreach ([
        'Full name' => $fullName,
        'Email address' => $email,
        'Phone number' => $phone,
        'Experience level' => $experienceLevel,
        'Membership goal' => $membershipGoal,
        'Development notes' => $developmentNotes,
    ] as $label => $value) {
        if ($value === '') {
            throw new RuntimeException($label . ' is required.');
        }
    }

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        throw new RuntimeException('Enter a valid email address.');
    }

    if ($accountEmail === '' || $email !== $accountEmail) {
        throw new RuntimeException('Use the email address tied to your signed-in RTBO account for RefZone University access.');
    }

    if (!in_array($paymentProvider, ['stripe', 'paypal'], true)) {
        throw new RuntimeException('Choose Stripe or PayPal for the membership payment.');
    }

    if ((string) ($_POST['membership_terms'] ?? '') !== 'Agree') {
        throw new RuntimeException('You must agree to the recurring membership terms before checkout.');
    }

    $enrollment = [
        'id' => 'RZU-' . gmdate('Ymd-His') . '-' . strtoupper(bin2hex(random_bytes(3))),
        'user_id' => (int) ($accountUser['id'] ?? 0),
        'full_name' => $fullName,
        'email' => $email,
        'phone' => $phone,
        'package_id' => (string) $package['id'],
        'package_name' => (string) $package['name'],
        'amount_cents' => (int) $package['amount_cents'],
        'currency' => (string) $package['currency'],
        'course_track' => $courseTrack,
        'course_track_label' => $tracks[$courseTrack],
        'course_id' => $courseId,
        'course_url' => $courseUrl,
        'experience_level' => $experienceLevel,
        'membership_goal' => $membershipGoal,
        'development_notes' => $developmentNotes,
        'payment_provider' => $paymentProvider,
        'payment_status' => 'checkout_pending',
        'submitted_at' => date('c'),
    ];

    save_refzone_enrollment_record($enrollment);
    rtbo_refzone_send_enrollment_notice($enrollment);

    if (!payment_ready($paymentProvider)) {
        update_refzone_enrollment_payment($enrollment['id'], 'gateway_not_configured');
        throw new RuntimeException(ucfirst($paymentProvider) . ' is not configured yet. Add live credentials in api/.env on the production server.');
    }

    if ($paymentProvider === 'paypal') {
        $checkoutUrl = create_paypal_subscription_checkout($enrollment, $package);
        $checkoutUpdates = ['checkout_url' => $checkoutUrl];
    } else {
        $session = rtbo_refzone_create_stripe_checkout($enrollment, $package);
        $checkoutUrl = (string) $session['url'];
        $checkoutUpdates = [
            'checkout_url' => $checkoutUrl,
            'stripe_checkout_session_id' => (string) ($session['id'] ?? ''),
        ];
    }

    update_refzone_enrollment_payment($enrollment['id'], 'checkout_created', $checkoutUpdates);

    try {
        rtbo_notify_admins([
            'type' => 'refzone_enrollment_started',
            'title' => 'RefZone University enrollment started',
            'body' => $fullName . ' selected the ' . (string) $package['name'] . ' for RefZone University.',
            'related_type' => 'refzone_enrollment',
            'target_user_id' => null,
            'metadata' => [
                'enrollment_id' => $enrollment['id'],
                'email' => $email,
                'package_id' => (string) $package['id'],
                'course_id' => $courseId,
                'payment_provider' => $paymentProvider,
            ],
        ]);
    } catch (Throwable $notificationError) {
        error_log('RTBO RefZone enrollment notification failed: ' . $notificationError->getMessage());
    }

    rtbo_refzone_json([
        'success' => true,
        'message' => 'Membership checkout is ready.',
        'enrollment_id' => $enrollment['id'],
        'checkout_url' => $checkoutUrl,
        'redirect' => $checkoutUrl,
    ]);
} catch (Throwable $error) {
    rtbo_refzone_json([
        'success' => false,
        'message' => $error->getMessage(),
    ], 400);
}

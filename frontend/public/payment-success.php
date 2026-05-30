<?php
declare(strict_types=1);

require_once __DIR__ . '/api/includes/bootstrap.php';
require_once __DIR__ . '/api/includes/payments.php';
require_once __DIR__ . '/api/includes/registration-store.php';
require_once __DIR__ . '/api/includes/refzone-enrollments.php';
require_once __DIR__ . '/api/includes/email.php';
require_once __DIR__ . '/api/includes/notifications.php';
require_once __DIR__ . '/api/includes/store-orders.php';

$provider = strtolower(trim((string) ($_GET['provider'] ?? '')));
$type = strtolower(trim((string) ($_GET['type'] ?? '')));
$registrationId = trim((string) ($_GET['registration'] ?? ''));
$enrollmentId = trim((string) ($_GET['enrollment'] ?? ''));
$storeOrderId = trim((string) ($_GET['order'] ?? ''));
$verified = false;
$message = 'We could not verify this payment. Please contact RTBO if you believe this is an error.';
$registration = null;
$enrollment = null;
$storeOrder = null;
$redirectUrl = '';

if ($type === 'refzone' && in_array($provider, ['stripe', 'paypal'], true) && $enrollmentId !== '') {
    $enrollment = find_refzone_enrollment($enrollmentId);

    if ($enrollment) {
        try {
            $alreadyPaid = (($enrollment['payment_status'] ?? '') === 'paid');
            $updates = [];

            if (!$alreadyPaid && $provider === 'stripe') {
                $sessionId = trim((string) ($_GET['session_id'] ?? ''));
                if ($sessionId !== '') {
                    $session = retrieve_stripe_checkout_session($sessionId);
                    $metadata = is_array($session['metadata'] ?? null) ? $session['metadata'] : [];
                    $verified = (($session['payment_status'] ?? '') === 'paid' || ($session['mode'] ?? '') === 'subscription')
                        && (($metadata['enrollment_id'] ?? '') === $enrollmentId || ($session['client_reference_id'] ?? '') === $enrollmentId);
                    $updates = [
                        'stripe_checkout_session_id' => (string) ($session['id'] ?? ''),
                        'stripe_subscription_id' => (string) ($session['subscription'] ?? ''),
                    ];
                }
            } elseif (!$alreadyPaid && $provider === 'paypal') {
                $subscriptionId = trim((string) ($_GET['subscription_id'] ?? $_GET['token'] ?? ''));
                if ($subscriptionId !== '') {
                    $subscription = retrieve_paypal_subscription($subscriptionId);
                    $verified = (string) ($subscription['status'] ?? '') === 'ACTIVE'
                        && ((string) ($subscription['custom_id'] ?? '') === $enrollmentId);
                    $updates = [
                        'paypal_subscription_id' => (string) ($subscription['id'] ?? $subscriptionId),
                    ];
                }
            } else {
                $verified = true;
            }

            if ($verified || $alreadyPaid) {
                update_refzone_enrollment_payment($enrollmentId, 'paid', $updates);
                $enrollment = array_merge($enrollment, $updates, ['payment_status' => 'paid']);
                if (!$alreadyPaid) {
                    rtbo_notify_admins([
                        'type' => 'refzone_enrollment_paid',
                        'title' => 'RefZone membership payment confirmed',
                        'body' => (string) ($enrollment['full_name'] ?? 'A RefZone member') . ' completed payment for ' . (string) ($enrollment['package_name'] ?? 'RefZone University') . '.',
                        'related_type' => 'refzone_enrollment',
                        'metadata' => [
                            'enrollment_id' => $enrollmentId,
                            'email' => (string) ($enrollment['email'] ?? ''),
                            'package_name' => (string) ($enrollment['package_name'] ?? ''),
                            'payment_provider' => $provider,
                        ],
                    ]);
                }
                $redirectUrl = rtbo_refzone_course_url($enrollment);
            } else {
                update_refzone_enrollment_payment($enrollmentId, 'verification_failed', $updates);
            }

            $message = ($verified || $alreadyPaid)
                ? 'Payment verified. Your RefZone University membership is confirmed.'
                : 'Payment returned, but membership verification did not complete.';
        } catch (Throwable $error) {
            error_log('RTBO RefZone payment verification failed: ' . $error->getMessage());
            update_refzone_enrollment_payment($enrollmentId, 'verification_error');
        }
    } else {
        $message = 'RefZone University enrollment record was not found.';
    }
}

if ($type === 'store' && in_array($provider, ['stripe', 'paypal'], true) && $storeOrderId !== '') {
    $storeOrder = rtbo_store_order_find($storeOrderId);

    if ($storeOrder) {
        try {
            $alreadyPaid = (($storeOrder['status'] ?? '') === 'paid');
            $updates = [];

            if (!$alreadyPaid && $provider === 'stripe') {
                $sessionId = trim((string) ($_GET['session_id'] ?? ''));
                if ($sessionId !== '') {
                    $session = retrieve_stripe_checkout_session($sessionId);
                    $metadata = is_array($session['metadata'] ?? null) ? $session['metadata'] : [];
                    $verified = (($session['payment_status'] ?? '') === 'paid')
                        && (($metadata['order_id'] ?? '') === $storeOrderId || ($session['client_reference_id'] ?? '') === $storeOrderId);
                    $updates = [
                        'stripe_checkout_session_id' => (string) ($session['id'] ?? ''),
                    ];
                }
            } elseif (!$alreadyPaid && $provider === 'paypal') {
                $paypalOrderId = trim((string) ($_GET['token'] ?? ''));
                if ($paypalOrderId !== '') {
                    $response = http_json(paypal_base_url() . '/v2/checkout/orders/' . rawurlencode($paypalOrderId) . '/capture', 'POST', [
                        'Authorization: Bearer ' . paypal_access_token(),
                        'Content-Type: application/json',
                    ], '{}');
                    $body = $response['body'];
                    $verified = $response['status'] < 400
                        && (($body['status'] ?? '') === 'COMPLETED')
                        && (($body['purchase_units'][0]['reference_id'] ?? '') === $storeOrderId);
                    $updates = [
                        'paypal_order_id' => $paypalOrderId,
                        'paypal_capture_id' => (string) ($body['purchase_units'][0]['payments']['captures'][0]['id'] ?? ''),
                    ];
                }
            } else {
                $verified = true;
            }

            if ($verified || $alreadyPaid) {
                $storeOrder = rtbo_store_order_update_record($storeOrderId, array_merge($updates, [
                    'status' => 'paid',
                    'payment_status' => 'paid',
                    'paid_at' => $storeOrder['paid_at'] ?? gmdate('c'),
                ])) ?: $storeOrder;
                rtbo_store_order_notify_purchase_completed($storeOrder);
                $message = 'Payment verified. Your RTBO shop purchase is confirmed.';
            } else {
                rtbo_store_order_update_record($storeOrderId, array_merge($updates, [
                    'status' => 'verification_failed',
                    'payment_status' => 'verification_failed',
                ]));
                $message = 'Payment returned, but store purchase verification did not complete.';
            }
        } catch (Throwable $error) {
            error_log('RTBO store payment verification failed: ' . $error->getMessage());
            rtbo_store_order_update_record($storeOrderId, ['status' => 'verification_error']);
            $message = 'Payment returned, but store purchase verification could not be completed.';
        }
    } else {
        $message = 'Store order record was not found.';
    }
}

if ($type !== 'refzone' && in_array($provider, ['stripe', 'paypal'], true) && $registrationId !== '') {
    $registration = find_school_registration($registrationId);

    if ($registration) {
        try {
            $alreadyPaid = (($registration['payment_status'] ?? '') === 'paid');
            $verified = $alreadyPaid || verify_payment($provider, $registrationId);
            if ($verified) {
                $registration['payment_status'] = 'paid';
                $registration['paid_at'] = $registration['paid_at'] ?? date('c');
                $emailAlreadySent = !empty($registration['payment_confirmation_sent_at']);
                if (!$emailAlreadySent && send_registration_email($registration)) {
                    $registration['payment_confirmation_sent_at'] = date('c');
                }
                update_school_registration_payment($registrationId, 'paid', $registration);
            } else {
                update_school_registration_payment($registrationId, 'verification_failed');
            }
            $message = $verified
                ? 'Payment verified. Your registration is confirmed.'
                : 'Payment returned, but verification did not complete.';
        } catch (Throwable $error) {
            error_log('RTBO payment verification failed: ' . $error->getMessage());
            update_school_registration_payment($registrationId, 'verification_error');
        }
    } else {
        $message = 'Registration record was not found.';
    }
}
?>
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <?php if ($redirectUrl !== ''): ?>
  <meta http-equiv="refresh" content="2;url=<?php echo e($redirectUrl); ?>">
  <?php endif; ?>
  <title>Payment Confirmation | Raising The Bar Officiating</title>
  <style>
    body { margin: 0; min-height: 100vh; display: grid; place-items: center; font-family: Inter, Arial, sans-serif; color: #fff; background: #080808; }
    main { width: min(680px, calc(100% - 32px)); border: 1px solid rgba(193, 18, 31,.35); border-radius: 24px; padding: 34px; background: linear-gradient(145deg, rgba(255,255,255,.1), rgba(255,255,255,.035)); box-shadow: 0 24px 80px rgba(0,0,0,.45); }
    img { width: 116px; height: auto; display: block; margin-bottom: 18px; }
    p { color: rgba(255,255,255,.74); line-height: 1.6; }
    a { display: inline-flex; margin-top: 18px; border-radius: 999px; padding: 12px 18px; color: #111; background: linear-gradient(145deg, #c1121f, #c68a92); font-weight: 900; text-decoration: none; }
  </style>
</head>
<body>
  <main>
    <img src="/assets/images/logo.png" alt="Raising The Bar Officiating logo">
    <p>Raising The Bar Officiating Inc.</p>
    <h1><?php echo $verified ? 'Payment Confirmed' : 'Payment Needs Review'; ?></h1>
    <p><?php echo e($message); ?></p>
    <?php if ($registration): ?>
      <p><strong>Applicant:</strong> <?php echo e((string) ($registration['full_name'] ?? '')); ?><br><strong>Registration:</strong> <?php echo e($registrationId); ?></p>
    <?php endif; ?>
    <?php if ($enrollment): ?>
      <p><strong>Member:</strong> <?php echo e((string) ($enrollment['full_name'] ?? '')); ?><br><strong>Package:</strong> <?php echo e((string) ($enrollment['package_name'] ?? 'RefZone University')); ?><br><strong>Enrollment:</strong> <?php echo e($enrollmentId); ?></p>
    <?php endif; ?>
    <?php if ($storeOrder): ?>
      <p><strong>Store Order:</strong> <?php echo e($storeOrderId); ?><br><strong>Total:</strong> $<?php echo e(number_format(((int) ($storeOrder['total_cents'] ?? 0)) / 100, 2)); ?></p>
    <?php endif; ?>
    <?php if ($redirectUrl !== ''): ?>
      <p>Redirecting you to your RefZone University course now.</p>
      <a href="<?php echo e($redirectUrl); ?>">Continue to Course</a>
    <?php else: ?>
      <a href="/">Return to RTBO</a>
    <?php endif; ?>
  </main>
</body>
</html>

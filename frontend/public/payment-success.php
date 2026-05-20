<?php
declare(strict_types=1);

require_once __DIR__ . '/api/includes/bootstrap.php';
require_once __DIR__ . '/api/includes/payments.php';
require_once __DIR__ . '/api/includes/registration-store.php';
require_once __DIR__ . '/api/includes/email.php';

$provider = strtolower(trim((string) ($_GET['provider'] ?? '')));
$registrationId = trim((string) ($_GET['registration'] ?? ''));
$verified = false;
$message = 'We could not verify this payment. Please contact RTBO if you believe this is an error.';
$registration = null;

if (in_array($provider, ['stripe', 'paypal'], true) && $registrationId !== '') {
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
  <title>Payment Confirmation | Raising The Bar Officiating</title>
  <style>
    body { margin: 0; min-height: 100vh; display: grid; place-items: center; font-family: Inter, Arial, sans-serif; color: #fff; background: #080808; }
    main { width: min(680px, calc(100% - 32px)); border: 1px solid rgba(245,130,32,.35); border-radius: 24px; padding: 34px; background: linear-gradient(145deg, rgba(255,255,255,.1), rgba(255,255,255,.035)); box-shadow: 0 24px 80px rgba(0,0,0,.45); }
    img { width: 116px; height: auto; display: block; margin-bottom: 18px; }
    p { color: rgba(255,255,255,.74); line-height: 1.6; }
    a { display: inline-flex; margin-top: 18px; border-radius: 999px; padding: 12px 18px; color: #111; background: linear-gradient(145deg, #f58220, #ffd18f); font-weight: 900; text-decoration: none; }
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
    <a href="/">Return to RTBO</a>
  </main>
</body>
</html>

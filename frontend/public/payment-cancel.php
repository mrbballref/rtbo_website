<?php
declare(strict_types=1);

require_once __DIR__ . '/api/includes/bootstrap.php';
require_once __DIR__ . '/api/includes/registration-store.php';
require_once __DIR__ . '/api/includes/refzone-enrollments.php';

$type = strtolower(trim((string) ($_GET['type'] ?? '')));
$registrationId = trim((string) ($_GET['registration'] ?? ''));
$enrollmentId = trim((string) ($_GET['enrollment'] ?? ''));

if ($type === 'refzone' && $enrollmentId !== '') {
    try {
        update_refzone_enrollment_payment($enrollmentId, 'canceled');
    } catch (Throwable $error) {
        error_log('RTBO RefZone payment cancellation update failed: ' . $error->getMessage());
    }
} elseif ($registrationId !== '') {
    try {
        update_school_registration_payment($registrationId, 'canceled');
    } catch (Throwable $error) {
        error_log('RTBO payment cancellation update failed: ' . $error->getMessage());
    }
}
?>
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Payment Canceled | Raising The Bar Officiating</title>
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
    <h1>Payment Canceled</h1>
    <p><?php echo $type === 'refzone' ? 'Your RefZone University enrollment was received, but membership payment was not completed.' : 'Your registration was received, but payment was not completed.'; ?> You can return to the website and submit payment again when you are ready.</p>
    <a href="/">Return to RTBO</a>
  </main>
</body>
</html>

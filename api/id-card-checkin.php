<?php
declare(strict_types=1);

require_once __DIR__ . '/includes/bootstrap.php';
require_once __DIR__ . '/includes/id-cards.php';

function rtbo_id_card_checkin_json(array $payload, int $status = 200): never
{
    http_response_code($status);
    header('Content-Type: application/json');
    echo json_encode($payload, JSON_UNESCAPED_SLASHES);
    exit;
}

function rtbo_id_card_checkin_token(): string
{
    return rtbo_id_card_text($_GET['token'] ?? $_POST['token'] ?? '', 128);
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $payload = json_decode((string) file_get_contents('php://input'), true);
    if (!is_array($payload)) {
        $payload = $_POST;
    }
    $token = rtbo_id_card_text($payload['token'] ?? rtbo_id_card_checkin_token(), 128);

    try {
        $result = rtbo_id_card_record_checkin($token, $payload);
        rtbo_id_card_checkin_json([
            'success' => true,
            'message' => $result['message'],
            'checkin' => $result['checkin'],
        ]);
    } catch (InvalidArgumentException $error) {
        rtbo_id_card_checkin_json(['success' => false, 'message' => $error->getMessage()], 422);
    } catch (Throwable $error) {
        error_log('RTBO ID Card QR check-in failed: ' . $error->getMessage());
        rtbo_id_card_checkin_json(['success' => false, 'message' => 'The ID Card check-in could not be completed right now.'], 500);
    }
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    rtbo_id_card_checkin_json(['success' => false, 'message' => 'GET or POST required.'], 405);
}

$token = rtbo_id_card_checkin_token();
$selection = rtbo_id_card_selection_by_token($token);
if (!$selection) {
    http_response_code(404);
}

$profile = [];
$profileSnapshot = $selection['profile_snapshot'] ?? [];
if (is_string($profileSnapshot)) {
    $decoded = json_decode($profileSnapshot, true);
    $profile = is_array($decoded) ? $decoded : [];
} elseif (is_array($profileSnapshot)) {
    $profile = $profileSnapshot;
}

$memberName = (string) ($profile['full_name'] ?? 'RTBO Member');
$cardTitle = (string) ($selection['card_title'] ?? 'RTBO ID Card');
$valid = (bool) $selection;
?>
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>ID Card Check-In | Raising The Bar Officiating</title>
  <style>
    :root {
      color-scheme: dark;
      --bg: #050507;
      --panel: #12161d;
      --line: rgba(255,255,255,.14);
      --text: #f8fafc;
      --muted: #b8c0cc;
      --gold: #f4c65a;
      --red: #c1121f;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      display: grid;
      place-items: center;
      padding: 24px;
      font-family: Inter, Arial, sans-serif;
      color: var(--text);
      background: radial-gradient(circle at top, rgba(193,18,31,.22), transparent 32rem), var(--bg);
    }
    main {
      width: min(680px, 100%);
      border: 1px solid var(--line);
      border-radius: 24px;
      padding: clamp(24px, 5vw, 44px);
      background: linear-gradient(145deg, rgba(255,255,255,.08), rgba(255,255,255,.035));
      box-shadow: 0 28px 90px rgba(0,0,0,.52);
    }
    img { width: 110px; height: auto; display: block; margin-bottom: 22px; }
    p { color: var(--muted); line-height: 1.65; }
    .eyebrow { color: var(--gold); font-size: 12px; font-weight: 900; letter-spacing: .14em; text-transform: uppercase; }
    h1 { margin: 10px 0 14px; font-size: clamp(32px, 7vw, 56px); line-height: .96; letter-spacing: 0; text-transform: uppercase; }
    button, a {
      appearance: none;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      border: 1px solid rgba(255,255,255,.18);
      border-radius: 12px;
      padding: 14px 18px;
      color: #fff;
      background: linear-gradient(145deg, #c1121f, #7c1018);
      font-weight: 900;
      text-decoration: none;
      cursor: pointer;
    }
    button[disabled] { cursor: wait; opacity: .7; }
    .status {
      margin-top: 18px;
      border: 1px solid var(--line);
      border-radius: 16px;
      padding: 16px;
      background: rgba(0,0,0,.22);
      color: var(--muted);
    }
    .valid-false button { display: none; }
  </style>
</head>
<body>
  <main class="valid-<?php echo $valid ? 'true' : 'false'; ?>">
    <img src="/assets/images/logo.png" alt="Raising The Bar Officiating logo">
    <div class="eyebrow">RTBO Event Arrival</div>
    <h1><?php echo $valid ? 'ID Card Check-In' : 'Invalid ID Card Link'; ?></h1>
    <?php if ($valid): ?>
      <p><strong><?php echo e($memberName); ?></strong><br><?php echo e($cardTitle); ?></p>
      <p>Tap the button below to share this phone browser location with Raising The Bar Officiating for event-site arrival verification.</p>
      <button id="checkin-button" type="button">Send Arrival Check-In</button>
      <div class="status" id="status">Location permission has not been requested yet.</div>
    <?php else: ?>
      <p>This ID Card check-in link is not active. Please contact RTBO if you believe this card should be available.</p>
      <a href="/">Return to RTBO</a>
    <?php endif; ?>
  </main>
  <?php if ($valid): ?>
  <script>
    const token = <?php echo json_encode($token, JSON_UNESCAPED_SLASHES); ?>;
    const button = document.getElementById('checkin-button');
    const statusBox = document.getElementById('status');

    async function postCheckIn(position) {
      const coords = position?.coords || {};
      const payload = {
        token,
        latitude: coords.latitude,
        longitude: coords.longitude,
        accuracy_meters: coords.accuracy,
        source: 'id_card_qr'
      };
      const response = await fetch('/api/id-card-checkin.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data.success === false) {
        throw new Error(data.message || 'Check-in could not be completed.');
      }
      return data;
    }

    async function sendCheckIn() {
      button.disabled = true;
      statusBox.textContent = 'Requesting location permission...';
      const completeWithoutLocation = async message => {
        statusBox.textContent = message || 'Sending check-in without browser location...';
        const data = await postCheckIn(null);
        statusBox.textContent = data.message || 'Your RTBO arrival check-in has been sent.';
      };

      try {
        if (!navigator.geolocation) {
          await completeWithoutLocation('This browser does not support location. Sending scan notification only...');
          return;
        }
        navigator.geolocation.getCurrentPosition(async position => {
          try {
            statusBox.textContent = 'Sending verified arrival check-in...';
            const data = await postCheckIn(position);
            statusBox.textContent = data.message || 'Your RTBO arrival check-in has been sent.';
          } catch (error) {
            statusBox.textContent = error.message || 'Check-in could not be completed.';
          } finally {
            button.disabled = false;
          }
        }, async () => {
          try {
            await completeWithoutLocation('Location was not shared. Sending scan notification only...');
          } catch (error) {
            statusBox.textContent = error.message || 'Check-in could not be completed.';
          } finally {
            button.disabled = false;
          }
        }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 });
      } catch (error) {
        statusBox.textContent = error.message || 'Check-in could not be completed.';
        button.disabled = false;
      }
    }

    button.addEventListener('click', sendCheckIn);
  </script>
  <?php endif; ?>
</body>
</html>

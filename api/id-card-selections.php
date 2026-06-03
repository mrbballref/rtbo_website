<?php
declare(strict_types=1);

require_once __DIR__ . '/includes/bootstrap.php';
require_once __DIR__ . '/includes/id-cards.php';

header('Content-Type: application/json');

function rtbo_id_card_json(array $payload, int $status = 200): never
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_SLASHES);
    exit;
}

$user = current_database_user();
if (!$user) {
    rtbo_id_card_json(['success' => false, 'message' => 'Sign in to select RTBO ID Cards.'], 401);
}

try {
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        rtbo_id_card_json([
            'success' => true,
            'profile' => rtbo_id_card_safe_profile($user),
            'selections' => rtbo_id_card_selections_for_user((int) $user['id']),
        ]);
    }

    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        rtbo_id_card_json(['success' => false, 'message' => 'GET or POST required.'], 405);
    }

    require_same_origin_request();
    $payload = json_decode((string) file_get_contents('php://input'), true);
    if (!is_array($payload)) {
        $payload = $_POST;
    }

    $cards = is_array($payload['cards'] ?? null) ? $payload['cards'] : [];
    $selections = rtbo_id_card_save_selections($user, $cards, $payload);

    rtbo_id_card_json([
        'success' => true,
        'profile' => rtbo_id_card_safe_profile($user),
        'selections' => $selections,
        'message' => 'Selected ID Cards saved.',
    ]);
} catch (InvalidArgumentException $error) {
    rtbo_id_card_json(['success' => false, 'message' => $error->getMessage()], 422);
} catch (Throwable $error) {
    error_log('RTBO ID card selection endpoint failed: ' . $error->getMessage());
    rtbo_id_card_json(['success' => false, 'message' => 'ID Card selections could not be saved right now.'], 500);
}

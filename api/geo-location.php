<?php
declare(strict_types=1);

require_once __DIR__ . '/includes/bootstrap.php';
require_once __DIR__ . '/includes/users.php';
require_once __DIR__ . '/includes/geo.php';

header('Content-Type: application/json');

$user = current_database_user();
if (!$user) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Sign-in is required.']);
    exit;
}

try {
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        echo json_encode([
            'success' => true,
            'location' => rtbo_geo_location_for_user((int) $user['id']),
            'arrival_statuses' => rtbo_geo_arrival_statuses_for_official((int) $user['id']),
        ], JSON_UNESCAPED_SLASHES);
        exit;
    }

    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['success' => false, 'message' => 'GET or POST required.']);
        exit;
    }

    require_same_origin_request();
    $payload = json_decode((string) file_get_contents('php://input'), true);
    if (!is_array($payload)) {
        $payload = $_POST;
    }

    if (strtolower((string) ($payload['action'] ?? '')) === 'stop') {
        rtbo_geo_stop_sharing((int) $user['id']);
        echo json_encode([
            'success' => true,
            'message' => 'Live location sharing stopped.',
            'location' => rtbo_geo_location_for_user((int) $user['id']),
            'arrival_statuses' => rtbo_geo_arrival_statuses_for_official((int) $user['id']),
        ], JSON_UNESCAPED_SLASHES);
        exit;
    }

    $location = rtbo_geo_upsert_location((int) $user['id'], $payload);
    echo json_encode([
        'success' => true,
        'message' => 'Live location updated.',
        'location' => $location,
        'arrival_statuses' => rtbo_geo_arrival_statuses_for_official((int) $user['id']),
    ], JSON_UNESCAPED_SLASHES);
} catch (InvalidArgumentException $error) {
    http_response_code(422);
    echo json_encode(['success' => false, 'message' => $error->getMessage()]);
} catch (Throwable $error) {
    error_log('RTBO live location update failed: ' . $error->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Live location could not be saved right now.']);
}

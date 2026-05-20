<?php
declare(strict_types=1);

require_once __DIR__ . '/includes/bootstrap.php';
require_once __DIR__ . '/includes/users.php';
require_once __DIR__ . '/includes/geo.php';
require_once __DIR__ . '/includes/admin-schools.php';

header('Content-Type: application/json');

$user = current_database_user();
if (!$user || !is_admin_user($user)) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Admin access is required.']);
    exit;
}

try {
    $gameId = (int) ($_GET['game_id'] ?? 0);
    $venueId = (int) ($_GET['venue_id'] ?? 0);
    $targetGame = $gameId > 0 ? rtbo_geo_game_target($gameId) : null;
    $venues = array_values(array_filter(
        admin_schools_list(),
        static fn (array $record): bool => in_array(($record['record_type'] ?? ''), ['school', 'event_center'], true)
            && ($record['status'] ?? 'active') === 'active'
    ));
    $targetVenue = null;
    if (!$targetGame && $venueId > 0) {
        foreach ($venues as $venue) {
            if ((int) ($venue['id'] ?? 0) === $venueId) {
                $address = trim(implode(', ', array_filter([
                    (string) ($venue['address_line1'] ?? ''),
                    (string) ($venue['city'] ?? ''),
                    (string) ($venue['state'] ?? ''),
                    (string) ($venue['zip'] ?? ''),
                ])));
                $lat = filter_var($venue['location_lat'] ?? $venue['latitude'] ?? null, FILTER_VALIDATE_FLOAT);
                $lng = filter_var($venue['location_lng'] ?? $venue['longitude'] ?? null, FILTER_VALIDATE_FLOAT);
                $targetVenue = [
                    'id' => (int) ($venue['id'] ?? 0),
                    'record_type' => (string) ($venue['record_type'] ?? ''),
                    'latitude' => $lat === false ? null : (float) $lat,
                    'longitude' => $lng === false ? null : (float) $lng,
                    'label' => (string) ($venue['name'] ?? 'Selected Venue'),
                    'location_name' => (string) ($venue['gym_name'] ?? $venue['name'] ?? ''),
                    'location_address' => $address,
                ];
                break;
            }
        }
    }
    $targetLat = filter_input(INPUT_GET, 'target_lat', FILTER_VALIDATE_FLOAT);
    $targetLng = filter_input(INPUT_GET, 'target_lng', FILTER_VALIDATE_FLOAT);
    if ($targetGame) {
        $targetLat = (float) $targetGame['latitude'];
        $targetLng = (float) $targetGame['longitude'];
    } elseif ($targetVenue && $targetVenue['latitude'] !== null && $targetVenue['longitude'] !== null) {
        $targetLat = (float) $targetVenue['latitude'];
        $targetLng = (float) $targetVenue['longitude'];
    }
    $hasTarget = $targetLat !== false && $targetLat !== null && $targetLng !== false && $targetLng !== null;

    echo json_encode([
        'success' => true,
        'games' => rtbo_geo_games_for_map(),
        'venues' => array_map(static function (array $venue): array {
            $address = trim(implode(', ', array_filter([
                (string) ($venue['address_line1'] ?? ''),
                (string) ($venue['city'] ?? ''),
                (string) ($venue['state'] ?? ''),
                (string) ($venue['zip'] ?? ''),
            ])));
            return [
                'id' => (int) ($venue['id'] ?? 0),
                'record_type' => (string) ($venue['record_type'] ?? ''),
                'type_label' => (string) ($venue['type_label'] ?? ''),
                'name' => (string) ($venue['name'] ?? ''),
                'gym_name' => (string) ($venue['gym_name'] ?? ''),
                'location_address' => $address,
                'latitude' => isset($venue['location_lat']) ? (float) $venue['location_lat'] : null,
                'longitude' => isset($venue['location_lng']) ? (float) $venue['location_lng'] : null,
            ];
        }, $venues),
        'target_game' => $targetGame,
        'target_venue' => $targetVenue,
        'target' => $hasTarget ? ['latitude' => (float) $targetLat, 'longitude' => (float) $targetLng] : ($targetVenue ?: null),
        'officials' => rtbo_geo_admin_locations($hasTarget ? (float) $targetLat : null, $hasTarget ? (float) $targetLng : null, $targetGame ? (int) $targetGame['id'] : 0),
        'refreshed_at' => date('Y-m-d H:i:s'),
    ], JSON_UNESCAPED_SLASHES);
} catch (Throwable $error) {
    error_log('RTBO admin live geo lookup failed: ' . $error->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Live locations could not be loaded right now.']);
}

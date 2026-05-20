<?php
declare(strict_types=1);

require_once __DIR__ . '/includes/bootstrap.php';
require_once __DIR__ . '/includes/admin-games.php';

header('Content-Type: application/json');

if (!is_admin_user()) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Admin sign-in required.']);
    exit;
}

function admin_games_json_body(): array
{
    $raw = file_get_contents('php://input') ?: '';
    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : [];
}

function admin_games_reference_payload(): array
{
    return [
        'venues' => admin_game_venue_records(),
        'schools' => admin_game_records_by_type('school'),
        'event_centers' => admin_game_records_by_type('event_center'),
        'teams' => admin_game_records_by_type('team'),
        'officials' => admin_game_officials_list(true),
        'positions' => admin_game_positions_list(),
        'games' => admin_game_add_tba_request_counts(admin_games_list()),
        'tba_requests' => admin_game_tba_requests_list(),
    ];
}

try {
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        echo json_encode(['success' => true, ...admin_games_reference_payload()], JSON_UNESCAPED_SLASHES);
        exit;
    }

    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['success' => false, 'message' => 'GET or POST required.']);
        exit;
    }
    require_same_origin_request();

    $input = admin_games_json_body();
    $action = (string) ($input['action'] ?? '');
    $game = is_array($input['game'] ?? null) ? $input['game'] : [];
    $id = (int) ($input['id'] ?? $game['id'] ?? 0);

    if ($action === 'create') {
        $created = admin_game_create($game);
        echo json_encode(['success' => true, 'message' => 'Game assignment created.', 'game' => $created, ...admin_games_reference_payload()], JSON_UNESCAPED_SLASHES);
        exit;
    }

    if ($action === 'update') {
        $updated = admin_game_update($id, $game);
        echo json_encode(['success' => true, 'message' => 'Game assignment updated.', 'game' => $updated, ...admin_games_reference_payload()], JSON_UNESCAPED_SLASHES);
        exit;
    }

    if ($action === 'publish') {
        $updated = admin_game_set_published($id, true);
        echo json_encode(['success' => true, 'message' => 'Game assignment published.', 'game' => $updated, ...admin_games_reference_payload()], JSON_UNESCAPED_SLASHES);
        exit;
    }

    if ($action === 'unpublish') {
        $updated = admin_game_set_published($id, false);
        echo json_encode(['success' => true, 'message' => 'Game assignment unpublished.', 'game' => $updated, ...admin_games_reference_payload()], JSON_UNESCAPED_SLASHES);
        exit;
    }

    if (in_array($action, ['cancel', 'cancel_game', 'delete', 'delete_game', 'postpone', 'reschedule'], true)) {
        $reason = (string) ($input['reason'] ?? $game['cancellation_reason'] ?? $game['reason'] ?? '');
        $status = match ($action) {
            'delete', 'delete_game' => 'deleted',
            'postpone' => 'postponed',
            'reschedule' => 'rescheduled',
            default => 'cancelled',
        };
        $updated = admin_game_set_status_with_reason($id, $status, $reason);
        echo json_encode([
            'success' => true,
            'message' => $status === 'deleted' ? 'Game assignment deleted with reason.' : 'Game assignment status updated with reason.',
            'game' => $updated,
            ...admin_games_reference_payload(),
        ], JSON_UNESCAPED_SLASHES);
        exit;
    }

    if ($action === 'assign_official') {
        $assignment = is_array($input['assignment'] ?? null) ? $input['assignment'] : [];
        $updated = admin_game_assign_official($id, $assignment);
        echo json_encode(['success' => true, 'message' => 'Official assigned to game.', 'game' => $updated, ...admin_games_reference_payload()], JSON_UNESCAPED_SLASHES);
        exit;
    }

    if ($action === 'assign_crew') {
        $assignments = is_array($input['assignments'] ?? null) ? $input['assignments'] : [];
        $updated = admin_game_assign_crew($id, ['assignments' => $assignments]);
        echo json_encode(['success' => true, 'message' => 'Crew assignments saved. Publish the game when you are ready for assigned officials to see it.', 'game' => $updated, ...admin_games_reference_payload()], JSON_UNESCAPED_SLASHES);
        exit;
    }

    if ($action === 'send_tba_list') {
        $result = admin_game_send_tba_list();
        echo json_encode(['success' => true, ...$result, ...admin_games_reference_payload()], JSON_UNESCAPED_SLASHES);
        exit;
    }

    http_response_code(422);
    echo json_encode(['success' => false, 'message' => 'Unknown game assignment action.']);
} catch (Throwable $error) {
    error_log('RTBO admin game action failed: ' . $error->getMessage());
    http_response_code(422);
    echo json_encode(['success' => false, 'message' => $error->getMessage()]);
}

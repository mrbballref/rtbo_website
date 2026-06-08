<?php
declare(strict_types=1);

require_once __DIR__ . '/includes/bootstrap.php';
require_once __DIR__ . '/includes/users.php';
require_once __DIR__ . '/includes/calendar-sync.php';

header('Content-Type: application/json');

function rtbo_calendar_sync_input(): array
{
    $decoded = json_decode((string) file_get_contents('php://input'), true);
    return is_array($decoded) ? $decoded : [];
}

$databaseUser = current_database_user();
$user = $databaseUser ? public_auth_user($databaseUser) : current_user();
if (!$user) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Sign-in is required.']);
    exit;
}

try {
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $payload = is_admin_user($user)
            ? rtbo_calendar_sync_admin_payload()
            : rtbo_calendar_sync_user_payload($user);
        echo json_encode(['success' => true, ...$payload], JSON_UNESCAPED_SLASHES);
        exit;
    }

    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['success' => false, 'message' => 'GET or POST required.']);
        exit;
    }

    require_same_origin_request();
    $input = rtbo_calendar_sync_input();
    $action = (string) ($input['action'] ?? '');

    if ($action === 'update_master') {
        if (!is_super_admin($user)) {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'Only the Super Admin can update the master schedule feed.']);
            exit;
        }
        $master = rtbo_calendar_sync_update_master((array) ($input['master'] ?? $input));
        echo json_encode(['success' => true, 'message' => 'Master calendar sync updated.', 'master' => $master, ...rtbo_calendar_sync_admin_payload()], JSON_UNESCAPED_SLASHES);
        exit;
    }

    if ($action === 'update_official') {
        $officialId = (int) ($input['official_id'] ?? $input['officialId'] ?? 0);
        if (!is_admin_user($user)) {
            $officialId = (int) ($user['id'] ?? 0);
        }
        if (!is_admin_user($user) && $officialId !== (int) ($user['id'] ?? 0)) {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'You can only update your own calendar sync feed.']);
            exit;
        }
        $official = rtbo_calendar_sync_update_official($officialId, (array) ($input['official'] ?? $input));
        $payload = is_admin_user($user)
            ? rtbo_calendar_sync_admin_payload()
            : rtbo_calendar_sync_user_payload($user);
        echo json_encode(['success' => true, 'message' => 'Official calendar sync updated.', 'official' => $official, ...$payload], JSON_UNESCAPED_SLASHES);
        exit;
    }

    http_response_code(422);
    echo json_encode(['success' => false, 'message' => 'Unknown calendar sync action.']);
} catch (Throwable $error) {
    error_log('RTBO calendar sync action failed: ' . $error->getMessage());
    http_response_code(422);
    echo json_encode(['success' => false, 'message' => $error->getMessage()]);
}

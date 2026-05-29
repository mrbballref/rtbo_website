<?php
declare(strict_types=1);

require_once __DIR__ . '/includes/bootstrap.php';
require_once __DIR__ . '/includes/users.php';
require_once __DIR__ . '/includes/client-spotlight.php';

header('Content-Type: application/json');

function rtbo_client_spotlight_json(array $payload, int $status = 200): never
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_SLASHES);
    exit;
}

function rtbo_client_spotlight_input(): array
{
    $raw = file_get_contents('php://input') ?: '';
    $data = json_decode($raw, true);

    return is_array($data) ? $data : [];
}

function rtbo_client_spotlight_current_admin(): ?array
{
    $databaseUser = current_database_user();
    $user = $databaseUser ? public_auth_user($databaseUser) : current_user();

    return $user && is_admin_user($user) ? $user : null;
}

try {
    $method = strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET'));
    $adminScope = (string) ($_GET['scope'] ?? '') === 'admin';

    if ($method === 'GET') {
        if ($adminScope && !rtbo_client_spotlight_current_admin()) {
            rtbo_client_spotlight_json(['success' => false, 'message' => 'Admin sign-in is required.'], 401);
        }

        $data = rtbo_client_spotlight_load();
        $videos = $adminScope ? $data['videos'] : rtbo_client_spotlight_public_videos($data['videos']);
        rtbo_client_spotlight_json([
            'success' => true,
            'show' => $data['show'],
            'videos' => $videos,
            'managed' => ($data['updated_at'] ?? null) !== null,
            'updated_at' => $data['updated_at'] ?? null,
        ]);
    }

    if ($method !== 'POST') {
        rtbo_client_spotlight_json(['success' => false, 'message' => 'Unsupported Client Spotlight request method.'], 405);
    }

    require_same_origin_request();
    $user = rtbo_client_spotlight_current_admin();
    if (!$user) {
        rtbo_client_spotlight_json(['success' => false, 'message' => 'Admin sign-in is required.'], 401);
    }

    $input = rtbo_client_spotlight_input();
    $action = strtolower(trim((string) ($input['action'] ?? 'save_video')));

    if ($action === 'save_show') {
        $show = is_array($input['show'] ?? null) ? $input['show'] : [];
        $saved = rtbo_client_spotlight_save_show($show, $user);
        $data = rtbo_client_spotlight_load();
        rtbo_client_spotlight_json([
            'success' => true,
            'show' => $saved,
            'videos' => $data['videos'],
            'message' => 'Client Spotlight settings saved.',
        ]);
    }

    if (in_array($action, ['create_video', 'update_video', 'save_video'], true)) {
        $video = is_array($input['video'] ?? null) ? $input['video'] : [];
        $saved = rtbo_client_spotlight_save_video($video, $user);
        $data = rtbo_client_spotlight_load();
        rtbo_client_spotlight_json([
            'success' => true,
            'video' => $saved,
            'videos' => $data['videos'],
            'show' => $data['show'],
            'message' => 'Client Spotlight video saved.',
        ]);
    }

    if ($action === 'delete_video') {
        $deleted = rtbo_client_spotlight_delete_video((string) ($input['id'] ?? ''), $user);
        $data = rtbo_client_spotlight_load();
        rtbo_client_spotlight_json([
            'success' => true,
            'deleted' => $deleted,
            'videos' => $data['videos'],
            'show' => $data['show'],
            'message' => 'Client Spotlight video removed.',
        ]);
    }

    rtbo_client_spotlight_json(['success' => false, 'message' => 'Unsupported Client Spotlight action.'], 400);
} catch (Throwable $error) {
    error_log('RTBO Client Spotlight action failed: ' . $error->getMessage());
    rtbo_client_spotlight_json(['success' => false, 'message' => $error->getMessage()], 400);
}

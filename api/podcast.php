<?php
declare(strict_types=1);

require_once __DIR__ . '/includes/bootstrap.php';
require_once __DIR__ . '/includes/users.php';
require_once __DIR__ . '/includes/podcast.php';

header('Content-Type: application/json');

function rtbo_podcast_json(array $payload, int $status = 200): never
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_SLASHES);
    exit;
}

function rtbo_podcast_input(): array
{
    $raw = file_get_contents('php://input') ?: '';
    $data = json_decode($raw, true);

    return is_array($data) ? $data : [];
}

function rtbo_podcast_current_admin(): ?array
{
    $databaseUser = current_database_user();
    $user = $databaseUser ? public_auth_user($databaseUser) : current_user();

    return $user && is_admin_user($user) ? $user : null;
}

try {
    $method = strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET'));
    $adminScope = (string) ($_GET['scope'] ?? '') === 'admin';

    if ($method === 'GET') {
        if ($adminScope && !rtbo_podcast_current_admin()) {
            rtbo_podcast_json(['success' => false, 'message' => 'Admin sign-in is required.'], 401);
        }

        $data = rtbo_podcast_load();
        $episodes = $adminScope ? $data['episodes'] : rtbo_podcast_public_episodes($data['episodes']);
        rtbo_podcast_json([
            'success' => true,
            'show' => $data['show'],
            'episodes' => $episodes,
            'managed' => ($data['updated_at'] ?? null) !== null,
            'updated_at' => $data['updated_at'] ?? null,
        ]);
    }

    if ($method !== 'POST') {
        rtbo_podcast_json(['success' => false, 'message' => 'Unsupported podcast request method.'], 405);
    }

    require_same_origin_request();
    $user = rtbo_podcast_current_admin();
    if (!$user) {
        rtbo_podcast_json(['success' => false, 'message' => 'Admin sign-in is required.'], 401);
    }

    $input = rtbo_podcast_input();
    $action = strtolower(trim((string) ($input['action'] ?? 'save_episode')));

    if ($action === 'save_show') {
        $show = is_array($input['show'] ?? null) ? $input['show'] : [];
        $saved = rtbo_podcast_save_show($show, $user);
        $data = rtbo_podcast_load();
        rtbo_podcast_json([
            'success' => true,
            'show' => $saved,
            'episodes' => $data['episodes'],
            'message' => 'Podcast show settings saved.',
        ]);
    }

    if (in_array($action, ['create_episode', 'update_episode', 'save_episode'], true)) {
        $episode = is_array($input['episode'] ?? null) ? $input['episode'] : [];
        $saved = rtbo_podcast_save_episode($episode, $user);
        $data = rtbo_podcast_load();
        rtbo_podcast_json([
            'success' => true,
            'episode' => $saved,
            'episodes' => $data['episodes'],
            'show' => $data['show'],
            'message' => 'Podcast video saved.',
        ]);
    }

    if ($action === 'replace_episodes') {
        $episodes = is_array($input['episodes'] ?? null) ? $input['episodes'] : [];
        $saved = rtbo_podcast_replace_episodes($episodes, $user);
        $data = rtbo_podcast_load();
        rtbo_podcast_json([
            'success' => true,
            'episodes' => $saved,
            'show' => $data['show'],
            'message' => 'Podcast video library saved.',
        ]);
    }

    if ($action === 'delete_episode') {
        $deleted = rtbo_podcast_delete_episode((string) ($input['id'] ?? ''), $user);
        $data = rtbo_podcast_load();
        rtbo_podcast_json([
            'success' => true,
            'deleted' => $deleted,
            'episodes' => $data['episodes'],
            'show' => $data['show'],
            'message' => 'Podcast video removed.',
        ]);
    }

    rtbo_podcast_json(['success' => false, 'message' => 'Unsupported podcast action.'], 400);
} catch (Throwable $error) {
    error_log('RTBO podcast action failed: ' . $error->getMessage());
    rtbo_podcast_json(['success' => false, 'message' => $error->getMessage()], 400);
}

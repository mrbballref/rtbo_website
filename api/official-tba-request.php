<?php
declare(strict_types=1);

require_once __DIR__ . '/includes/bootstrap.php';
require_once __DIR__ . '/includes/users.php';
require_once __DIR__ . '/includes/admin-games.php';

header('Content-Type: application/json');

function rtbo_tba_json_body(): array
{
    $raw = file_get_contents('php://input') ?: '';
    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : [];
}

function rtbo_tba_current_user(): ?array
{
    $databaseUser = current_database_user();
    if ($databaseUser) {
        return $databaseUser;
    }

    $sessionUser = current_user();
    if (!$sessionUser || empty($sessionUser['id']) || empty($sessionUser['email'])) {
        return null;
    }

    foreach (admin_member_read_file() as $member) {
        $sameId = (int) ($member['id'] ?? 0) === (int) $sessionUser['id'];
        $sameEmail = strtolower((string) ($member['email'] ?? '')) === strtolower((string) $sessionUser['email']);
        $notDeleted = (string) ($member['status'] ?? 'active') !== 'deleted';
        if ($sameId && $sameEmail && $notDeleted) {
            return $member;
        }
    }

    return null;
}

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['success' => false, 'message' => 'POST required.']);
        exit;
    }
    require_same_origin_request();

    $user = rtbo_tba_current_user();
    if (!$user) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Please sign in to request a TBA game.']);
        exit;
    }

    $input = rtbo_tba_json_body();
    $gameId = (int) ($input['game_id'] ?? 0);
    $note = trim((string) ($input['note'] ?? ''));
    $request = admin_game_tba_request_create($gameId, (int) ($user['id'] ?? 0), $note);
    $game = admin_game_fetch($gameId);

    try {
        $officialName = trim((string) (($user['first_name'] ?? '') . ' ' . ($user['last_name'] ?? ''))) ?: (string) ($user['name'] ?? $user['email'] ?? 'Official');
        rtbo_notify_admins([
            'type' => 'tba_game_requested',
            'title' => 'Official requested a TBA game',
            'body' => "{$officialName} requested " . rtbo_notification_game_summary($game) . '. Super Admin approval is still required.',
            'related_type' => 'game',
            'related_id' => $gameId,
            'metadata' => [
                'request' => $request,
                'game_id' => $gameId,
                'official_id' => (int) ($user['id'] ?? 0),
                'note' => $note,
            ],
            'actor' => public_auth_user($user),
        ]);
    } catch (Throwable $notificationError) {
        error_log('RTBO TBA request notification failed: ' . $notificationError->getMessage());
    }

    echo json_encode([
        'success' => true,
        'message' => 'TBA request sent to the Super Admin. You are not assigned until the Super Admin adds you to the crew.',
        'request' => $request,
        'tba_games' => admin_game_tba_open_games_for_official((int) ($user['id'] ?? 0)),
    ], JSON_UNESCAPED_SLASHES);
} catch (Throwable $error) {
    error_log('RTBO official TBA request failed: ' . $error->getMessage());
    http_response_code(422);
    echo json_encode(['success' => false, 'message' => $error->getMessage()]);
}

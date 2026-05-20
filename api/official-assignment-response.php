<?php
declare(strict_types=1);

require_once __DIR__ . '/includes/bootstrap.php';
require_once __DIR__ . '/includes/users.php';
require_once __DIR__ . '/includes/notifications.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'POST required.']);
    exit;
}

require_same_origin_request();

$user = current_database_user();
if (!$user) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Sign-in is required.']);
    exit;
}

$payload = json_decode((string) file_get_contents('php://input'), true);
if (!is_array($payload)) {
    $payload = $_POST;
}

$assignmentId = (int) ($payload['assignment_id'] ?? 0);
$action = strtolower(trim((string) ($payload['action'] ?? '')));
$declineReason = trim((string) ($payload['decline_reason'] ?? ''));

if ($assignmentId <= 0) {
    http_response_code(422);
    echo json_encode(['success' => false, 'message' => 'A valid assignment is required.']);
    exit;
}

if (!in_array($action, ['accept', 'accepted', 'decline', 'declined'], true)) {
    http_response_code(422);
    echo json_encode(['success' => false, 'message' => 'Choose accept or decline.']);
    exit;
}

$status = str_starts_with($action, 'accept') ? 'accepted' : 'declined';
$normalizedDeclineReason = strtolower((string) preg_replace('/[\s\.\/_-]+/', '', $declineReason));
if ($status === 'declined' && ($declineReason === '' || in_array($normalizedDeclineReason, ['na', 'notapplicable'], true))) {
    http_response_code(422);
    echo json_encode(['success' => false, 'message' => 'A specific decline reason is required. N/A is not accepted.']);
    exit;
}

try {
    ensure_users_table();

    $stmt = db()->prepare(
        'SELECT id, game_id, official_id, position_id, status
         FROM assignments
         WHERE id = ? AND official_id = ?
         LIMIT 1'
    );
    $stmt->execute([$assignmentId, (int) $user['id']]);
    $assignment = $stmt->fetch();

    if (!$assignment) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Assignment was not found for this official.']);
        exit;
    }

    $update = db()->prepare(
        'UPDATE assignments
         SET status = ?,
             decline_reason = ?,
             responded_at = NOW()
         WHERE id = ? AND official_id = ?'
    );
    $update->execute([
        $status,
        $status === 'declined' ? $declineReason : null,
        $assignmentId,
        (int) $user['id'],
    ]);

    $response = [
        'id' => $assignmentId,
        'game_id' => (int) ($assignment['game_id'] ?? 0),
        'official_id' => (int) $user['id'],
        'status' => $status,
        'decline_reason' => $status === 'declined' ? $declineReason : '',
        'responded_at' => date('Y-m-d H:i:s'),
    ];

    try {
        $gameStmt = db()->prepare('SELECT * FROM games WHERE id = ? LIMIT 1');
        $gameStmt->execute([(int) ($assignment['game_id'] ?? 0)]);
        $game = $gameStmt->fetch() ?: ['id' => (int) ($assignment['game_id'] ?? 0)];
        $officialName = trim((string) ($user['first_name'] ?? '') . ' ' . (string) ($user['last_name'] ?? '')) ?: (string) ($user['email'] ?? 'Official');
        rtbo_notify_admins([
            'type' => $status === 'accepted' ? 'assignment_accepted' : 'assignment_declined',
            'title' => $status === 'accepted' ? 'Assignment accepted' : 'Assignment declined',
            'body' => $status === 'accepted'
                ? "{$officialName} accepted " . rtbo_notification_game_summary($game) . '.'
                : "{$officialName} declined " . rtbo_notification_game_summary($game) . '. Reason: ' . $declineReason,
            'related_type' => 'assignment',
            'related_id' => $assignmentId,
            'metadata' => [
                'game_id' => (int) ($assignment['game_id'] ?? 0),
                'official_id' => (int) $user['id'],
                'official_name' => $officialName,
                'status' => $status,
                'decline_reason' => $status === 'declined' ? $declineReason : '',
            ],
            'actor' => $user,
        ]);
    } catch (Throwable $notificationError) {
        error_log('RTBO assignment response notification failed: ' . $notificationError->getMessage());
    }

    echo json_encode([
        'success' => true,
        'message' => $status === 'accepted'
            ? 'Assignment accepted. Your published schedule has been updated.'
            : 'Assignment declined. The game remains on the schedule until an admin reassigns it.',
        'assignment' => $response,
    ], JSON_UNESCAPED_SLASHES);
} catch (Throwable $error) {
    error_log('RTBO assignment response failed: ' . $error->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Assignment response could not be saved right now.']);
}

<?php
declare(strict_types=1);

require_once __DIR__ . '/includes/bootstrap.php';
require_once __DIR__ . '/includes/locker-room.php';

header('Content-Type: application/json');

function rtbo_locker_room_request_input(): array
{
    $contentType = strtolower((string) ($_SERVER['CONTENT_TYPE'] ?? ''));
    if (str_contains($contentType, 'multipart/form-data')) {
        return $_POST;
    }

    $decoded = json_decode((string) file_get_contents('php://input'), true);
    return is_array($decoded) ? $decoded : [];
}

function rtbo_locker_room_payload(array $user, int $teamId = 0): array
{
    rtbo_locker_room_ensure_tables();
    $teams = rtbo_locker_room_load_teams($user);
    $selectedTeamId = $teamId > 0 ? $teamId : (int) ($teams[0]['id'] ?? 0);

    return [
        'success' => true,
        'user' => $user,
        'teams' => $teams,
        'films' => $selectedTeamId > 0 ? rtbo_locker_room_load_films($user, $selectedTeamId) : [],
        'selectedTeamId' => $selectedTeamId,
    ];
}

function rtbo_locker_room_member_role(int $teamId, array $user): string
{
    if (is_admin_user($user)) {
        return 'owner';
    }

    $stmt = db()->prepare('SELECT role FROM locker_room_team_members WHERE team_id = ? AND user_id = ? LIMIT 1');
    $stmt->execute([$teamId, (int) $user['id']]);

    return (string) ($stmt->fetchColumn() ?: '');
}

function rtbo_locker_room_require_team_admin(int $teamId, array $user): void
{
    if (in_array(rtbo_locker_room_member_role($teamId, $user), ['owner', 'admin'], true)) {
        return;
    }

    throw new RuntimeException('Only team room owners and administrators can manage Locker Room notification recipients.');
}

try {
    rtbo_locker_room_ensure_tables();
    $method = strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET'));
    $user = rtbo_locker_room_require_user();

    if ($method === 'GET') {
        $teamId = (int) ($_GET['teamId'] ?? 0);
        rtbo_locker_room_json(rtbo_locker_room_payload($user, $teamId));
    }

    if ($method !== 'POST') {
        rtbo_locker_room_json(['success' => false, 'message' => 'Unsupported Locker Room request method.'], 405);
    }

    require_same_origin_request();
    $input = rtbo_locker_room_request_input();
    $action = strtolower(trim((string) ($input['action'] ?? '')));

    if ($action === 'create_team') {
        $team = rtbo_locker_room_create_team($input, $user);
        $payload = rtbo_locker_room_payload($user, (int) $team['id']);
        $payload['team'] = $team;
        $payload['message'] = 'Locker Room team room created.';
        rtbo_locker_room_json($payload);
    }

    if ($action === 'upload_film') {
        $film = rtbo_locker_room_upload_film($input, $_FILES, $user);
        $payload = rtbo_locker_room_payload($user, (int) $film['teamId']);
        $payload['film'] = $film;
        $payload['message'] = 'Locker Room film uploaded.';
        rtbo_locker_room_json($payload);
    }

    if ($action === 'record_event') {
        $filmId = (int) ($input['filmId'] ?? 0);
        $eventType = strtolower(trim((string) ($input['eventType'] ?? 'view')));
        $metadata = is_array($input['metadata'] ?? null) ? $input['metadata'] : [];
        $film = rtbo_locker_room_record_film_event($filmId, $eventType, $user, $metadata);
        rtbo_locker_room_json([
            'success' => true,
            'film' => $film,
            'message' => 'Locker Room activity recorded.',
        ]);
    }

    if ($action === 'add_notification_recipient') {
        $teamId = (int) ($input['teamId'] ?? 0);
        $email = strtolower(trim((string) ($input['email'] ?? '')));
        if ($teamId <= 0 || !rtbo_locker_room_is_team_member($teamId, $user)) {
            throw new RuntimeException('Choose a valid Locker Room team.');
        }
        rtbo_locker_room_require_team_admin($teamId, $user);
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            throw new RuntimeException('Enter a valid notification email address.');
        }

        $stmt = db()->prepare(
            "INSERT INTO locker_room_notification_recipients(team_id, email, created_by, updated_at)
             VALUES(?, ?, ?, NOW())
             ON DUPLICATE KEY UPDATE enabled = 1, updated_at = NOW()"
        );
        $stmt->execute([$teamId, $email, (int) $user['id']]);
        rtbo_locker_room_log_event(null, $teamId, $user, 'notification_recipient_added', ['email' => $email]);

        $payload = rtbo_locker_room_payload($user, $teamId);
        $payload['message'] = 'Locker Room notification recipient saved.';
        rtbo_locker_room_json($payload);
    }

    if ($action === 'remove_notification_recipient') {
        $teamId = (int) ($input['teamId'] ?? 0);
        $email = strtolower(trim((string) ($input['email'] ?? '')));
        if ($teamId <= 0 || !rtbo_locker_room_is_team_member($teamId, $user)) {
            throw new RuntimeException('Choose a valid Locker Room team.');
        }
        rtbo_locker_room_require_team_admin($teamId, $user);

        $stmt = db()->prepare('UPDATE locker_room_notification_recipients SET enabled = 0, updated_at = NOW() WHERE team_id = ? AND email = ?');
        $stmt->execute([$teamId, $email]);
        rtbo_locker_room_log_event(null, $teamId, $user, 'notification_recipient_removed', ['email' => $email]);

        $payload = rtbo_locker_room_payload($user, $teamId);
        $payload['message'] = 'Locker Room notification recipient removed.';
        rtbo_locker_room_json($payload);
    }

    rtbo_locker_room_json(['success' => false, 'message' => 'Unsupported Locker Room action.'], 400);
} catch (Throwable $error) {
    error_log('RTBO Locker Room request failed: ' . $error->getMessage());
    rtbo_locker_room_json(['success' => false, 'message' => $error->getMessage()], 400);
}

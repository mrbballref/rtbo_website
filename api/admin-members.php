<?php
declare(strict_types=1);

require_once __DIR__ . '/includes/bootstrap.php';
require_once __DIR__ . '/includes/admin-members.php';
require_once __DIR__ . '/includes/notifications.php';

header('Content-Type: application/json');

if (!is_admin_user()) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Admin sign-in required.']);
    exit;
}

function admin_members_json_body(): array
{
    $raw = file_get_contents('php://input') ?: '';
    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : [];
}

try {
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        echo json_encode([
            'success' => true,
            'roles' => admin_member_assignable_roles(),
            'members' => admin_members_list(),
        ], JSON_UNESCAPED_SLASHES);
        exit;
    }

    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['success' => false, 'message' => 'GET or POST required.']);
        exit;
    }
    require_same_origin_request();

    $input = admin_members_json_body();
    $action = (string) ($input['action'] ?? '');
    $member = is_array($input['member'] ?? null) ? $input['member'] : [];
    $id = (int) ($input['id'] ?? $member['id'] ?? 0);

    if ($action === 'create') {
        $created = admin_member_create($member);
        try {
            rtbo_notify_users([(int) ($created['id'] ?? 0)], [
                'type' => 'member_profile_created',
                'title' => 'Your RTBO profile was created',
                'body' => 'Please sign in, update your password, complete your profile, and save it so your account can become active.',
                'related_type' => 'member',
                'related_id' => (int) ($created['id'] ?? 0),
                'metadata' => ['role' => $created['role'] ?? '', 'status' => $created['status'] ?? 'inactive'],
                'actor' => current_user(),
            ]);
            rtbo_notify_admins([
                'type' => 'member_created',
                'title' => 'Member added',
                'body' => ($created['name'] ?? 'A member') . ' was added as ' . ($created['role_label'] ?? $created['role'] ?? 'member') . '.',
                'related_type' => 'member',
                'related_id' => (int) ($created['id'] ?? 0),
                'metadata' => ['member' => $created],
                'actor' => current_user(),
            ]);
        } catch (Throwable $notificationError) {
            error_log('RTBO member create notification failed: ' . $notificationError->getMessage());
        }
        echo json_encode(['success' => true, 'message' => 'Member created and saved.', 'member' => $created], JSON_UNESCAPED_SLASHES);
        exit;
    }

    if ($action === 'update') {
        $updated = admin_member_update($id, $member);
        try {
            rtbo_notify_admins([
                'type' => 'member_updated',
                'title' => 'Member profile updated',
                'body' => ($updated['name'] ?? 'A member') . ' was updated in the member directory.',
                'related_type' => 'member',
                'related_id' => (int) ($updated['id'] ?? 0),
                'metadata' => ['member' => $updated],
                'actor' => current_user(),
            ]);
        } catch (Throwable $notificationError) {
            error_log('RTBO member update notification failed: ' . $notificationError->getMessage());
        }
        echo json_encode(['success' => true, 'message' => 'Member updated.', 'member' => $updated], JSON_UNESCAPED_SLASHES);
        exit;
    }

    if ($action === 'delete') {
        admin_member_delete($id);
        echo json_encode(['success' => true, 'message' => 'Member removed.']);
        exit;
    }

    http_response_code(422);
    echo json_encode(['success' => false, 'message' => 'Unknown member action.']);
} catch (Throwable $error) {
    error_log('RTBO admin members action failed: ' . $error->getMessage());
    http_response_code(422);
    echo json_encode(['success' => false, 'message' => $error->getMessage()]);
}

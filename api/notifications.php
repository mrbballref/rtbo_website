<?php
declare(strict_types=1);

require_once __DIR__ . '/includes/bootstrap.php';
require_once __DIR__ . '/includes/users.php';
require_once __DIR__ . '/includes/notifications.php';

header('Content-Type: application/json');

function rtbo_notifications_input(): array
{
    $raw = file_get_contents('php://input') ?: '';
    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : $_POST;
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
        echo json_encode(['success' => true, ...rtbo_notifications_payload($user)], JSON_UNESCAPED_SLASHES);
        exit;
    }

    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['success' => false, 'message' => 'GET or POST required.']);
        exit;
    }

    require_same_origin_request();
    $input = rtbo_notifications_input();
    $action = (string) ($input['action'] ?? '');

    if ($action === 'mark_read') {
        rtbo_notification_mark_read((int) ($input['id'] ?? 0), (int) ($user['id'] ?? 0));
        echo json_encode(['success' => true, 'message' => 'Notification marked as read.', ...rtbo_notifications_payload($user)], JSON_UNESCAPED_SLASHES);
        exit;
    }

    if ($action === 'mark_all_read') {
        $count = rtbo_notification_mark_all_read($user);
        echo json_encode(['success' => true, 'message' => "{$count} notification(s) marked as read.", ...rtbo_notifications_payload($user)], JSON_UNESCAPED_SLASHES);
        exit;
    }

    if ($action === 'release_message') {
        $title = trim((string) ($input['title'] ?? 'New message released'));
        $body = trim((string) ($input['body'] ?? ''));
        $audience = rtbo_notification_clean_audience((string) ($input['audience'] ?? 'admins'));
        $targetRole = trim((string) ($input['target_role'] ?? ''));
        $targetUserId = (int) ($input['target_user_id'] ?? 0);
        $metadataInput = is_array($input['metadata'] ?? null) ? $input['metadata'] : [];

        if ($body === '') {
            throw new RuntimeException('Message body is required.');
        }

        if (!is_admin_user($user)) {
            $audience = 'admins';
            $targetRole = '';
            $targetUserId = 0;
        }

        $notification = [
            'type' => 'message_released',
            'title' => $title,
            'body' => $body,
            'related_type' => 'message',
            'metadata' => [
                'released_by' => $user['name'] ?? $user['email'] ?? 'User',
                'requested_audience' => $input['audience'] ?? '',
                ...$metadataInput,
            ],
            'actor' => $user,
        ];

        if ($targetUserId > 0) {
            rtbo_notify_users([$targetUserId], $notification);
        } elseif ($targetRole !== '') {
            rtbo_notify_role($targetRole, $notification);
        } elseif ($audience === 'admins') {
            rtbo_notify_admins($notification);
        } elseif ($audience === 'officials') {
            rtbo_notify_officials($notification);
        } elseif ($audience === 'everyone') {
            rtbo_notify_everyone($notification);
        } else {
            rtbo_notification_create([...$notification, 'audience' => $audience]);
        }

        echo json_encode(['success' => true, 'message' => 'Message notification released.', ...rtbo_notifications_payload($user)], JSON_UNESCAPED_SLASHES);
        exit;
    }

    http_response_code(422);
    echo json_encode(['success' => false, 'message' => 'Unknown notification action.']);
} catch (Throwable $error) {
    error_log('RTBO notifications action failed: ' . $error->getMessage());
    http_response_code(422);
    echo json_encode(['success' => false, 'message' => $error->getMessage()]);
}

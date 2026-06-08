<?php
declare(strict_types=1);

require_once __DIR__ . '/includes/bootstrap.php';
require_once __DIR__ . '/includes/users.php';
require_once __DIR__ . '/includes/notification-templates.php';

header('Content-Type: application/json');

function rtbo_notification_templates_input(): array
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

if (!is_super_admin($user)) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Notification templates are reserved for the Super Admin.']);
    exit;
}

try {
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        echo json_encode([
            'success' => true,
            'templates' => rtbo_notification_templates_all(),
            'placeholders' => rtbo_notification_template_placeholders(),
            'channels' => ['email', 'sms', 'pdf'],
        ], JSON_UNESCAPED_SLASHES);
        exit;
    }

    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['success' => false, 'message' => 'GET or POST required.']);
        exit;
    }

    require_same_origin_request();
    $input = rtbo_notification_templates_input();
    $action = (string) ($input['action'] ?? '');

    if ($action === 'save_template') {
        $template = rtbo_notification_template_save((array) ($input['template'] ?? []), $user);
        echo json_encode([
            'success' => true,
            'message' => 'Notification template saved.',
            'template' => $template,
            'templates' => rtbo_notification_templates_all(),
            'placeholders' => rtbo_notification_template_placeholders(),
        ], JSON_UNESCAPED_SLASHES);
        exit;
    }

    if ($action === 'reset_template') {
        $template = rtbo_notification_template_reset((string) ($input['key'] ?? ''), $user);
        echo json_encode([
            'success' => true,
            'message' => 'Notification template reset to the RTBO default.',
            'template' => $template,
            'templates' => rtbo_notification_templates_all(),
            'placeholders' => rtbo_notification_template_placeholders(),
        ], JSON_UNESCAPED_SLASHES);
        exit;
    }

    if ($action === 'preview_template') {
        $template = rtbo_notification_template_normalize((array) ($input['template'] ?? []));
        $rendered = rtbo_notification_template_render($template, [
            'type' => (string) ($template['key'] ?? ''),
            'title' => 'RTBO Preview',
            'body' => 'Preview body',
            'actor_name' => $user['name'] ?? 'Super Admin',
            'metadata' => [
                'recipient_name' => 'Montrel Simmons',
                'game_summary' => 'Northside Wildcats at Central Eagles',
                'game_date' => gmdate('Y-m-d'),
                'game_time' => '18:00',
                'location_name' => 'RTBO Event Center',
                'position' => 'Referee',
                'status' => 'confirmed',
                'reason' => 'Schedule details updated',
                'changed_fields' => ['time', 'location'],
                'role' => 'official',
                'email' => 'member@example.com',
                'phone' => '(501) 240-4961',
                'organization' => 'Raising The Bar Officiating',
                'event_name' => 'Summer Training School',
                'contract_title' => 'Event Officiating Agreement',
                'amount' => '$125.00',
                'reference' => 'RTBO-1001',
                'rating' => '5',
                'program_name' => 'RefZone University',
            ],
        ]);

        echo json_encode(['success' => true, 'preview' => $rendered], JSON_UNESCAPED_SLASHES);
        exit;
    }

    http_response_code(422);
    echo json_encode(['success' => false, 'message' => 'Unknown notification template action.']);
} catch (Throwable $error) {
    error_log('RTBO notification template action failed: ' . $error->getMessage());
    http_response_code(422);
    echo json_encode(['success' => false, 'message' => $error->getMessage()]);
}

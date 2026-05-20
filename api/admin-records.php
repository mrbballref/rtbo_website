<?php
declare(strict_types=1);

require_once __DIR__ . '/includes/bootstrap.php';
require_once __DIR__ . '/includes/users.php';
require_once __DIR__ . '/includes/admin-dashboard.php';
require_once __DIR__ . '/includes/notifications.php';

header('Content-Type: application/json');
require_same_origin_request();

function admin_records_input(): array
{
    $raw = file_get_contents('php://input') ?: '';
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

$databaseUser = current_database_user();
$user = $databaseUser ? public_auth_user($databaseUser) : current_user();
if (!$user || !is_admin_user($user)) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Admin sign-in is required.']);
    exit;
}

$input = admin_records_input();
$method = strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET'));
$action = (string) ($input['action'] ?? ($_GET['action'] ?? 'list'));
$section = (string) ($input['section'] ?? ($_GET['section'] ?? ''));

function admin_records_send_notification(string $section, string $action, array $record, array $user): void
{
    try {
        $name = trim((string) ($record['field0'] ?? ''));
        $name = $name !== '' ? $name : ucfirst($section) . ' record';
        $verb = $action === 'update' ? 'updated' : 'available';

        if ($section === 'education') {
            rtbo_notify_everyone([
                'type' => $action === 'update' ? 'education_updated' : 'education_available',
                'title' => $action === 'update' ? 'Educational material updated' : 'New educational material available',
                'body' => "{$name} is {$verb} in the Education section.",
                'related_type' => 'education',
                'related_id' => (int) ($record['id'] ?? 0),
                'metadata' => ['record' => $record, 'section' => $section],
                'actor' => $user,
            ]);
        }

        if ($section === 'reports') {
            rtbo_notify_officials([
                'type' => $action === 'update' ? 'game_report_requirement_updated' : 'game_report_due',
                'title' => $action === 'update' ? 'Game report requirement updated' : 'Game report due',
                'body' => "{$name} is {$verb} in the Reports section. Review the report requirement on your profile.",
                'related_type' => 'report',
                'related_id' => (int) ($record['id'] ?? 0),
                'metadata' => ['record' => $record, 'section' => $section],
                'actor' => $user,
            ]);
        }
    } catch (Throwable $notificationError) {
        error_log('RTBO dashboard record notification failed: ' . $notificationError->getMessage());
    }
}

try {
    if ($method === 'GET' || $action === 'list') {
        $section = dashboard_validate_section($section);
        echo json_encode(['success' => true, 'records' => dashboard_list_records($section)], JSON_UNESCAPED_SLASHES);
        exit;
    }

    if ($method !== 'POST') {
        http_response_code(405);
        echo json_encode(['success' => false, 'message' => 'Unsupported dashboard request method.']);
        exit;
    }

    $section = dashboard_validate_section($section);

    if ($action === 'create') {
        $record = dashboard_save_record($section, (array) ($input['record'] ?? []), $user);
        admin_records_send_notification($section, 'create', $record, $user);
        echo json_encode(['success' => true, 'record' => $record, 'message' => 'Record created and saved to the database.'], JSON_UNESCAPED_SLASHES);
        exit;
    }

    if ($action === 'update') {
        $id = (int) ($input['id'] ?? 0);
        if ($id <= 0) {
            throw new RuntimeException('A valid record ID is required.');
        }
        $record = dashboard_update_record($section, $id, (array) ($input['record'] ?? []), $user);
        admin_records_send_notification($section, 'update', $record, $user);
        echo json_encode(['success' => true, 'record' => $record, 'message' => 'Record updated and saved to the database.'], JSON_UNESCAPED_SLASHES);
        exit;
    }

    if ($action === 'delete') {
        $id = (int) ($input['id'] ?? 0);
        if ($id <= 0) {
            throw new RuntimeException('A valid record ID is required.');
        }
        dashboard_delete_record($section, $id, $user);
        echo json_encode(['success' => true, 'message' => 'Record deleted from the database.']);
        exit;
    }

    throw new RuntimeException('Unsupported dashboard action.');
} catch (Throwable $error) {
    error_log('RTBO admin records action failed: ' . $error->getMessage());
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => $error->getMessage()]);
}

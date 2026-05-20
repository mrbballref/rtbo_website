<?php
declare(strict_types=1);

require_once __DIR__ . '/includes/bootstrap.php';
require_once __DIR__ . '/includes/admin-schools.php';

header('Content-Type: application/json');

if (!is_admin_user()) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Admin sign-in required.']);
    exit;
}

function admin_schools_json_body(): array
{
    $raw = file_get_contents('php://input') ?: '';
    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : [];
}

function admin_schools_reference_payload(): array
{
    $records = admin_schools_list();
    $activeRecords = array_values(array_filter(
        $records,
        static fn (array $record): bool => ($record['status'] ?? 'active') === 'active'
    ));

    return [
        'records' => $records,
        'venues' => array_values(array_filter(
            $activeRecords,
            static fn (array $record): bool => in_array(($record['record_type'] ?? ''), ['school', 'event_center'], true)
        )),
        'schools' => array_values(array_filter(
            $activeRecords,
            static fn (array $record): bool => ($record['record_type'] ?? '') === 'school'
        )),
        'event_centers' => array_values(array_filter(
            $activeRecords,
            static fn (array $record): bool => ($record['record_type'] ?? '') === 'event_center'
        )),
        'teams' => array_values(array_filter(
            $activeRecords,
            static fn (array $record): bool => ($record['record_type'] ?? '') === 'team'
        )),
    ];
}

try {
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        echo json_encode(['success' => true, ...admin_schools_reference_payload()], JSON_UNESCAPED_SLASHES);
        exit;
    }

    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['success' => false, 'message' => 'GET or POST required.']);
        exit;
    }
    require_same_origin_request();

    $input = admin_schools_json_body();
    $action = (string) ($input['action'] ?? '');
    $record = is_array($input['record'] ?? null) ? $input['record'] : [];
    $id = (int) ($input['id'] ?? $record['id'] ?? 0);

    if ($action === 'create') {
        $created = admin_school_create($record);
        echo json_encode(['success' => true, 'message' => 'School/team saved.', 'record' => $created], JSON_UNESCAPED_SLASHES);
        exit;
    }

    if ($action === 'update') {
        $updated = admin_school_update($id, $record);
        echo json_encode(['success' => true, 'message' => 'School/team updated.', 'record' => $updated], JSON_UNESCAPED_SLASHES);
        exit;
    }

    if ($action === 'delete') {
        admin_school_delete($id);
        echo json_encode(['success' => true, 'message' => 'School/team removed.']);
        exit;
    }

    http_response_code(422);
    echo json_encode(['success' => false, 'message' => 'Unknown school/team action.']);
} catch (Throwable $error) {
    error_log('RTBO admin school/team action failed: ' . $error->getMessage());
    http_response_code(422);
    echo json_encode(['success' => false, 'message' => $error->getMessage()]);
}

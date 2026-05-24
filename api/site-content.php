<?php
declare(strict_types=1);

require_once __DIR__ . '/includes/bootstrap.php';
require_once __DIR__ . '/includes/users.php';
require_once __DIR__ . '/includes/site-content.php';

header('Content-Type: application/json');

function rtbo_site_content_json(array $payload, int $status = 200): never
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_SLASHES);
    exit;
}

function rtbo_site_content_input(): array
{
    $raw = file_get_contents('php://input') ?: '';
    $data = json_decode($raw, true);

    return is_array($data) ? $data : [];
}

function rtbo_site_content_current_admin(): ?array
{
    $databaseUser = current_database_user();
    $user = $databaseUser ? public_auth_user($databaseUser) : current_user();

    return $user && is_admin_user($user) ? $user : null;
}

try {
    $method = strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET'));
    $adminScope = (string) ($_GET['scope'] ?? '') === 'admin';

    if ($method === 'GET') {
        if ($adminScope && !rtbo_site_content_current_admin()) {
            rtbo_site_content_json(['success' => false, 'message' => 'Admin sign-in is required.'], 401);
        }

        $content = rtbo_site_content_load();
        $allRecords = rtbo_site_content_records_normalized($content['records'] ?? []);
        $records = $adminScope ? $allRecords : array_values(array_filter(
            $allRecords,
            static fn(array $record): bool => ($record['status'] ?? 'active') === 'active'
        ));

        rtbo_site_content_json([
            'success' => true,
            'records' => $records,
            'managed' => ($content['updated_at'] ?? null) !== null || $allRecords !== [],
            'updated_at' => $content['updated_at'] ?? null,
        ]);
    }

    if ($method !== 'POST') {
        rtbo_site_content_json(['success' => false, 'message' => 'Unsupported website content request method.'], 405);
    }

    require_same_origin_request();
    $user = rtbo_site_content_current_admin();
    if (!$user) {
        rtbo_site_content_json(['success' => false, 'message' => 'Admin sign-in is required.'], 401);
    }

    $input = rtbo_site_content_input();
    $action = strtolower(trim((string) ($input['action'] ?? 'list')));

    if (in_array($action, ['replace', 'bulk_save'], true)) {
        $records = is_array($input['records'] ?? null) ? $input['records'] : [];
        $saved = rtbo_site_content_replace($records, $user);
        rtbo_site_content_json([
            'success' => true,
            'records' => $saved,
            'message' => 'Website content saved.',
        ]);
    }

    if (in_array($action, ['create', 'update', 'save'], true)) {
        $record = is_array($input['record'] ?? null) ? $input['record'] : [];
        $saved = rtbo_site_content_save_record($record, $user);
        rtbo_site_content_json([
            'success' => true,
            'record' => $saved,
            'records' => rtbo_site_content_records(false),
            'message' => 'Website content item saved.',
        ]);
    }

    if ($action === 'delete') {
        $deleted = rtbo_site_content_delete_record((string) ($input['id'] ?? ''), $user);
        rtbo_site_content_json([
            'success' => true,
            'deleted' => $deleted,
            'records' => rtbo_site_content_records(false),
            'message' => 'Website content item removed.',
        ]);
    }

    rtbo_site_content_json(['success' => false, 'message' => 'Unsupported website content action.'], 400);
} catch (Throwable $error) {
    error_log('RTBO site content action failed: ' . $error->getMessage());
    rtbo_site_content_json(['success' => false, 'message' => $error->getMessage()], 400);
}

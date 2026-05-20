<?php
declare(strict_types=1);

require_once __DIR__ . '/includes/bootstrap.php';
require_once __DIR__ . '/includes/admin-organizations.php';

header('Content-Type: application/json');

if (!is_admin_user()) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Admin sign-in required.']);
    exit;
}

function admin_organizations_json_body(): array
{
    $raw = file_get_contents('php://input') ?: '';
    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : [];
}

try {
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        echo json_encode([
            'success' => true,
            'records' => admin_organizations_list(),
            'officials' => admin_organization_officials_list(),
            'entity_groups' => admin_organization_entity_groups(),
            'official_links' => admin_official_classification_links_list(),
            'official_link_conferences' => admin_official_classification_conferences_list(),
        ], JSON_UNESCAPED_SLASHES);
        exit;
    }

    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['success' => false, 'message' => 'GET or POST required.']);
        exit;
    }
    require_same_origin_request();

    $input = admin_organizations_json_body();
    $action = (string) ($input['action'] ?? '');
    $record = is_array($input['record'] ?? null) ? $input['record'] : [];
    $id = (int) ($input['id'] ?? $record['id'] ?? 0);

    if ($action === 'create') {
        $created = admin_organization_create($record);
        echo json_encode(['success' => true, 'message' => 'Classification saved.', 'record' => $created], JSON_UNESCAPED_SLASHES);
        exit;
    }

    if ($action === 'update') {
        $updated = admin_organization_update($id, $record);
        echo json_encode(['success' => true, 'message' => 'Classification updated.', 'record' => $updated], JSON_UNESCAPED_SLASHES);
        exit;
    }

    if ($action === 'delete') {
        admin_organization_delete($id);
        echo json_encode(['success' => true, 'message' => 'Classification removed.']);
        exit;
    }

    if ($action === 'save_official_classifications') {
        $officialId = (int) ($input['official_id'] ?? 0);
        $classificationIds = is_array($input['classification_ids'] ?? null) ? $input['classification_ids'] : [];
        $classificationConferences = is_array($input['classification_conferences'] ?? null) ? $input['classification_conferences'] : [];
        $saved = admin_official_classifications_save($officialId, $classificationIds, $classificationConferences);
        $officialConferenceLinks = admin_official_classification_conferences_list();
        echo json_encode([
            'success' => true,
            'message' => 'Official classification links saved.',
            'official_id' => $officialId,
            'classification_ids' => $saved,
            'classification_conferences' => $officialConferenceLinks[(string) $officialId] ?? [],
            'official_links' => admin_official_classification_links_list(),
            'official_link_conferences' => $officialConferenceLinks,
        ], JSON_UNESCAPED_SLASHES);
        exit;
    }

    http_response_code(422);
    echo json_encode(['success' => false, 'message' => 'Unknown classification action.']);
} catch (Throwable $error) {
    error_log('RTBO admin organization action failed: ' . $error->getMessage());
    http_response_code(422);
    echo json_encode(['success' => false, 'message' => $error->getMessage()]);
}

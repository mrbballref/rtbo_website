<?php
declare(strict_types=1);

require_once __DIR__ . '/includes/bootstrap.php';
require_once __DIR__ . '/includes/users.php';
require_once __DIR__ . '/includes/availability-rules.php';

header('Content-Type: application/json');

function rtbo_availability_rules_input(): array
{
    $decoded = json_decode((string) file_get_contents('php://input'), true);

    return is_array($decoded) ? $decoded : [];
}

$databaseUser = current_database_user();
$user = $databaseUser ? public_auth_user($databaseUser) : current_user();
if (!$user) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Sign-in is required to manage availability rules.']);
    exit;
}

try {
    $officialId = (int) ($user['id'] ?? 0);

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $rules = rtbo_availability_rules_for_official($officialId);
        echo json_encode([
            'success' => true,
            'rules' => $rules,
            'rule_types' => rtbo_availability_rule_types(),
            'summary' => rtbo_availability_rules_summary($rules),
        ], JSON_UNESCAPED_SLASHES);
        exit;
    }

    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['success' => false, 'message' => 'GET or POST required.']);
        exit;
    }

    require_same_origin_request();
    $input = rtbo_availability_rules_input();
    $action = (string) ($input['action'] ?? 'save_rule');

    if ($action === 'save_rule') {
        $rule = rtbo_save_availability_rule($officialId, (array) ($input['rule'] ?? $input));
        $rules = rtbo_availability_rules_for_official($officialId);
        echo json_encode([
            'success' => true,
            'message' => 'Availability rule saved.',
            'rule' => $rule,
            'rules' => $rules,
            'rule_types' => rtbo_availability_rule_types(),
            'summary' => rtbo_availability_rules_summary($rules),
        ], JSON_UNESCAPED_SLASHES);
        exit;
    }

    if ($action === 'delete_rule') {
        $id = (int) ($input['id'] ?? $input['rule_id'] ?? 0);
        if ($id <= 0) {
            throw new RuntimeException('Choose a valid availability rule to delete.');
        }
        rtbo_delete_availability_rule($officialId, $id);
        $rules = rtbo_availability_rules_for_official($officialId);
        echo json_encode([
            'success' => true,
            'message' => 'Availability rule deleted.',
            'rules' => $rules,
            'rule_types' => rtbo_availability_rule_types(),
            'summary' => rtbo_availability_rules_summary($rules),
        ], JSON_UNESCAPED_SLASHES);
        exit;
    }

    if ($action === 'toggle_rule') {
        $id = (int) ($input['id'] ?? $input['rule_id'] ?? 0);
        if ($id <= 0) {
            throw new RuntimeException('Choose a valid availability rule to update.');
        }
        $rule = rtbo_toggle_availability_rule($officialId, $id, !empty($input['is_active']));
        $rules = rtbo_availability_rules_for_official($officialId);
        echo json_encode([
            'success' => true,
            'message' => $rule['is_active'] ? 'Availability rule activated.' : 'Availability rule paused.',
            'rule' => $rule,
            'rules' => $rules,
            'rule_types' => rtbo_availability_rule_types(),
            'summary' => rtbo_availability_rules_summary($rules),
        ], JSON_UNESCAPED_SLASHES);
        exit;
    }

    http_response_code(422);
    echo json_encode(['success' => false, 'message' => 'Unknown availability rules action.']);
} catch (Throwable $error) {
    error_log('RTBO availability rules action failed: ' . $error->getMessage());
    http_response_code(422);
    echo json_encode(['success' => false, 'message' => $error->getMessage()]);
}

<?php
declare(strict_types=1);

require_once __DIR__ . '/includes/bootstrap.php';
require_once __DIR__ . '/includes/users.php';
require_once __DIR__ . '/includes/assignor-subscriptions.php';

header('Content-Type: application/json');

function rtbo_admin_assignor_input(): array
{
    $data = json_decode((string) file_get_contents('php://input'), true);

    return is_array($data) ? $data : [];
}

function rtbo_admin_assignor_public_plans(): array
{
    return array_map(static function (array $plan): array {
        unset($plan['price_id']);

        return $plan;
    }, array_values(rtbo_assignor_subscription_plans()));
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
    echo json_encode(['success' => false, 'message' => 'Assignor subscription management is reserved for the Super Admin.']);
    exit;
}

try {
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $applications = rtbo_assignor_subscription_all();
        echo json_encode([
            'success' => true,
            'applications' => $applications,
            'summary' => rtbo_assignor_subscription_summary($applications),
            'plans' => rtbo_admin_assignor_public_plans(),
        ], JSON_UNESCAPED_SLASHES);
        exit;
    }

    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['success' => false, 'message' => 'GET or POST required.']);
        exit;
    }

    require_same_origin_request();
    $input = rtbo_admin_assignor_input();
    $action = (string) ($input['action'] ?? '');

    if ($action === 'update_status') {
        $id = trim((string) ($input['id'] ?? ''));
        $status = trim((string) ($input['status'] ?? ''));
        $allowed = ['pending_checkout', 'checkout_created', 'active', 'subscription_updated', 'payment_failed', 'cancelled', 'needs_setup'];

        if ($id === '' || !in_array($status, $allowed, true)) {
            http_response_code(422);
            echo json_encode(['success' => false, 'message' => 'Choose a valid workspace and status.']);
            exit;
        }

        $updated = rtbo_assignor_subscription_update_payment($id, $status, [
            'admin_status_updated_at' => gmdate('c'),
        ]);
        if (!$updated) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Assignor workspace subscription was not found.']);
            exit;
        }

        $applications = rtbo_assignor_subscription_all();
        echo json_encode([
            'success' => true,
            'message' => 'Assignor subscription status updated.',
            'application' => $updated,
            'applications' => $applications,
            'summary' => rtbo_assignor_subscription_summary($applications),
            'plans' => rtbo_admin_assignor_public_plans(),
        ], JSON_UNESCAPED_SLASHES);
        exit;
    }

    http_response_code(422);
    echo json_encode(['success' => false, 'message' => 'Unknown assignor subscription action.']);
} catch (Throwable $error) {
    error_log('RTBO admin assignor subscription action failed: ' . $error->getMessage());
    http_response_code(422);
    echo json_encode(['success' => false, 'message' => $error->getMessage()]);
}

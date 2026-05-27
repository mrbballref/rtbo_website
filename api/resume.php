<?php
declare(strict_types=1);

require_once __DIR__ . '/includes/bootstrap.php';
require_once __DIR__ . '/includes/users.php';
require_once __DIR__ . '/includes/resume.php';

header('Content-Type: application/json');

function rtbo_resume_json(array $payload, int $status = 200): never
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_SLASHES);
    exit;
}

function rtbo_resume_input(): array
{
    $raw = file_get_contents('php://input') ?: '';
    $data = json_decode($raw, true);

    return is_array($data) ? $data : [];
}

function rtbo_resume_current_admin(): ?array
{
    $databaseUser = current_database_user();
    $user = $databaseUser ? public_auth_user($databaseUser) : current_user();

    return $user && is_admin_user($user) ? $user : null;
}

try {
    $method = strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET'));
    $adminScope = (string) ($_GET['scope'] ?? '') === 'admin';

    if ($method === 'GET') {
        if ($adminScope && !rtbo_resume_current_admin()) {
            rtbo_resume_json(['success' => false, 'message' => 'Admin sign-in is required.'], 401);
        }

        $data = rtbo_resume_load();
        rtbo_resume_json([
            'success' => true,
            'resume' => $data['resume'],
            'managed' => ($data['updated_at'] ?? null) !== null,
            'updated_at' => $data['updated_at'] ?? null,
        ]);
    }

    if ($method !== 'POST') {
        rtbo_resume_json(['success' => false, 'message' => 'Unsupported resume request method.'], 405);
    }

    require_same_origin_request();
    $user = rtbo_resume_current_admin();
    if (!$user) {
        rtbo_resume_json(['success' => false, 'message' => 'Admin sign-in is required.'], 401);
    }

    $input = rtbo_resume_input();
    $action = strtolower(trim((string) ($input['action'] ?? 'save')));

    if (in_array($action, ['save', 'update', 'replace'], true)) {
        $resume = is_array($input['resume'] ?? null) ? $input['resume'] : [];
        $saved = rtbo_resume_save($resume, $user);
        rtbo_resume_json([
            'success' => true,
            'resume' => $saved,
            'message' => 'RTBO resume saved.',
        ]);
    }

    rtbo_resume_json(['success' => false, 'message' => 'Unsupported resume action.'], 400);
} catch (Throwable $error) {
    error_log('RTBO resume action failed: ' . $error->getMessage());
    rtbo_resume_json(['success' => false, 'message' => $error->getMessage()], 400);
}

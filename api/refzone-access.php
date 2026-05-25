<?php
declare(strict_types=1);

require_once __DIR__ . '/includes/bootstrap.php';
require_once __DIR__ . '/includes/users.php';
require_once __DIR__ . '/includes/refzone-enrollments.php';

header('Content-Type: application/json');

function rtbo_refzone_access_json(array $payload, int $status = 200): never
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_SLASHES);
    exit;
}

if (strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET')) !== 'GET') {
    rtbo_refzone_access_json(['success' => false, 'message' => 'GET required.'], 405);
}

$user = current_database_user();
if (!$user) {
    rtbo_refzone_access_json([
        'success' => false,
        'message' => 'Sign in before accessing RefZone University courses.',
    ], 401);
}

$access = rtbo_refzone_access_for_user($user);
rtbo_refzone_access_json([
    'success' => true,
    'course_ids' => $access['course_ids'],
    'enrollments' => $access['enrollments'],
]);

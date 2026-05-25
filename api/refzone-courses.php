<?php
declare(strict_types=1);

require_once __DIR__ . '/includes/bootstrap.php';
require_once __DIR__ . '/includes/users.php';
require_once __DIR__ . '/includes/refzone-courses.php';
require_once __DIR__ . '/includes/refzone-enrollments.php';

header('Content-Type: application/json');

function rtbo_refzone_json(array $payload, int $status = 200): never
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_SLASHES);
    exit;
}

function rtbo_refzone_input(): array
{
    $raw = file_get_contents('php://input') ?: '';
    $data = json_decode($raw, true);

    return is_array($data) ? $data : [];
}

function rtbo_refzone_current_admin(): ?array
{
    $databaseUser = current_database_user();
    $user = $databaseUser ? public_auth_user($databaseUser) : current_user();

    return $user && is_admin_user($user) ? $user : null;
}

try {
    $method = strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET'));
    $adminScope = (string) ($_GET['scope'] ?? '') === 'admin';

    if ($method === 'GET') {
        if ($adminScope && !rtbo_refzone_current_admin()) {
            rtbo_refzone_json(['success' => false, 'message' => 'Admin sign-in is required.'], 401);
        }
        $databaseUser = current_database_user();
        $access = ['course_ids' => [], 'enrollments' => []];
        if (!$adminScope && !$databaseUser) {
            rtbo_refzone_json(['success' => false, 'message' => 'Sign in to access RefZone University courses.'], 401);
        }
        if (!$adminScope && $databaseUser) {
            $access = rtbo_refzone_access_for_user($databaseUser);
        }

        $data = rtbo_refzone_courses_load();
        $savedCourses = rtbo_refzone_courses_normalized($data['courses'] ?? []);
        $allCourses = $savedCourses !== [] ? $savedCourses : rtbo_refzone_starter_courses();
        $courses = $adminScope ? $allCourses : array_values(array_filter(
            $allCourses,
            static fn(array $course): bool => ($course['status'] ?? 'active') === 'active'
                && in_array((string) ($course['id'] ?? ''), $access['course_ids'], true)
        ));

        rtbo_refzone_json([
            'success' => true,
            'courses' => $courses,
            'course_ids' => $access['course_ids'],
            'enrollments' => $access['enrollments'],
            'managed' => $allCourses !== [],
            'managed_source' => $savedCourses !== [] ? 'saved' : 'starter',
            'updated_at' => $data['updated_at'] ?? null,
        ]);
    }

    if ($method !== 'POST') {
        rtbo_refzone_json(['success' => false, 'message' => 'Unsupported course request method.'], 405);
    }

    require_same_origin_request();
    $user = rtbo_refzone_current_admin();
    if (!$user) {
        rtbo_refzone_json(['success' => false, 'message' => 'Admin sign-in is required.'], 401);
    }

    $input = rtbo_refzone_input();
    $action = strtolower(trim((string) ($input['action'] ?? 'list')));

    if (in_array($action, ['replace', 'bulk_save'], true)) {
        $courses = is_array($input['courses'] ?? null) ? $input['courses'] : [];
        $saved = rtbo_refzone_courses_replace($courses, $user);
        rtbo_refzone_json([
            'success' => true,
            'courses' => $saved,
            'message' => 'RefZone University courses saved.',
        ]);
    }

    if (in_array($action, ['create', 'update', 'save'], true)) {
        $course = is_array($input['course'] ?? null) ? $input['course'] : [];
        $current = rtbo_refzone_courses(false);
        $saved = rtbo_refzone_course($course, count($current));
        $found = false;
        foreach ($current as &$existing) {
            if (($existing['id'] ?? '') !== ($saved['id'] ?? '')) {
                continue;
            }
            $existing = $saved;
            $found = true;
            break;
        }
        unset($existing);
        if (!$found) {
            array_unshift($current, $saved);
        }
        $savedCourses = rtbo_refzone_courses_replace($current, $user);
        rtbo_refzone_json([
            'success' => true,
            'course' => $saved,
            'courses' => $savedCourses,
            'message' => 'RefZone University course saved.',
        ]);
    }

    if ($action === 'delete') {
        $deleted = rtbo_refzone_courses_delete((string) ($input['id'] ?? ''), $user);
        rtbo_refzone_json([
            'success' => true,
            'deleted' => $deleted,
            'courses' => rtbo_refzone_courses(false),
            'message' => 'RefZone University course removed.',
        ]);
    }

    rtbo_refzone_json(['success' => false, 'message' => 'Unsupported course action.'], 400);
} catch (Throwable $error) {
    error_log('RTBO RefZone course action failed: ' . $error->getMessage());
    rtbo_refzone_json(['success' => false, 'message' => $error->getMessage()], 400);
}

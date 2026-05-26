<?php
declare(strict_types=1);

require_once __DIR__ . '/includes/bootstrap.php';
require_once __DIR__ . '/includes/users.php';

header('Content-Type: application/json');

function rtbo_refzone_video_json(array $payload, int $status = 200): never
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_SLASHES);
    exit;
}

function rtbo_refzone_video_current_admin(): ?array
{
    $databaseUser = current_database_user();
    $user = $databaseUser ? public_auth_user($databaseUser) : current_user();

    return $user && is_admin_user($user) ? $user : null;
}

function rtbo_refzone_video_upload_rows(array $fileField): array
{
    if (is_array($fileField['name'] ?? null)) {
        $rows = [];
        foreach ($fileField['name'] as $index => $name) {
            $rows[] = [
                'name' => $name,
                'type' => $fileField['type'][$index] ?? '',
                'tmp_name' => $fileField['tmp_name'][$index] ?? '',
                'error' => $fileField['error'][$index] ?? UPLOAD_ERR_NO_FILE,
                'size' => $fileField['size'][$index] ?? 0,
            ];
        }
        return $rows;
    }

    return [$fileField];
}

if (strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET')) !== 'POST') {
    rtbo_refzone_video_json(['success' => false, 'message' => 'POST required.'], 405);
}

require_same_origin_request();

if (!rtbo_refzone_video_current_admin()) {
    rtbo_refzone_video_json(['success' => false, 'message' => 'Admin sign-in is required.'], 401);
}

$field = $_FILES['videos'] ?? $_FILES['video'] ?? null;
if (!is_array($field)) {
    rtbo_refzone_video_json(['success' => false, 'message' => 'Choose one or more course videos to upload.'], 422);
}

$uploadDir = STORAGE_DIR . '/refzone-course-videos';
ensure_dir($uploadDir);

$saved = [];
$allowed = [
    'video/mp4' => 'mp4',
    'video/webm' => 'webm',
    'video/quicktime' => 'mov',
    'video/x-m4v' => 'm4v',
];

foreach (rtbo_refzone_video_upload_rows($field) as $index => $upload) {
    if ((int) ($upload['error'] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_NO_FILE) {
        continue;
    }
    if ((int) ($upload['error'] ?? UPLOAD_ERR_OK) !== UPLOAD_ERR_OK || empty($upload['tmp_name']) || !is_uploaded_file((string) $upload['tmp_name'])) {
        rtbo_refzone_video_json(['success' => false, 'message' => 'One of the selected videos could not be uploaded.'], 422);
    }
    if ((int) ($upload['size'] ?? 0) > 700 * 1024 * 1024) {
        rtbo_refzone_video_json(['success' => false, 'message' => 'Each course video must be 700MB or smaller.'], 422);
    }

    $mimeType = '';
    if (function_exists('finfo_open')) {
        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        if ($finfo !== false) {
            $detected = finfo_file($finfo, (string) $upload['tmp_name']);
            finfo_close($finfo);
            $mimeType = is_string($detected) ? $detected : '';
        }
    }
    $mimeType = $mimeType ?: (string) ($upload['type'] ?? '');
    $extension = $allowed[$mimeType] ?? '';
    if ($extension === '') {
        rtbo_refzone_video_json(['success' => false, 'message' => 'Course videos must be MP4, WebM, MOV, or M4V files.'], 422);
    }

    $filename = 'course-video-' . gmdate('Ymd-His') . '-' . bin2hex(random_bytes(6)) . '-' . ((int) $index + 1) . '.' . $extension;
    $target = $uploadDir . '/' . $filename;

    if (!move_uploaded_file((string) $upload['tmp_name'], $target)) {
        rtbo_refzone_video_json(['success' => false, 'message' => 'Course video could not be saved. Please try again.'], 500);
    }

    $originalName = pathinfo((string) ($upload['name'] ?? ('Course Video ' . ((int) $index + 1))), PATHINFO_FILENAME);
    $saved[] = [
        'title' => $originalName !== '' ? $originalName : ('Course Video ' . ((int) $index + 1)),
        'url' => '/api/refzone-course-video.php?file=' . rawurlencode($filename) . '&v=' . filemtime($target),
        'type' => $mimeType,
        'size' => filesize($target),
    ];
}

if ($saved === []) {
    rtbo_refzone_video_json(['success' => false, 'message' => 'Choose one or more course videos to upload.'], 422);
}

rtbo_refzone_video_json([
    'success' => true,
    'videos' => $saved,
    'message' => count($saved) === 1 ? 'Course video uploaded.' : count($saved) . ' course videos uploaded.',
]);

<?php
declare(strict_types=1);

require_once __DIR__ . '/includes/bootstrap.php';
require_once __DIR__ . '/includes/users.php';

header('Content-Type: application/json');

function rtbo_client_spotlight_video_json(array $payload, int $status = 200): never
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_SLASHES);
    exit;
}

function rtbo_client_spotlight_video_current_admin(): ?array
{
    $databaseUser = current_database_user();
    $user = $databaseUser ? public_auth_user($databaseUser) : current_user();

    return $user && is_admin_user($user) ? $user : null;
}

if (strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET')) !== 'POST') {
    rtbo_client_spotlight_video_json(['success' => false, 'message' => 'POST required.'], 405);
}

require_same_origin_request();

if (!rtbo_client_spotlight_video_current_admin()) {
    rtbo_client_spotlight_video_json(['success' => false, 'message' => 'Admin sign-in is required.'], 401);
}

$upload = $_FILES['video'] ?? null;
if (!is_array($upload) || (int) ($upload['error'] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_NO_FILE) {
    rtbo_client_spotlight_video_json(['success' => false, 'message' => 'Choose a Client Spotlight video to upload.'], 422);
}

$error = (int) ($upload['error'] ?? UPLOAD_ERR_OK);
if ($error !== UPLOAD_ERR_OK || empty($upload['tmp_name']) || !is_uploaded_file((string) $upload['tmp_name'])) {
    $message = in_array($error, [UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE], true)
        ? 'The selected Client Spotlight video is larger than the server upload limit.'
        : 'The Client Spotlight video could not be uploaded. Please choose an MP4, WebM, MOV, or M4V file.';
    rtbo_client_spotlight_video_json(['success' => false, 'message' => $message], 422);
}

if ((int) ($upload['size'] ?? 0) > 700 * 1024 * 1024) {
    rtbo_client_spotlight_video_json(['success' => false, 'message' => 'Client Spotlight videos must be 700MB or smaller.'], 422);
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

$allowed = [
    'video/mp4' => 'mp4',
    'video/webm' => 'webm',
    'video/quicktime' => 'mov',
    'video/x-m4v' => 'm4v',
];
$extension = $allowed[$mimeType] ?? '';
if ($extension === '') {
    rtbo_client_spotlight_video_json(['success' => false, 'message' => 'Client Spotlight videos must be MP4, WebM, MOV, or M4V files.'], 422);
}

$uploadDir = STORAGE_DIR . '/client-spotlight-videos';
ensure_dir($uploadDir);

$filename = 'client-spotlight-video-' . gmdate('Ymd-His') . '-' . bin2hex(random_bytes(6)) . '.' . $extension;
$target = $uploadDir . '/' . $filename;

if (!move_uploaded_file((string) $upload['tmp_name'], $target)) {
    rtbo_client_spotlight_video_json(['success' => false, 'message' => 'Client Spotlight video could not be saved. Please try again.'], 500);
}

$originalName = pathinfo((string) ($upload['name'] ?? 'Client Spotlight Video'), PATHINFO_FILENAME);
$title = trim((string) preg_replace('/[_-]+/', ' ', $originalName));

rtbo_client_spotlight_video_json([
    'success' => true,
    'video' => [
        'title' => $title !== '' ? $title : 'Client Spotlight Video',
        'url' => '/api/client-spotlight-video.php?file=' . rawurlencode($filename) . '&v=' . filemtime($target),
        'type' => $mimeType,
        'size' => filesize($target),
    ],
    'message' => 'Client Spotlight video uploaded.',
]);

<?php
declare(strict_types=1);

require_once __DIR__ . '/includes/bootstrap.php';
require_once __DIR__ . '/includes/users.php';

header('Content-Type: application/json');

function rtbo_refzone_image_json(array $payload, int $status = 200): never
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_SLASHES);
    exit;
}

function rtbo_refzone_image_current_admin(): ?array
{
    $databaseUser = current_database_user();
    $user = $databaseUser ? public_auth_user($databaseUser) : current_user();

    return $user && is_admin_user($user) ? $user : null;
}

if (strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET')) !== 'POST') {
    rtbo_refzone_image_json(['success' => false, 'message' => 'POST required.'], 405);
}

require_same_origin_request();

if (!rtbo_refzone_image_current_admin()) {
    rtbo_refzone_image_json(['success' => false, 'message' => 'Admin sign-in is required.'], 401);
}

$upload = $_FILES['image'] ?? null;
if (!is_array($upload) || (int) ($upload['error'] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_NO_FILE) {
    rtbo_refzone_image_json(['success' => false, 'message' => 'Choose a course image to upload.'], 422);
}

if ((int) ($upload['error'] ?? UPLOAD_ERR_OK) !== UPLOAD_ERR_OK || empty($upload['tmp_name']) || !is_uploaded_file((string) $upload['tmp_name'])) {
    rtbo_refzone_image_json(['success' => false, 'message' => 'The course image could not be uploaded. Please choose a JPG, PNG, or WebP image.'], 422);
}

if ((int) ($upload['size'] ?? 0) > 5 * 1024 * 1024) {
    rtbo_refzone_image_json(['success' => false, 'message' => 'Course image must be 5MB or smaller.'], 422);
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
$extension = match ($mimeType) {
    'image/jpeg' => 'jpg',
    'image/png' => 'png',
    'image/webp' => 'webp',
    default => '',
};

if ($extension === '') {
    rtbo_refzone_image_json(['success' => false, 'message' => 'Course image must be a JPG, PNG, or WebP image.'], 422);
}

$uploadDir = STORAGE_DIR . '/refzone-course-images';
ensure_dir($uploadDir);

$filename = 'course-' . gmdate('Ymd-His') . '-' . bin2hex(random_bytes(6)) . '.' . $extension;
$target = $uploadDir . '/' . $filename;

if (!move_uploaded_file((string) $upload['tmp_name'], $target)) {
    rtbo_refzone_image_json(['success' => false, 'message' => 'Course image could not be saved. Please try again.'], 500);
}

rtbo_refzone_image_json([
    'success' => true,
    'url' => '/api/refzone-course-image.php?file=' . rawurlencode($filename) . '&v=' . filemtime($target),
    'message' => 'Course image uploaded.',
]);

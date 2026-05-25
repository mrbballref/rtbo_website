<?php
declare(strict_types=1);

require_once __DIR__ . '/includes/bootstrap.php';

$file = basename((string) ($_GET['file'] ?? ''));
if ($file === '' || !preg_match('/^course-[a-z0-9.\-]+$/i', $file)) {
    http_response_code(404);
    exit;
}

$path = STORAGE_DIR . '/refzone-course-images/' . $file;
if (!is_file($path)) {
    http_response_code(404);
    exit;
}

$info = getimagesize($path);
if ($info === false || !in_array(($info['mime'] ?? ''), ['image/jpeg', 'image/png', 'image/webp'], true)) {
    http_response_code(404);
    exit;
}

header('Content-Type: ' . $info['mime']);
header('Cache-Control: public, max-age=86400');
readfile($path);

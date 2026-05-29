<?php
declare(strict_types=1);

require_once __DIR__ . '/includes/bootstrap.php';

$file = basename((string) ($_GET['file'] ?? ''));
if ($file === '' || !preg_match('/^client-spotlight-video-[a-z0-9.\-]+$/i', $file)) {
    http_response_code(404);
    exit;
}

$path = STORAGE_DIR . '/client-spotlight-videos/' . $file;
if (!is_file($path)) {
    http_response_code(404);
    exit;
}

$extension = strtolower((string) pathinfo($path, PATHINFO_EXTENSION));
$contentType = match ($extension) {
    'mp4', 'm4v' => 'video/mp4',
    'webm' => 'video/webm',
    'mov' => 'video/quicktime',
    default => '',
};

if ($contentType === '') {
    http_response_code(404);
    exit;
}

$size = filesize($path);
$start = 0;
$end = $size > 0 ? $size - 1 : 0;
$status = 200;

if (isset($_SERVER['HTTP_RANGE']) && preg_match('/bytes=(\d*)-(\d*)/', (string) $_SERVER['HTTP_RANGE'], $matches)) {
    if ($matches[1] !== '') {
        $start = max(0, (int) $matches[1]);
    }
    if ($matches[2] !== '') {
        $end = min($end, (int) $matches[2]);
    }
    if ($start <= $end) {
        $status = 206;
    }
}

$length = max(0, $end - $start + 1);
http_response_code($status);
header('Content-Type: ' . $contentType);
header('Accept-Ranges: bytes');
header('Cache-Control: public, max-age=86400');
header('Content-Length: ' . $length);
if ($status === 206) {
    header("Content-Range: bytes {$start}-{$end}/{$size}");
}

$handle = fopen($path, 'rb');
if ($handle === false) {
    http_response_code(500);
    exit;
}

fseek($handle, $start);
$remaining = $length;
while ($remaining > 0 && !feof($handle)) {
    $chunk = fread($handle, min(8192, $remaining));
    if ($chunk === false) {
        break;
    }
    $remaining -= strlen($chunk);
    echo $chunk;
}
fclose($handle);

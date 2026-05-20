<?php
declare(strict_types=1);

$requestPath = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
$root = __DIR__;
$distRoot = realpath($root . '/frontend/dist');

function rtbo_local_content_type(string $path): string
{
    return match (strtolower(pathinfo($path, PATHINFO_EXTENSION))) {
        'html' => 'text/html; charset=UTF-8',
        'css' => 'text/css; charset=UTF-8',
        'js' => 'application/javascript; charset=UTF-8',
        'json' => 'application/json; charset=UTF-8',
        'svg' => 'image/svg+xml',
        'png' => 'image/png',
        'jpg', 'jpeg' => 'image/jpeg',
        'webp' => 'image/webp',
        'gif' => 'image/gif',
        'ico' => 'image/x-icon',
        'woff' => 'font/woff',
        'woff2' => 'font/woff2',
        default => 'application/octet-stream',
    };
}

if (str_starts_with($requestPath, '/api/')) {
    $apiPath = realpath($root . '/api/' . substr($requestPath, 5));
    $apiRoot = realpath($root . '/api');

    if ($apiPath && $apiRoot && str_starts_with($apiPath, $apiRoot) && is_file($apiPath)) {
        require $apiPath;
        return true;
    }

    http_response_code(404);
    header('Content-Type: application/json');
    echo json_encode(['success' => false, 'message' => 'API endpoint not found.']);
    return true;
}

if ($distRoot) {
    $assetPath = realpath($distRoot . ($requestPath === '/' ? '/index.html' : $requestPath));
    if ($assetPath && str_starts_with($assetPath, $distRoot) && is_file($assetPath)) {
        header('Content-Type: ' . rtbo_local_content_type($assetPath));
        header('Cache-Control: no-cache');
        readfile($assetPath);
        return true;
    }

    header('Content-Type: text/html; charset=UTF-8');
    require $distRoot . '/index.html';
    return true;
}

http_response_code(500);
echo 'RTBO build output is missing. Run npm --prefix frontend run build first.';
return true;

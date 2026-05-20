<?php
declare(strict_types=1);

require_once __DIR__ . '/includes/bootstrap.php';
require_once __DIR__ . '/includes/users.php';

$current = current_database_user();
$requestedId = (int) ($_GET['id'] ?? 0);

if (!$current || $requestedId <= 0 || ((int) $current['id'] !== $requestedId && !is_admin_user(public_auth_user($current)))) {
    http_response_code(404);
    exit;
}

ensure_users_table();
$stmt = db()->prepare('SELECT profile_photo FROM users WHERE id = ? LIMIT 1');
$stmt->execute([$requestedId]);
$path = (string) ($stmt->fetchColumn() ?: '');

if ($path === '' || !is_file($path)) {
    http_response_code(404);
    exit;
}

$info = getimagesize($path);
if ($info === false || !in_array(($info['mime'] ?? ''), ['image/jpeg', 'image/png', 'image/webp'], true)) {
    http_response_code(404);
    exit;
}

header('Content-Type: ' . $info['mime']);
header('Cache-Control: private, max-age=300');
readfile($path);

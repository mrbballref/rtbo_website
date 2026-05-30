<?php
declare(strict_types=1);

require_once __DIR__ . '/includes/bootstrap.php';
require_once __DIR__ . '/includes/locker-room.php';

function rtbo_locker_room_media_type(string $path, bool $caption): string
{
    if ($caption) {
        return 'text/vtt; charset=utf-8';
    }

    return match (strtolower((string) pathinfo($path, PATHINFO_EXTENSION))) {
        'mp4', 'm4v' => 'video/mp4',
        'webm' => 'video/webm',
        'mov' => 'video/quicktime',
        default => 'application/octet-stream',
    };
}

function rtbo_locker_room_stream_file(string $path, string $contentType, string $downloadName = ''): never
{
    if (!is_file($path) || !is_readable($path)) {
        http_response_code(404);
        exit;
    }

    @set_time_limit(0);
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
    header('Cache-Control: private, max-age=0, must-revalidate');
    header('Content-Length: ' . $length);
    if ($downloadName !== '') {
        $safeDownloadName = str_replace(['"', "\r", "\n"], '', basename($downloadName));
        header('Content-Disposition: attachment; filename="' . $safeDownloadName . '"');
    }
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
        $chunk = fread($handle, min(1024 * 1024, $remaining));
        if ($chunk === false) {
            break;
        }
        $remaining -= strlen($chunk);
        echo $chunk;
        if (ob_get_level() > 0) {
            @ob_flush();
        }
        flush();
    }
    fclose($handle);
    exit;
}

try {
    rtbo_locker_room_ensure_tables();
    $user = rtbo_locker_room_require_user();
    $filmId = (int) ($_GET['film'] ?? 0);
    if ($filmId <= 0) {
        http_response_code(404);
        exit;
    }

    $film = rtbo_locker_room_media_record($filmId, $user);
    $asset = strtolower(trim((string) ($_GET['asset'] ?? 'video')));
    $isCaption = $asset === 'caption';
    $download = isset($_GET['download']) && !$isCaption;

    if ($download && (int) ($film['download_enabled'] ?? 1) !== 1 && !is_admin_user($user)) {
        http_response_code(403);
        exit;
    }

    $relativePath = $isCaption ? (string) ($film['caption_path'] ?? '') : (string) ($film['storage_path'] ?? '');
    if ($relativePath === '') {
        http_response_code(404);
        exit;
    }

    $path = rtbo_locker_room_upload_dir() . '/' . basename($relativePath);
    if ($download) {
        $stmt = db()->prepare('UPDATE locker_room_films SET download_count = download_count + 1, updated_at = NOW() WHERE id = ?');
        $stmt->execute([$filmId]);
        rtbo_locker_room_log_event($filmId, (int) $film['team_id'], $user, 'download', [
            'filename' => (string) ($film['original_filename'] ?? basename($path)),
        ]);
    }

    $downloadName = $download ? (string) ($film['original_filename'] ?? basename($path)) : '';
    rtbo_locker_room_stream_file($path, rtbo_locker_room_media_type($path, $isCaption), $downloadName);
} catch (Throwable $error) {
    error_log('RTBO Locker Room media failed: ' . $error->getMessage());
    http_response_code(404);
    exit;
}

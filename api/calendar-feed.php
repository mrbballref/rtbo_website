<?php
declare(strict_types=1);

require_once __DIR__ . '/includes/bootstrap.php';
require_once __DIR__ . '/includes/calendar-sync.php';

$token = trim((string) ($_GET['token'] ?? ''));
$scope = rtbo_calendar_sync_find_by_token($token);
if (!$scope) {
    http_response_code(404);
    header('Content-Type: text/plain; charset=utf-8');
    echo 'Calendar feed not found.';
    exit;
}

header('Content-Type: text/calendar; charset=utf-8');
header('Content-Disposition: inline; filename="rtbo-calendar.ics"');
header('Cache-Control: private, max-age=300');
echo rtbo_calendar_sync_ics($scope);

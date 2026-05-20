<?php
declare(strict_types=1);

require_once __DIR__ . '/includes/bootstrap.php';
require_once __DIR__ . '/includes/newsletter.php';
require_once __DIR__ . '/includes/contact.php';
require_once __DIR__ . '/includes/registration-store.php';
require_once __DIR__ . '/includes/users.php';
require_once __DIR__ . '/includes/geo.php';
require_once __DIR__ . '/includes/admin-dashboard.php';
require_once __DIR__ . '/includes/admin-games.php';
require_once __DIR__ . '/includes/notifications.php';

header('Content-Type: application/json');

$databaseUser = current_database_user();
$user = $databaseUser ? public_auth_user($databaseUser) : current_user();
if (!$user || !is_admin_user($user)) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Admin sign-in is required.']);
    exit;
}

function safe_dashboard_list(callable $loader): array
{
    try {
        return $loader();
    } catch (Throwable $error) {
        error_log('RTBO dashboard data load failed: ' . $error->getMessage());
        return [];
    }
}

function dashboard_game_row(array $row): array
{
    return [
        'id' => (int) ($row['id'] ?? $row['game_id'] ?? 0),
        'game_id' => (int) ($row['game_id'] ?? $row['id'] ?? 0),
        'game_date' => (string) ($row['game_date'] ?? ''),
        'game_time' => (string) ($row['game_time'] ?? ''),
        'level' => (string) ($row['level'] ?? ''),
        'home_team' => (string) ($row['home_team'] ?? ''),
        'away_team' => (string) ($row['away_team'] ?? ''),
        'location_name' => (string) ($row['location_name'] ?? ''),
        'location_address' => (string) ($row['location_address'] ?? ''),
        'status' => (string) ($row['game_status'] ?? $row['status'] ?? ''),
        'published' => (bool) ($row['published'] ?? false),
    ];
}

function dashboard_assignment_row(array $row): array
{
    $game = dashboard_game_row($row);
    $game['assignment_id'] = (int) ($row['assignment_id'] ?? 0);
    $game['official_id'] = (int) ($row['official_id'] ?? 0);
    $game['official_name'] = trim((string) ($row['first_name'] ?? '') . ' ' . (string) ($row['last_name'] ?? ''));
    $game['official_email'] = (string) ($row['email'] ?? '');
    $game['official_phone'] = rtbo_format_phone_number((string) ($row['phone'] ?? ''));
    $game['position'] = (string) ($row['position_name'] ?? '');
    $game['assignment_status'] = (string) ($row['assignment_status'] ?? '');
    return $game;
}

function dashboard_assignment_from_game(array $game, array $assignment): array
{
    $official = is_array($assignment['official'] ?? null) ? $assignment['official'] : [];
    $row = dashboard_game_row($game);
    $officialName = trim((string) ($official['name'] ?? ''));
    if ($officialName === '') {
        $officialName = trim((string) ($official['first_name'] ?? '') . ' ' . (string) ($official['last_name'] ?? ''));
    }

    $row['assignment_id'] = (int) ($assignment['assignment_id'] ?? $assignment['id'] ?? 0);
    $row['official_id'] = (int) ($assignment['official_id'] ?? $official['id'] ?? 0);
    $row['official_name'] = $officialName !== '' ? $officialName : 'Official';
    $row['official_email'] = (string) ($official['email'] ?? '');
    $row['official_phone'] = rtbo_format_phone_number((string) ($official['phone'] ?? ''));
    $row['position'] = (string) ($assignment['position_name'] ?? $assignment['position'] ?? '');
    $row['assignment_status'] = (string) ($assignment['status'] ?? 'pending');
    return $row;
}

function dashboard_active_game(array $game): bool
{
    return !in_array(strtolower((string) ($game['status'] ?? '')), ['deleted', 'cancelled', 'canceled'], true);
}

function dashboard_sort_games(array &$games, bool $ascending = true): void
{
    usort($games, static function (array $a, array $b) use ($ascending): int {
        $left = sprintf('%s %s %010d', (string) ($a['game_date'] ?? ''), (string) ($a['game_time'] ?? ''), (int) ($a['id'] ?? 0));
        $right = sprintf('%s %s %010d', (string) ($b['game_date'] ?? ''), (string) ($b['game_time'] ?? ''), (int) ($b['id'] ?? 0));
        return $ascending ? strcmp($left, $right) : strcmp($right, $left);
    });
}

function dashboard_next_geo_target_from_games(array $games): ?array
{
    $today = date('Y-m-d');
    dashboard_sort_games($games, true);
    foreach ($games as $game) {
        $latitude = $game['location_lat'] ?? null;
        $longitude = $game['location_lng'] ?? null;
        if (
            (string) ($game['game_date'] ?? '') >= $today
            && $latitude !== null
            && $longitude !== null
        ) {
            return [
                'id' => (int) ($game['id'] ?? 0),
                'latitude' => (float) $latitude,
                'longitude' => (float) $longitude,
                'label' => trim((string) ($game['away_team'] ?? '') . ' at ' . (string) ($game['home_team'] ?? '')),
                'location_name' => (string) ($game['location_name'] ?? ''),
                'location_address' => (string) ($game['location_address'] ?? ''),
                'game_date' => (string) ($game['game_date'] ?? ''),
                'game_time' => (string) ($game['game_time'] ?? ''),
            ];
        }
    }

    return null;
}

function dashboard_overview_data(): array
{
    $today = date('Y-m-d');
    $games = array_values(array_filter(admin_games_list(), 'dashboard_active_game'));
    dashboard_sort_games($games, true);

    $unaccepted = [];
    foreach ($games as $game) {
        if (!(bool) ($game['published'] ?? false)) {
            continue;
        }

        foreach (($game['assignments'] ?? []) as $assignment) {
            $officialId = (int) ($assignment['official_id'] ?? ($assignment['official']['id'] ?? 0));
            $assignmentStatus = strtolower((string) ($assignment['status'] ?? 'pending'));
            if ($officialId <= 0 || in_array($assignmentStatus, ['accepted', 'declined', 'removed'], true)) {
                continue;
            }
            $unaccepted[] = dashboard_assignment_from_game($game, $assignment);
        }
    }

    $todaysGames = array_values(array_map(
        'dashboard_game_row',
        array_filter($games, static fn (array $game): bool => (string) ($game['game_date'] ?? '') === $today)
    ));
    $scheduledEvents = array_values(array_map(
        'dashboard_game_row',
        array_filter($games, static fn (array $game): bool => (string) ($game['game_date'] ?? '') >= $today)
    ));
    $upcomingEvents = array_values(array_map(
        'dashboard_game_row',
        array_filter($games, static fn (array $game): bool => (string) ($game['game_date'] ?? '') > $today)
    ));

    $unaccepted = array_slice($unaccepted, 0, 25);
    $todaysGames = array_slice($todaysGames, 0, 20);
    $scheduledEvents = array_slice($scheduledEvents, 0, 20);
    $upcomingEvents = array_slice($upcomingEvents, 0, 20);

    $target = dashboard_next_geo_target_from_games($games);
    try {
        rtbo_ensure_geo_tables();
        rtbo_ensure_game_geo_columns();
        $officials = $target
            ? rtbo_geo_admin_locations((float) $target['latitude'], (float) $target['longitude'], (int) $target['id'])
            : rtbo_geo_admin_locations(null, null, 0);
    } catch (Throwable $error) {
        error_log('RTBO overview geo load failed: ' . $error->getMessage());
        $officials = [];
    }
    $trackedOfficials = array_values(array_filter($officials, static function (array $official): bool {
        return (bool) ($official['location']['consent_enabled'] ?? false)
            && ($official['location']['latitude'] ?? null) !== null
            && ($official['location']['longitude'] ?? null) !== null;
    }));

    return [
        'counts' => [
            'unaccepted_assignments' => count($unaccepted),
            'todays_games' => count($todaysGames),
            'scheduled_events' => count($scheduledEvents),
            'upcoming_events' => count($upcomingEvents),
            'tracked_officials' => count($trackedOfficials),
        ],
        'unaccepted_assignments' => $unaccepted,
        'todays_games' => $todaysGames,
        'scheduled_events' => $scheduledEvents,
        'upcoming_events' => $upcomingEvents,
        'geo' => [
            'target_game' => $target,
            'tracked_count' => count($trackedOfficials),
            'untracked_count' => count($officials) - count($trackedOfficials),
            'closest_officials' => array_slice($officials, 0, 5),
            'refreshed_at' => date('c'),
        ],
    ];
}

$registrations = safe_dashboard_list(static fn() => recent_school_registrations(50));
$contacts = safe_dashboard_list(static fn() => recent_contact_messages(50));
$subscribers = safe_dashboard_list(static fn() => newsletter_recent_subscribers(50));
$newsletters = safe_dashboard_list(static fn() => newsletter_history(50));
$adminRecords = safe_dashboard_list(static fn() => dashboard_records_by_section());
$overview = safe_dashboard_list(static fn() => dashboard_overview_data());

echo json_encode([
    'success' => true,
    'registrations' => $registrations,
    'contacts' => $contacts,
    'subscribers' => $subscribers,
    'newsletters' => $newsletters,
    'adminRecords' => $adminRecords,
    'overview' => $overview,
    ...rtbo_notifications_payload($user),
    'user' => $user,
], JSON_UNESCAPED_SLASHES);

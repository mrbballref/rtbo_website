<?php
declare(strict_types=1);

require_once __DIR__ . '/admin-games.php';

function rtbo_calendar_sync_storage_path(): string
{
    return STORAGE_DIR . '/calendar-sync.json';
}

function rtbo_calendar_sync_default_state(): array
{
    return [
        'master' => [
            'enabled' => true,
            'token' => bin2hex(random_bytes(32)),
            'include_unpublished' => false,
            'updated_at' => gmdate('c'),
        ],
        'officials' => [],
    ];
}

function rtbo_calendar_sync_load(): array
{
    $path = rtbo_calendar_sync_storage_path();
    if (!is_file($path)) {
        $state = rtbo_calendar_sync_default_state();
        rtbo_calendar_sync_save($state);
        return $state;
    }

    $decoded = json_decode((string) file_get_contents($path), true);
    if (!is_array($decoded)) {
        $state = rtbo_calendar_sync_default_state();
        rtbo_calendar_sync_save($state);
        return $state;
    }

    $default = rtbo_calendar_sync_default_state();
    $decoded['master'] = is_array($decoded['master'] ?? null) ? [
        ...$default['master'],
        ...$decoded['master'],
        'token' => (string) ($decoded['master']['token'] ?? $default['master']['token']),
    ] : $default['master'];
    if ((string) ($decoded['master']['token'] ?? '') === '') {
        $decoded['master']['token'] = bin2hex(random_bytes(32));
    }
    $decoded['officials'] = is_array($decoded['officials'] ?? null) ? $decoded['officials'] : [];

    return $decoded;
}

function rtbo_calendar_sync_save(array $state): void
{
    ensure_dir(dirname(rtbo_calendar_sync_storage_path()));
    file_put_contents(
        rtbo_calendar_sync_storage_path(),
        json_encode($state, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES),
        LOCK_EX
    );
}

function rtbo_calendar_sync_origin(): string
{
    $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
    $host = (string) ($_SERVER['HTTP_HOST'] ?? '127.0.0.1:5173');
    return $scheme . '://' . $host;
}

function rtbo_calendar_sync_feed_path(string $token): string
{
    return '/api/calendar-feed.php?token=' . rawurlencode($token);
}

function rtbo_calendar_sync_feed_url(string $token): string
{
    return rtbo_calendar_sync_origin() . rtbo_calendar_sync_feed_path($token);
}

function rtbo_calendar_sync_google_url(string $feedUrl): string
{
    return 'https://calendar.google.com/calendar/render?cid=' . rawurlencode($feedUrl);
}

function rtbo_calendar_sync_webcal_url(string $feedUrl): string
{
    return preg_replace('/^https?:\/\//', 'webcal://', $feedUrl) ?: $feedUrl;
}

function rtbo_calendar_sync_official_state(int $officialId, array $state): array
{
    $key = (string) $officialId;
    $row = is_array($state['officials'][$key] ?? null) ? $state['officials'][$key] : [];
    if ((string) ($row['token'] ?? '') === '') {
        $row['token'] = bin2hex(random_bytes(32));
    }

    return [
        'official_id' => $officialId,
        'enabled' => (bool) ($row['enabled'] ?? false),
        'token' => (string) $row['token'],
        'target_name' => (string) ($row['target_name'] ?? ''),
        'target_url' => (string) ($row['target_url'] ?? ''),
        'include_availability' => (bool) ($row['include_availability'] ?? true),
        'updated_at' => (string) ($row['updated_at'] ?? ''),
    ];
}

function rtbo_calendar_sync_public_feed_fields(array $row): array
{
    $token = (string) ($row['token'] ?? '');
    $feedUrl = $token !== '' ? rtbo_calendar_sync_feed_url($token) : '';

    return [
        'feed_path' => $token !== '' ? rtbo_calendar_sync_feed_path($token) : '',
        'feed_url' => $feedUrl,
        'webcal_url' => $feedUrl !== '' ? rtbo_calendar_sync_webcal_url($feedUrl) : '',
        'google_url' => $feedUrl !== '' ? rtbo_calendar_sync_google_url($feedUrl) : '',
    ];
}

function rtbo_calendar_sync_update_official(int $officialId, array $input): array
{
    if ($officialId <= 0) {
        throw new RuntimeException('Choose a valid official for calendar sync.');
    }

    $state = rtbo_calendar_sync_load();
    $current = rtbo_calendar_sync_official_state($officialId, $state);
    if (!empty($input['regenerate_token'])) {
        $current['token'] = bin2hex(random_bytes(32));
    }

    $current['enabled'] = !empty($input['enabled']);
    $current['target_name'] = trim((string) ($input['target_name'] ?? $current['target_name']));
    $current['target_url'] = trim((string) ($input['target_url'] ?? $current['target_url']));
    $current['include_availability'] = array_key_exists('include_availability', $input) ? !empty($input['include_availability']) : $current['include_availability'];
    $current['updated_at'] = gmdate('c');
    $state['officials'][(string) $officialId] = $current;
    rtbo_calendar_sync_save($state);

    return [
        ...$current,
        ...rtbo_calendar_sync_public_feed_fields($current),
    ];
}

function rtbo_calendar_sync_update_master(array $input): array
{
    $state = rtbo_calendar_sync_load();
    $master = is_array($state['master'] ?? null) ? $state['master'] : rtbo_calendar_sync_default_state()['master'];
    if (!empty($input['regenerate_token']) || (string) ($master['token'] ?? '') === '') {
        $master['token'] = bin2hex(random_bytes(32));
    }

    $master['enabled'] = array_key_exists('enabled', $input) ? !empty($input['enabled']) : (bool) ($master['enabled'] ?? true);
    $master['include_unpublished'] = array_key_exists('include_unpublished', $input) ? !empty($input['include_unpublished']) : (bool) ($master['include_unpublished'] ?? false);
    $master['updated_at'] = gmdate('c');
    $state['master'] = $master;
    rtbo_calendar_sync_save($state);

    return [
        ...$master,
        ...rtbo_calendar_sync_public_feed_fields($master),
    ];
}

function rtbo_calendar_sync_master_public(array $state): array
{
    $master = is_array($state['master'] ?? null) ? $state['master'] : rtbo_calendar_sync_default_state()['master'];
    return [
        'enabled' => (bool) ($master['enabled'] ?? true),
        'include_unpublished' => (bool) ($master['include_unpublished'] ?? false),
        'updated_at' => (string) ($master['updated_at'] ?? ''),
        ...rtbo_calendar_sync_public_feed_fields($master),
    ];
}

function rtbo_calendar_sync_official_public(array $official, array $state): array
{
    $row = rtbo_calendar_sync_official_state((int) ($official['id'] ?? 0), $state);
    return [
        'official_id' => (int) ($official['id'] ?? 0),
        'name' => (string) ($official['name'] ?? ''),
        'email' => (string) ($official['email'] ?? ''),
        'phone' => (string) ($official['phone'] ?? ''),
        'enabled' => (bool) ($row['enabled'] ?? false),
        'target_name' => (string) ($row['target_name'] ?? ''),
        'target_url' => (string) ($row['target_url'] ?? ''),
        'include_availability' => (bool) ($row['include_availability'] ?? true),
        'updated_at' => (string) ($row['updated_at'] ?? ''),
        ...rtbo_calendar_sync_public_feed_fields($row),
    ];
}

function rtbo_calendar_sync_admin_payload(): array
{
    $state = rtbo_calendar_sync_load();
    $officials = array_map(
        static fn (array $official): array => rtbo_calendar_sync_official_public($official, $state),
        admin_game_officials_list(false)
    );
    $enabledOfficials = count(array_filter($officials, static fn (array $official): bool => !empty($official['enabled'])));
    $games = admin_games_list();
    $publishedGames = count(array_filter($games, static fn (array $game): bool => !empty($game['published']) && strtolower((string) ($game['status'] ?? '')) !== 'deleted'));

    return [
        'master' => rtbo_calendar_sync_master_public($state),
        'officials' => $officials,
        'summary' => [
            'published_games' => $publishedGames,
            'officials' => count($officials),
            'enabled_official_feeds' => $enabledOfficials,
        ],
    ];
}

function rtbo_calendar_sync_user_payload(array $user): array
{
    $state = rtbo_calendar_sync_load();
    $official = [
        'id' => (int) ($user['id'] ?? 0),
        'name' => (string) ($user['name'] ?? ''),
        'email' => (string) ($user['email'] ?? ''),
        'phone' => (string) ($user['phone'] ?? ''),
    ];

    return [
        'official' => rtbo_calendar_sync_official_public($official, $state),
    ];
}

function rtbo_calendar_sync_find_by_token(string $token): ?array
{
    $token = trim($token);
    if ($token === '') {
        return null;
    }

    $state = rtbo_calendar_sync_load();
    $master = is_array($state['master'] ?? null) ? $state['master'] : [];
    if (!empty($master['enabled']) && hash_equals((string) ($master['token'] ?? ''), $token)) {
        return [
            'scope' => 'master',
            'settings' => $master,
        ];
    }

    foreach ($state['officials'] as $officialId => $row) {
        if (!is_array($row) || empty($row['enabled'])) {
            continue;
        }
        if (hash_equals((string) ($row['token'] ?? ''), $token)) {
            return [
                'scope' => 'official',
                'official_id' => (int) $officialId,
                'settings' => $row,
            ];
        }
    }

    return null;
}

function rtbo_calendar_sync_ics_escape(string $value): string
{
    $value = str_replace(["\r\n", "\r", "\n"], '\\n', $value);
    $value = str_replace(['\\', ';', ','], ['\\\\', '\;', '\,'], $value);
    return $value;
}

function rtbo_calendar_sync_ics_datetime(string $date, string $time = '', int $offsetMinutes = 0): string
{
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
        $date = gmdate('Y-m-d');
    }

    $time = trim($time) !== '' ? substr(trim($time), 0, 5) : '12:00';
    if (!preg_match('/^\d{2}:\d{2}$/', $time)) {
        $time = '12:00';
    }

    $timestamp = strtotime($date . ' ' . $time . ' +' . max(0, $offsetMinutes) . ' minutes');
    return date('Ymd\THis', $timestamp ?: time());
}

function rtbo_calendar_sync_game_event(array $game, string $uidSuffix = 'master', string $position = '', string $assignmentStatus = ''): array
{
    $summary = trim((string) ($game['away_team'] ?? '') . ' at ' . (string) ($game['home_team'] ?? ''));
    $summary = $summary !== 'at' ? $summary : 'RTBO Game Assignment';
    $level = trim((string) ($game['level'] ?? ''));
    $location = trim(implode(', ', array_filter([
        (string) ($game['location_name'] ?? ''),
        (string) ($game['location_address'] ?? ''),
    ])));
    $descriptionParts = array_filter([
        $level !== '' ? 'Level: ' . $level : '',
        $position !== '' ? 'Position: ' . $position : '',
        $assignmentStatus !== '' ? 'Assignment Status: ' . $assignmentStatus : '',
        (string) ($game['notes'] ?? '') !== '' ? 'Notes: ' . (string) ($game['notes'] ?? '') : '',
    ]);

    return [
        'uid' => 'rtbo-game-' . (int) ($game['id'] ?? 0) . '-' . preg_replace('/[^a-z0-9]+/i', '-', $uidSuffix) . '@rtbo',
        'summary' => $summary,
        'description' => implode("\n", $descriptionParts),
        'location' => $location,
        'dtstart' => rtbo_calendar_sync_ics_datetime((string) ($game['game_date'] ?? ''), (string) ($game['game_time'] ?? '')),
        'dtend' => rtbo_calendar_sync_ics_datetime((string) ($game['game_date'] ?? ''), (string) ($game['game_time'] ?? ''), 120),
        'status' => in_array(strtolower((string) ($game['status'] ?? '')), ['cancelled', 'canceled'], true) ? 'CANCELLED' : 'CONFIRMED',
    ];
}

function rtbo_calendar_sync_availability_event(array $availability, int $officialId): array
{
    $date = (string) ($availability['date'] ?? '');
    $status = !empty($availability['contact_required']) ? 'Contact first' : ucfirst((string) ($availability['status'] ?? 'availability'));
    $reason = trim((string) ($availability['reason'] ?? $availability['notes'] ?? ''));
    $summary = 'RTBO Availability: ' . $status;

    return [
        'uid' => 'rtbo-availability-' . $officialId . '-' . preg_replace('/[^0-9]+/', '', $date) . '@rtbo',
        'summary' => $summary,
        'description' => $reason,
        'location' => (string) ($availability['game_location'] ?? ''),
        'dtstart' => rtbo_calendar_sync_ics_datetime($date, '08:00'),
        'dtend' => rtbo_calendar_sync_ics_datetime($date, '17:00'),
        'status' => 'CONFIRMED',
    ];
}

function rtbo_calendar_sync_events_for_scope(array $scope): array
{
    $games = admin_games_list();
    $events = [];
    if (($scope['scope'] ?? '') === 'master') {
        $includeUnpublished = !empty($scope['settings']['include_unpublished']);
        foreach ($games as $game) {
            if (strtolower((string) ($game['status'] ?? '')) === 'deleted') {
                continue;
            }
            if (!$includeUnpublished && empty($game['published'])) {
                continue;
            }
            $events[] = rtbo_calendar_sync_game_event($game);
        }
        return $events;
    }

    $officialId = (int) ($scope['official_id'] ?? 0);
    foreach ($games as $game) {
        if (empty($game['published']) || strtolower((string) ($game['status'] ?? '')) === 'deleted') {
            continue;
        }
        foreach (($game['assignments'] ?? []) as $assignment) {
            $assignmentOfficialId = (int) ($assignment['official_id'] ?? ($assignment['official']['id'] ?? 0));
            $assignmentStatus = strtolower((string) ($assignment['status'] ?? 'pending'));
            if ($assignmentOfficialId !== $officialId || in_array($assignmentStatus, ['removed', 'declined'], true)) {
                continue;
            }
            $events[] = rtbo_calendar_sync_game_event(
                $game,
                'official-' . $officialId . '-assignment-' . (int) ($assignment['assignment_id'] ?? $assignment['id'] ?? 0),
                (string) ($assignment['position_name'] ?? $assignment['position'] ?? ''),
                (string) ($assignment['status'] ?? '')
            );
        }
    }

    if (!empty($scope['settings']['include_availability'])) {
        $availabilityMap = admin_game_official_availability_map([$officialId]);
        foreach (($availabilityMap[$officialId] ?? []) as $availability) {
            $events[] = rtbo_calendar_sync_availability_event($availability, $officialId);
        }
    }

    return $events;
}

function rtbo_calendar_sync_ics(array $scope): string
{
    $name = ($scope['scope'] ?? '') === 'master'
        ? 'Raising The Bar Officiating Master Schedule'
        : 'Raising The Bar Officiating Assignments';
    $lines = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Raising The Bar Officiating//RTBO Calendar Sync//EN',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        'X-WR-CALNAME:' . rtbo_calendar_sync_ics_escape($name),
        'X-WR-TIMEZONE:America/Chicago',
    ];

    foreach (rtbo_calendar_sync_events_for_scope($scope) as $event) {
        $lines[] = 'BEGIN:VEVENT';
        $lines[] = 'UID:' . rtbo_calendar_sync_ics_escape((string) ($event['uid'] ?? uniqid('rtbo-', true)));
        $lines[] = 'DTSTAMP:' . gmdate('Ymd\THis\Z');
        $lines[] = 'DTSTART:' . (string) ($event['dtstart'] ?? gmdate('Ymd\THis'));
        $lines[] = 'DTEND:' . (string) ($event['dtend'] ?? gmdate('Ymd\THis'));
        $lines[] = 'SUMMARY:' . rtbo_calendar_sync_ics_escape((string) ($event['summary'] ?? 'RTBO Event'));
        if ((string) ($event['description'] ?? '') !== '') {
            $lines[] = 'DESCRIPTION:' . rtbo_calendar_sync_ics_escape((string) $event['description']);
        }
        if ((string) ($event['location'] ?? '') !== '') {
            $lines[] = 'LOCATION:' . rtbo_calendar_sync_ics_escape((string) $event['location']);
        }
        $lines[] = 'STATUS:' . rtbo_calendar_sync_ics_escape((string) ($event['status'] ?? 'CONFIRMED'));
        $lines[] = 'END:VEVENT';
    }

    $lines[] = 'END:VCALENDAR';
    return implode("\r\n", $lines) . "\r\n";
}

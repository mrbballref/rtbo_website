<?php
declare(strict_types=1);

require_once __DIR__ . '/includes/bootstrap.php';
require_once __DIR__ . '/includes/users.php';
require_once __DIR__ . '/includes/admin-members.php';
require_once __DIR__ . '/includes/admin-schools.php';
require_once __DIR__ . '/includes/admin-games.php';
require_once __DIR__ . '/includes/geo.php';
require_once __DIR__ . '/includes/notifications.php';

header('Content-Type: application/json');

function rtbo_profile_user_by_id(int $userId): ?array
{
    if ($userId <= 0) {
        return null;
    }

    try {
        ensure_users_table();
        $stmt = db()->prepare('SELECT * FROM users WHERE id = ? LIMIT 1');
        $stmt->execute([$userId]);
        $user = $stmt->fetch();
        if ($user && (string) ($user['status'] ?? 'active') !== 'deleted') {
            return $user;
        }
    } catch (Throwable $error) {
        error_log('RTBO profile database user lookup failed: ' . $error->getMessage());
    }

    foreach (admin_member_read_file() as $member) {
        if ((int) ($member['id'] ?? 0) === $userId && (string) ($member['status'] ?? 'active') !== 'deleted') {
            return admin_member_normalize($member);
        }
    }

    return null;
}

function rtbo_current_profile_user(): ?array
{
    $sessionUser = current_user();
    $targetUserId = (int) ($_GET['id'] ?? $_GET['user_id'] ?? 0);
    if ($targetUserId > 0 && is_admin_user($sessionUser)) {
        $targetUser = rtbo_profile_user_by_id($targetUserId);
        if ($targetUser) {
            return $targetUser;
        }
    }

    $databaseUser = current_database_user();
    if ($databaseUser) {
        return $databaseUser;
    }

    if (!$sessionUser || empty($sessionUser['id']) || empty($sessionUser['email'])) {
        return null;
    }

    foreach (admin_member_read_file() as $member) {
        $sameId = (int) ($member['id'] ?? 0) === (int) $sessionUser['id'];
        $sameEmail = strtolower((string) ($member['email'] ?? '')) === strtolower((string) $sessionUser['email']);
        $notDeleted = (string) ($member['status'] ?? 'active') !== 'deleted';
        if ($sameId && $sameEmail && $notDeleted) {
            return $member;
        }
    }

    return null;
}

function rtbo_table_columns(string $table): array
{
    try {
        $stmt = db()->prepare(
            "SELECT COLUMN_NAME
             FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE()
               AND TABLE_NAME = ?"
        );
        $stmt->execute([$table]);
        return array_map('strval', $stmt->fetchAll(PDO::FETCH_COLUMN));
    } catch (Throwable $error) {
        error_log('RTBO table column lookup failed: ' . $error->getMessage());
        return [];
    }
}

function rtbo_columns_exist(array $columns, array $required): bool
{
    foreach ($required as $column) {
        if (!in_array($column, $columns, true)) {
            return false;
        }
    }

    return true;
}

function rtbo_profile_photo_url(array $row): string
{
    $photo = (string) ($row['profile_photo'] ?? $row['photo'] ?? '');
    if ($photo !== '' && !str_starts_with($photo, 'http') && !str_starts_with($photo, '/api/')) {
        $photo = '/api/profile-photo.php?id=' . (int) ($row['id'] ?? 0);
    }

    return $photo;
}

function rtbo_assignment_crews_for_games(array $gameIds): array
{
    $gameIds = array_values(array_unique(array_filter(array_map('intval', $gameIds))));
    if (!$gameIds) {
        return [];
    }

    try {
        ensure_users_table();
        $assignmentColumns = rtbo_table_columns('assignments');
        $positionColumns = rtbo_table_columns('positions');
        $userColumns = rtbo_table_columns('users');

        if (
            !rtbo_columns_exist($assignmentColumns, ['game_id', 'official_id', 'position_id', 'status'])
            || !rtbo_columns_exist($userColumns, ['id', 'first_name', 'last_name', 'email'])
        ) {
            return [];
        }

        $joinPosition = rtbo_columns_exist($positionColumns, ['id', 'name']);
        $positionSelect = $joinPosition ? 'p.name AS position_name' : "'' AS position_name";
        $positionJoin = $joinPosition ? 'LEFT JOIN positions p ON p.id = a.position_id' : '';
        $positionOrder = $joinPosition && in_array('sort_order', $positionColumns, true) ? 'p.sort_order' : 'a.position_id';

        $phoneSelect = in_array('phone', $userColumns, true) ? 'u.phone' : "''";
        $sexSelect = in_array('sex', $userColumns, true) ? 'u.sex' : "''";
        $raceSelect = in_array('race', $userColumns, true) ? 'u.race' : "''";
        $address1Select = in_array('address_line1', $userColumns, true) ? 'u.address_line1' : "''";
        $address2Select = in_array('address_line2', $userColumns, true) ? 'u.address_line2' : "''";
        $citySelect = in_array('city', $userColumns, true) ? 'u.city' : "''";
        $stateSelect = in_array('state', $userColumns, true) ? 'u.state' : "''";
        $zipSelect = in_array('zip', $userColumns, true) ? 'u.zip' : "''";
        $photoSelect = in_array('profile_photo', $userColumns, true) ? 'u.profile_photo' : "''";
        $statusFilter = in_array('status', $userColumns, true) ? "AND (u.status IS NULL OR u.status <> 'deleted')" : '';
        $placeholders = implode(',', array_fill(0, count($gameIds), '?'));

        $stmt = db()->prepare(
            "SELECT
                a.game_id,
                a.status AS assignment_status,
                {$positionSelect},
                u.id,
                u.first_name,
                u.last_name,
                u.email,
                {$phoneSelect} AS phone,
                {$sexSelect} AS sex,
                {$raceSelect} AS race,
                {$address1Select} AS address_line1,
                {$address2Select} AS address_line2,
                {$citySelect} AS city,
                {$stateSelect} AS state,
                {$zipSelect} AS zip,
                {$photoSelect} AS profile_photo
             FROM assignments a
             INNER JOIN users u ON u.id = a.official_id
             {$positionJoin}
             WHERE a.game_id IN ({$placeholders})
               {$statusFilter}
             ORDER BY a.game_id ASC, {$positionOrder} ASC, a.official_id ASC"
        );
        $stmt->execute($gameIds);

        $crewByGame = [];
        foreach ($stmt->fetchAll() as $row) {
            $gameId = (int) ($row['game_id'] ?? 0);
            $name = trim((string) ($row['first_name'] ?? '') . ' ' . (string) ($row['last_name'] ?? ''));
            if ($name === '') {
                $name = (string) ($row['email'] ?? 'Official');
            }

            $crewByGame[$gameId][] = [
                'id' => (int) ($row['id'] ?? 0),
                'name' => $name,
                'first_name' => (string) ($row['first_name'] ?? ''),
                'last_name' => (string) ($row['last_name'] ?? ''),
                'email' => (string) ($row['email'] ?? ''),
                'phone' => rtbo_format_phone_number((string) ($row['phone'] ?? '')),
                'sex' => (string) ($row['sex'] ?? ''),
                'race' => (string) ($row['race'] ?? ''),
                'address' => trim((string) ($row['address_line1'] ?? '') . ((string) ($row['address_line2'] ?? '') !== '' ? ', ' . (string) ($row['address_line2'] ?? '') : '')),
                'address_line1' => (string) ($row['address_line1'] ?? ''),
                'address_line2' => (string) ($row['address_line2'] ?? ''),
                'city' => (string) ($row['city'] ?? ''),
                'state' => (string) ($row['state'] ?? ''),
                'zip' => (string) ($row['zip'] ?? ''),
                'photo' => rtbo_profile_photo_url($row),
                'position' => (string) ($row['position_name'] ?? ''),
                'assignment_status' => (string) ($row['assignment_status'] ?? ''),
            ];
        }

        return $crewByGame;
    } catch (Throwable $error) {
        error_log('RTBO assignment crew lookup failed: ' . $error->getMessage());
        return [];
    }
}

function rtbo_assignment_team_key(string $value): string
{
    return strtolower((string) preg_replace('/[^a-z0-9]+/i', '', $value));
}

function rtbo_empty_head_coach(): array
{
    return [
        'name' => '',
        'email' => '',
        'phone' => '',
    ];
}

function rtbo_head_coach_from_linked_user(int $schoolTeamId): array
{
    if ($schoolTeamId <= 0) {
        return rtbo_empty_head_coach();
    }

    try {
        $userColumns = rtbo_table_columns('users');
        if (!rtbo_columns_exist($userColumns, ['id', 'role', 'first_name', 'last_name', 'email', 'school_id'])) {
            return rtbo_empty_head_coach();
        }

        $phoneSelect = in_array('phone', $userColumns, true) ? 'phone' : "'' AS phone";
        $statusFilter = in_array('status', $userColumns, true) ? "AND (status IS NULL OR status <> 'deleted')" : '';
        $stmt = db()->prepare(
            "SELECT first_name, last_name, email, {$phoneSelect}
             FROM users
             WHERE school_id = ?
               AND role IN ('coach', 'assistant_coach')
               {$statusFilter}
             ORDER BY FIELD(role, 'coach', 'assistant_coach'), last_name, first_name
             LIMIT 1"
        );
        $stmt->execute([$schoolTeamId]);
        $coach = $stmt->fetch();
        if (!$coach) {
            return rtbo_empty_head_coach();
        }

        return [
            'name' => trim((string) ($coach['first_name'] ?? '') . ' ' . (string) ($coach['last_name'] ?? '')),
            'email' => (string) ($coach['email'] ?? ''),
            'phone' => rtbo_format_phone_number((string) ($coach['phone'] ?? '')),
        ];
    } catch (Throwable $error) {
        error_log('RTBO linked head coach lookup failed: ' . $error->getMessage());
        return rtbo_empty_head_coach();
    }
}

function rtbo_assignment_team_details(array $teamNames): array
{
    $wantedKeys = array_values(array_unique(array_filter(array_map(
        static fn ($name): string => rtbo_assignment_team_key((string) $name),
        $teamNames
    ))));
    if (!$wantedKeys) {
        return [];
    }

    $details = [];
    try {
        foreach (admin_schools_list() as $record) {
            if ((string) ($record['status'] ?? 'active') !== 'active') {
                continue;
            }

            $headCoach = [
                'name' => (string) ($record['head_coach_name'] ?? ''),
                'email' => (string) ($record['head_coach_email'] ?? ''),
                'phone' => rtbo_format_phone_number((string) ($record['head_coach_phone'] ?? '')),
            ];
            if ($headCoach['name'] === '' && $headCoach['email'] === '' && $headCoach['phone'] === '') {
                $headCoach = rtbo_head_coach_from_linked_user((int) ($record['id'] ?? 0));
            }

            $teamDetail = [
                'id' => (int) ($record['id'] ?? 0),
                'name' => (string) ($record['name'] ?? ''),
                'school_name' => (string) ($record['school_name'] ?? ''),
                'gym_name' => (string) ($record['gym_name'] ?? ''),
                'address_line1' => (string) ($record['address_line1'] ?? ''),
                'city' => (string) ($record['city'] ?? ''),
                'state' => (string) ($record['state'] ?? ''),
                'zip' => (string) ($record['zip'] ?? ''),
                'logo_url' => (string) ($record['logo_url'] ?? ''),
                'head_coach' => $headCoach,
            ];

            foreach ([
                (string) ($record['name'] ?? ''),
                (string) ($record['school_name'] ?? ''),
                trim((string) ($record['school_name'] ?? '') . ' ' . (string) ($record['name'] ?? '')),
            ] as $candidate) {
                $key = rtbo_assignment_team_key($candidate);
                if ($key !== '' && in_array($key, $wantedKeys, true)) {
                    $details[$key] = $teamDetail;
                }
                if (strlen($key) >= 5) {
                    foreach ($wantedKeys as $wantedKey) {
                        if (!isset($details[$wantedKey]) && (str_contains($wantedKey, $key) || str_contains($key, $wantedKey))) {
                            $details[$wantedKey] = $teamDetail;
                        }
                    }
                }
            }
        }
    } catch (Throwable $error) {
        error_log('RTBO assignment team detail lookup failed: ' . $error->getMessage());
    }

    return $details;
}

function rtbo_assignment_official_profile(array $assignment): array
{
    $official = is_array($assignment['official'] ?? null) ? $assignment['official'] : [];
    $officialId = (int) ($assignment['official_id'] ?? $official['id'] ?? 0);
    if (!$official && $officialId > 0) {
        $official = rtbo_profile_user_by_id($officialId) ?? [];
    }

    $name = trim((string) ($official['name'] ?? ''));
    if ($name === '') {
        $name = trim((string) ($official['first_name'] ?? '') . ' ' . (string) ($official['last_name'] ?? ''));
    }
    if ($name === '') {
        $name = (string) ($official['email'] ?? 'Official');
    }

    $addressLine1 = (string) ($official['address_line1'] ?? $official['address'] ?? '');
    $addressLine2 = (string) ($official['address_line2'] ?? '');
    $photo = rtbo_profile_photo_url([
        'id' => $officialId,
        'profile_photo' => (string) ($official['profile_photo'] ?? $official['photo'] ?? ''),
    ]);

    return [
        'assignment_id' => (int) ($assignment['assignment_id'] ?? $assignment['id'] ?? 0),
        'id' => $officialId,
        'official_id' => $officialId,
        'name' => $name,
        'first_name' => (string) ($official['first_name'] ?? ''),
        'last_name' => (string) ($official['last_name'] ?? ''),
        'email' => (string) ($official['email'] ?? ''),
        'phone' => rtbo_format_phone_number((string) ($official['phone'] ?? '')),
        'sex' => (string) ($official['sex'] ?? ''),
        'race' => (string) ($official['race'] ?? ''),
        'address' => trim($addressLine1 . ($addressLine2 !== '' ? ', ' . $addressLine2 : '')),
        'address_line1' => $addressLine1,
        'address_line2' => $addressLine2,
        'city' => (string) ($official['city'] ?? ''),
        'state' => (string) ($official['state'] ?? ''),
        'zip' => (string) ($official['zip'] ?? ''),
        'photo' => $photo,
        'position' => (string) ($assignment['position_name'] ?? $assignment['position'] ?? ''),
        'assignment_status' => (string) ($assignment['status'] ?? 'pending'),
    ];
}

function rtbo_assignment_crew_from_game(array $game): array
{
    $crew = [];
    foreach (($game['assignments'] ?? []) as $assignment) {
        if (strtolower((string) ($assignment['status'] ?? 'pending')) === 'removed') {
            continue;
        }
        $crew[] = rtbo_assignment_official_profile($assignment);
    }

    return $crew;
}

function rtbo_official_assignments(int $officialId): array
{
    try {
        $games = admin_games_list();
        usort($games, static function (array $a, array $b): int {
            $left = sprintf('%s %s %010d', (string) ($a['game_date'] ?? ''), (string) ($a['game_time'] ?? ''), (int) ($a['id'] ?? 0));
            $right = sprintf('%s %s %010d', (string) ($b['game_date'] ?? ''), (string) ($b['game_time'] ?? ''), (int) ($b['id'] ?? 0));
            return strcmp($left, $right);
        });

        $assignments = [];
        foreach ($games as $game) {
            if (!(bool) ($game['published'] ?? false) || strtolower((string) ($game['status'] ?? '')) === 'deleted') {
                continue;
            }

            foreach (($game['assignments'] ?? []) as $assignment) {
                $assignedOfficialId = (int) ($assignment['official_id'] ?? ($assignment['official']['id'] ?? 0));
                $assignmentStatus = strtolower((string) ($assignment['status'] ?? 'pending'));
                if ($assignedOfficialId !== $officialId || $assignmentStatus === 'removed') {
                    continue;
                }

                $assignments[] = [
                    'assignment_id' => (int) ($assignment['assignment_id'] ?? $assignment['id'] ?? 0),
                    'id' => (int) ($game['id'] ?? 0),
                    'game_date' => (string) ($game['game_date'] ?? ''),
                    'game_time' => (string) ($game['game_time'] ?? ''),
                    'level' => (string) ($game['level'] ?? ''),
                    'home_team' => (string) ($game['home_team'] ?? ''),
                    'away_team' => (string) ($game['away_team'] ?? ''),
                    'location_name' => (string) ($game['location_name'] ?? ''),
                    'location_address' => (string) ($game['location_address'] ?? ''),
                    'location_lat' => $game['location_lat'] !== null ? (float) $game['location_lat'] : null,
                    'location_lng' => $game['location_lng'] !== null ? (float) $game['location_lng'] : null,
                    'game_status' => (string) ($game['status'] ?? ''),
                    'assignment_status' => (string) ($assignment['status'] ?? 'pending'),
                    'position' => (string) ($assignment['position_name'] ?? $assignment['position'] ?? ''),
                    'crew' => rtbo_assignment_crew_from_game($game),
                ];
            }
        }

        $teamDetails = rtbo_assignment_team_details(array_merge(
            array_column($assignments, 'home_team'),
            array_column($assignments, 'away_team')
        ));
        $currentLocation = rtbo_geo_location_for_user($officialId);
        $arrivalStatuses = rtbo_geo_arrival_statuses_for_official($officialId);
        foreach ($assignments as &$assignment) {
            $homeDetails = $teamDetails[rtbo_assignment_team_key((string) ($assignment['home_team'] ?? ''))] ?? null;
            $awayDetails = $teamDetails[rtbo_assignment_team_key((string) ($assignment['away_team'] ?? ''))] ?? null;
            $assignment['home_team_record'] = $homeDetails;
            $assignment['away_team_record'] = $awayDetails;
            $assignment['home_team_logo'] = (string) ($homeDetails['logo_url'] ?? '');
            $assignment['away_team_logo'] = (string) ($awayDetails['logo_url'] ?? '');
            $assignment['home_team_coach'] = $homeDetails['head_coach'] ?? rtbo_empty_head_coach();
            $assignment['away_team_coach'] = $awayDetails['head_coach'] ?? rtbo_empty_head_coach();
            $assignment['arrival_status'] = $arrivalStatuses[(int) $assignment['assignment_id']] ?? null;
            $assignment['distance_miles'] = $assignment['arrival_status']['current_distance_miles'] ?? null;
            if (
                $assignment['distance_miles'] === null
                && strtolower((string) ($assignment['assignment_status'] ?? '')) === 'accepted'
                && $currentLocation
                && !empty($currentLocation['consent_enabled'])
                && $currentLocation['latitude'] !== null
                && $currentLocation['longitude'] !== null
                && $assignment['location_lat'] !== null
                && $assignment['location_lng'] !== null
            ) {
                $assignment['distance_miles'] = round(rtbo_geo_distance_miles(
                    (float) $currentLocation['latitude'],
                    (float) $currentLocation['longitude'],
                    (float) $assignment['location_lat'],
                    (float) $assignment['location_lng']
                ), 1);
            }
        }
        unset($assignment);

        return $assignments;
    } catch (Throwable $error) {
        error_log('RTBO official assignment lookup failed: ' . $error->getMessage());
        return [];
    }
}

function rtbo_profile_evaluation_rank_label(float $score): string
{
    if ($score >= 4.75) {
        return 'Platinum Elite Official';
    }
    if ($score >= 4.5) {
        return 'Elite Official';
    }
    if ($score >= 4) {
        return 'Advanced Official';
    }
    if ($score >= 3.5) {
        return 'Developing Official';
    }
    if ($score >= 3) {
        return 'Standard Official';
    }

    return 'Improvement Required';
}

function rtbo_visible_evaluation_notes(array $row, bool $ratingVisible): array
{
    $strengthsVisible = array_key_exists('strengths_visible', $row) ? (bool) ((int) $row['strengths_visible']) : true;
    $improvementsVisible = array_key_exists('improvements_visible', $row) ? (bool) ((int) $row['improvements_visible']) : true;
    $recommendationVisible = array_key_exists('recommendation_visible', $row) ? (bool) ((int) $row['recommendation_visible']) : true;
    $adminCommentsVisible = array_key_exists('admin_comments_visible', $row) ? (bool) ((int) $row['admin_comments_visible']) : false;

    $strengths = $strengthsVisible ? trim((string) ($row['strengths'] ?? '')) : '';
    $improvements = $improvementsVisible ? trim((string) ($row['improvements'] ?? '')) : '';
    $recommendation = $recommendationVisible ? trim((string) ($row['recommendation'] ?? '')) : '';
    $adminComments = $adminCommentsVisible ? trim((string) ($row['comments_to_admin'] ?? '')) : '';

    $parts = [];
    foreach ([
        'Strengths' => $strengths,
        'Areas For Improvement' => $improvements,
        'Recommendation' => $recommendation,
    ] as $label => $value) {
        if ($value !== '') {
            $parts[] = "{$label}: {$value}";
        }
    }

    $commentsToOfficial = implode("\n\n", $parts);
    $legacyComments = trim((string) ($row['comments_to_official'] ?? ''));
    if ($commentsToOfficial === '' && $legacyComments !== '' && $ratingVisible) {
        $commentsToOfficial = $legacyComments;
    }

    return [
        'strengths' => $strengths,
        'improvements' => $improvements,
        'recommendation' => $recommendation,
        'comments_to_admin' => $adminComments,
        'comments_to_official' => $commentsToOfficial,
    ];
}

function rtbo_official_evaluations(int $officialId): array
{
    try {
        $columns = rtbo_table_columns('evaluations');
        if (!rtbo_columns_exist($columns, ['official_id', 'created_at'])) {
            return [];
        }

        $idSelect = in_array('id', $columns, true) ? 'id' : '0 AS id';
        $gameDateSelect = in_array('game_date', $columns, true) ? 'game_date' : 'created_at AS game_date';
        $evaluationTypeSelect = in_array('evaluation_type', $columns, true) ? 'evaluation_type' : "'regular_season' AS evaluation_type";
        $gameTypeSelect = in_array('game_type', $columns, true) ? 'game_type' : "'' AS game_type";
        $rankingLabelSelect = in_array('ranking_label', $columns, true) ? 'ranking_label' : "'' AS ranking_label";
        $ratingVisibleSelect = in_array('rating_visible', $columns, true) ? 'rating_visible' : '1 AS rating_visible';
        $strengthsSelect = in_array('strengths', $columns, true) ? 'strengths' : "'' AS strengths";
        $improvementsSelect = in_array('improvements', $columns, true) ? 'improvements' : "'' AS improvements";
        $recommendationSelect = in_array('recommendation', $columns, true) ? 'recommendation' : "'' AS recommendation";
        $commentsToAdminSelect = in_array('comments_to_admin', $columns, true) ? 'comments_to_admin' : "'' AS comments_to_admin";
        $commentsToOfficialSelect = in_array('comments_to_official', $columns, true) ? 'comments_to_official' : "'' AS comments_to_official";
        $strengthsVisibleSelect = in_array('strengths_visible', $columns, true) ? 'strengths_visible' : '1 AS strengths_visible';
        $improvementsVisibleSelect = in_array('improvements_visible', $columns, true) ? 'improvements_visible' : '1 AS improvements_visible';
        $recommendationVisibleSelect = in_array('recommendation_visible', $columns, true) ? 'recommendation_visible' : '1 AS recommendation_visible';
        $adminCommentsVisibleSelect = in_array('admin_comments_visible', $columns, true) ? 'admin_comments_visible' : '0 AS admin_comments_visible';

        $stmt = db()->prepare(
            "SELECT
                {$idSelect},
                {$gameDateSelect},
                {$evaluationTypeSelect},
                {$gameTypeSelect},
                {$rankingLabelSelect},
                {$ratingVisibleSelect},
                {$strengthsSelect},
                {$improvementsSelect},
                {$recommendationSelect},
                {$commentsToAdminSelect},
                {$commentsToOfficialSelect},
                {$strengthsVisibleSelect},
                {$improvementsVisibleSelect},
                {$recommendationVisibleSelect},
                {$adminCommentsVisibleSelect},
                mechanics_score,
                judgment_score,
                communication_score,
                professionalism_score,
                rules_score,
                positioning_score,
                total_score,
                created_at
             FROM evaluations
             WHERE official_id = ?
             ORDER BY created_at DESC
             LIMIT 40"
        );
        $stmt->execute([$officialId]);

        $evaluations = [];
        foreach ($stmt->fetchAll() as $row) {
            $ratingVisible = (bool) ((int) ($row['rating_visible'] ?? 1));
            $notes = rtbo_visible_evaluation_notes($row, $ratingVisible);
            $hasVisibleNotes = trim(implode('', $notes)) !== '';
            if (!$ratingVisible && !$hasVisibleNotes) {
                continue;
            }

            $evaluations[] = [
                'id' => (int) ($row['id'] ?? 0),
                'created_at' => (string) ($row['created_at'] ?? ''),
                'game_date' => (string) ($row['game_date'] ?? ''),
                'evaluation_type' => (string) ($row['evaluation_type'] ?? 'regular_season'),
                'game_type' => (string) ($row['game_type'] ?? ''),
                'rating_visible' => $ratingVisible,
                'total_score' => $ratingVisible ? (string) ($row['total_score'] ?? '') : '',
                'ranking_label' => $ratingVisible ? (string) ($row['ranking_label'] ?? '') : '',
                'comments_to_official' => $notes['comments_to_official'],
                'strengths' => $notes['strengths'],
                'improvements' => $notes['improvements'],
                'recommendation' => $notes['recommendation'],
                'comments_to_admin' => $notes['comments_to_admin'],
                'scores' => $ratingVisible ? [
                    'Mechanics' => $row['mechanics_score'] ?? null,
                    'Judgment' => $row['judgment_score'] ?? null,
                    'Communication' => $row['communication_score'] ?? null,
                    'Professionalism' => $row['professionalism_score'] ?? null,
                    'Rules Knowledge' => $row['rules_score'] ?? null,
                    'Positioning' => $row['positioning_score'] ?? null,
                ] : null,
            ];
        }

        return array_slice($evaluations, 0, 25);
    } catch (Throwable $error) {
        error_log('RTBO official evaluation lookup failed: ' . $error->getMessage());
        return [];
    }
}

function rtbo_official_school_ranking(int $officialId): ?array
{
    try {
        $columns = rtbo_table_columns('evaluations');
        if (!rtbo_columns_exist($columns, ['official_id', 'total_score', 'created_at']) || !in_array('evaluation_type', $columns, true)) {
            return null;
        }

        $ratingFilter = in_array('rating_visible', $columns, true) ? 'AND (rating_visible = 1 OR rating_visible IS NULL)' : '';
        $nameSelect = in_array('official_name', $columns, true) ? 'MAX(official_name) AS official_name' : "'' AS official_name";

        $stmt = db()->prepare(
            "SELECT
                official_id,
                {$nameSelect},
                AVG(total_score) AS average_score,
                COUNT(*) AS evaluation_count,
                MAX(created_at) AS updated_at
             FROM evaluations
             WHERE official_id IS NOT NULL
               AND official_id > 0
               AND evaluation_type = 'school'
               AND total_score IS NOT NULL
               AND total_score > 0
               {$ratingFilter}
             GROUP BY official_id
             ORDER BY average_score DESC, evaluation_count DESC, updated_at ASC, official_id ASC"
        );
        $stmt->execute();

        $rows = $stmt->fetchAll();
        $totalOfficials = count($rows);
        if ($totalOfficials === 0) {
            return null;
        }

        $rank = 0;
        $position = 0;
        $previousScore = null;
        foreach ($rows as $row) {
            $position++;
            $averageScore = (float) ($row['average_score'] ?? 0);
            if ($previousScore === null || abs($averageScore - $previousScore) > 0.0001) {
                $rank = $position;
                $previousScore = $averageScore;
            }

            if ((int) ($row['official_id'] ?? 0) === $officialId) {
                return [
                    'rank' => $rank,
                    'total_officials' => $totalOfficials,
                    'average_score' => round($averageScore, 2),
                    'evaluation_count' => (int) ($row['evaluation_count'] ?? 0),
                    'ranking_label' => rtbo_profile_evaluation_rank_label($averageScore),
                    'updated_at' => (string) ($row['updated_at'] ?? ''),
                ];
            }
        }

        return null;
    } catch (Throwable $error) {
        error_log('RTBO official school ranking lookup failed: ' . $error->getMessage());
        return null;
    }
}

function rtbo_official_availability(int $officialId): array
{
    foreach (['official_availability', 'availability'] as $table) {
        try {
            $columns = rtbo_table_columns($table);
            if (!in_array('official_id', $columns, true)) {
                continue;
            }

            $dateColumn = null;
            foreach (['availability_date', 'date', 'available_date'] as $candidate) {
                if (in_array($candidate, $columns, true)) {
                    $dateColumn = $candidate;
                    break;
                }
            }
            if ($dateColumn === null) {
                continue;
            }

            $statusSelect = in_array('status', $columns, true) ? 'status' : "'' AS status";
            $reasonSelect = in_array('reason', $columns, true) ? 'reason' : "'' AS reason";
            $notesSelect = in_array('notes', $columns, true) ? 'notes' : "'' AS notes";
            $gameSchoolSelect = in_array('game_school', $columns, true) ? 'game_school' : "'' AS game_school";
            $gameLocationSelect = in_array('game_location', $columns, true) ? 'game_location' : (in_array('game_city', $columns, true) ? 'game_city AS game_location' : "'' AS game_location");
            $gameTimeSelect = in_array('game_time', $columns, true) ? 'game_time' : "'' AS game_time";
            $gameCitySelect = in_array('game_city', $columns, true) ? 'game_city' : "'' AS game_city";
            $supervisorSelect = in_array('supervisor', $columns, true) ? 'supervisor' : "'' AS supervisor";
            $contactRequiredSelect = in_array('contact_required', $columns, true) ? 'contact_required' : '0 AS contact_required';
            $createdSelect = in_array('created_at', $columns, true) ? 'created_at' : "{$dateColumn} AS created_at";

            $stmt = db()->prepare(
                "SELECT id, {$dateColumn} AS availability_date, {$statusSelect}, {$reasonSelect}, {$gameSchoolSelect}, {$gameLocationSelect}, {$gameTimeSelect}, {$gameCitySelect}, {$supervisorSelect}, {$notesSelect}, {$contactRequiredSelect}, {$createdSelect}
                 FROM {$table}
                 WHERE official_id = ?
                 ORDER BY {$dateColumn} DESC
                 LIMIT 40"
            );
            $stmt->execute([$officialId]);

            return array_map(static fn (array $row): array => [
                'id' => (int) ($row['id'] ?? 0),
                'date' => (string) ($row['availability_date'] ?? ''),
                'status' => (string) ($row['status'] ?? ''),
                'reason' => (string) ($row['reason'] ?? ''),
                'game_school' => (string) ($row['game_school'] ?? ''),
                'game_location' => (string) ($row['game_location'] ?? $row['game_city'] ?? ''),
                'game_time' => (string) ($row['game_time'] ?? ''),
                'game_city' => (string) ($row['game_city'] ?? ''),
                'supervisor' => (string) ($row['supervisor'] ?? ''),
                'notes' => (string) ($row['notes'] ?? ''),
                'contact_required' => (bool) ((int) ($row['contact_required'] ?? 0)),
                'created_at' => (string) ($row['created_at'] ?? ''),
            ], $stmt->fetchAll());
        } catch (Throwable $error) {
            error_log("RTBO official availability lookup failed for {$table}: " . $error->getMessage());
        }
    }

    return [];
}

function rtbo_official_game_reports(int $officialId): array
{
    $fallbackReports = static function () use ($officialId): array {
        $path = __DIR__ . '/storage/game-reports.json';
        if (!is_file($path)) {
            return [];
        }

        $reports = json_decode((string) file_get_contents($path), true);
        if (!is_array($reports)) {
            return [];
        }

        $reports = array_values(array_filter($reports, static fn (array $report): bool => (int) ($report['official_id'] ?? 0) === $officialId));
        usort($reports, static fn (array $a, array $b): int => strcmp((string) ($b['created_at'] ?? ''), (string) ($a['created_at'] ?? '')));
        return array_slice($reports, 0, 40);
    };

    try {
        $columns = rtbo_table_columns('game_reports');
        if (!in_array('official_id', $columns, true)) {
            return $fallbackReports();
        }

        $gameSelect = in_array('game_id', $columns, true) ? 'game_id' : '0 AS game_id';
        $assignmentSelect = in_array('assignment_id', $columns, true) ? 'assignment_id' : '0 AS assignment_id';
        $ruleSetSelect = in_array('rule_set', $columns, true) ? 'rule_set' : "'' AS rule_set";
        $gameDateSelect = in_array('game_date', $columns, true) ? 'game_date' : 'created_at AS game_date';
        $gameSiteSelect = in_array('game_site', $columns, true) ? 'game_site' : "'' AS game_site";
        $gameLevelSelect = in_array('game_level', $columns, true) ? 'game_level' : "'' AS game_level";
        $homeTeamSelect = in_array('home_team', $columns, true) ? 'home_team' : "'' AS home_team";
        $visitingTeamSelect = in_array('visiting_team', $columns, true) ? 'visiting_team' : "'' AS visiting_team";
        $homeScoreSelect = in_array('home_score', $columns, true) ? 'home_score' : 'NULL AS home_score';
        $visitingScoreSelect = in_array('visiting_score', $columns, true) ? 'visiting_score' : 'NULL AS visiting_score';
        $finalScoreSelect = in_array('final_score', $columns, true) ? 'final_score' : "'' AS final_score";
        $tableSelect = in_array('table_performance', $columns, true) ? 'table_performance' : "'' AS table_performance";
        $dressingRoomSelect = in_array('dressing_room_condition', $columns, true) ? 'dressing_room_condition' : "'' AS dressing_room_condition";
        $incidentsSelect = in_array('incidents_json', $columns, true) ? 'incidents_json' : "'[]' AS incidents_json";
        $statusSelect = in_array('status', $columns, true) ? 'status' : "'' AS status";
        $notesSelect = in_array('notes', $columns, true) ? 'notes' : "'' AS notes";
        $createdSelect = in_array('created_at', $columns, true) ? 'created_at' : 'NOW() AS created_at';

        $stmt = db()->prepare(
            "SELECT id, {$gameSelect}, {$assignmentSelect}, {$ruleSetSelect}, {$gameDateSelect}, {$gameSiteSelect}, {$gameLevelSelect},
                    {$homeTeamSelect}, {$visitingTeamSelect}, {$homeScoreSelect}, {$visitingScoreSelect}, {$finalScoreSelect},
                    {$tableSelect}, {$dressingRoomSelect}, {$incidentsSelect}, {$statusSelect}, {$notesSelect}, {$createdSelect}
             FROM game_reports
             WHERE official_id = ?
             ORDER BY created_at DESC
             LIMIT 40"
        );
        $stmt->execute([$officialId]);

        return array_map(static function (array $row): array {
            $incidents = json_decode((string) ($row['incidents_json'] ?? '[]'), true);
            return [
                'id' => (int) ($row['id'] ?? 0),
                'game_id' => (int) ($row['game_id'] ?? 0),
                'assignment_id' => (int) ($row['assignment_id'] ?? 0),
                'rule_set' => (string) ($row['rule_set'] ?? ''),
                'game_date' => (string) ($row['game_date'] ?? ''),
                'game_site' => (string) ($row['game_site'] ?? ''),
                'game_level' => (string) ($row['game_level'] ?? ''),
                'home_team' => (string) ($row['home_team'] ?? ''),
                'visiting_team' => (string) ($row['visiting_team'] ?? ''),
                'home_score' => $row['home_score'] ?? null,
                'visiting_score' => $row['visiting_score'] ?? null,
                'final_score' => (string) ($row['final_score'] ?? ''),
                'table_performance' => (string) ($row['table_performance'] ?? ''),
                'dressing_room_condition' => (string) ($row['dressing_room_condition'] ?? ''),
                'incidents' => is_array($incidents) ? $incidents : [],
                'status' => (string) ($row['status'] ?? ''),
                'notes' => (string) ($row['notes'] ?? ''),
                'created_at' => (string) ($row['created_at'] ?? ''),
            ];
        }, $stmt->fetchAll());
    } catch (Throwable $error) {
        error_log('RTBO official game report lookup failed: ' . $error->getMessage());
        return $fallbackReports();
    }
}

function rtbo_observer_forms(int $observerId): array
{
    $fallbackForms = static function () use ($observerId): array {
        $path = __DIR__ . '/storage/observer-forms.json';
        if (!is_file($path)) {
            return [];
        }

        $forms = json_decode((string) file_get_contents($path), true);
        if (!is_array($forms)) {
            return [];
        }

        $forms = array_values(array_filter($forms, static fn (array $form): bool => (int) ($form['observer_id'] ?? 0) === $observerId));
        usort($forms, static fn (array $a, array $b): int => strcmp((string) ($b['created_at'] ?? ''), (string) ($a['created_at'] ?? '')));
        return array_slice($forms, 0, 40);
    };

    try {
        $columns = rtbo_table_columns('observer_forms');
        if (!in_array('observer_id', $columns, true)) {
            return $fallbackForms();
        }

        $observationTypeSelect = in_array('observation_type', $columns, true) ? 'observation_type' : "'live_game' AS observation_type";
        $gameDateSelect = in_array('game_date', $columns, true) ? 'game_date' : 'created_at AS game_date';
        $gameLevelSelect = in_array('game_level', $columns, true) ? 'game_level' : "'' AS game_level";
        $gameSiteSelect = in_array('game_site', $columns, true) ? 'game_site' : "'' AS game_site";
        $homeTeamSelect = in_array('home_team', $columns, true) ? 'home_team' : "'' AS home_team";
        $visitingTeamSelect = in_array('visiting_team', $columns, true) ? 'visiting_team' : "'' AS visiting_team";
        $crewChiefSelect = in_array('crew_chief', $columns, true) ? 'crew_chief' : "'' AS crew_chief";
        $official2Select = in_array('official2_name', $columns, true) ? 'official2_name' : "'' AS official2_name";
        $official3Select = in_array('official3_name', $columns, true) ? 'official3_name' : "'' AS official3_name";
        $finalScoreSelect = in_array('final_score', $columns, true) ? 'final_score' : '0 AS final_score';
        $crewRankingSelect = in_array('crew_ranking', $columns, true) ? 'crew_ranking' : "'' AS crew_ranking";
        $scoresSelect = in_array('scores_json', $columns, true) ? 'scores_json' : "'{}' AS scores_json";
        $statusSelect = in_array('status', $columns, true) ? 'status' : "'' AS status";
        $createdSelect = in_array('created_at', $columns, true) ? 'created_at' : 'NOW() AS created_at';

        $stmt = db()->prepare(
            "SELECT id, {$observationTypeSelect}, {$gameDateSelect}, {$gameLevelSelect}, {$gameSiteSelect},
                    {$homeTeamSelect}, {$visitingTeamSelect}, {$crewChiefSelect}, {$official2Select}, {$official3Select},
                    {$finalScoreSelect}, {$crewRankingSelect}, {$scoresSelect}, {$statusSelect}, {$createdSelect}
             FROM observer_forms
             WHERE observer_id = ?
             ORDER BY created_at DESC
             LIMIT 40"
        );
        $stmt->execute([$observerId]);

        return array_map(static function (array $row): array {
            $scores = json_decode((string) ($row['scores_json'] ?? '{}'), true);
            return [
                'id' => (int) ($row['id'] ?? 0),
                'observation_type' => (string) ($row['observation_type'] ?? ''),
                'game_date' => (string) ($row['game_date'] ?? ''),
                'game_level' => (string) ($row['game_level'] ?? ''),
                'game_site' => (string) ($row['game_site'] ?? ''),
                'home_team' => (string) ($row['home_team'] ?? ''),
                'visiting_team' => (string) ($row['visiting_team'] ?? ''),
                'crew_chief' => (string) ($row['crew_chief'] ?? ''),
                'official2_name' => (string) ($row['official2_name'] ?? ''),
                'official3_name' => (string) ($row['official3_name'] ?? ''),
                'final_score' => (float) ($row['final_score'] ?? 0),
                'crew_ranking' => (string) ($row['crew_ranking'] ?? ''),
                'scores' => is_array($scores) ? $scores : [],
                'status' => (string) ($row['status'] ?? ''),
                'created_at' => (string) ($row['created_at'] ?? ''),
            ];
        }, $stmt->fetchAll());
    } catch (Throwable $error) {
        error_log('RTBO observer form lookup failed: ' . $error->getMessage());
        return $fallbackForms();
    }
}

function rtbo_official_film_clips(int $officialId): array
{
    foreach (['game_film', 'game_films', 'film_clips'] as $table) {
        try {
            $columns = rtbo_table_columns($table);
            if (!in_array('official_id', $columns, true)) {
                continue;
            }

            $titleSelect = in_array('title', $columns, true) ? 'title' : "'' AS title";
            $urlSelect = in_array('file_url', $columns, true) ? 'file_url' : (in_array('url', $columns, true) ? 'url AS file_url' : "'' AS file_url");
            $notesSelect = in_array('notes', $columns, true) ? 'notes' : "'' AS notes";
            $createdSelect = in_array('created_at', $columns, true) ? 'created_at' : 'NOW() AS created_at';

            $stmt = db()->prepare(
                "SELECT id, {$titleSelect}, {$urlSelect}, {$notesSelect}, {$createdSelect}
                 FROM {$table}
                 WHERE official_id = ?
                 ORDER BY created_at DESC
                 LIMIT 40"
            );
            $stmt->execute([$officialId]);

            return array_map(static fn (array $row): array => [
                'id' => (int) ($row['id'] ?? 0),
                'title' => (string) ($row['title'] ?? ''),
                'file_url' => (string) ($row['file_url'] ?? ''),
                'notes' => (string) ($row['notes'] ?? ''),
                'created_at' => (string) ($row['created_at'] ?? ''),
            ], $stmt->fetchAll());
        } catch (Throwable $error) {
            error_log("RTBO official film lookup failed for {$table}: " . $error->getMessage());
        }
    }

    return [];
}

$user = rtbo_current_profile_user();
if (!$user) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Please sign in to view your official profile.']);
    exit;
}

$publicUser = public_auth_user($user);
$officialId = (int) $publicUser['id'];

echo json_encode([
    'success' => true,
    'user' => $publicUser,
    'assignments' => $officialId > 0 ? rtbo_official_assignments($officialId) : [],
    'tba_games' => $officialId > 0 ? admin_game_tba_open_games_for_official($officialId) : [],
    'availability' => $officialId > 0 ? rtbo_official_availability($officialId) : [],
    'game_reports' => $officialId > 0 ? rtbo_official_game_reports($officialId) : [],
    'observer_forms' => $officialId > 0 ? rtbo_observer_forms($officialId) : [],
    'film_clips' => $officialId > 0 ? rtbo_official_film_clips($officialId) : [],
    'evaluations' => $officialId > 0 ? rtbo_official_evaluations($officialId) : [],
    'school_ranking' => $officialId > 0 ? rtbo_official_school_ranking($officialId) : null,
    'geo_location' => $officialId > 0 ? rtbo_geo_location_for_user($officialId) : null,
    'arrival_statuses' => $officialId > 0 ? rtbo_geo_arrival_statuses_for_official($officialId) : [],
    ...rtbo_notifications_payload($publicUser),
], JSON_UNESCAPED_SLASHES);

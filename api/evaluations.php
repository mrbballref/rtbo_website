<?php
declare(strict_types=1);

require_once __DIR__ . '/includes/bootstrap.php';
require_once __DIR__ . '/includes/users.php';
require_once __DIR__ . '/includes/admin-members.php';
require_once __DIR__ . '/includes/notifications.php';

header('Content-Type: application/json');

function rtbo_evaluations_input(): array
{
    $raw = file_get_contents('php://input') ?: '';
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

function rtbo_evaluations_columns(string $table): array
{
    $stmt = db()->prepare(
        "SELECT COLUMN_NAME
         FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = ?"
    );
    $stmt->execute([$table]);
    return array_map('strval', $stmt->fetchAll(PDO::FETCH_COLUMN));
}

function rtbo_evaluations_add_column_if_missing(array $columns, string $column, string $sql): array
{
    if (!in_array($column, $columns, true)) {
        db()->exec($sql);
        $columns[] = $column;
    }

    return $columns;
}

function rtbo_ensure_evaluations_table(): void
{
    db()->exec(
        "CREATE TABLE IF NOT EXISTS evaluations (
          id INT AUTO_INCREMENT PRIMARY KEY,
          game_id INT NULL,
          evaluator_id INT NULL,
          official_id INT NULL,
          mechanics_score INT NULL,
          judgment_score INT NULL,
          communication_score INT NULL,
          professionalism_score INT NULL,
          rules_score INT NULL,
          positioning_score INT NULL,
          total_score DECIMAL(6,2) NULL,
          rating_visible TINYINT(1) NOT NULL DEFAULT 1,
          comments_to_official TEXT NULL,
          comments_to_admin TEXT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_evaluations_official (official_id),
          INDEX idx_evaluations_evaluator (evaluator_id),
          INDEX idx_evaluations_created (created_at)
        )"
    );

    $columns = rtbo_evaluations_columns('evaluations');
    $columns = rtbo_evaluations_add_column_if_missing($columns, 'official_name', 'ALTER TABLE evaluations ADD COLUMN official_name VARCHAR(190) NULL AFTER official_id');
    $columns = rtbo_evaluations_add_column_if_missing($columns, 'official_email', 'ALTER TABLE evaluations ADD COLUMN official_email VARCHAR(190) NULL AFTER official_name');
    $columns = rtbo_evaluations_add_column_if_missing($columns, 'evaluator_name', 'ALTER TABLE evaluations ADD COLUMN evaluator_name VARCHAR(190) NULL AFTER evaluator_id');
    $columns = rtbo_evaluations_add_column_if_missing($columns, 'game_date', 'ALTER TABLE evaluations ADD COLUMN game_date DATE NULL AFTER game_id');
    $columns = rtbo_evaluations_add_column_if_missing($columns, 'location', 'ALTER TABLE evaluations ADD COLUMN location VARCHAR(190) NULL AFTER game_date');
    $columns = rtbo_evaluations_add_column_if_missing($columns, 'home_team', 'ALTER TABLE evaluations ADD COLUMN home_team VARCHAR(190) NULL AFTER location');
    $columns = rtbo_evaluations_add_column_if_missing($columns, 'visiting_team', 'ALTER TABLE evaluations ADD COLUMN visiting_team VARCHAR(190) NULL AFTER home_team');
    $columns = rtbo_evaluations_add_column_if_missing($columns, 'level', 'ALTER TABLE evaluations ADD COLUMN level VARCHAR(120) NULL AFTER visiting_team');
    $columns = rtbo_evaluations_add_column_if_missing($columns, 'crew_position', 'ALTER TABLE evaluations ADD COLUMN crew_position VARCHAR(80) NULL AFTER level');
    $columns = rtbo_evaluations_add_column_if_missing($columns, 'evaluation_type', "ALTER TABLE evaluations ADD COLUMN evaluation_type VARCHAR(40) NOT NULL DEFAULT 'regular_season' AFTER crew_position");
    $columns = rtbo_evaluations_add_column_if_missing($columns, 'game_type', 'ALTER TABLE evaluations ADD COLUMN game_type VARCHAR(80) NULL AFTER evaluation_type');
    $columns = rtbo_evaluations_add_column_if_missing($columns, 'ranking_label', 'ALTER TABLE evaluations ADD COLUMN ranking_label VARCHAR(120) NULL AFTER total_score');
    $columns = rtbo_evaluations_add_column_if_missing($columns, 'percentage_score', 'ALTER TABLE evaluations ADD COLUMN percentage_score DECIMAL(6,2) NULL AFTER total_score');
    $columns = rtbo_evaluations_add_column_if_missing($columns, 'scores_json', 'ALTER TABLE evaluations ADD COLUMN scores_json MEDIUMTEXT NULL AFTER comments_to_admin');
    $columns = rtbo_evaluations_add_column_if_missing($columns, 'category_scores_json', 'ALTER TABLE evaluations ADD COLUMN category_scores_json MEDIUMTEXT NULL AFTER scores_json');
    $columns = rtbo_evaluations_add_column_if_missing($columns, 'strengths', 'ALTER TABLE evaluations ADD COLUMN strengths TEXT NULL AFTER category_scores_json');
    $columns = rtbo_evaluations_add_column_if_missing($columns, 'improvements', 'ALTER TABLE evaluations ADD COLUMN improvements TEXT NULL AFTER strengths');
    $columns = rtbo_evaluations_add_column_if_missing($columns, 'recommendation', 'ALTER TABLE evaluations ADD COLUMN recommendation TEXT NULL AFTER improvements');
    $columns = rtbo_evaluations_add_column_if_missing($columns, 'strengths_visible', 'ALTER TABLE evaluations ADD COLUMN strengths_visible TINYINT(1) NOT NULL DEFAULT 1 AFTER rating_visible');
    $columns = rtbo_evaluations_add_column_if_missing($columns, 'improvements_visible', 'ALTER TABLE evaluations ADD COLUMN improvements_visible TINYINT(1) NOT NULL DEFAULT 1 AFTER strengths_visible');
    $columns = rtbo_evaluations_add_column_if_missing($columns, 'recommendation_visible', 'ALTER TABLE evaluations ADD COLUMN recommendation_visible TINYINT(1) NOT NULL DEFAULT 1 AFTER improvements_visible');
    rtbo_evaluations_add_column_if_missing($columns, 'admin_comments_visible', 'ALTER TABLE evaluations ADD COLUMN admin_comments_visible TINYINT(1) NOT NULL DEFAULT 0 AFTER recommendation_visible');
}

function rtbo_public_official_options(): array
{
    $officials = array_values(array_filter(
        admin_members_list(),
        static fn (array $member): bool => ($member['role'] ?? '') === 'official'
            && ($member['status'] ?? 'active') !== 'deleted'
    ));

    usort($officials, static function (array $a, array $b): int {
        return strcmp(
            strtolower(trim((string) ($a['last_name'] ?? '') . ' ' . (string) ($a['first_name'] ?? '') . ' ' . (string) ($a['email'] ?? ''))),
            strtolower(trim((string) ($b['last_name'] ?? '') . ' ' . (string) ($b['first_name'] ?? '') . ' ' . (string) ($b['email'] ?? '')))
        );
    });

    return array_map(static function (array $official): array {
        $name = trim((string) ($official['first_name'] ?? '') . ' ' . (string) ($official['last_name'] ?? ''));
        return [
            'id' => (int) $official['id'],
            'name' => $name !== '' ? $name : (string) ($official['email'] ?? 'Official'),
            'email' => (string) ($official['email'] ?? ''),
            'status' => (string) ($official['status'] ?? 'active'),
        ];
    }, $officials);
}

function rtbo_find_official_record(array $meta): ?array
{
    $officialId = (int) ($meta['officialId'] ?? $meta['official_id'] ?? 0);
    $email = strtolower(trim((string) ($meta['officialEmail'] ?? '')));

    foreach (rtbo_public_official_options() as $official) {
        $sameId = $officialId > 0 && (int) ($official['id'] ?? 0) === $officialId;
        $sameEmail = $email !== '' && strtolower((string) ($official['email'] ?? '')) === $email;
        if ($sameId || $sameEmail) {
            return $official;
        }
    }

    return null;
}

function rtbo_average_category(array $scores, string $categoryId): float
{
    $values = array_values(array_filter(array_map('floatval', (array) ($scores[$categoryId] ?? [])), static fn (float $value): bool => $value > 0));
    if (!$values) {
        return 0.0;
    }

    return array_sum($values) / count($values);
}

function rtbo_normalize_evaluation_type(string $value): string
{
    $value = strtolower(trim(str_replace(['-', ' '], '_', $value)));
    return in_array($value, ['school', 'school_evaluation'], true) ? 'school' : 'regular_season';
}

function rtbo_normalize_game_type(string $value): string
{
    $value = strtolower(trim(str_replace(['-', ' '], '_', $value)));
    $allowed = [
        'non_conference' => 'non_conference',
        'conference' => 'conference',
        'tournament' => 'tournament',
        'tournament_final_four' => 'tournament_final_four',
        'final' => 'final',
    ];

    return $allowed[$value] ?? '';
}

function rtbo_note_visible(array $notes, string $key, bool $default): bool
{
    if (array_key_exists($key, $notes)) {
        return !empty($notes[$key]);
    }

    return $default;
}

function rtbo_evaluation_comments_to_official(array $notes, array $visibility): string
{
    $parts = [];
    foreach ([
        'strengths' => ['Strengths', $notes['strengths'] ?? ''],
        'improvements' => ['Areas For Improvement', $notes['improvements'] ?? ''],
        'recommendation' => ['Recommendation', $notes['recommendation'] ?? ''],
    ] as $key => [$label, $value]) {
        $value = trim((string) $value);
        if (!empty($visibility[$key]) && $value !== '') {
            $parts[] = "{$label}: {$value}";
        }
    }

    return implode("\n\n", $parts);
}

$databaseUser = current_database_user();
$user = $databaseUser ? public_auth_user($databaseUser) : current_user();
if (!$user) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Sign-in is required.']);
    exit;
}

$method = strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET'));
$allowedRoles = ['super_admin', 'admin', 'evaluator', 'observer'];
if (!in_array((string) ($user['role'] ?? ''), $allowedRoles, true)) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Evaluation access is reserved for Super Admin, admins, evaluators, and observers.']);
    exit;
}

try {
    if ($method === 'GET') {
        echo json_encode(['success' => true, 'officials' => rtbo_public_official_options()], JSON_UNESCAPED_SLASHES);
        exit;
    }

    if ($method !== 'POST') {
        http_response_code(405);
        echo json_encode(['success' => false, 'message' => 'Unsupported evaluation request method.']);
        exit;
    }

    require_same_origin_request();
    $input = rtbo_evaluations_input();
    $action = (string) ($input['action'] ?? 'create');
    if ($action !== 'create') {
        throw new RuntimeException('Unsupported evaluation action.');
    }

    rtbo_ensure_evaluations_table();

    $meta = (array) ($input['meta'] ?? []);
    $scores = (array) ($input['scores'] ?? []);
    $summary = (array) ($input['summary'] ?? []);
    $notes = (array) ($input['notes'] ?? []);
    $official = rtbo_find_official_record($meta);
    if (!$official) {
        throw new RuntimeException('Select an official from the official database before submitting this evaluation.');
    }

    $evaluationType = rtbo_normalize_evaluation_type((string) ($meta['evaluationType'] ?? $meta['evaluation_type'] ?? 'regular_season'));
    $gameType = $evaluationType === 'regular_season'
        ? rtbo_normalize_game_type((string) ($meta['gameType'] ?? $meta['game_type'] ?? ''))
        : '';
    if ($evaluationType === 'regular_season' && $gameType === '') {
        throw new RuntimeException('Select a regular-season game type before submitting this evaluation.');
    }

    $officialId = (int) ($official['id'] ?? 0);
    $officialName = trim((string) ($official['name'] ?? ''));
    $officialEmail = trim((string) ($official['email'] ?? ''));
    $visibility = [
        'strengths' => rtbo_note_visible($notes, 'strengthsVisible', true),
        'improvements' => rtbo_note_visible($notes, 'improvementsVisible', true),
        'recommendation' => rtbo_note_visible($notes, 'recommendationVisible', true),
        'admin_comments' => rtbo_note_visible($notes, 'adminCommentsVisible', false),
        'rating' => array_key_exists('ratingVisible', $notes)
            ? !empty($notes['ratingVisible'])
            : (array_key_exists('visibleToOfficial', $notes) ? !empty($notes['visibleToOfficial']) : true),
    ];
    $commentsToOfficial = rtbo_evaluation_comments_to_official($notes, $visibility);
    $commentsToAdmin = trim((string) ($notes['commentsToAdmin'] ?? ''));
    $ratingVisible = !empty($visibility['rating']) ? 1 : 0;
    $strengthsVisible = !empty($visibility['strengths']) ? 1 : 0;
    $improvementsVisible = !empty($visibility['improvements']) ? 1 : 0;
    $recommendationVisible = !empty($visibility['recommendation']) ? 1 : 0;
    $adminCommentsVisible = !empty($visibility['admin_comments']) ? 1 : 0;

    $stmt = db()->prepare(
        "INSERT INTO evaluations (
            game_date, evaluator_id, evaluator_name, official_id, official_name, official_email,
            location, home_team, visiting_team, level, crew_position, evaluation_type, game_type,
            mechanics_score, judgment_score, communication_score, professionalism_score, rules_score, positioning_score,
            total_score, percentage_score, ranking_label, rating_visible, strengths_visible, improvements_visible, recommendation_visible, admin_comments_visible,
            comments_to_official, comments_to_admin, scores_json, category_scores_json,
            strengths, improvements, recommendation
        ) VALUES (
            ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?,
            ?, ?, ?
        )"
    );

    $stmt->execute([
        ($meta['gameDate'] ?? '') !== '' ? (string) $meta['gameDate'] : null,
        (int) ($user['id'] ?? 0) ?: null,
        trim((string) ($meta['evaluatorName'] ?? $user['name'] ?? 'Evaluator')),
        $officialId,
        $officialName,
        $officialEmail,
        trim((string) ($meta['location'] ?? '')),
        trim((string) ($meta['homeTeam'] ?? '')),
        trim((string) ($meta['visitingTeam'] ?? '')),
        trim((string) ($meta['level'] ?? '')),
        trim((string) ($meta['crewPosition'] ?? '')),
        $evaluationType,
        $gameType,
        (int) round(rtbo_average_category($scores, 'mechanics')),
        (int) round(rtbo_average_category($scores, 'management')),
        (int) round(rtbo_average_category($scores, 'communication')),
        (int) round(rtbo_average_category($scores, 'professionalism')),
        (int) round(rtbo_average_category($scores, 'rules')),
        (int) round(rtbo_average_category($scores, 'mechanics')),
        (float) ($summary['weightedAverage'] ?? 0),
        (float) ($summary['percentageScore'] ?? 0),
        trim((string) ($summary['ranking'] ?? '')),
        $ratingVisible,
        $strengthsVisible,
        $improvementsVisible,
        $recommendationVisible,
        $adminCommentsVisible,
        $commentsToOfficial,
        $commentsToAdmin,
        json_encode($scores, JSON_UNESCAPED_SLASHES),
        json_encode((array) ($summary['categoryScores'] ?? []), JSON_UNESCAPED_SLASHES),
        trim((string) ($notes['strengths'] ?? '')),
        trim((string) ($notes['improvements'] ?? '')),
        trim((string) ($notes['recommendation'] ?? '')),
    ]);

    $id = (int) db()->lastInsertId();
    $evaluation = [
        'id' => $id,
        'official_id' => $officialId,
        'official_name' => $officialName,
        'official_email' => $officialEmail,
        'total_score' => (string) ($summary['weightedAverage'] ?? ''),
        'ranking_label' => (string) ($summary['ranking'] ?? ''),
        'evaluation_type' => $evaluationType,
        'game_type' => $gameType,
        'comments_to_official' => $commentsToOfficial,
    ];

    $hasVisibleRelease = $ratingVisible || ($strengthsVisible && trim((string) ($notes['strengths'] ?? '')) !== '')
        || ($improvementsVisible && trim((string) ($notes['improvements'] ?? '')) !== '')
        || ($recommendationVisible && trim((string) ($notes['recommendation'] ?? '')) !== '')
        || ($adminCommentsVisible && $commentsToAdmin !== '');

    if ($officialId && $hasVisibleRelease) {
        $notificationBody = $ratingVisible
            ? "A new evaluation is available on your profile. Ranking: {$evaluation['ranking_label']}."
            : 'A new evaluation note is available on your profile.';
        rtbo_notification_create([
            'audience' => 'user',
            'target_user_id' => $officialId,
            'type' => 'evaluation_available',
            'title' => 'Evaluation available',
            'body' => $notificationBody,
            'related_type' => 'evaluation',
            'related_id' => $id,
            'metadata' => ['evaluation' => $evaluation],
            'actor' => $user,
        ]);
    }

    rtbo_notify_admins([
        'type' => 'evaluation_form_submitted',
        'title' => 'Evaluator form completed',
        'body' => trim((string) ($meta['evaluatorName'] ?? $user['name'] ?? 'An evaluator')) . ' completed an evaluation for ' . $officialName . '.',
        'related_type' => 'evaluation',
        'related_id' => $id,
        'metadata' => [
            'evaluation_id' => $id,
            'official_id' => $officialId,
            'official_name' => $officialName,
            'official_email' => $officialEmail,
            'evaluation_type' => $evaluationType,
            'game_type' => $gameType,
            'total_score' => $evaluation['total_score'],
            'ranking_label' => $evaluation['ranking_label'],
        ],
        'actor' => $user,
    ]);

    echo json_encode([
        'success' => true,
        'evaluation' => $evaluation,
        'message' => $officialId
            ? 'Evaluation saved and linked to the official profile.'
            : 'Evaluation saved. Add the official email to link future evaluations directly to their profile.',
    ], JSON_UNESCAPED_SLASHES);
} catch (Throwable $error) {
    error_log('RTBO evaluation action failed: ' . $error->getMessage());
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => $error->getMessage()]);
}

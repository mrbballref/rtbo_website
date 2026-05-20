<?php
declare(strict_types=1);

require_once __DIR__ . '/includes/bootstrap.php';
require_once __DIR__ . '/includes/users.php';

header('Content-Type: application/json');

function rtbo_completed_table_columns(string $table): array
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
        error_log("RTBO completed forms column lookup failed for {$table}: " . $error->getMessage());

        return [];
    }
}

function rtbo_completed_table_exists(string $table): bool
{
    try {
        $stmt = db()->prepare(
            "SELECT COUNT(*)
             FROM information_schema.TABLES
             WHERE TABLE_SCHEMA = DATABASE()
               AND TABLE_NAME = ?"
        );
        $stmt->execute([$table]);

        return (int) $stmt->fetchColumn() > 0;
    } catch (Throwable $error) {
        error_log("RTBO completed forms table lookup failed for {$table}: " . $error->getMessage());

        return false;
    }
}

function rtbo_completed_column(array $columns, string $tableAlias, string $column, ?string $alias = null): string
{
    $safeAlias = $alias ?: $column;
    if (in_array($column, $columns, true)) {
        return "{$tableAlias}.{$column} AS {$safeAlias}";
    }

    return "NULL AS {$safeAlias}";
}

function rtbo_completed_text(array $source, string ...$keys): string
{
    foreach ($keys as $key) {
        $value = trim((string) ($source[$key] ?? ''));
        if ($value !== '') {
            return $value;
        }
    }

    return '';
}

function rtbo_completed_number(array $source, string ...$keys): float
{
    foreach ($keys as $key) {
        $value = $source[$key] ?? null;
        if ($value !== null && $value !== '') {
            return (float) $value;
        }
    }

    return 0.0;
}

function rtbo_completed_json_decode(mixed $value): array
{
    if (is_array($value)) {
        return $value;
    }

    $decoded = json_decode((string) $value, true);

    return is_array($decoded) ? $decoded : [];
}

function rtbo_completed_read_storage(string $filename): array
{
    $path = STORAGE_DIR . '/' . $filename;
    if (!is_file($path)) {
        return [];
    }

    $data = json_decode((string) file_get_contents($path), true);

    return is_array($data) ? $data : [];
}

function rtbo_completed_sort(array $records): array
{
    usort($records, static function (array $a, array $b): int {
        return strcmp((string) ($b['created_at'] ?? ''), (string) ($a['created_at'] ?? ''));
    });

    return array_values($records);
}

function rtbo_completed_game_report_record(array $row, string $source): array
{
    $crewName = rtbo_completed_text($row, 'official_name', 'referee_name', 'crew_chief', 'officialName', 'refereeName', 'crewChief');
    $homeTeam = rtbo_completed_text($row, 'home_team', 'homeTeam');
    $visitingTeam = rtbo_completed_text($row, 'visiting_team', 'visitingTeam');

    return [
        'id' => (int) ($row['id'] ?? 0),
        'source' => $source,
        'official_id' => (int) ($row['official_id'] ?? $row['officialId'] ?? 0),
        'official_name' => $crewName !== '' ? $crewName : 'Official',
        'title' => trim($visitingTeam . ($homeTeam !== '' && $visitingTeam !== '' ? ' at ' : '') . $homeTeam) ?: 'Game report',
        'game_date' => rtbo_completed_text($row, 'game_date', 'gameDate'),
        'game_site' => rtbo_completed_text($row, 'game_site', 'gameSite'),
        'game_level' => rtbo_completed_text($row, 'game_level', 'gameLevel'),
        'home_team' => $homeTeam,
        'visiting_team' => $visitingTeam,
        'final_score' => rtbo_completed_text($row, 'final_score', 'finalScore'),
        'rule_set' => rtbo_completed_text($row, 'rule_set', 'ruleSet'),
        'table_performance' => rtbo_completed_text($row, 'table_performance', 'tablePerformance'),
        'dressing_room_condition' => rtbo_completed_text($row, 'dressing_room_condition', 'dressingRoomCondition'),
        'crew_chief' => rtbo_completed_text($row, 'crew_chief', 'crewChief'),
        'official2_name' => rtbo_completed_text($row, 'official2_name', 'official2'),
        'official3_name' => rtbo_completed_text($row, 'official3_name', 'official3'),
        'incidents' => rtbo_completed_json_decode($row['incidents_json'] ?? $row['incidents'] ?? []),
        'notes' => rtbo_completed_text($row, 'notes'),
        'status' => rtbo_completed_text($row, 'status') ?: 'submitted',
        'created_at' => rtbo_completed_text($row, 'created_at', 'createdAt'),
    ];
}

function rtbo_completed_game_reports_from_database(): array
{
    $columns = rtbo_completed_table_columns('game_reports');
    if ($columns === []) {
        return [];
    }

    $usersAvailable = rtbo_completed_table_exists('users') && in_array('official_id', $columns, true);
    $join = $usersAvailable ? 'LEFT JOIN users u ON u.id = gr.official_id' : '';
    $officialName = $usersAvailable
        ? "TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))) AS official_name"
        : 'NULL AS official_name';
    $where = in_array('status', $columns, true) ? "WHERE COALESCE(gr.status, 'submitted') = 'submitted'" : '';
    $order = in_array('created_at', $columns, true) ? 'gr.created_at DESC' : 'gr.id DESC';
    $select = [
        rtbo_completed_column($columns, 'gr', 'id'),
        rtbo_completed_column($columns, 'gr', 'official_id'),
        $officialName,
        rtbo_completed_column($columns, 'gr', 'game_date'),
        rtbo_completed_column($columns, 'gr', 'game_site'),
        rtbo_completed_column($columns, 'gr', 'game_level'),
        rtbo_completed_column($columns, 'gr', 'home_team'),
        rtbo_completed_column($columns, 'gr', 'visiting_team'),
        rtbo_completed_column($columns, 'gr', 'final_score'),
        rtbo_completed_column($columns, 'gr', 'rule_set'),
        rtbo_completed_column($columns, 'gr', 'table_performance'),
        rtbo_completed_column($columns, 'gr', 'dressing_room_condition'),
        rtbo_completed_column($columns, 'gr', 'referee_name'),
        rtbo_completed_column($columns, 'gr', 'crew_chief'),
        rtbo_completed_column($columns, 'gr', 'official2_name'),
        rtbo_completed_column($columns, 'gr', 'official3_name'),
        rtbo_completed_column($columns, 'gr', 'incidents_json'),
        rtbo_completed_column($columns, 'gr', 'notes'),
        rtbo_completed_column($columns, 'gr', 'status'),
        rtbo_completed_column($columns, 'gr', 'created_at'),
    ];

    try {
        $stmt = db()->query('SELECT ' . implode(', ', $select) . " FROM game_reports gr {$join} {$where} ORDER BY {$order} LIMIT 250");

        return array_map(
            static fn (array $row): array => rtbo_completed_game_report_record($row, 'database'),
            $stmt->fetchAll()
        );
    } catch (Throwable $error) {
        error_log('RTBO completed game reports database query failed: ' . $error->getMessage());

        return [];
    }
}

function rtbo_completed_game_reports_from_storage(): array
{
    $reports = rtbo_completed_read_storage('game-reports.json');
    $submitted = array_values(array_filter($reports, static function (array $report): bool {
        return strtolower((string) ($report['status'] ?? 'submitted')) === 'submitted';
    }));

    return array_map(
        static fn (array $report): array => rtbo_completed_game_report_record($report, 'json_fallback'),
        $submitted
    );
}

function rtbo_completed_evaluation_record(array $row): array
{
    $homeTeam = rtbo_completed_text($row, 'home_team', 'homeTeam');
    $visitingTeam = rtbo_completed_text($row, 'visiting_team', 'visitingTeam');

    return [
        'id' => (int) ($row['id'] ?? 0),
        'source' => 'database',
        'evaluator_id' => (int) ($row['evaluator_id'] ?? 0),
        'evaluator_name' => rtbo_completed_text($row, 'evaluator_name') ?: 'Evaluator',
        'official_id' => (int) ($row['official_id'] ?? 0),
        'official_name' => rtbo_completed_text($row, 'official_name') ?: 'Official',
        'official_email' => rtbo_completed_text($row, 'official_email'),
        'title' => rtbo_completed_text($row, 'official_name') ?: 'Evaluation',
        'game_date' => rtbo_completed_text($row, 'game_date'),
        'location' => rtbo_completed_text($row, 'location'),
        'home_team' => $homeTeam,
        'visiting_team' => $visitingTeam,
        'level' => rtbo_completed_text($row, 'level'),
        'crew_position' => rtbo_completed_text($row, 'crew_position'),
        'evaluation_type' => rtbo_completed_text($row, 'evaluation_type') ?: 'regular_season',
        'game_type' => rtbo_completed_text($row, 'game_type'),
        'total_score' => rtbo_completed_number($row, 'total_score'),
        'percentage_score' => rtbo_completed_number($row, 'percentage_score'),
        'ranking_label' => rtbo_completed_text($row, 'ranking_label'),
        'strengths' => rtbo_completed_text($row, 'strengths'),
        'improvements' => rtbo_completed_text($row, 'improvements'),
        'recommendation' => rtbo_completed_text($row, 'recommendation'),
        'comments_to_admin' => rtbo_completed_text($row, 'comments_to_admin'),
        'comments_to_official' => rtbo_completed_text($row, 'comments_to_official'),
        'created_at' => rtbo_completed_text($row, 'created_at'),
    ];
}

function rtbo_completed_evaluations_from_database(): array
{
    $columns = rtbo_completed_table_columns('evaluations');
    if ($columns === []) {
        return [];
    }

    $order = in_array('created_at', $columns, true) ? 'ev.created_at DESC' : 'ev.id DESC';
    $select = [
        rtbo_completed_column($columns, 'ev', 'id'),
        rtbo_completed_column($columns, 'ev', 'evaluator_id'),
        rtbo_completed_column($columns, 'ev', 'evaluator_name'),
        rtbo_completed_column($columns, 'ev', 'official_id'),
        rtbo_completed_column($columns, 'ev', 'official_name'),
        rtbo_completed_column($columns, 'ev', 'official_email'),
        rtbo_completed_column($columns, 'ev', 'game_date'),
        rtbo_completed_column($columns, 'ev', 'location'),
        rtbo_completed_column($columns, 'ev', 'home_team'),
        rtbo_completed_column($columns, 'ev', 'visiting_team'),
        rtbo_completed_column($columns, 'ev', 'level'),
        rtbo_completed_column($columns, 'ev', 'crew_position'),
        rtbo_completed_column($columns, 'ev', 'evaluation_type'),
        rtbo_completed_column($columns, 'ev', 'game_type'),
        rtbo_completed_column($columns, 'ev', 'total_score'),
        rtbo_completed_column($columns, 'ev', 'percentage_score'),
        rtbo_completed_column($columns, 'ev', 'ranking_label'),
        rtbo_completed_column($columns, 'ev', 'strengths'),
        rtbo_completed_column($columns, 'ev', 'improvements'),
        rtbo_completed_column($columns, 'ev', 'recommendation'),
        rtbo_completed_column($columns, 'ev', 'comments_to_admin'),
        rtbo_completed_column($columns, 'ev', 'comments_to_official'),
        rtbo_completed_column($columns, 'ev', 'created_at'),
    ];

    try {
        $stmt = db()->query('SELECT ' . implode(', ', $select) . " FROM evaluations ev ORDER BY {$order} LIMIT 250");

        return array_map(
            static fn (array $row): array => rtbo_completed_evaluation_record($row),
            $stmt->fetchAll()
        );
    } catch (Throwable $error) {
        error_log('RTBO completed evaluations database query failed: ' . $error->getMessage());

        return [];
    }
}

function rtbo_completed_observer_record(array $row, string $source): array
{
    $homeTeam = rtbo_completed_text($row, 'home_team', 'homeTeam');
    $visitingTeam = rtbo_completed_text($row, 'visiting_team', 'visitingTeam');

    return [
        'id' => (int) ($row['id'] ?? 0),
        'source' => $source,
        'observer_id' => (int) ($row['observer_id'] ?? $row['observerId'] ?? 0),
        'observer_name' => rtbo_completed_text($row, 'observer_name', 'observerName') ?: 'Observer',
        'title' => trim($visitingTeam . ($homeTeam !== '' && $visitingTeam !== '' ? ' at ' : '') . $homeTeam) ?: 'Observer form',
        'observation_type' => rtbo_completed_text($row, 'observation_type', 'observationType') ?: 'live_game',
        'game_date' => rtbo_completed_text($row, 'game_date', 'gameDate'),
        'game_level' => rtbo_completed_text($row, 'game_level', 'gameLevel'),
        'game_site' => rtbo_completed_text($row, 'game_site', 'gameSite'),
        'home_team' => $homeTeam,
        'visiting_team' => $visitingTeam,
        'crew_chief' => rtbo_completed_text($row, 'crew_chief', 'crewChief'),
        'official2_name' => rtbo_completed_text($row, 'official2_name', 'official2'),
        'official3_name' => rtbo_completed_text($row, 'official3_name', 'official3'),
        'video_url' => rtbo_completed_text($row, 'video_url', 'videoUrl'),
        'final_score' => rtbo_completed_number($row, 'final_score', 'finalScore'),
        'crew_ranking' => rtbo_completed_text($row, 'crew_ranking', 'crewRanking'),
        'scores' => rtbo_completed_json_decode($row['scores_json'] ?? $row['scores'] ?? []),
        'strengths' => rtbo_completed_text($row, 'strengths'),
        'concerns' => rtbo_completed_text($row, 'concerns'),
        'recommendations' => rtbo_completed_text($row, 'recommendations'),
        'follow_up' => rtbo_completed_text($row, 'follow_up', 'followUp'),
        'status' => rtbo_completed_text($row, 'status') ?: 'submitted',
        'created_at' => rtbo_completed_text($row, 'created_at', 'createdAt'),
    ];
}

function rtbo_completed_observer_forms_from_database(): array
{
    $columns = rtbo_completed_table_columns('observer_forms');
    if ($columns === []) {
        return [];
    }

    $where = in_array('status', $columns, true) ? "WHERE COALESCE(obs.status, 'submitted') = 'submitted'" : '';
    $order = in_array('created_at', $columns, true) ? 'obs.created_at DESC' : 'obs.id DESC';
    $select = [
        rtbo_completed_column($columns, 'obs', 'id'),
        rtbo_completed_column($columns, 'obs', 'observer_id'),
        rtbo_completed_column($columns, 'obs', 'observer_name'),
        rtbo_completed_column($columns, 'obs', 'observation_type'),
        rtbo_completed_column($columns, 'obs', 'game_date'),
        rtbo_completed_column($columns, 'obs', 'game_level'),
        rtbo_completed_column($columns, 'obs', 'game_site'),
        rtbo_completed_column($columns, 'obs', 'home_team'),
        rtbo_completed_column($columns, 'obs', 'visiting_team'),
        rtbo_completed_column($columns, 'obs', 'crew_chief'),
        rtbo_completed_column($columns, 'obs', 'official2_name'),
        rtbo_completed_column($columns, 'obs', 'official3_name'),
        rtbo_completed_column($columns, 'obs', 'video_url'),
        rtbo_completed_column($columns, 'obs', 'final_score'),
        rtbo_completed_column($columns, 'obs', 'crew_ranking'),
        rtbo_completed_column($columns, 'obs', 'scores_json'),
        rtbo_completed_column($columns, 'obs', 'strengths'),
        rtbo_completed_column($columns, 'obs', 'concerns'),
        rtbo_completed_column($columns, 'obs', 'recommendations'),
        rtbo_completed_column($columns, 'obs', 'follow_up'),
        rtbo_completed_column($columns, 'obs', 'status'),
        rtbo_completed_column($columns, 'obs', 'created_at'),
    ];

    try {
        $stmt = db()->query('SELECT ' . implode(', ', $select) . " FROM observer_forms obs {$where} ORDER BY {$order} LIMIT 250");

        return array_map(
            static fn (array $row): array => rtbo_completed_observer_record($row, 'database'),
            $stmt->fetchAll()
        );
    } catch (Throwable $error) {
        error_log('RTBO completed observer forms database query failed: ' . $error->getMessage());

        return [];
    }
}

function rtbo_completed_observer_forms_from_storage(): array
{
    $forms = rtbo_completed_read_storage('observer-forms.json');
    $submitted = array_values(array_filter($forms, static function (array $form): bool {
        return strtolower((string) ($form['status'] ?? 'submitted')) === 'submitted';
    }));

    return array_map(
        static fn (array $form): array => rtbo_completed_observer_record($form, 'json_fallback'),
        $submitted
    );
}

$databaseUser = current_database_user();
$user = $databaseUser ? public_auth_user($databaseUser) : current_user();

if (!$user) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Sign-in is required.']);
    exit;
}

if (!is_admin_user($user)) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Completed forms are reserved for Super Admin and admin accounts.']);
    exit;
}

if (strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET')) !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'GET required.']);
    exit;
}

$gameReports = array_merge(
    rtbo_completed_game_reports_from_database(),
    rtbo_completed_game_reports_from_storage()
);
$observerForms = array_merge(
    rtbo_completed_observer_forms_from_database(),
    rtbo_completed_observer_forms_from_storage()
);

echo json_encode([
    'success' => true,
    'completed_forms' => [
        'officials' => rtbo_completed_sort($gameReports),
        'evaluators' => rtbo_completed_sort(rtbo_completed_evaluations_from_database()),
        'observers' => rtbo_completed_sort($observerForms),
    ],
], JSON_UNESCAPED_SLASHES);

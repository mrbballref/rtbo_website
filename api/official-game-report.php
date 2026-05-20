<?php
declare(strict_types=1);

require_once __DIR__ . '/includes/bootstrap.php';
require_once __DIR__ . '/includes/users.php';
require_once __DIR__ . '/includes/notifications.php';

header('Content-Type: application/json');

function rtbo_game_report_input(): array
{
    $data = json_decode((string) file_get_contents('php://input'), true);
    return is_array($data) ? $data : [];
}

function rtbo_game_report_columns(): array
{
    $stmt = db()->prepare(
        "SELECT COLUMN_NAME
         FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = 'game_reports'"
    );
    $stmt->execute();
    return array_map('strval', $stmt->fetchAll(PDO::FETCH_COLUMN));
}

function rtbo_game_report_add_column_if_missing(array $columns, string $column, string $sql): array
{
    if (!in_array($column, $columns, true)) {
        db()->exec($sql);
        $columns[] = $column;
    }

    return $columns;
}

function rtbo_ensure_game_reports_table(): void
{
    db()->exec(
        "CREATE TABLE IF NOT EXISTS game_reports (
            id INT AUTO_INCREMENT PRIMARY KEY,
            game_id INT NULL,
            assignment_id INT NULL,
            official_id INT NOT NULL,
            rule_set VARCHAR(20) NOT NULL DEFAULT 'NFHS',
            table_performance VARCHAR(80) NULL,
            dressing_room_condition VARCHAR(80) NULL,
            game_date DATE NULL,
            game_site VARCHAR(190) NULL,
            game_level VARCHAR(120) NULL,
            home_team VARCHAR(190) NULL,
            visiting_team VARCHAR(190) NULL,
            home_score INT NULL,
            visiting_score INT NULL,
            final_score VARCHAR(40) NULL,
            referee_name VARCHAR(190) NULL,
            umpire1_name VARCHAR(190) NULL,
            umpire2_name VARCHAR(190) NULL,
            crew_chief VARCHAR(190) NULL,
            official2_name VARCHAR(190) NULL,
            official3_name VARCHAR(190) NULL,
            incidents_json MEDIUMTEXT NULL,
            notes TEXT NULL,
            certification TINYINT(1) NOT NULL DEFAULT 0,
            status VARCHAR(40) NOT NULL DEFAULT 'submitted',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NULL,
            INDEX idx_game_reports_official (official_id),
            INDEX idx_game_reports_game (game_id),
            INDEX idx_game_reports_created (created_at)
        )"
    );

    $columns = rtbo_game_report_columns();
    $columns = rtbo_game_report_add_column_if_missing($columns, 'game_id', 'ALTER TABLE game_reports ADD COLUMN game_id INT NULL AFTER id');
    $columns = rtbo_game_report_add_column_if_missing($columns, 'assignment_id', 'ALTER TABLE game_reports ADD COLUMN assignment_id INT NULL AFTER game_id');
    $columns = rtbo_game_report_add_column_if_missing($columns, 'official_id', 'ALTER TABLE game_reports ADD COLUMN official_id INT NULL AFTER assignment_id');
    $columns = rtbo_game_report_add_column_if_missing($columns, 'rule_set', "ALTER TABLE game_reports ADD COLUMN rule_set VARCHAR(20) NOT NULL DEFAULT 'NFHS' AFTER official_id");
    $columns = rtbo_game_report_add_column_if_missing($columns, 'table_performance', 'ALTER TABLE game_reports ADD COLUMN table_performance VARCHAR(80) NULL AFTER rule_set');
    $columns = rtbo_game_report_add_column_if_missing($columns, 'dressing_room_condition', 'ALTER TABLE game_reports ADD COLUMN dressing_room_condition VARCHAR(80) NULL AFTER table_performance');
    $columns = rtbo_game_report_add_column_if_missing($columns, 'game_date', 'ALTER TABLE game_reports ADD COLUMN game_date DATE NULL AFTER dressing_room_condition');
    $columns = rtbo_game_report_add_column_if_missing($columns, 'game_site', 'ALTER TABLE game_reports ADD COLUMN game_site VARCHAR(190) NULL AFTER game_date');
    $columns = rtbo_game_report_add_column_if_missing($columns, 'game_level', 'ALTER TABLE game_reports ADD COLUMN game_level VARCHAR(120) NULL AFTER game_site');
    $columns = rtbo_game_report_add_column_if_missing($columns, 'home_team', 'ALTER TABLE game_reports ADD COLUMN home_team VARCHAR(190) NULL AFTER game_level');
    $columns = rtbo_game_report_add_column_if_missing($columns, 'visiting_team', 'ALTER TABLE game_reports ADD COLUMN visiting_team VARCHAR(190) NULL AFTER home_team');
    $columns = rtbo_game_report_add_column_if_missing($columns, 'home_score', 'ALTER TABLE game_reports ADD COLUMN home_score INT NULL AFTER visiting_team');
    $columns = rtbo_game_report_add_column_if_missing($columns, 'visiting_score', 'ALTER TABLE game_reports ADD COLUMN visiting_score INT NULL AFTER home_score');
    $columns = rtbo_game_report_add_column_if_missing($columns, 'final_score', 'ALTER TABLE game_reports ADD COLUMN final_score VARCHAR(40) NULL AFTER visiting_score');
    $columns = rtbo_game_report_add_column_if_missing($columns, 'referee_name', 'ALTER TABLE game_reports ADD COLUMN referee_name VARCHAR(190) NULL AFTER final_score');
    $columns = rtbo_game_report_add_column_if_missing($columns, 'umpire1_name', 'ALTER TABLE game_reports ADD COLUMN umpire1_name VARCHAR(190) NULL AFTER referee_name');
    $columns = rtbo_game_report_add_column_if_missing($columns, 'umpire2_name', 'ALTER TABLE game_reports ADD COLUMN umpire2_name VARCHAR(190) NULL AFTER umpire1_name');
    $columns = rtbo_game_report_add_column_if_missing($columns, 'crew_chief', 'ALTER TABLE game_reports ADD COLUMN crew_chief VARCHAR(190) NULL AFTER umpire2_name');
    $columns = rtbo_game_report_add_column_if_missing($columns, 'official2_name', 'ALTER TABLE game_reports ADD COLUMN official2_name VARCHAR(190) NULL AFTER crew_chief');
    $columns = rtbo_game_report_add_column_if_missing($columns, 'official3_name', 'ALTER TABLE game_reports ADD COLUMN official3_name VARCHAR(190) NULL AFTER official2_name');
    $columns = rtbo_game_report_add_column_if_missing($columns, 'incidents_json', 'ALTER TABLE game_reports ADD COLUMN incidents_json MEDIUMTEXT NULL AFTER official3_name');
    $columns = rtbo_game_report_add_column_if_missing($columns, 'notes', 'ALTER TABLE game_reports ADD COLUMN notes TEXT NULL AFTER incidents_json');
    $columns = rtbo_game_report_add_column_if_missing($columns, 'certification', 'ALTER TABLE game_reports ADD COLUMN certification TINYINT(1) NOT NULL DEFAULT 0 AFTER notes');
    $columns = rtbo_game_report_add_column_if_missing($columns, 'updated_at', 'ALTER TABLE game_reports ADD COLUMN updated_at DATETIME NULL AFTER created_at');
    rtbo_game_report_add_column_if_missing($columns, 'status', "ALTER TABLE game_reports ADD COLUMN status VARCHAR(40) NOT NULL DEFAULT 'submitted' AFTER certification");
}

function rtbo_game_report_text(array $source, string $key): string
{
    return trim((string) ($source[$key] ?? ''));
}

function rtbo_game_report_int_or_null(array $source, string $key): ?int
{
    $value = trim((string) ($source[$key] ?? ''));
    if ($value === '') {
        return null;
    }

    return max(0, min(200, (int) $value));
}

function rtbo_game_report_incidents(array $items): array
{
    $incidents = [];
    foreach ($items as $item) {
        if (!is_array($item)) {
            continue;
        }
        $incident = [
            'type' => rtbo_game_report_text($item, 'type'),
            'player' => rtbo_game_report_text($item, 'player'),
            'team' => rtbo_game_report_text($item, 'team'),
            'time' => rtbo_game_report_text($item, 'time'),
            'description' => rtbo_game_report_text($item, 'description'),
        ];
        if (trim(implode('', $incident)) !== '') {
            $incidents[] = $incident;
        }
    }

    return $incidents;
}

function rtbo_game_report_assignment(int $assignmentId, int $officialId): ?array
{
    if ($assignmentId <= 0) {
        return null;
    }

    $stmt = db()->prepare(
        "SELECT a.id AS assignment_id, a.game_id, a.official_id, a.status AS assignment_status,
                g.game_date, g.level, g.home_team, g.away_team, g.location_name
         FROM assignments a
         LEFT JOIN games g ON g.id = a.game_id
         WHERE a.id = ? AND a.official_id = ?
         LIMIT 1"
    );
    $stmt->execute([$assignmentId, $officialId]);
    $assignment = $stmt->fetch();

    return $assignment ?: null;
}

function rtbo_game_report_storage_path(): string
{
    $dir = __DIR__ . '/storage';
    if (!is_dir($dir)) {
        mkdir($dir, 0775, true);
    }

    return $dir . '/game-reports.json';
}

function rtbo_game_report_read_file(): array
{
    $path = rtbo_game_report_storage_path();
    if (!is_file($path)) {
        return [];
    }

    $data = json_decode((string) file_get_contents($path), true);
    return is_array($data) ? $data : [];
}

function rtbo_game_report_write_file(array $reports): void
{
    $path = rtbo_game_report_storage_path();
    file_put_contents($path, json_encode(array_values($reports), JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
}

function rtbo_game_report_save_file(array $report): array
{
    $reports = rtbo_game_report_read_file();
    $maxId = 0;
    foreach ($reports as $existing) {
        $maxId = max($maxId, (int) ($existing['id'] ?? 0));
    }

    $report['id'] = $maxId + 1;
    $report['source'] = 'json_fallback';
    array_unshift($reports, $report);
    rtbo_game_report_write_file($reports);

    return $report;
}

if (strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET')) !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'POST required.']);
    exit;
}

require_same_origin_request();

$databaseUser = current_database_user();
$user = $databaseUser ? public_auth_user($databaseUser) : current_user();
if (!$user || (string) ($user['role'] ?? '') !== 'official') {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Only officials can submit game reports.']);
    exit;
}

try {
    $input = rtbo_game_report_input();
    $report = (array) ($input['report'] ?? []);
    $status = strtolower(trim((string) ($input['status'] ?? $report['status'] ?? 'submitted')));
    $status = $status === 'draft' ? 'draft' : 'submitted';
    $officialId = (int) ($user['id'] ?? 0);
    $assignmentId = (int) ($report['assignmentId'] ?? $report['assignment_id'] ?? 0);
    $assignment = null;
    $databaseAvailable = true;

    try {
        rtbo_ensure_game_reports_table();
        $assignment = rtbo_game_report_assignment($assignmentId, $officialId);
    } catch (Throwable $databaseError) {
        $databaseAvailable = false;
        error_log('RTBO game report database unavailable, using JSON fallback: ' . $databaseError->getMessage());
    }

    if ($assignmentId > 0 && $databaseAvailable && !$assignment) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'That assignment was not found for your official account.']);
        exit;
    }

    $ruleSet = strtoupper(rtbo_game_report_text($report, 'ruleSet'));
    if (!in_array($ruleSet, ['NFHS', 'NCAAW', 'NCAAM'], true)) {
        $ruleSet = 'NFHS';
    }

    $gameDate = rtbo_game_report_text($report, 'gameDate') ?: (string) ($assignment['game_date'] ?? '');
    $gameSite = rtbo_game_report_text($report, 'gameSite') ?: (string) ($assignment['location_name'] ?? '');
    $homeTeam = rtbo_game_report_text($report, 'homeTeam') ?: (string) ($assignment['home_team'] ?? '');
    $visitingTeam = rtbo_game_report_text($report, 'visitingTeam') ?: (string) ($assignment['away_team'] ?? '');
    $homeScore = rtbo_game_report_int_or_null($report, 'homeScore');
    $visitingScore = rtbo_game_report_int_or_null($report, 'visitingScore');
    $finalScore = $homeScore !== null && $visitingScore !== null ? "{$homeScore}-{$visitingScore}" : rtbo_game_report_text($report, 'finalScore');
    $certification = !empty($report['certification']);

    if ($status === 'submitted') {
        $missing = [];
        foreach ([
            'game date' => $gameDate,
            'game site' => $gameSite,
            'home team' => $homeTeam,
            'visiting team' => $visitingTeam,
        ] as $label => $value) {
            if (trim((string) $value) === '') {
                $missing[] = $label;
            }
        }
        if ($missing) {
            throw new RuntimeException('Complete the ' . implode(', ', $missing) . ' before submitting this game report.');
        }
        if (!$certification) {
            throw new RuntimeException('Certify the report before submitting it.');
        }
    }

    $incidents = rtbo_game_report_incidents((array) ($input['incidents'] ?? $report['incidents'] ?? []));
    $saved = [
        'id' => 0,
        'game_id' => (int) ($assignment['game_id'] ?? $report['gameId'] ?? $report['game_id'] ?? 0),
        'assignment_id' => $assignmentId,
        'official_id' => $officialId,
        'rule_set' => $ruleSet,
        'status' => $status,
        'game_date' => $gameDate,
        'game_site' => $gameSite,
        'game_level' => rtbo_game_report_text($report, 'gameLevel') ?: (string) ($assignment['level'] ?? ''),
        'home_team' => $homeTeam,
        'visiting_team' => $visitingTeam,
        'home_score' => $homeScore,
        'visiting_score' => $visitingScore,
        'final_score' => $finalScore,
        'table_performance' => rtbo_game_report_text($report, 'tablePerformance'),
        'dressing_room_condition' => rtbo_game_report_text($report, 'dressingRoomCondition'),
        'incidents' => $incidents,
        'notes' => rtbo_game_report_text($report, 'notes'),
        'created_at' => date('Y-m-d H:i:s'),
    ];

    if ($databaseAvailable) {
        try {
            $stmt = db()->prepare(
                "INSERT INTO game_reports (
                    game_id, assignment_id, official_id, rule_set, table_performance, dressing_room_condition,
                    game_date, game_site, game_level, home_team, visiting_team, home_score, visiting_score, final_score,
                    referee_name, umpire1_name, umpire2_name, crew_chief, official2_name, official3_name,
                    incidents_json, notes, certification, status, updated_at
                ) VALUES (
                    ?, ?, ?, ?, ?, ?,
                    ?, ?, ?, ?, ?, ?, ?, ?,
                    ?, ?, ?, ?, ?, ?,
                    ?, ?, ?, ?, NOW()
                )"
            );

            $stmt->execute([
                $saved['game_id'] ?: null,
                $assignmentId ?: null,
                $officialId,
                $ruleSet,
                $saved['table_performance'],
                $saved['dressing_room_condition'],
                $gameDate !== '' ? $gameDate : null,
                $gameSite,
                $saved['game_level'],
                $homeTeam,
                $visitingTeam,
                $homeScore,
                $visitingScore,
                $finalScore,
                rtbo_game_report_text($report, 'refereeName'),
                rtbo_game_report_text($report, 'umpire1Name'),
                rtbo_game_report_text($report, 'umpire2Name'),
                rtbo_game_report_text($report, 'crewChief'),
                rtbo_game_report_text($report, 'official2'),
                rtbo_game_report_text($report, 'official3'),
                json_encode($incidents, JSON_UNESCAPED_SLASHES),
                $saved['notes'],
                $certification ? 1 : 0,
                $status,
            ]);

            $saved['id'] = (int) db()->lastInsertId();
        } catch (Throwable $databaseSaveError) {
            error_log('RTBO game report database save failed, using JSON fallback: ' . $databaseSaveError->getMessage());
            $saved = rtbo_game_report_save_file($saved);
        }
    } else {
        $saved = rtbo_game_report_save_file($saved);
    }

    if ($status === 'submitted') {
        $officialName = trim((string) ($user['name'] ?? '')) ?: trim((string) ($user['first_name'] ?? '') . ' ' . (string) ($user['last_name'] ?? '')) ?: (string) ($user['email'] ?? 'Official');
        try {
            rtbo_notify_admins([
                'type' => 'game_report_submitted',
                'title' => 'Game report submitted',
                'body' => "{$officialName} submitted a game report for {$visitingTeam} at {$homeTeam}.",
                'related_type' => 'game_report',
                'related_id' => (int) ($saved['id'] ?? 0),
                'metadata' => ['game_report' => $saved],
                'actor' => $user,
            ]);
        } catch (Throwable $notificationError) {
            error_log('RTBO game report notification failed: ' . $notificationError->getMessage());
        }
    }

    echo json_encode([
        'success' => true,
        'message' => $status === 'draft' ? 'Game report draft saved.' : 'Game report submitted.',
        'report' => $saved,
    ], JSON_UNESCAPED_SLASHES);
} catch (Throwable $error) {
    error_log('RTBO official game report failed: ' . $error->getMessage());
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => $error->getMessage()]);
}

<?php
declare(strict_types=1);

require_once __DIR__ . '/includes/bootstrap.php';
require_once __DIR__ . '/includes/users.php';
require_once __DIR__ . '/includes/notifications.php';

header('Content-Type: application/json');

function rtbo_observer_form_input(): array
{
    $data = json_decode((string) file_get_contents('php://input'), true);
    return is_array($data) ? $data : [];
}

function rtbo_observer_form_columns(): array
{
    $stmt = db()->prepare(
        "SELECT COLUMN_NAME
         FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = 'observer_forms'"
    );
    $stmt->execute();
    return array_map('strval', $stmt->fetchAll(PDO::FETCH_COLUMN));
}

function rtbo_observer_form_add_column_if_missing(array $columns, string $column, string $sql): array
{
    if (!in_array($column, $columns, true)) {
        db()->exec($sql);
        $columns[] = $column;
    }

    return $columns;
}

function rtbo_ensure_observer_forms_table(): void
{
    db()->exec(
        "CREATE TABLE IF NOT EXISTS observer_forms (
            id INT AUTO_INCREMENT PRIMARY KEY,
            observer_id INT NOT NULL,
            observer_name VARCHAR(190) NULL,
            observation_type VARCHAR(80) NOT NULL DEFAULT 'live_game',
            game_date DATE NULL,
            game_level VARCHAR(120) NULL,
            game_site VARCHAR(190) NULL,
            home_team VARCHAR(190) NULL,
            visiting_team VARCHAR(190) NULL,
            crew_chief VARCHAR(190) NULL,
            official2_name VARCHAR(190) NULL,
            official3_name VARCHAR(190) NULL,
            video_url VARCHAR(500) NULL,
            final_score DECIMAL(6,2) NULL,
            crew_ranking VARCHAR(120) NULL,
            scores_json MEDIUMTEXT NULL,
            strengths TEXT NULL,
            concerns TEXT NULL,
            recommendations TEXT NULL,
            follow_up TEXT NULL,
            certification TINYINT(1) NOT NULL DEFAULT 0,
            status VARCHAR(40) NOT NULL DEFAULT 'submitted',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NULL,
            INDEX idx_observer_forms_observer (observer_id),
            INDEX idx_observer_forms_created (created_at)
        )"
    );

    $columns = rtbo_observer_form_columns();
    $columns = rtbo_observer_form_add_column_if_missing($columns, 'observer_id', 'ALTER TABLE observer_forms ADD COLUMN observer_id INT NULL AFTER id');
    $columns = rtbo_observer_form_add_column_if_missing($columns, 'observer_name', 'ALTER TABLE observer_forms ADD COLUMN observer_name VARCHAR(190) NULL AFTER observer_id');
    $columns = rtbo_observer_form_add_column_if_missing($columns, 'observation_type', "ALTER TABLE observer_forms ADD COLUMN observation_type VARCHAR(80) NOT NULL DEFAULT 'live_game' AFTER observer_name");
    $columns = rtbo_observer_form_add_column_if_missing($columns, 'game_date', 'ALTER TABLE observer_forms ADD COLUMN game_date DATE NULL AFTER observation_type');
    $columns = rtbo_observer_form_add_column_if_missing($columns, 'game_level', 'ALTER TABLE observer_forms ADD COLUMN game_level VARCHAR(120) NULL AFTER game_date');
    $columns = rtbo_observer_form_add_column_if_missing($columns, 'game_site', 'ALTER TABLE observer_forms ADD COLUMN game_site VARCHAR(190) NULL AFTER game_level');
    $columns = rtbo_observer_form_add_column_if_missing($columns, 'home_team', 'ALTER TABLE observer_forms ADD COLUMN home_team VARCHAR(190) NULL AFTER game_site');
    $columns = rtbo_observer_form_add_column_if_missing($columns, 'visiting_team', 'ALTER TABLE observer_forms ADD COLUMN visiting_team VARCHAR(190) NULL AFTER home_team');
    $columns = rtbo_observer_form_add_column_if_missing($columns, 'crew_chief', 'ALTER TABLE observer_forms ADD COLUMN crew_chief VARCHAR(190) NULL AFTER visiting_team');
    $columns = rtbo_observer_form_add_column_if_missing($columns, 'official2_name', 'ALTER TABLE observer_forms ADD COLUMN official2_name VARCHAR(190) NULL AFTER crew_chief');
    $columns = rtbo_observer_form_add_column_if_missing($columns, 'official3_name', 'ALTER TABLE observer_forms ADD COLUMN official3_name VARCHAR(190) NULL AFTER official2_name');
    $columns = rtbo_observer_form_add_column_if_missing($columns, 'video_url', 'ALTER TABLE observer_forms ADD COLUMN video_url VARCHAR(500) NULL AFTER official3_name');
    $columns = rtbo_observer_form_add_column_if_missing($columns, 'final_score', 'ALTER TABLE observer_forms ADD COLUMN final_score DECIMAL(6,2) NULL AFTER video_url');
    $columns = rtbo_observer_form_add_column_if_missing($columns, 'crew_ranking', 'ALTER TABLE observer_forms ADD COLUMN crew_ranking VARCHAR(120) NULL AFTER final_score');
    $columns = rtbo_observer_form_add_column_if_missing($columns, 'scores_json', 'ALTER TABLE observer_forms ADD COLUMN scores_json MEDIUMTEXT NULL AFTER crew_ranking');
    $columns = rtbo_observer_form_add_column_if_missing($columns, 'strengths', 'ALTER TABLE observer_forms ADD COLUMN strengths TEXT NULL AFTER scores_json');
    $columns = rtbo_observer_form_add_column_if_missing($columns, 'concerns', 'ALTER TABLE observer_forms ADD COLUMN concerns TEXT NULL AFTER strengths');
    $columns = rtbo_observer_form_add_column_if_missing($columns, 'recommendations', 'ALTER TABLE observer_forms ADD COLUMN recommendations TEXT NULL AFTER concerns');
    $columns = rtbo_observer_form_add_column_if_missing($columns, 'follow_up', 'ALTER TABLE observer_forms ADD COLUMN follow_up TEXT NULL AFTER recommendations');
    $columns = rtbo_observer_form_add_column_if_missing($columns, 'certification', 'ALTER TABLE observer_forms ADD COLUMN certification TINYINT(1) NOT NULL DEFAULT 0 AFTER follow_up');
    $columns = rtbo_observer_form_add_column_if_missing($columns, 'status', "ALTER TABLE observer_forms ADD COLUMN status VARCHAR(40) NOT NULL DEFAULT 'submitted' AFTER certification");
    rtbo_observer_form_add_column_if_missing($columns, 'updated_at', 'ALTER TABLE observer_forms ADD COLUMN updated_at DATETIME NULL AFTER created_at');
}

function rtbo_observer_form_text(array $source, string $key): string
{
    return trim((string) ($source[$key] ?? ''));
}

function rtbo_observer_form_storage_path(): string
{
    $dir = __DIR__ . '/storage';
    if (!is_dir($dir)) {
        mkdir($dir, 0775, true);
    }

    return $dir . '/observer-forms.json';
}

function rtbo_observer_form_save_file(array $form): array
{
    $path = rtbo_observer_form_storage_path();
    $forms = is_file($path) ? json_decode((string) file_get_contents($path), true) : [];
    $forms = is_array($forms) ? $forms : [];
    $maxId = 0;
    foreach ($forms as $existing) {
        $maxId = max($maxId, (int) ($existing['id'] ?? 0));
    }

    $form['id'] = $maxId + 1;
    $form['source'] = 'json_fallback';
    array_unshift($forms, $form);
    file_put_contents($path, json_encode($forms, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));

    return $form;
}

if (strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET')) !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'POST required.']);
    exit;
}

require_same_origin_request();

$databaseUser = current_database_user();
$user = $databaseUser ? public_auth_user($databaseUser) : current_user();
if (!$user || (string) ($user['role'] ?? '') !== 'observer') {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Only observers can submit observer forms.']);
    exit;
}

try {
    $input = rtbo_observer_form_input();
    $form = (array) ($input['form'] ?? []);
    $scores = (array) ($input['scores'] ?? []);
    $summary = (array) ($input['summary'] ?? []);
    $status = strtolower(trim((string) ($input['status'] ?? $form['status'] ?? 'submitted')));
    $status = $status === 'draft' ? 'draft' : 'submitted';
    $certification = !empty($form['certification']);

    if ($status === 'submitted') {
        $missing = [];
        foreach ([
            'observer name' => rtbo_observer_form_text($form, 'observerName'),
            'game date' => rtbo_observer_form_text($form, 'gameDate'),
            'game level' => rtbo_observer_form_text($form, 'gameLevel'),
            'game site' => rtbo_observer_form_text($form, 'gameSite'),
        ] as $label => $value) {
            if ($value === '') {
                $missing[] = $label;
            }
        }
        if ($missing) {
            throw new RuntimeException('Complete the ' . implode(', ', $missing) . ' before submitting this observer form.');
        }
        if (!$certification) {
            throw new RuntimeException('Certify the observer form before submitting it.');
        }
    }

    $saved = [
        'id' => 0,
        'observer_id' => (int) ($user['id'] ?? 0),
        'observer_name' => rtbo_observer_form_text($form, 'observerName') ?: (string) ($user['name'] ?? ''),
        'observation_type' => rtbo_observer_form_text($form, 'observationType') ?: 'live_game',
        'game_date' => rtbo_observer_form_text($form, 'gameDate'),
        'game_level' => rtbo_observer_form_text($form, 'gameLevel'),
        'game_site' => rtbo_observer_form_text($form, 'gameSite'),
        'home_team' => rtbo_observer_form_text($form, 'homeTeam'),
        'visiting_team' => rtbo_observer_form_text($form, 'visitingTeam'),
        'crew_chief' => rtbo_observer_form_text($form, 'crewChief'),
        'official2_name' => rtbo_observer_form_text($form, 'official2'),
        'official3_name' => rtbo_observer_form_text($form, 'official3'),
        'video_url' => rtbo_observer_form_text($form, 'videoUrl'),
        'final_score' => (float) ($summary['finalScore'] ?? 0),
        'crew_ranking' => (string) ($summary['crewRanking'] ?? ''),
        'scores' => $scores,
        'strengths' => rtbo_observer_form_text($form, 'strengths'),
        'concerns' => rtbo_observer_form_text($form, 'concerns'),
        'recommendations' => rtbo_observer_form_text($form, 'recommendations'),
        'follow_up' => rtbo_observer_form_text($form, 'followUp'),
        'certification' => $certification,
        'status' => $status,
        'created_at' => date('Y-m-d H:i:s'),
    ];

    $databaseAvailable = true;
    try {
        rtbo_ensure_observer_forms_table();
        $stmt = db()->prepare(
            "INSERT INTO observer_forms (
                observer_id, observer_name, observation_type, game_date, game_level, game_site,
                home_team, visiting_team, crew_chief, official2_name, official3_name, video_url,
                final_score, crew_ranking, scores_json, strengths, concerns, recommendations, follow_up,
                certification, status, updated_at
            ) VALUES (
                ?, ?, ?, ?, ?, ?,
                ?, ?, ?, ?, ?, ?,
                ?, ?, ?, ?, ?, ?, ?,
                ?, ?, NOW()
            )"
        );
        $stmt->execute([
            $saved['observer_id'],
            $saved['observer_name'],
            $saved['observation_type'],
            $saved['game_date'] !== '' ? $saved['game_date'] : null,
            $saved['game_level'],
            $saved['game_site'],
            $saved['home_team'],
            $saved['visiting_team'],
            $saved['crew_chief'],
            $saved['official2_name'],
            $saved['official3_name'],
            $saved['video_url'],
            $saved['final_score'],
            $saved['crew_ranking'],
            json_encode($scores, JSON_UNESCAPED_SLASHES),
            $saved['strengths'],
            $saved['concerns'],
            $saved['recommendations'],
            $saved['follow_up'],
            $certification ? 1 : 0,
            $status,
        ]);
        $saved['id'] = (int) db()->lastInsertId();
    } catch (Throwable $databaseError) {
        $databaseAvailable = false;
        error_log('RTBO observer form database unavailable, using JSON fallback: ' . $databaseError->getMessage());
        $saved = rtbo_observer_form_save_file($saved);
    }

    if ($status === 'submitted') {
        try {
            rtbo_notify_admins([
                'type' => 'observer_form_submitted',
                'title' => 'Observer form submitted',
                'body' => "{$saved['observer_name']} submitted an observer form for {$saved['visiting_team']} at {$saved['home_team']}.",
                'related_type' => 'observer_form',
                'related_id' => (int) ($saved['id'] ?? 0),
                'metadata' => ['observer_form' => $saved, 'database_available' => $databaseAvailable],
                'actor' => $user,
            ]);
        } catch (Throwable $notificationError) {
            error_log('RTBO observer form notification failed: ' . $notificationError->getMessage());
        }
    }

    echo json_encode([
        'success' => true,
        'message' => $status === 'draft' ? 'Observer form draft saved.' : 'Observer form submitted.',
        'observer_form' => $saved,
    ], JSON_UNESCAPED_SLASHES);
} catch (Throwable $error) {
    error_log('RTBO observer form failed: ' . $error->getMessage());
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => $error->getMessage()]);
}

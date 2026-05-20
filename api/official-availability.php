<?php
declare(strict_types=1);

require_once __DIR__ . '/includes/bootstrap.php';
require_once __DIR__ . '/includes/users.php';

header('Content-Type: application/json');

function rtbo_official_availability_input(): array
{
    $raw = file_get_contents('php://input') ?: '';
    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : $_POST;
}

function rtbo_official_availability_column_exists(string $column): bool
{
    try {
        $stmt = db()->prepare(
            "SELECT COUNT(*)
             FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE()
               AND TABLE_NAME = 'official_availability'
               AND COLUMN_NAME = ?"
        );
        $stmt->execute([$column]);
        return (int) $stmt->fetchColumn() > 0;
    } catch (Throwable $error) {
        error_log('RTBO availability column lookup failed: ' . $error->getMessage());
        return false;
    }
}

function rtbo_ensure_official_availability_table(): void
{
    db()->exec(
        "CREATE TABLE IF NOT EXISTS official_availability (
            id INT AUTO_INCREMENT PRIMARY KEY,
            official_id INT NOT NULL,
            availability_date DATE NOT NULL,
            status VARCHAR(50) NOT NULL DEFAULT 'available',
            reason VARCHAR(100) NULL,
            game_school VARCHAR(190) NULL,
            game_location VARCHAR(190) NULL,
            game_time VARCHAR(20) NULL,
            game_city VARCHAR(120) NULL,
            supervisor VARCHAR(190) NULL,
            notes TEXT NULL,
            contact_required TINYINT(1) NOT NULL DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NULL,
            UNIQUE KEY uq_official_availability_date (official_id, availability_date),
            INDEX idx_official_availability_official (official_id),
            INDEX idx_official_availability_date (availability_date)
        )"
    );

    foreach ([
        'official_id' => "ALTER TABLE official_availability ADD COLUMN official_id INT NOT NULL AFTER id",
        'availability_date' => "ALTER TABLE official_availability ADD COLUMN availability_date DATE NOT NULL AFTER official_id",
        'status' => "ALTER TABLE official_availability ADD COLUMN status VARCHAR(50) NOT NULL DEFAULT 'available' AFTER availability_date",
        'reason' => "ALTER TABLE official_availability ADD COLUMN reason VARCHAR(100) NULL AFTER status",
        'game_school' => "ALTER TABLE official_availability ADD COLUMN game_school VARCHAR(190) NULL AFTER reason",
        'game_location' => "ALTER TABLE official_availability ADD COLUMN game_location VARCHAR(190) NULL AFTER game_school",
        'game_time' => "ALTER TABLE official_availability ADD COLUMN game_time VARCHAR(20) NULL AFTER game_school",
        'game_city' => "ALTER TABLE official_availability ADD COLUMN game_city VARCHAR(120) NULL AFTER game_time",
        'supervisor' => "ALTER TABLE official_availability ADD COLUMN supervisor VARCHAR(190) NULL AFTER game_city",
        'notes' => "ALTER TABLE official_availability ADD COLUMN notes TEXT NULL AFTER supervisor",
        'contact_required' => "ALTER TABLE official_availability ADD COLUMN contact_required TINYINT(1) NOT NULL DEFAULT 0 AFTER notes",
        'created_at' => "ALTER TABLE official_availability ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP",
        'updated_at' => "ALTER TABLE official_availability ADD COLUMN updated_at DATETIME NULL",
    ] as $column => $sql) {
        if (!rtbo_official_availability_column_exists($column)) {
            db()->exec($sql);
        }
    }
}

function rtbo_official_availability_rows(int $officialId): array
{
    rtbo_ensure_official_availability_table();
    $stmt = db()->prepare(
        "SELECT id, availability_date, status, reason, game_school, game_location, game_time, game_city, supervisor, notes, contact_required, created_at, updated_at
         FROM official_availability
         WHERE official_id = ?
         ORDER BY availability_date DESC"
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
        'updated_at' => (string) ($row['updated_at'] ?? ''),
    ], $stmt->fetchAll());
}

$databaseUser = current_database_user();
$user = $databaseUser ? public_auth_user($databaseUser) : current_user();
if (!$user) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Please sign in to update availability.']);
    exit;
}

try {
    rtbo_ensure_official_availability_table();
    $officialId = (int) ($user['id'] ?? 0);

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        echo json_encode(['success' => true, 'availability' => rtbo_official_availability_rows($officialId)], JSON_UNESCAPED_SLASHES);
        exit;
    }

    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['success' => false, 'message' => 'GET or POST required.']);
        exit;
    }

    require_same_origin_request();
    $input = rtbo_official_availability_input();
    $date = trim((string) ($input['date'] ?? ''));
    $mode = strtolower(trim((string) ($input['mode'] ?? 'unavailable')));
    $status = strtolower(trim((string) ($input['status'] ?? ($mode === 'comment' ? 'available' : 'unavailable'))));
    $reason = strtolower(trim((string) ($input['reason'] ?? '')));
    $gameSchool = trim((string) ($input['game_school'] ?? ''));
    $gameLocation = trim((string) ($input['game_location'] ?? $input['game_city'] ?? ''));
    $gameTime = trim((string) ($input['game_time'] ?? ''));
    $gameCity = trim((string) ($input['game_city'] ?? ''));
    $supervisor = trim((string) ($input['supervisor'] ?? ''));
    $notes = trim((string) ($input['notes'] ?? ''));
    $contactRequired = !empty($input['contact_required']);

    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
        throw new RuntimeException('Choose a valid availability date.');
    }
    if (!in_array($mode, ['unavailable', 'comment'], true)) {
        throw new RuntimeException('Choose whether you are closing the date or leaving an assignor comment.');
    }

    if ($mode === 'comment') {
        $status = 'available';
        $reason = 'contact_required';
        $gameSchool = '';
        $gameLocation = '';
        $gameTime = '';
        $gameCity = '';
        $supervisor = '';
        $contactRequired = true;
        if ($notes === '') {
            throw new RuntimeException('Enter a comment so the Super Admin knows why to contact you before assigning this date.');
        }
    } else {
        $status = 'unavailable';
        $contactRequired = false;
    }

    if ($status === 'available' && !$contactRequired) {
        $reason = '';
        $gameSchool = '';
        $gameLocation = '';
        $gameTime = '';
        $gameCity = '';
        $supervisor = '';
    } elseif ($status === 'unavailable' && !in_array($reason, ['game', 'personal', 'work', 'schedule_conflict'], true)) {
        throw new RuntimeException('Choose a reason for the unavailable date.');
    } elseif ($status === 'unavailable' && $reason === 'game' && ($gameSchool === '' || $gameLocation === '' || $gameTime === '' || $supervisor === '')) {
        throw new RuntimeException('For a game conflict, enter the game location, school name, game time, and supervisor.');
    } elseif ($status === 'unavailable' && $reason !== 'game') {
        $gameSchool = '';
        $gameLocation = '';
        $gameTime = '';
        $gameCity = '';
        $supervisor = '';
    }

    $existing = db()->prepare(
        "SELECT id
         FROM official_availability
         WHERE official_id = ? AND availability_date = ?
         ORDER BY id ASC
         LIMIT 1"
    );
    $existing->execute([$officialId, $date]);
    $existingId = (int) ($existing->fetchColumn() ?: 0);

    if ($existingId > 0) {
        $stmt = db()->prepare(
            "UPDATE official_availability
             SET status = :status,
                 reason = :reason,
                 game_school = :game_school,
                 game_location = :game_location,
                 game_time = :game_time,
                 game_city = :game_city,
                 supervisor = :supervisor,
                 notes = :notes,
                 contact_required = :contact_required,
                 updated_at = NOW()
             WHERE id = :id AND official_id = :official_id"
        );
        $stmt->execute([
            ':id' => $existingId,
            ':official_id' => $officialId,
            ':status' => $status,
            ':reason' => $reason,
            ':game_school' => $gameSchool,
            ':game_location' => $gameLocation,
            ':game_time' => $gameTime,
            ':game_city' => $gameCity ?: $gameLocation,
            ':supervisor' => $supervisor,
            ':notes' => $notes,
            ':contact_required' => $contactRequired ? 1 : 0,
        ]);
    } else {
        $stmt = db()->prepare(
            "INSERT INTO official_availability
                (official_id, availability_date, status, reason, game_school, game_location, game_time, game_city, supervisor, notes, contact_required, updated_at)
             VALUES
                (:official_id, :availability_date, :status, :reason, :game_school, :game_location, :game_time, :game_city, :supervisor, :notes, :contact_required, NOW())"
        );
        $stmt->execute([
            ':official_id' => $officialId,
            ':availability_date' => $date,
            ':status' => $status,
            ':reason' => $reason,
            ':game_school' => $gameSchool,
            ':game_location' => $gameLocation,
            ':game_time' => $gameTime,
            ':game_city' => $gameCity ?: $gameLocation,
            ':supervisor' => $supervisor,
            ':notes' => $notes,
            ':contact_required' => $contactRequired ? 1 : 0,
        ]);
    }

    echo json_encode([
        'success' => true,
        'message' => 'Availability calendar updated.',
        'availability' => rtbo_official_availability_rows($officialId),
    ], JSON_UNESCAPED_SLASHES);
} catch (Throwable $error) {
    error_log('RTBO official availability action failed: ' . $error->getMessage());
    http_response_code(422);
    echo json_encode(['success' => false, 'message' => $error->getMessage()]);
}

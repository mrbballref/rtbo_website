<?php
declare(strict_types=1);

require_once __DIR__ . '/notifications.php';

function rtbo_ensure_schedule_review_table(): void
{
    db()->exec(
        "CREATE TABLE IF NOT EXISTS assignment_schedule_reviews (
            id INT AUTO_INCREMENT PRIMARY KEY,
            official_id INT NOT NULL,
            official_name VARCHAR(190) NULL,
            assignment_count INT NOT NULL DEFAULT 0,
            accepted_assignment_count INT NOT NULL DEFAULT 0,
            reviewed_at DATETIME NOT NULL,
            ip_address VARCHAR(80) NULL,
            user_agent VARCHAR(500) NULL,
            metadata JSON NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_schedule_reviews_official (official_id),
            INDEX idx_schedule_reviews_reviewed (reviewed_at)
        )"
    );
}

function rtbo_record_accepted_schedule_review(array $official, array $assignments): void
{
    $officialId = (int) ($official['id'] ?? 0);
    if ($officialId <= 0) {
        return;
    }

    $accepted = array_values(array_filter($assignments, static function (array $assignment): bool {
        return strtolower((string) ($assignment['assignment_status'] ?? $assignment['status'] ?? '')) === 'accepted';
    }));

    if ($accepted === []) {
        return;
    }

    try {
        rtbo_ensure_schedule_review_table();
        $recent = db()->prepare(
            "SELECT id
             FROM assignment_schedule_reviews
             WHERE official_id = ?
               AND reviewed_at >= DATE_SUB(NOW(), INTERVAL 30 MINUTE)
             ORDER BY reviewed_at DESC
             LIMIT 1"
        );
        $recent->execute([$officialId]);
        if ($recent->fetchColumn()) {
            return;
        }

        $name = trim((string) ($official['name'] ?? ''));
        if ($name === '') {
            $name = trim((string) ($official['first_name'] ?? '') . ' ' . (string) ($official['last_name'] ?? ''));
        }
        $name = $name !== '' ? $name : (string) ($official['email'] ?? 'Official');
        $reviewedAt = date('Y-m-d H:i:s');
        $scheduleItems = array_slice(array_map(static function (array $assignment): array {
            return [
                'assignment_id' => (int) ($assignment['assignment_id'] ?? 0),
                'game_id' => (int) ($assignment['id'] ?? $assignment['game_id'] ?? 0),
                'game_date' => (string) ($assignment['game_date'] ?? ''),
                'game_time' => (string) ($assignment['game_time'] ?? ''),
                'home_team' => (string) ($assignment['home_team'] ?? ''),
                'away_team' => (string) ($assignment['away_team'] ?? ''),
                'location_name' => (string) ($assignment['location_name'] ?? ''),
            ];
        }, $accepted), 0, 10);

        $stmt = db()->prepare(
            "INSERT INTO assignment_schedule_reviews(
                official_id, official_name, assignment_count, accepted_assignment_count, reviewed_at, ip_address, user_agent, metadata
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
        );
        $stmt->execute([
            $officialId,
            $name,
            count($assignments),
            count($accepted),
            $reviewedAt,
            substr((string) ($_SERVER['REMOTE_ADDR'] ?? ''), 0, 80),
            substr((string) ($_SERVER['HTTP_USER_AGENT'] ?? ''), 0, 500),
            json_encode(['schedule_items' => $scheduleItems], JSON_UNESCAPED_SLASHES),
        ]);

        rtbo_notify_admins([
            'type' => 'accepted_schedule_reviewed',
            'title' => 'Accepted schedule reviewed',
            'body' => "{$name} reviewed their game schedule after accepting assignments at {$reviewedAt}.",
            'related_type' => 'assignment_schedule_review',
            'related_id' => (int) db()->lastInsertId(),
            'metadata' => [
                'official_id' => $officialId,
                'official_name' => $name,
                'accepted_assignment_count' => count($accepted),
                'reviewed_at' => $reviewedAt,
                'schedule_items' => $scheduleItems,
            ],
            'actor' => $official,
        ]);
    } catch (Throwable $error) {
        error_log('RTBO accepted schedule review notification failed: ' . $error->getMessage());
    }
}

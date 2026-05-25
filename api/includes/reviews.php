<?php
declare(strict_types=1);

function rtbo_review_storage_path(): string
{
    return STORAGE_DIR . '/attendee-reviews.json';
}

function rtbo_review_file_load(): array
{
    $path = rtbo_review_storage_path();
    if (!is_file($path)) {
        return ['reviews' => []];
    }

    $data = json_decode((string) file_get_contents($path), true);
    if (!is_array($data)) {
        return ['reviews' => []];
    }

    return [
        'reviews' => is_array($data['reviews'] ?? null) ? $data['reviews'] : [],
    ];
}

function rtbo_review_file_save(array $data): void
{
    ensure_dir(dirname(rtbo_review_storage_path()));
    file_put_contents(
        rtbo_review_storage_path(),
        json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . PHP_EOL,
        LOCK_EX
    );
}

function ensure_attendee_review_tables(): void
{
    db()->exec(
        "CREATE TABLE IF NOT EXISTS attendee_reviews (
            review_id VARCHAR(64) PRIMARY KEY,
            full_name VARCHAR(200) NOT NULL,
            email VARCHAR(190) NOT NULL,
            phone VARCHAR(60) NULL,
            experience_type VARCHAR(80) NOT NULL,
            school_or_course VARCHAR(190) NOT NULL,
            attendee_role VARCHAR(80) NOT NULL,
            rating TINYINT NOT NULL,
            review_text TEXT NOT NULL,
            photo_path VARCHAR(500) NULL,
            public_consent TINYINT(1) NOT NULL DEFAULT 0,
            contact_ok TINYINT(1) NOT NULL DEFAULT 0,
            status VARCHAR(40) NOT NULL DEFAULT 'pending',
            payload LONGTEXT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_attendee_reviews_status (status),
            INDEX idx_attendee_reviews_created (created_at),
            INDEX idx_attendee_reviews_experience (experience_type)
        )"
    );

    try {
        db()->exec("ALTER TABLE attendee_reviews ADD COLUMN photo_path VARCHAR(500) NULL AFTER review_text");
    } catch (Throwable $error) {
        if (!str_contains(strtolower($error->getMessage()), 'duplicate')) {
            error_log('RTBO attendee review photo column migration skipped: ' . $error->getMessage());
        }
    }
}

function save_attendee_review(array $review): void
{
    try {
        ensure_attendee_review_tables();

        $stmt = db()->prepare(
            "INSERT INTO attendee_reviews (
                review_id,
                full_name,
                email,
                phone,
                experience_type,
                school_or_course,
                attendee_role,
                rating,
                review_text,
                photo_path,
                public_consent,
                contact_ok,
                status,
                payload
            ) VALUES (
                :review_id,
                :full_name,
                :email,
                :phone,
                :experience_type,
                :school_or_course,
                :attendee_role,
                :rating,
                :review_text,
                :photo_path,
                :public_consent,
                :contact_ok,
                :status,
                :payload
            )"
        );
        $stmt->execute([
            ':review_id' => $review['review_id'],
            ':full_name' => $review['full_name'],
            ':email' => $review['email'],
            ':phone' => $review['phone'],
            ':experience_type' => $review['experience_type'],
            ':school_or_course' => $review['school_or_course'],
            ':attendee_role' => $review['attendee_role'],
            ':rating' => $review['rating'],
            ':review_text' => $review['review_text'],
            ':photo_path' => (string) ($review['photo_path'] ?? ''),
            ':public_consent' => $review['public_consent'] ? 1 : 0,
            ':contact_ok' => $review['contact_ok'] ? 1 : 0,
            ':status' => $review['status'],
            ':payload' => json_encode($review, JSON_UNESCAPED_SLASHES),
        ]);
        return;
    } catch (Throwable $error) {
        error_log('RTBO attendee review database save using file fallback: ' . $error->getMessage());
    }

    $data = rtbo_review_file_load();
    array_unshift($data['reviews'], $review);
    $data['reviews'] = array_slice($data['reviews'], 0, 500);
    rtbo_review_file_save($data);
}

function recent_attendee_reviews(int $limit = 50): array
{
    try {
        ensure_attendee_review_tables();
        $stmt = db()->prepare("SELECT * FROM attendee_reviews ORDER BY created_at DESC LIMIT ?");
        $stmt->bindValue(1, $limit, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetchAll();
    } catch (Throwable $error) {
        error_log('RTBO attendee reviews using file fallback: ' . $error->getMessage());
        return array_slice(rtbo_review_file_load()['reviews'], 0, $limit);
    }
}

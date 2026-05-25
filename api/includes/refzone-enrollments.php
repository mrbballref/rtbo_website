<?php
declare(strict_types=1);

function rtbo_refzone_membership_packages(): array
{
    return [
        'fundamentals' => [
            'id' => 'fundamentals',
            'name' => 'NFHS Membership',
            'description' => 'Self-paced RefZone University NFHS course access with readings, lecture notes, visual aids, quizzes, tests, and progress tracking.',
            'amount_cents' => 2500,
            'currency' => 'USD',
            'stripe_price_id' => STRIPE_REFZONE_FUNDAMENTALS_PRICE_ID,
            'paypal_plan_id' => PAYPAL_REFZONE_FUNDAMENTALS_PLAN_ID,
        ],
        'advantage' => [
            'id' => 'advantage',
            'name' => 'NCAA Membership',
            'description' => 'RefZone University NCAA course access plus monthly RefRoom study sessions, film lab work, and priority course support.',
            'amount_cents' => 4900,
            'currency' => 'USD',
            'stripe_price_id' => STRIPE_REFZONE_ADVANTAGE_PRICE_ID,
            'paypal_plan_id' => PAYPAL_REFZONE_ADVANTAGE_PLAN_ID,
        ],
        'elite' => [
            'id' => 'elite',
            'name' => 'ProAm Membership',
            'description' => 'Advanced RefZone University ProAm membership with mentor evaluation checkpoints, portfolio review, and advancement guidance.',
            'amount_cents' => 7900,
            'currency' => 'USD',
            'stripe_price_id' => STRIPE_REFZONE_ELITE_PRICE_ID,
            'paypal_plan_id' => PAYPAL_REFZONE_ELITE_PLAN_ID,
        ],
    ];
}

function rtbo_refzone_membership_package(string $packageId): ?array
{
    $packageId = strtolower(trim($packageId));
    $packages = rtbo_refzone_membership_packages();

    return $packages[$packageId] ?? null;
}

function rtbo_refzone_enrollments_path(): string
{
    ensure_dir(STORAGE_DIR);

    return STORAGE_DIR . '/refzone-enrollments.json';
}

function rtbo_refzone_read_file_enrollments(): array
{
    $path = rtbo_refzone_enrollments_path();
    if (!is_file($path)) {
        return [];
    }

    $records = json_decode((string) file_get_contents($path), true);

    return is_array($records) ? $records : [];
}

function rtbo_refzone_write_file_enrollments(array $records): void
{
    file_put_contents(
        rtbo_refzone_enrollments_path(),
        json_encode(array_values($records), JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES),
        LOCK_EX
    );
}

function rtbo_refzone_save_file_enrollment(array $enrollment): void
{
    $records = rtbo_refzone_read_file_enrollments();
    $updated = false;
    foreach ($records as &$record) {
        if ((string) ($record['id'] ?? '') === (string) ($enrollment['id'] ?? '')) {
            $record = array_merge($record, $enrollment, ['updated_at' => date('c')]);
            $updated = true;
            break;
        }
    }
    unset($record);

    if (!$updated) {
        $records[] = $enrollment;
    }

    rtbo_refzone_write_file_enrollments($records);
}

function ensure_refzone_enrollment_tables(): void
{
    db()->exec(
        "CREATE TABLE IF NOT EXISTS refzone_enrollments (
            id VARCHAR(64) PRIMARY KEY,
            full_name VARCHAR(200) NOT NULL,
            email VARCHAR(190) NOT NULL,
            phone VARCHAR(60) NULL,
            package_id VARCHAR(80) NOT NULL,
            package_name VARCHAR(160) NOT NULL,
            amount_cents INT NOT NULL DEFAULT 0,
            currency VARCHAR(10) NOT NULL DEFAULT 'USD',
            course_track VARCHAR(80) NOT NULL,
            experience_level VARCHAR(120) NOT NULL,
            membership_goal VARCHAR(255) NULL,
            development_notes TEXT NULL,
            payment_provider VARCHAR(40) NOT NULL,
            payment_status VARCHAR(40) NOT NULL DEFAULT 'pending',
            stripe_checkout_session_id VARCHAR(190) NULL,
            stripe_subscription_id VARCHAR(190) NULL,
            paypal_subscription_id VARCHAR(190) NULL,
            paid_at DATETIME NULL,
            payload JSON NULL,
            submitted_at DATETIME NOT NULL,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_refzone_enrollments_email (email),
            INDEX idx_refzone_enrollments_package (package_id),
            INDEX idx_refzone_enrollments_status (payment_status),
            INDEX idx_refzone_enrollments_submitted (submitted_at)
        )"
    );
}

function save_refzone_enrollment_record(array $enrollment): void
{
    try {
        ensure_refzone_enrollment_tables();
        $submittedAt = strtotime((string) ($enrollment['submitted_at'] ?? '')) ?: time();
        $stmt = db()->prepare(
            "INSERT INTO refzone_enrollments (
                id, full_name, email, phone, package_id, package_name, amount_cents, currency,
                course_track, experience_level, membership_goal, development_notes, payment_provider,
                payment_status, stripe_checkout_session_id, stripe_subscription_id, paypal_subscription_id,
                paid_at, payload, submitted_at
            ) VALUES (
                :id, :full_name, :email, :phone, :package_id, :package_name, :amount_cents, :currency,
                :course_track, :experience_level, :membership_goal, :development_notes, :payment_provider,
                :payment_status, :stripe_checkout_session_id, :stripe_subscription_id, :paypal_subscription_id,
                :paid_at, :payload, :submitted_at
            ) ON DUPLICATE KEY UPDATE
                full_name = VALUES(full_name),
                email = VALUES(email),
                phone = VALUES(phone),
                package_id = VALUES(package_id),
                package_name = VALUES(package_name),
                amount_cents = VALUES(amount_cents),
                currency = VALUES(currency),
                course_track = VALUES(course_track),
                experience_level = VALUES(experience_level),
                membership_goal = VALUES(membership_goal),
                development_notes = VALUES(development_notes),
                payment_provider = VALUES(payment_provider),
                payment_status = VALUES(payment_status),
                stripe_checkout_session_id = VALUES(stripe_checkout_session_id),
                stripe_subscription_id = VALUES(stripe_subscription_id),
                paypal_subscription_id = VALUES(paypal_subscription_id),
                paid_at = VALUES(paid_at),
                payload = VALUES(payload),
                submitted_at = VALUES(submitted_at)"
        );

        $stmt->execute([
            ':id' => (string) ($enrollment['id'] ?? ''),
            ':full_name' => (string) ($enrollment['full_name'] ?? ''),
            ':email' => (string) ($enrollment['email'] ?? ''),
            ':phone' => rtbo_format_phone_number((string) ($enrollment['phone'] ?? '')),
            ':package_id' => (string) ($enrollment['package_id'] ?? ''),
            ':package_name' => (string) ($enrollment['package_name'] ?? ''),
            ':amount_cents' => (int) ($enrollment['amount_cents'] ?? 0),
            ':currency' => strtoupper((string) ($enrollment['currency'] ?? 'USD')),
            ':course_track' => (string) ($enrollment['course_track'] ?? ''),
            ':experience_level' => (string) ($enrollment['experience_level'] ?? ''),
            ':membership_goal' => (string) ($enrollment['membership_goal'] ?? ''),
            ':development_notes' => (string) ($enrollment['development_notes'] ?? ''),
            ':payment_provider' => (string) ($enrollment['payment_provider'] ?? ''),
            ':payment_status' => (string) ($enrollment['payment_status'] ?? 'pending'),
            ':stripe_checkout_session_id' => (string) ($enrollment['stripe_checkout_session_id'] ?? ''),
            ':stripe_subscription_id' => (string) ($enrollment['stripe_subscription_id'] ?? ''),
            ':paypal_subscription_id' => (string) ($enrollment['paypal_subscription_id'] ?? ''),
            ':paid_at' => empty($enrollment['paid_at']) ? null : date('Y-m-d H:i:s', strtotime((string) $enrollment['paid_at'])),
            ':payload' => json_encode($enrollment, JSON_UNESCAPED_SLASHES),
            ':submitted_at' => date('Y-m-d H:i:s', $submittedAt),
        ]);
    } catch (Throwable $error) {
        error_log('RTBO RefZone enrollment database save failed: ' . $error->getMessage());
    }

    rtbo_refzone_save_file_enrollment($enrollment);
}

function find_refzone_enrollment(string $enrollmentId): ?array
{
    try {
        ensure_refzone_enrollment_tables();
        $stmt = db()->prepare("SELECT * FROM refzone_enrollments WHERE id = ? LIMIT 1");
        $stmt->execute([$enrollmentId]);
        $enrollment = $stmt->fetch();
        if ($enrollment) {
            $payload = json_decode((string) ($enrollment['payload'] ?? ''), true);
            if (is_array($payload)) {
                return array_merge($payload, array_filter($enrollment, static fn($value) => $value !== null));
            }

            return $enrollment;
        }
    } catch (Throwable $error) {
        error_log('RTBO RefZone enrollment database lookup failed: ' . $error->getMessage());
    }

    foreach (rtbo_refzone_read_file_enrollments() as $enrollment) {
        if ((string) ($enrollment['id'] ?? '') === $enrollmentId) {
            return $enrollment;
        }
    }

    return null;
}

function update_refzone_enrollment_payment(string $enrollmentId, string $status, array $updates = []): void
{
    $existing = find_refzone_enrollment($enrollmentId) ?? ['id' => $enrollmentId];
    if (($existing['payment_status'] ?? '') === 'paid' && $status !== 'paid') {
        return;
    }

    $payload = array_merge($existing, $updates, [
        'payment_status' => $status,
        'updated_at' => date('c'),
    ]);
    if ($status === 'paid' && empty($payload['paid_at'])) {
        $payload['paid_at'] = date('c');
    }

    save_refzone_enrollment_record($payload);
}

<?php
declare(strict_types=1);

function ensure_registration_tables(): void
{
    db()->exec(
        "CREATE TABLE IF NOT EXISTS school_registrations (
            id VARCHAR(64) PRIMARY KEY,
            user_id INT NULL,
            first_name VARCHAR(100),
            last_name VARCHAR(100),
            full_name VARCHAR(200),
            email VARCHAR(190),
            phone VARCHAR(60),
            address_1 VARCHAR(190),
            address_2 VARCHAR(190),
            city VARCHAR(120),
            state VARCHAR(80),
            zip VARCHAR(30),
            experience VARCHAR(120),
            gender VARCHAR(80),
            sex VARCHAR(40),
            race VARCHAR(120),
            levels TEXT,
            current_conferences TEXT,
            referred VARCHAR(20),
            referral_name VARCHAR(190),
            goals TEXT,
            sessions TEXT,
            amount_cents INT DEFAULT 0,
            payment_provider VARCHAR(40),
            payment_status VARCHAR(40),
            waiver_agreement VARCHAR(40),
            printed_signature VARCHAR(190),
            signature TEXT,
            profile_photo_path VARCHAR(500),
            pdf_path VARCHAR(500),
            got_u_nex_ref_sync_status VARCHAR(40),
            payload JSON,
            submitted_at DATETIME,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )"
    );

    foreach ([
        'paid_at' => "ALTER TABLE school_registrations ADD COLUMN paid_at DATETIME NULL AFTER payment_status",
        'payment_confirmation_sent_at' => "ALTER TABLE school_registrations ADD COLUMN payment_confirmation_sent_at DATETIME NULL AFTER paid_at",
        'user_id' => "ALTER TABLE school_registrations ADD COLUMN user_id INT NULL AFTER id",
        'sex' => "ALTER TABLE school_registrations ADD COLUMN sex VARCHAR(40) NULL AFTER gender",
        'race' => "ALTER TABLE school_registrations ADD COLUMN race VARCHAR(120) NULL AFTER gender",
    ] as $column => $sql) {
        $stmt = db()->prepare(
            "SELECT COUNT(*)
             FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE()
               AND TABLE_NAME = 'school_registrations'
               AND COLUMN_NAME = ?"
        );
        $stmt->execute([$column]);
        if ((int) $stmt->fetchColumn() === 0) {
            db()->exec($sql);
        }
    }
}

function save_school_registration_record(array $registration): void
{
    ensure_registration_tables();

    $stmt = db()->prepare(
        "INSERT INTO school_registrations (
            id, user_id, first_name, last_name, full_name, email, phone, address_1, address_2, city, state, zip,
            experience, gender, sex, race, levels, current_conferences, referred, referral_name, goals, sessions,
            amount_cents, payment_provider, payment_status, waiver_agreement, printed_signature, signature,
            profile_photo_path, pdf_path, got_u_nex_ref_sync_status, payload, submitted_at
        ) VALUES (
            :id, :user_id, :first_name, :last_name, :full_name, :email, :phone, :address_1, :address_2, :city, :state, :zip,
            :experience, :gender, :sex, :race, :levels, :current_conferences, :referred, :referral_name, :goals, :sessions,
            :amount_cents, :payment_provider, :payment_status, :waiver_agreement, :printed_signature, :signature,
            :profile_photo_path, :pdf_path, :got_u_nex_ref_sync_status, :payload, :submitted_at
        ) ON DUPLICATE KEY UPDATE
            first_name = VALUES(first_name),
            user_id = VALUES(user_id),
            last_name = VALUES(last_name),
            full_name = VALUES(full_name),
            email = VALUES(email),
            phone = VALUES(phone),
            address_1 = VALUES(address_1),
            address_2 = VALUES(address_2),
            city = VALUES(city),
            state = VALUES(state),
            zip = VALUES(zip),
            experience = VALUES(experience),
            gender = VALUES(gender),
            sex = VALUES(sex),
            race = VALUES(race),
            levels = VALUES(levels),
            current_conferences = VALUES(current_conferences),
            referred = VALUES(referred),
            referral_name = VALUES(referral_name),
            goals = VALUES(goals),
            sessions = VALUES(sessions),
            amount_cents = VALUES(amount_cents),
            payment_provider = VALUES(payment_provider),
            payment_status = VALUES(payment_status),
            waiver_agreement = VALUES(waiver_agreement),
            printed_signature = VALUES(printed_signature),
            signature = VALUES(signature),
            profile_photo_path = VALUES(profile_photo_path),
            pdf_path = VALUES(pdf_path),
            got_u_nex_ref_sync_status = VALUES(got_u_nex_ref_sync_status),
            payload = VALUES(payload),
            submitted_at = VALUES(submitted_at)"
    );

    $submittedAt = strtotime((string) ($registration['submitted_at'] ?? '')) ?: time();
    $stmt->execute([
        ':id' => (string) ($registration['id'] ?? ''),
        ':user_id' => isset($registration['user_id']) ? (int) $registration['user_id'] : null,
        ':first_name' => (string) ($registration['first_name'] ?? ''),
        ':last_name' => (string) ($registration['last_name'] ?? ''),
        ':full_name' => (string) ($registration['full_name'] ?? ''),
        ':email' => (string) ($registration['email'] ?? ''),
        ':phone' => rtbo_format_phone_number((string) ($registration['phone'] ?? '')),
        ':address_1' => (string) ($registration['address_1'] ?? ''),
        ':address_2' => (string) ($registration['address_2'] ?? ''),
        ':city' => (string) ($registration['city'] ?? ''),
        ':state' => (string) ($registration['state'] ?? ''),
        ':zip' => (string) ($registration['zip'] ?? ''),
        ':experience' => (string) ($registration['experience'] ?? ''),
        ':gender' => (string) ($registration['gender'] ?? ''),
        ':sex' => (string) ($registration['sex'] ?? $registration['gender'] ?? ''),
        ':race' => (string) ($registration['race'] ?? ''),
        ':levels' => implode(', ', is_array($registration['levels'] ?? null) ? $registration['levels'] : []),
        ':current_conferences' => (string) ($registration['current_conferences'] ?? ''),
        ':referred' => (string) ($registration['referred'] ?? ''),
        ':referral_name' => (string) ($registration['referral_name'] ?? ''),
        ':goals' => (string) ($registration['goals'] ?? ''),
        ':sessions' => implode(', ', is_array($registration['sessions'] ?? null) ? $registration['sessions'] : []),
        ':amount_cents' => (int) ($registration['amount_cents'] ?? 0),
        ':payment_provider' => (string) ($registration['payment_provider'] ?? ''),
        ':payment_status' => (string) ($registration['payment_status'] ?? ''),
        ':waiver_agreement' => (string) ($registration['waiver_agreement'] ?? ''),
        ':printed_signature' => (string) ($registration['printed_signature'] ?? ''),
        ':signature' => (string) ($registration['signature'] ?? ''),
        ':profile_photo_path' => (string) ($registration['profile_photo_path'] ?? ''),
        ':pdf_path' => (string) ($registration['pdf_path'] ?? ''),
        ':got_u_nex_ref_sync_status' => (string) ($registration['got_u_nex_ref_sync']['status'] ?? ''),
        ':payload' => json_encode($registration, JSON_UNESCAPED_SLASHES),
        ':submitted_at' => date('Y-m-d H:i:s', $submittedAt),
    ]);
}

function recent_school_registrations(int $limit = 50): array
{
    ensure_registration_tables();
    $stmt = db()->prepare("SELECT * FROM school_registrations ORDER BY submitted_at DESC LIMIT ?");
    $stmt->bindValue(1, $limit, PDO::PARAM_INT);
    $stmt->execute();
    return $stmt->fetchAll();
}

function find_school_registration(string $registrationId): ?array
{
    ensure_registration_tables();
    $stmt = db()->prepare("SELECT * FROM school_registrations WHERE id = ? LIMIT 1");
    $stmt->execute([$registrationId]);
    $registration = $stmt->fetch();
    if (!$registration) {
        return null;
    }

    $payload = json_decode((string) ($registration['payload'] ?? ''), true);
    if (is_array($payload)) {
        $registration = array_merge($payload, array_filter($registration, static fn($value) => $value !== null));
    }

    foreach (['levels', 'sessions'] as $key) {
        if (isset($registration[$key]) && !is_array($registration[$key])) {
            $registration[$key] = array_values(array_filter(array_map('trim', explode(',', (string) $registration[$key]))));
        }
    }

    return $registration;
}

function update_school_registration_payment(string $registrationId, string $status, array $updates = []): void
{
    ensure_registration_tables();
    $existing = find_school_registration($registrationId);
    if (($existing['payment_status'] ?? '') === 'paid' && $status !== 'paid') {
        return;
    }
    $payload = is_array($existing) ? array_merge($existing, $updates, ['payment_status' => $status]) : array_merge($updates, ['payment_status' => $status]);
    if ($status === 'paid' && empty($payload['paid_at'])) {
        $payload['paid_at'] = date('c');
    }

    $stmt = db()->prepare(
        "UPDATE school_registrations
         SET payment_status = ?,
             paid_at = COALESCE(?, paid_at),
             payment_confirmation_sent_at = COALESCE(?, payment_confirmation_sent_at),
             payload = ?,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?"
    );
    $stmt->execute([
        $status,
        isset($payload['paid_at']) ? date('Y-m-d H:i:s', strtotime((string) $payload['paid_at'])) : null,
        isset($payload['payment_confirmation_sent_at']) ? date('Y-m-d H:i:s', strtotime((string) $payload['payment_confirmation_sent_at'])) : null,
        json_encode($payload, JSON_UNESCAPED_SLASHES),
        $registrationId,
    ]);

    $jsonPath = REGISTRATION_DIR . '/' . $registrationId . '.json';
    if (is_file($jsonPath)) {
        file_put_contents($jsonPath, json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES), LOCK_EX);
    }
}

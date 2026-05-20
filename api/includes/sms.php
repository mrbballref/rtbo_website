<?php
declare(strict_types=1);

function rtbo_sms_storage_path(): string
{
    return STORAGE_DIR . '/sms-notifications.json';
}

function rtbo_sms_file_load(): array
{
    $path = rtbo_sms_storage_path();
    if (!is_file($path)) {
        return [];
    }

    $records = json_decode((string) file_get_contents($path), true);
    return is_array($records) ? $records : [];
}

function rtbo_sms_file_save(array $records): void
{
    ensure_dir(dirname(rtbo_sms_storage_path()));
    file_put_contents(
        rtbo_sms_storage_path(),
        json_encode($records, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES),
        LOCK_EX
    );
}

function rtbo_ensure_sms_tables(): void
{
    db()->exec(
        "CREATE TABLE IF NOT EXISTS sms_notifications (
            id INT AUTO_INCREMENT PRIMARY KEY,
            notification_id INT NULL,
            target_user_id INT NULL,
            phone_raw VARCHAR(80) NULL,
            phone_e164 VARCHAR(32) NULL,
            provider VARCHAR(40) NOT NULL DEFAULT 'twilio',
            status VARCHAR(50) NOT NULL,
            message TEXT NOT NULL,
            provider_message_id VARCHAR(120) NULL,
            error TEXT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            sent_at DATETIME NULL,
            INDEX idx_sms_notifications_notification (notification_id),
            INDEX idx_sms_notifications_user (target_user_id),
            INDEX idx_sms_notifications_status (status),
            INDEX idx_sms_notifications_created (created_at)
        )"
    );
}

function rtbo_sms_db_available(): bool
{
    try {
        rtbo_ensure_sms_tables();
        return true;
    } catch (Throwable $error) {
        error_log('RTBO SMS using file fallback: ' . $error->getMessage());
        return false;
    }
}

function rtbo_sms_log(array $record): array
{
    $record = [
        'notification_id' => isset($record['notification_id']) ? (int) $record['notification_id'] : null,
        'target_user_id' => isset($record['target_user_id']) ? (int) $record['target_user_id'] : null,
        'phone_raw' => trim((string) ($record['phone_raw'] ?? '')),
        'phone_e164' => trim((string) ($record['phone_e164'] ?? '')),
        'provider' => trim((string) ($record['provider'] ?? 'twilio')) ?: 'twilio',
        'status' => trim((string) ($record['status'] ?? 'queued')),
        'message' => trim((string) ($record['message'] ?? '')),
        'provider_message_id' => trim((string) ($record['provider_message_id'] ?? '')),
        'error' => trim((string) ($record['error'] ?? '')),
        'created_at' => date('c'),
        'sent_at' => trim((string) ($record['sent_at'] ?? '')),
    ];

    if (!rtbo_sms_db_available()) {
        $records = rtbo_sms_file_load();
        $record['id'] = count($records) + 1;
        array_unshift($records, $record);
        rtbo_sms_file_save($records);
        return $record;
    }

    $stmt = db()->prepare(
        "INSERT INTO sms_notifications(
            notification_id, target_user_id, phone_raw, phone_e164, provider, status,
            message, provider_message_id, error, sent_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    );
    $stmt->execute([
        $record['notification_id'],
        $record['target_user_id'],
        $record['phone_raw'] !== '' ? $record['phone_raw'] : null,
        $record['phone_e164'] !== '' ? $record['phone_e164'] : null,
        $record['provider'],
        $record['status'],
        $record['message'],
        $record['provider_message_id'] !== '' ? $record['provider_message_id'] : null,
        $record['error'] !== '' ? $record['error'] : null,
        $record['sent_at'] !== '' ? $record['sent_at'] : null,
    ]);
    $record['id'] = (int) db()->lastInsertId();

    return $record;
}

function rtbo_sms_normalize_phone(string $phone): string
{
    $phone = trim($phone);
    if ($phone === '') {
        return '';
    }

    $digits = preg_replace('/\D+/', '', $phone) ?: '';
    if ($digits === '') {
        return '';
    }

    if (str_starts_with($phone, '+')) {
        return '+' . $digits;
    }

    if (strlen($digits) === 10) {
        return '+' . preg_replace('/\D+/', '', RTBO_SMS_DEFAULT_COUNTRY_CODE) . $digits;
    }

    if (strlen($digits) === 11 && str_starts_with($digits, '1')) {
        return '+' . $digits;
    }

    return strlen($digits) >= 8 && strlen($digits) <= 15 ? '+' . $digits : '';
}

function rtbo_sms_message_for_notification(array $notification): string
{
    $title = trim(strip_tags((string) ($notification['title'] ?? 'RTBO Notification')));
    $body = trim(strip_tags((string) ($notification['body'] ?? '')));
    $message = trim('RTBO: ' . $title . ($body !== '' ? ' - ' . $body : ''));
    $message = preg_replace('/\s+/', ' ', $message) ?: 'RTBO: You have a new notification.';

    if (strlen($message) <= 480) {
        return $message;
    }

    return rtrim(substr($message, 0, 477)) . '...';
}

function rtbo_sms_send_twilio(string $to, string $message): array
{
    if (!RTBO_SMS_ENABLED) {
        return ['status' => 'disabled', 'provider_message_id' => '', 'error' => 'SMS delivery is disabled.'];
    }

    if (RTBO_SMS_DRY_RUN) {
        return ['status' => 'dry_run', 'provider_message_id' => '', 'error' => 'SMS dry run is enabled.'];
    }

    if (TWILIO_ACCOUNT_SID === '' || TWILIO_AUTH_TOKEN === '' || TWILIO_FROM_NUMBER === '') {
        return ['status' => 'not_configured', 'provider_message_id' => '', 'error' => 'Twilio credentials are not configured.'];
    }

    if (!function_exists('curl_init')) {
        return ['status' => 'failed', 'provider_message_id' => '', 'error' => 'PHP cURL extension is not available.'];
    }

    $endpoint = 'https://api.twilio.com/2010-04-01/Accounts/' . rawurlencode(TWILIO_ACCOUNT_SID) . '/Messages.json';
    $handle = curl_init($endpoint);
    curl_setopt_array($handle, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => http_build_query([
            'From' => TWILIO_FROM_NUMBER,
            'To' => $to,
            'Body' => $message,
        ]),
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 10,
        CURLOPT_USERPWD => TWILIO_ACCOUNT_SID . ':' . TWILIO_AUTH_TOKEN,
    ]);

    $responseBody = (string) curl_exec($handle);
    $curlError = (string) curl_error($handle);
    $statusCode = (int) curl_getinfo($handle, CURLINFO_RESPONSE_CODE);
    curl_close($handle);

    $decoded = json_decode($responseBody, true);
    $providerId = is_array($decoded) ? (string) ($decoded['sid'] ?? '') : '';

    if ($curlError !== '') {
        return ['status' => 'failed', 'provider_message_id' => $providerId, 'error' => $curlError];
    }

    if ($statusCode < 200 || $statusCode >= 300) {
        $error = is_array($decoded)
            ? (string) ($decoded['message'] ?? $responseBody)
            : $responseBody;
        return ['status' => 'failed', 'provider_message_id' => $providerId, 'error' => $error];
    }

    return ['status' => 'sent', 'provider_message_id' => $providerId, 'error' => ''];
}

function rtbo_sms_dispatch_to_user(array $user, array $notification): ?array
{
    $rawPhone = trim((string) ($user['phone'] ?? ''));
    $e164Phone = rtbo_sms_normalize_phone($rawPhone);
    $message = rtbo_sms_message_for_notification($notification);

    if ($rawPhone === '') {
        return null;
    }

    if ($e164Phone === '') {
        return rtbo_sms_log([
            'notification_id' => (int) ($notification['id'] ?? 0),
            'target_user_id' => (int) ($user['id'] ?? 0),
            'phone_raw' => $rawPhone,
            'status' => 'invalid_phone',
            'message' => $message,
            'error' => 'Phone number could not be normalized for SMS delivery.',
        ]);
    }

    $delivery = rtbo_sms_send_twilio($e164Phone, $message);

    return rtbo_sms_log([
        'notification_id' => (int) ($notification['id'] ?? 0),
        'target_user_id' => (int) ($user['id'] ?? 0),
        'phone_raw' => $rawPhone,
        'phone_e164' => $e164Phone,
        'status' => $delivery['status'] ?? 'failed',
        'message' => $message,
        'provider_message_id' => $delivery['provider_message_id'] ?? '',
        'error' => $delivery['error'] ?? '',
        'sent_at' => ($delivery['status'] ?? '') === 'sent' ? date('Y-m-d H:i:s') : '',
    ]);
}

function rtbo_sms_user_row(array $row): array
{
    return [
        'id' => (int) ($row['id'] ?? 0),
        'role' => (string) ($row['role'] ?? ''),
        'status' => (string) ($row['status'] ?? 'active'),
        'phone' => rtbo_format_phone_number((string) ($row['phone'] ?? '')),
    ];
}

function rtbo_sms_recipients_from_file(array $notification): array
{
    $path = STORAGE_DIR . '/admin-members.json';
    if (!is_file($path)) {
        return [];
    }

    $members = json_decode((string) file_get_contents($path), true);
    if (!is_array($members)) {
        return [];
    }

    $recipients = [];
    foreach ($members as $member) {
        if (!is_array($member) || !rtbo_notification_matches_user($notification, $member)) {
            continue;
        }
        if (($member['status'] ?? 'active') === 'deleted') {
            continue;
        }
        $recipients[] = rtbo_sms_user_row($member);
    }

    return $recipients;
}

function rtbo_sms_recipients_for_notification(array $notification): array
{
    try {
        $conditions = ['status <> "deleted"', 'phone IS NOT NULL', 'phone <> ""'];
        $params = [];
        $audience = rtbo_notification_clean_audience((string) ($notification['audience'] ?? 'user'));

        if ($audience === 'user') {
            $conditions[] = 'id = ?';
            $params[] = (int) ($notification['target_user_id'] ?? 0);
        } elseif ($audience === 'role') {
            $conditions[] = 'role = ?';
            $params[] = (string) ($notification['target_role'] ?? '');
        } elseif ($audience === 'admins') {
            $conditions[] = 'role IN ("super_admin", "admin")';
        } elseif ($audience === 'officials') {
            $conditions[] = 'role = "official"';
        } elseif ($audience === 'coaches') {
            $conditions[] = 'role IN ("coach", "assistant_coach")';
        } elseif ($audience === 'school_admins') {
            $conditions[] = 'role IN ("school_admin", "athletic_director", "assistant_athletic_director", "sports_information_director", "conference_commissioner", "game_day_admin")';
        } elseif ($audience !== 'everyone') {
            return [];
        }

        $stmt = db()->prepare('SELECT id, role, status, phone FROM users WHERE ' . implode(' AND ', $conditions));
        $stmt->execute($params);

        return array_map('rtbo_sms_user_row', $stmt->fetchAll());
    } catch (Throwable $error) {
        error_log('RTBO SMS recipient lookup failed: ' . $error->getMessage());
        return rtbo_sms_recipients_from_file($notification);
    }
}

function rtbo_sms_dispatch_notification(array $notification): array
{
    $sent = [];
    $recipientIds = [];
    foreach (rtbo_sms_recipients_for_notification($notification) as $recipient) {
        $recipientId = (int) ($recipient['id'] ?? 0);
        if ($recipientId <= 0 || isset($recipientIds[$recipientId])) {
            continue;
        }
        $recipientIds[$recipientId] = true;
        $result = rtbo_sms_dispatch_to_user($recipient, $notification);
        if ($result !== null) {
            $sent[] = $result;
        }
    }

    return $sent;
}

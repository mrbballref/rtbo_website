<?php
declare(strict_types=1);

require_once __DIR__ . '/includes/bootstrap.php';
require_once __DIR__ . '/includes/users.php';
require_once __DIR__ . '/includes/admin-members.php';
require_once __DIR__ . '/includes/email.php';
require_once __DIR__ . '/includes/notifications.php';

header('Content-Type: application/json');

function rtbo_refroom_input(): array
{
    $decoded = json_decode((string) file_get_contents('php://input'), true);

    return is_array($decoded) ? $decoded : [];
}

function rtbo_refroom_storage_path(): string
{
    ensure_dir(STORAGE_DIR);

    return STORAGE_DIR . '/refroom-meetings.json';
}

function rtbo_refroom_default_store(): array
{
    return [
        'next_id' => 1,
        'meetings' => [],
    ];
}

function rtbo_refroom_read_store(): array
{
    $path = rtbo_refroom_storage_path();
    if (!is_file($path)) {
        return rtbo_refroom_default_store();
    }

    $data = json_decode((string) file_get_contents($path), true);
    if (!is_array($data)) {
        return rtbo_refroom_default_store();
    }

    return array_merge(rtbo_refroom_default_store(), $data);
}

function rtbo_refroom_write_store(array $store): void
{
    file_put_contents(
        rtbo_refroom_storage_path(),
        json_encode(array_merge(rtbo_refroom_default_store(), $store), JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES),
        LOCK_EX
    );
}

function rtbo_refroom_ensure_table(): void
{
    db()->exec(
        "CREATE TABLE IF NOT EXISTS refroom_meetings (
            id INT AUTO_INCREMENT PRIMARY KEY,
            meeting_code VARCHAR(40) NOT NULL,
            title VARCHAR(190) NOT NULL,
            meeting_date DATE NULL,
            meeting_time VARCHAR(20) NULL,
            starts_at VARCHAR(80) NULL,
            invite_status VARCHAR(60) NOT NULL DEFAULT 'not_sent',
            invite_recipient_count INT NOT NULL DEFAULT 0,
            payload LONGTEXT NOT NULL,
            created_at DATETIME NULL,
            updated_at DATETIME NULL,
            UNIQUE KEY uniq_refroom_meeting_code (meeting_code),
            INDEX idx_refroom_meeting_date (meeting_date),
            INDEX idx_refroom_meeting_status (invite_status)
        )"
    );
}

function rtbo_refroom_db_available(): bool
{
    try {
        rtbo_refroom_ensure_table();
        return true;
    } catch (Throwable $error) {
        error_log('RTBO RefRoom database unavailable, using legacy file fallback: ' . $error->getMessage());
        return false;
    }
}

function rtbo_refroom_datetime_or_null(string $value): ?string
{
    $value = trim($value);
    if ($value === '') {
        return null;
    }

    $time = strtotime($value);
    return $time ? date('Y-m-d H:i:s', $time) : null;
}

function rtbo_refroom_row_to_meeting(array $row): array
{
    $payload = json_decode((string) ($row['payload'] ?? ''), true);
    if (!is_array($payload)) {
        $payload = [];
    }

    return array_merge($payload, [
        'id' => (int) ($payload['id'] ?? $row['id'] ?? 0),
        'meetingCode' => (string) ($payload['meetingCode'] ?? $row['meeting_code'] ?? ''),
        'title' => (string) ($payload['title'] ?? $row['title'] ?? ''),
        'date' => (string) ($payload['date'] ?? $row['meeting_date'] ?? ''),
        'time' => (string) ($payload['time'] ?? $row['meeting_time'] ?? ''),
        'invite_status' => (string) ($payload['invite_status'] ?? $row['invite_status'] ?? 'not_sent'),
        'invite_recipient_count' => (int) ($payload['invite_recipient_count'] ?? $row['invite_recipient_count'] ?? 0),
        'created_at' => (string) ($payload['created_at'] ?? $row['created_at'] ?? ''),
        'updated_at' => (string) ($payload['updated_at'] ?? $row['updated_at'] ?? ''),
    ]);
}

function rtbo_refroom_upsert_database(array $meeting): array
{
    rtbo_refroom_ensure_table();
    $id = (int) ($meeting['id'] ?? 0);
    if ($id > 0) {
        $stmt = db()->prepare(
            "INSERT INTO refroom_meetings(id, meeting_code, title, meeting_date, meeting_time, starts_at, invite_status, invite_recipient_count, payload, created_at, updated_at)
             VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
                meeting_code = VALUES(meeting_code),
                title = VALUES(title),
                meeting_date = VALUES(meeting_date),
                meeting_time = VALUES(meeting_time),
                starts_at = VALUES(starts_at),
                invite_status = VALUES(invite_status),
                invite_recipient_count = VALUES(invite_recipient_count),
                payload = VALUES(payload),
                updated_at = VALUES(updated_at)"
        );
        $stmt->execute(rtbo_refroom_database_params($meeting, $id));
        return $meeting;
    }

    $stmt = db()->prepare(
        "INSERT INTO refroom_meetings(meeting_code, title, meeting_date, meeting_time, starts_at, invite_status, invite_recipient_count, payload, created_at, updated_at)
         VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    );
    $params = rtbo_refroom_database_params($meeting, 0);
    array_shift($params);
    $stmt->execute($params);
    $meeting['id'] = (int) db()->lastInsertId();
    rtbo_refroom_upsert_database($meeting);

    return $meeting;
}

function rtbo_refroom_database_params(array $meeting, int $id): array
{
    return [
        $id,
        (string) ($meeting['meetingCode'] ?? ''),
        (string) ($meeting['title'] ?? ''),
        trim((string) ($meeting['date'] ?? '')) ?: null,
        trim((string) ($meeting['time'] ?? '')) ?: null,
        (string) ($meeting['startsAt'] ?? ''),
        (string) ($meeting['invite_status'] ?? 'not_sent'),
        (int) ($meeting['invite_recipient_count'] ?? 0),
        json_encode($meeting, JSON_UNESCAPED_SLASHES),
        rtbo_refroom_datetime_or_null((string) ($meeting['created_at'] ?? '')),
        rtbo_refroom_datetime_or_null((string) ($meeting['updated_at'] ?? '')),
    ];
}

function rtbo_refroom_read_database_store(): array
{
    rtbo_refroom_ensure_table();
    $rows = db()->query('SELECT * FROM refroom_meetings ORDER BY COALESCE(updated_at, created_at) DESC, id DESC LIMIT 500')->fetchAll();
    if (!$rows) {
        $legacy = rtbo_refroom_read_file_store();
        foreach (($legacy['meetings'] ?? []) as $meeting) {
            if (is_array($meeting) && trim((string) ($meeting['meetingCode'] ?? '')) !== '') {
                rtbo_refroom_upsert_database($meeting);
            }
        }
        $rows = db()->query('SELECT * FROM refroom_meetings ORDER BY COALESCE(updated_at, created_at) DESC, id DESC LIMIT 500')->fetchAll();
    }

    $meetings = array_map('rtbo_refroom_row_to_meeting', $rows);
    $maxId = array_reduce($meetings, static fn (int $carry, array $meeting): int => max($carry, (int) ($meeting['id'] ?? 0)), 0);

    return [
        'next_id' => $maxId + 1,
        'meetings' => $meetings,
    ];
}

function rtbo_refroom_write_database_store(array $store): void
{
    rtbo_refroom_ensure_table();
    $meetings = is_array($store['meetings'] ?? null) ? $store['meetings'] : [];
    db()->beginTransaction();
    try {
        db()->exec('DELETE FROM refroom_meetings');
        foreach ($meetings as $meeting) {
            if (is_array($meeting) && trim((string) ($meeting['meetingCode'] ?? '')) !== '') {
                rtbo_refroom_upsert_database($meeting);
            }
        }
        db()->commit();
    } catch (Throwable $error) {
        db()->rollBack();
        throw $error;
    }
}

function rtbo_refroom_read_file_store(): array
{
    $path = rtbo_refroom_storage_path();
    if (!is_file($path)) {
        return rtbo_refroom_default_store();
    }

    $data = json_decode((string) file_get_contents($path), true);
    if (!is_array($data)) {
        return rtbo_refroom_default_store();
    }

    return array_merge(rtbo_refroom_default_store(), $data);
}

function rtbo_refroom_read_records_store(): array
{
    return rtbo_refroom_db_available() ? rtbo_refroom_read_database_store() : rtbo_refroom_read_file_store();
}

function rtbo_refroom_write_records_store(array $store): void
{
    if (rtbo_refroom_db_available()) {
        rtbo_refroom_write_database_store($store);
        return;
    }

    rtbo_refroom_write_store($store);
}

function rtbo_refroom_text(array $source, string $key): string
{
    return trim((string) ($source[$key] ?? ''));
}

function rtbo_refroom_code(): string
{
    return 'REF-' . strtoupper(substr(bin2hex(random_bytes(3)), 0, 3)) . '-' . strtoupper(substr(bin2hex(random_bytes(3)), 0, 4));
}

function rtbo_refroom_invite_url(string $meetingCode): string
{
    return RTBO_BASE_URL . '/#refroom/' . rawurlencode($meetingCode);
}

function rtbo_refroom_member_options(): array
{
    return array_values(array_filter(array_map(static function (array $member): array {
        return [
            'id' => (int) ($member['id'] ?? 0),
            'name' => trim((string) ($member['name'] ?? trim(($member['first_name'] ?? '') . ' ' . ($member['last_name'] ?? '')))),
            'email' => strtolower(trim((string) ($member['email'] ?? ''))),
            'role' => (string) ($member['role'] ?? ''),
            'role_label' => (string) ($member['role_label'] ?? ''),
            'status' => (string) ($member['status'] ?? ''),
        ];
    }, admin_members_list()), static fn (array $member): bool => ($member['id'] ?? 0) > 0 && filter_var($member['email'] ?? '', FILTER_VALIDATE_EMAIL)));
}

function rtbo_refroom_selected_members(array $memberIds, array $allMembers): array
{
    $wanted = array_values(array_unique(array_filter(array_map('intval', $memberIds))));
    if ($wanted === []) {
        return [];
    }

    return array_values(array_filter($allMembers, static fn (array $member): bool => in_array((int) ($member['id'] ?? 0), $wanted, true)));
}

function rtbo_refroom_meeting_payload(array $source, ?array $existing = null): array
{
    $title = rtbo_refroom_text($source, 'title');
    $date = rtbo_refroom_text($source, 'date');
    $time = rtbo_refroom_text($source, 'time');

    if ($title === '') {
        throw new RuntimeException('Meeting title is required.');
    }
    if ($date === '' || $time === '') {
        throw new RuntimeException('Meeting date and time are required.');
    }

    $memberIds = is_array($source['invited_member_ids'] ?? null) ? $source['invited_member_ids'] : [];
    $invitedEmails = is_array($source['invited_emails'] ?? null) ? $source['invited_emails'] : [];

    return [
        'id' => (int) ($existing['id'] ?? 0),
        'title' => $title,
        'date' => $date,
        'time' => $time,
        'startsAt' => $date . 'T' . $time,
        'purpose' => rtbo_refroom_text($source, 'purpose'),
        'passcode' => rtbo_refroom_text($source, 'passcode'),
        'meetingCode' => (string) ($existing['meetingCode'] ?? rtbo_refroom_code()),
        'invited_member_ids' => array_values(array_unique(array_filter(array_map('intval', $memberIds)))),
        'invited_emails' => rtbo_normalize_email_list(array_map('strval', $invitedEmails)),
        'invite_status' => (string) ($existing['invite_status'] ?? 'not_sent'),
        'invite_sent_at' => (string) ($existing['invite_sent_at'] ?? ''),
        'invite_recipient_count' => (int) ($existing['invite_recipient_count'] ?? 0),
        'created_at' => (string) ($existing['created_at'] ?? date('c')),
        'updated_at' => date('c'),
    ];
}

function rtbo_refroom_invite_body(array $meeting, array $recipients, array $actor): string
{
    $recipientCount = count($recipients);
    $lines = [
        'You have been invited to a RefRoom meeting.',
        '',
        'Meeting: ' . (string) ($meeting['title'] ?? 'RefRoom'),
        'Date: ' . (string) ($meeting['date'] ?? ''),
        'Time: ' . (string) ($meeting['time'] ?? ''),
        'Meeting Code: ' . (string) ($meeting['meetingCode'] ?? ''),
    ];

    if ((string) ($meeting['passcode'] ?? '') !== '') {
        $lines[] = 'Passcode: ' . (string) $meeting['passcode'];
    }

    if ((string) ($meeting['purpose'] ?? '') !== '') {
        $lines[] = '';
        $lines[] = 'Purpose:';
        $lines[] = (string) $meeting['purpose'];
    }

    $lines[] = '';
    $lines[] = 'Open RefRoom: ' . rtbo_refroom_invite_url((string) ($meeting['meetingCode'] ?? ''));
    $lines[] = '';
    $lines[] = 'Host: ' . (string) ($actor['name'] ?? $actor['email'] ?? 'RTBO');
    $lines[] = 'Recipient count: ' . number_format($recipientCount);

    return implode("\n", $lines);
}

function rtbo_refroom_send_invites(array $meeting, array $members, array $actor): array
{
    $memberRecipients = rtbo_refroom_selected_members($meeting['invited_member_ids'] ?? [], $members);
    $recipientEmails = rtbo_normalize_email_list([
        ...array_map(static fn (array $member): string => (string) ($member['email'] ?? ''), $memberRecipients),
        ...array_map('strval', is_array($meeting['invited_emails'] ?? null) ? $meeting['invited_emails'] : []),
    ]);

    if ($recipientEmails === []) {
        throw new RuntimeException('Select at least one member with a valid email address before sending invitations.');
    }

    $subject = 'RefRoom Invitation - ' . (string) ($meeting['title'] ?? 'Meeting');
    $body = rtbo_refroom_invite_body($meeting, $recipientEmails, $actor);
    $result = rtbo_mail_bcc_batches($recipientEmails, $subject, $body, (string) ($actor['email'] ?? ''), (int) env_value('RTBOMAIL_BATCH_SIZE', '80'));

    foreach ($memberRecipients as $member) {
        rtbo_notify_users([(int) ($member['id'] ?? 0)], [
            'type' => 'refroom_invitation',
            'title' => 'RefRoom invitation: ' . (string) ($meeting['title'] ?? 'Meeting'),
            'body' => 'You have been invited to a RefRoom meeting on ' . (string) ($meeting['date'] ?? '') . ' at ' . (string) ($meeting['time'] ?? '') . '.',
            'related_type' => 'refroom',
            'metadata' => [
                'meeting' => $meeting,
                'invite_url' => rtbo_refroom_invite_url((string) ($meeting['meetingCode'] ?? '')),
            ],
            'actor' => $actor,
        ]);
    }

    rtbo_notify_admins([
        'type' => 'refroom_invitations_sent',
        'title' => 'RefRoom invitations sent',
        'body' => number_format((int) ($result['recipient_count'] ?? 0)) . ' invitation(s) were sent for ' . (string) ($meeting['title'] ?? 'RefRoom') . '.',
        'related_type' => 'refroom',
        'metadata' => ['meeting' => $meeting, 'mail_result' => $result],
        'actor' => $actor,
    ]);

    if ((int) ($result['failed_batches'] ?? 0) > 0) {
        $mailError = rtbo_mail_last_error();
        throw new RuntimeException('RefRoom invitations could not be delivered to every batch. ' . ($mailError !== '' ? $mailError : 'Check SMTP/mail configuration.'));
    }

    return $result;
}

function rtbo_refroom_public_meeting(array $meeting): array
{
    return [
        'id' => (int) ($meeting['id'] ?? 0),
        'title' => (string) ($meeting['title'] ?? ''),
        'date' => (string) ($meeting['date'] ?? ''),
        'time' => (string) ($meeting['time'] ?? ''),
        'startsAt' => (string) ($meeting['startsAt'] ?? ''),
        'purpose' => (string) ($meeting['purpose'] ?? ''),
        'passcode' => (string) ($meeting['passcode'] ?? ''),
        'meetingCode' => (string) ($meeting['meetingCode'] ?? ''),
        'invite_status' => (string) ($meeting['invite_status'] ?? 'not_sent'),
        'invite_recipient_count' => (int) ($meeting['invite_recipient_count'] ?? 0),
        'created_at' => (string) ($meeting['created_at'] ?? ''),
        'updated_at' => (string) ($meeting['updated_at'] ?? ''),
    ];
}

function rtbo_refroom_find_by_code(string $meetingCode, array $meetings): ?array
{
    $needle = strtoupper(trim($meetingCode));
    foreach ($meetings as $meeting) {
        if (strtoupper((string) ($meeting['meetingCode'] ?? '')) === $needle) {
            return is_array($meeting) ? $meeting : null;
        }
    }

    return null;
}

$databaseUser = current_database_user();
$user = $databaseUser ? public_auth_user($databaseUser) : current_user();

try {
    $method = strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET'));
    $requestInput = $method === 'POST' ? rtbo_refroom_input() : [];

    if ($method === 'GET' && trim((string) ($_GET['code'] ?? '')) !== '') {
        $meeting = rtbo_refroom_find_by_code((string) $_GET['code'], rtbo_refroom_read_records_store()['meetings'] ?? []);
        if (!$meeting) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'RefRoom meeting not found.']);
            exit;
        }

        echo json_encode(['success' => true, 'meeting' => rtbo_refroom_public_meeting($meeting)], JSON_UNESCAPED_SLASHES);
        exit;
    }

    if ($method === 'POST') {
        if ((string) ($requestInput['action'] ?? '') === 'create_public') {
            require_same_origin_request();
            $store = rtbo_refroom_read_records_store();
            $meetings = is_array($store['meetings'] ?? null) ? $store['meetings'] : [];
            $meeting = rtbo_refroom_meeting_payload(is_array($requestInput['meeting'] ?? null) ? $requestInput['meeting'] : []);
            $meeting['id'] = (int) ($store['next_id'] ?? 1);
            $meeting['invite_status'] = 'draft_ready';
            $meeting['invite_recipient_count'] = count(is_array($meeting['invited_emails'] ?? null) ? $meeting['invited_emails'] : []);
            $store['next_id'] = $meeting['id'] + 1;
            array_unshift($meetings, $meeting);
            $store['meetings'] = $meetings;
            rtbo_refroom_write_records_store($store);

            echo json_encode(['success' => true, 'message' => 'RefRoom meeting created.', 'meeting' => $meeting], JSON_UNESCAPED_SLASHES);
            exit;
        }
    }

    if (!$user || !is_admin_user($user)) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Admin sign-in is required.']);
        exit;
    }

    if ($method === 'GET') {
        echo json_encode([
            'success' => true,
            'meetings' => rtbo_refroom_read_records_store()['meetings'],
            'members' => rtbo_refroom_member_options(),
        ], JSON_UNESCAPED_SLASHES);
        exit;
    }

    if ($method !== 'POST') {
        http_response_code(405);
        echo json_encode(['success' => false, 'message' => 'GET or POST required.']);
        exit;
    }

    require_same_origin_request();

    $input = $requestInput;
    $action = (string) ($input['action'] ?? '');
    $store = rtbo_refroom_read_records_store();
    $meetings = is_array($store['meetings'] ?? null) ? $store['meetings'] : [];
    $members = rtbo_refroom_member_options();

    if ($action === 'create') {
        $meeting = rtbo_refroom_meeting_payload(is_array($input['meeting'] ?? null) ? $input['meeting'] : []);
        $meeting['id'] = (int) ($store['next_id'] ?? 1);
        $store['next_id'] = $meeting['id'] + 1;
        array_unshift($meetings, $meeting);
        $store['meetings'] = $meetings;
        rtbo_refroom_write_records_store($store);

        echo json_encode(['success' => true, 'message' => 'RefRoom meeting created.', 'meeting' => $meeting, 'meetings' => $meetings], JSON_UNESCAPED_SLASHES);
        exit;
    }

    if ($action === 'update') {
        $id = (int) ($input['id'] ?? 0);
        if ($id <= 0) {
            throw new RuntimeException('A valid meeting ID is required.');
        }

        $found = false;
        $meetings = array_map(static function (array $meeting) use ($id, $input, &$found): array {
            if ((int) ($meeting['id'] ?? 0) !== $id) {
                return $meeting;
            }
            $found = true;
            return rtbo_refroom_meeting_payload(is_array($input['meeting'] ?? null) ? $input['meeting'] : [], $meeting);
        }, $meetings);

        if (!$found) {
            throw new RuntimeException('Meeting not found.');
        }

        $store['meetings'] = $meetings;
        rtbo_refroom_write_records_store($store);
        $updated = array_values(array_filter($meetings, static fn (array $meeting): bool => (int) ($meeting['id'] ?? 0) === $id))[0] ?? null;

        echo json_encode(['success' => true, 'message' => 'RefRoom meeting updated.', 'meeting' => $updated, 'meetings' => $meetings], JSON_UNESCAPED_SLASHES);
        exit;
    }

    if ($action === 'delete') {
        $id = (int) ($input['id'] ?? 0);
        $meetings = array_values(array_filter($meetings, static fn (array $meeting): bool => (int) ($meeting['id'] ?? 0) !== $id));
        $store['meetings'] = $meetings;
        rtbo_refroom_write_records_store($store);

        echo json_encode(['success' => true, 'message' => 'RefRoom meeting deleted.', 'meetings' => $meetings], JSON_UNESCAPED_SLASHES);
        exit;
    }

    if ($action === 'send_invites') {
        $id = (int) ($input['id'] ?? 0);
        $targetIndex = null;
        foreach ($meetings as $index => $meeting) {
            if ((int) ($meeting['id'] ?? 0) === $id) {
                $targetIndex = $index;
                break;
            }
        }

        if ($targetIndex === null) {
            throw new RuntimeException('Meeting not found.');
        }

        $meeting = $meetings[$targetIndex];
        try {
            $result = rtbo_refroom_send_invites($meeting, $members, $user);
            $meeting['invite_status'] = 'sent';
            $meeting['invite_sent_at'] = date('c');
            $meeting['invite_recipient_count'] = (int) ($result['recipient_count'] ?? 0);
            $meeting['updated_at'] = date('c');
            $meetings[$targetIndex] = $meeting;
            $store['meetings'] = $meetings;
            rtbo_refroom_write_records_store($store);

            echo json_encode(['success' => true, 'message' => 'RefRoom invitations sent.', 'meeting' => $meeting, 'meetings' => $meetings, 'mail_result' => $result, 'mail_transport' => rtbo_mail_transport_status()], JSON_UNESCAPED_SLASHES);
            exit;
        } catch (Throwable $mailError) {
            $meeting['invite_status'] = 'failed';
            $meeting['updated_at'] = date('c');
            $meetings[$targetIndex] = $meeting;
            $store['meetings'] = $meetings;
            rtbo_refroom_write_records_store($store);
            throw $mailError;
        }
    }

    http_response_code(422);
    echo json_encode(['success' => false, 'message' => 'Unknown RefRoom action.']);
} catch (Throwable $error) {
    error_log('RTBO RefRoom action failed: ' . $error->getMessage());
    http_response_code(422);
    echo json_encode(['success' => false, 'message' => $error->getMessage(), 'mail_transport' => rtbo_mail_transport_status()], JSON_UNESCAPED_SLASHES);
}

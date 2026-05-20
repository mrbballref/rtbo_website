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
    return RTBO_BASE_URL . '/#' . rawurlencode($meetingCode);
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

$databaseUser = current_database_user();
$user = $databaseUser ? public_auth_user($databaseUser) : current_user();
if (!$user || !is_admin_user($user)) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Admin sign-in is required.']);
    exit;
}

try {
    $method = strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET'));

    if ($method === 'GET') {
        echo json_encode([
            'success' => true,
            'meetings' => rtbo_refroom_read_store()['meetings'],
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

    $input = rtbo_refroom_input();
    $action = (string) ($input['action'] ?? '');
    $store = rtbo_refroom_read_store();
    $meetings = is_array($store['meetings'] ?? null) ? $store['meetings'] : [];
    $members = rtbo_refroom_member_options();

    if ($action === 'create') {
        $meeting = rtbo_refroom_meeting_payload(is_array($input['meeting'] ?? null) ? $input['meeting'] : []);
        $meeting['id'] = (int) ($store['next_id'] ?? 1);
        $store['next_id'] = $meeting['id'] + 1;
        array_unshift($meetings, $meeting);
        $store['meetings'] = $meetings;
        rtbo_refroom_write_store($store);

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
        rtbo_refroom_write_store($store);
        $updated = array_values(array_filter($meetings, static fn (array $meeting): bool => (int) ($meeting['id'] ?? 0) === $id))[0] ?? null;

        echo json_encode(['success' => true, 'message' => 'RefRoom meeting updated.', 'meeting' => $updated, 'meetings' => $meetings], JSON_UNESCAPED_SLASHES);
        exit;
    }

    if ($action === 'delete') {
        $id = (int) ($input['id'] ?? 0);
        $meetings = array_values(array_filter($meetings, static fn (array $meeting): bool => (int) ($meeting['id'] ?? 0) !== $id));
        $store['meetings'] = $meetings;
        rtbo_refroom_write_store($store);

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
            rtbo_refroom_write_store($store);

            echo json_encode(['success' => true, 'message' => 'RefRoom invitations sent.', 'meeting' => $meeting, 'meetings' => $meetings, 'mail_result' => $result, 'mail_transport' => rtbo_mail_transport_status()], JSON_UNESCAPED_SLASHES);
            exit;
        } catch (Throwable $mailError) {
            $meeting['invite_status'] = 'failed';
            $meeting['updated_at'] = date('c');
            $meetings[$targetIndex] = $meeting;
            $store['meetings'] = $meetings;
            rtbo_refroom_write_store($store);
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

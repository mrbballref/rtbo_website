<?php
declare(strict_types=1);

require_once __DIR__ . '/includes/bootstrap.php';
require_once __DIR__ . '/includes/users.php';
require_once __DIR__ . '/includes/email.php';
require_once __DIR__ . '/includes/notifications.php';

header('Content-Type: application/json');

function rtbo_mail_input(): array
{
    $decoded = json_decode((string) file_get_contents('php://input'), true);

    return is_array($decoded) ? $decoded : [];
}

function rtbo_mail_text(array $source, string $key): string
{
    return trim((string) ($source[$key] ?? ''));
}

function rtbo_mail_recipient_values(mixed $value): array
{
    if (is_array($value)) {
        $items = [];
        foreach ($value as $item) {
            if (is_array($item)) {
                $items[] = (string) ($item['email'] ?? '');
            } else {
                $items[] = (string) $item;
            }
        }

        return $items;
    }

    return preg_split('/[,;\s]+/', (string) $value) ?: [];
}

$databaseUser = current_database_user();
$user = $databaseUser ? public_auth_user($databaseUser) : current_user();
if (!$user) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Sign-in is required.']);
    exit;
}

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['success' => false, 'message' => 'POST required.']);
        exit;
    }

    require_same_origin_request();

    if (!is_admin_user($user)) {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'Admin access is required to send RTBOMAIL distribution emails.']);
        exit;
    }

    $input = rtbo_mail_input();
    $action = (string) ($input['action'] ?? '');
    if ($action !== 'send_distribution_email') {
        http_response_code(422);
        echo json_encode(['success' => false, 'message' => 'Unknown RTBOMAIL action.']);
        exit;
    }

    $subject = rtbo_mail_text($input, 'subject');
    $body = rtbo_mail_text($input, 'body');
    $recipients = rtbo_normalize_email_list(rtbo_mail_recipient_values($input['recipients'] ?? []));
    $batchSize = (int) ($input['batchSize'] ?? env_value('RTBOMAIL_BATCH_SIZE', '80'));
    $attachments = is_array($input['attachments'] ?? null) ? $input['attachments'] : [];

    if ($subject === '') {
        throw new RuntimeException('Subject is required.');
    }
    if ($body === '') {
        throw new RuntimeException('Message body is required.');
    }
    if ($recipients === []) {
        throw new RuntimeException('At least one valid distribution list recipient is required.');
    }

    $result = rtbo_mail_bcc_batches($recipients, $subject, $body, (string) ($user['email'] ?? ''), $batchSize, $attachments);

    rtbo_notification_create([
        'audience' => 'admins',
        'type' => 'rtbomail_distribution_sent',
        'title' => 'RTBOMAIL Distribution Sent - ' . $subject,
        'body' => 'RTBOMAIL processed ' . number_format((int) $result['recipient_count']) . ' recipient(s) in ' . number_format((int) $result['batch_count']) . ' batch(es).',
        'related_type' => 'message',
        'metadata' => [
            'released_by' => $user['name'] ?? $user['email'] ?? 'Admin',
            'recipient_count' => (int) $result['recipient_count'],
            'batch_count' => (int) $result['batch_count'],
            'failed_batches' => (int) $result['failed_batches'],
            'attachment_count' => (int) ($result['attachment_count'] ?? 0),
            'delivery_mode' => 'bcc_batch_email',
            'no_application_recipient_cap' => true,
        ],
        'actor' => $user,
    ]);

    if ((int) $result['failed_batches'] > 0) {
        $mailError = rtbo_mail_last_error();
        throw new RuntimeException('RTBOMAIL sent some batches, but ' . (int) $result['failed_batches'] . ' batch(es) failed. ' . ($mailError !== '' ? $mailError : 'Check SMTP/mail configuration.'));
    }

    echo json_encode([
        'success' => true,
        'message' => 'RTBOMAIL sent ' . number_format((int) $result['recipient_count']) . ' recipient(s) in ' . number_format((int) $result['batch_count']) . ' batch(es).',
        'mail_transport' => rtbo_mail_transport_status(),
        ...$result,
    ], JSON_UNESCAPED_SLASHES);
} catch (Throwable $error) {
    error_log('RTBOMAIL action failed: ' . $error->getMessage());
    http_response_code(422);
    echo json_encode([
        'success' => false,
        'message' => $error->getMessage(),
        'mail_transport' => rtbo_mail_transport_status(),
    ], JSON_UNESCAPED_SLASHES);
}

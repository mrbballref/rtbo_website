<?php
declare(strict_types=1);

require_once __DIR__ . '/includes/bootstrap.php';
require_once __DIR__ . '/includes/payments.php';
require_once __DIR__ . '/includes/registration-store.php';
require_once __DIR__ . '/includes/refzone-enrollments.php';
require_once __DIR__ . '/includes/email.php';
require_once __DIR__ . '/includes/notifications.php';
require_once __DIR__ . '/includes/store-orders.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'POST required.']);
    exit;
}

$payload = file_get_contents('php://input') ?: '';
$signature = (string) ($_SERVER['HTTP_STRIPE_SIGNATURE'] ?? '');

if (!verify_stripe_webhook_signature($payload, $signature)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid Stripe signature.']);
    exit;
}

$event = json_decode($payload, true);
if (!is_array($event)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid webhook payload.']);
    exit;
}

$type = (string) ($event['type'] ?? '');
$object = $event['data']['object'] ?? [];
$metadata = is_array($object['metadata'] ?? null) ? $object['metadata'] : [];

function rtbo_stripe_webhook_ensure_table(): void
{
    db()->exec(
        "CREATE TABLE IF NOT EXISTS stripe_webhook_events (
            id VARCHAR(190) PRIMARY KEY,
            event_type VARCHAR(120) NOT NULL,
            livemode TINYINT(1) NOT NULL DEFAULT 0,
            payload LONGTEXT NOT NULL,
            processed_at DATETIME NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_stripe_webhook_type (event_type),
            INDEX idx_stripe_webhook_created (created_at)
        )"
    );
}

function rtbo_stripe_webhook_store_event(array $event, string $payload): bool
{
    $eventId = trim((string) ($event['id'] ?? ''));
    if ($eventId === '') {
        return true;
    }

    try {
        rtbo_stripe_webhook_ensure_table();
        $stmt = db()->prepare(
            "INSERT IGNORE INTO stripe_webhook_events(id, event_type, livemode, payload)
             VALUES(?, ?, ?, ?)"
        );
        $stmt->execute([
            $eventId,
            (string) ($event['type'] ?? ''),
            !empty($event['livemode']) ? 1 : 0,
            $payload,
        ]);

        if ($stmt->rowCount() > 0) {
            return true;
        }

        $lookup = db()->prepare('SELECT processed_at FROM stripe_webhook_events WHERE id = ? LIMIT 1');
        $lookup->execute([$eventId]);
        return trim((string) ($lookup->fetchColumn() ?: '')) === '';
    } catch (Throwable $error) {
        error_log('RTBO Stripe webhook event log unavailable: ' . $error->getMessage());
        return true;
    }
}

function rtbo_stripe_webhook_mark_processed(array $event): void
{
    $eventId = trim((string) ($event['id'] ?? ''));
    if ($eventId === '') {
        return;
    }

    try {
        rtbo_stripe_webhook_ensure_table();
        $stmt = db()->prepare('UPDATE stripe_webhook_events SET processed_at = NOW() WHERE id = ?');
        $stmt->execute([$eventId]);
    } catch (Throwable $error) {
        error_log('RTBO Stripe webhook event processed marker failed: ' . $error->getMessage());
    }
}

function rtbo_webhook_update_incoming_payment_file(string $paymentId, string $status, string $sessionId): void
{
    $path = STORAGE_DIR . '/admin-payments.json';
    if (!is_file($path)) {
        return;
    }

    $store = json_decode((string) file_get_contents($path), true);
    if (!is_array($store) || !is_array($store['incoming_payments'] ?? null)) {
        return;
    }

    foreach ($store['incoming_payments'] as &$payment) {
        if ((string) ($payment['id'] ?? '') !== $paymentId) {
            continue;
        }
        $payment['status'] = $status;
        $payment['stripe_checkout_session_id'] = $sessionId;
        $payment['updated_at'] = date('c');
        file_put_contents($path, json_encode($store, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES), LOCK_EX);
        return;
    }
}

function rtbo_webhook_update_incoming_payment(string $paymentId, string $status, string $sessionId): void
{
    if ($paymentId === '') {
        return;
    }

    try {
        $stmt = db()->prepare(
            "UPDATE payment_incoming
             SET status = ?, stripe_checkout_session_id = ?, updated_at = NOW()
             WHERE id = ?"
        );
        $stmt->execute([$status, $sessionId, (int) $paymentId]);
        if ($stmt->rowCount() > 0) {
            return;
        }
    } catch (Throwable $error) {
        error_log('RTBO Stripe webhook payment_incoming database update failed: ' . $error->getMessage());
    }

    rtbo_webhook_update_incoming_payment_file($paymentId, $status, $sessionId);
}

try {
    if (!rtbo_stripe_webhook_store_event($event, $payload)) {
        echo json_encode(['success' => true, 'message' => 'Webhook event already processed.']);
        exit;
    }

    if ($type === 'checkout.session.completed') {
        if (($metadata['type'] ?? '') === 'store') {
            $orderId = (string) ($metadata['order_id'] ?? $object['client_reference_id'] ?? '');
            $paymentStatus = (string) ($object['payment_status'] ?? '');
            if ($orderId !== '' && $paymentStatus === 'paid') {
                $order = rtbo_store_order_update_record($orderId, [
                    'status' => 'paid',
                    'payment_status' => 'paid',
                    'stripe_checkout_session_id' => (string) ($object['id'] ?? ''),
                    'paid_at' => gmdate('c'),
                ]);
                if ($order) {
                    rtbo_store_order_notify_purchase_completed($order);
                }
            }
        }

        if (($metadata['type'] ?? '') === 'accounts_receivable') {
            $paymentStatus = (string) ($object['payment_status'] ?? '');
            if ($paymentStatus === 'paid') {
                rtbo_webhook_update_incoming_payment(
                    (string) ($metadata['payment_id'] ?? ''),
                    'paid',
                    (string) ($object['id'] ?? '')
                );
            }
        }

        $registrationId = (string) ($metadata['registration_id'] ?? $object['client_reference_id'] ?? '');
        $paymentStatus = (string) ($object['payment_status'] ?? '');
        $mode = (string) ($object['mode'] ?? '');

        if ($registrationId !== '' && ($paymentStatus === 'paid' || $mode === 'subscription')) {
            $registration = find_school_registration($registrationId);
            if ($registration) {
                $registration['payment_status'] = 'paid';
                $registration['paid_at'] = $registration['paid_at'] ?? date('c');
                $registration['stripe_checkout_session_id'] = (string) ($object['id'] ?? '');
                $emailAlreadySent = !empty($registration['payment_confirmation_sent_at']);
                if (!$emailAlreadySent && send_registration_email($registration)) {
                    $registration['payment_confirmation_sent_at'] = date('c');
                }
                update_school_registration_payment($registrationId, 'paid', $registration);
            }
        }

        if (($metadata['type'] ?? '') === 'refzone_university') {
            $enrollmentId = (string) ($metadata['enrollment_id'] ?? $object['client_reference_id'] ?? '');
            if ($enrollmentId !== '') {
                update_refzone_enrollment_payment($enrollmentId, 'paid', [
                    'stripe_checkout_session_id' => (string) ($object['id'] ?? ''),
                    'stripe_subscription_id' => (string) ($object['subscription'] ?? ''),
                ]);
                $enrollment = find_refzone_enrollment($enrollmentId);
                if ($enrollment) {
                    rtbo_notify_admins([
                        'type' => 'refzone_enrollment_paid',
                        'title' => 'RefZone membership payment confirmed',
                        'body' => (string) ($enrollment['full_name'] ?? 'A RefZone member') . ' completed payment for ' . (string) ($enrollment['package_name'] ?? 'RefZone University') . '.',
                        'related_type' => 'refzone_enrollment',
                        'metadata' => [
                            'enrollment_id' => $enrollmentId,
                            'email' => (string) ($enrollment['email'] ?? ''),
                            'package_name' => (string) ($enrollment['package_name'] ?? ''),
                            'payment_provider' => 'stripe',
                        ],
                    ]);
                }
            }
        }
    }

    if ($type === 'checkout.session.async_payment_failed') {
        if (($metadata['type'] ?? '') === 'accounts_receivable') {
            rtbo_webhook_update_incoming_payment(
                (string) ($metadata['payment_id'] ?? ''),
                'failed',
                (string) ($object['id'] ?? '')
            );
        }

        $registrationId = (string) ($metadata['registration_id'] ?? $object['client_reference_id'] ?? '');
        if ($registrationId !== '') {
            update_school_registration_payment($registrationId, 'payment_failed', [
                'stripe_checkout_session_id' => (string) ($object['id'] ?? ''),
            ]);
        }

        if (($metadata['type'] ?? '') === 'refzone_university') {
            $enrollmentId = (string) ($metadata['enrollment_id'] ?? $object['client_reference_id'] ?? '');
            if ($enrollmentId !== '') {
                update_refzone_enrollment_payment($enrollmentId, 'payment_failed', [
                    'stripe_checkout_session_id' => (string) ($object['id'] ?? ''),
                ]);
            }
        }
    }

    if (in_array($type, ['invoice.paid', 'invoice.payment_failed', 'customer.subscription.deleted', 'customer.subscription.updated'], true)) {
        error_log('RTBO Stripe billing event received: ' . $type . ' ' . (string) ($object['id'] ?? ''));
    }

    rtbo_stripe_webhook_mark_processed($event);
    echo json_encode(['success' => true]);
} catch (Throwable $error) {
    error_log('RTBO Stripe webhook handling failed: ' . $error->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Webhook handling failed.']);
}

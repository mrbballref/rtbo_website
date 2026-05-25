<?php
declare(strict_types=1);

require_once __DIR__ . '/includes/bootstrap.php';
require_once __DIR__ . '/includes/payments.php';
require_once __DIR__ . '/includes/registration-store.php';
require_once __DIR__ . '/includes/refzone-enrollments.php';
require_once __DIR__ . '/includes/email.php';

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
    if ($type === 'checkout.session.completed') {
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

    echo json_encode(['success' => true]);
} catch (Throwable $error) {
    error_log('RTBO Stripe webhook handling failed: ' . $error->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Webhook handling failed.']);
}

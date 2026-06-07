<?php
declare(strict_types=1);

require_once __DIR__ . '/includes/bootstrap.php';
require_once __DIR__ . '/includes/payments.php';
require_once __DIR__ . '/includes/assignor-subscriptions.php';
require_once __DIR__ . '/includes/notifications.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'POST required.']);
    exit;
}

require_same_origin_request();

$raw = file_get_contents('php://input') ?: '';
$json = json_decode($raw, true);
$input = array_merge($_POST, is_array($json) ? $json : []);

$planId = strtolower(trim((string) ($input['plan_id'] ?? '')));
$organizationName = trim((string) ($input['organization_name'] ?? ''));
$contactName = trim((string) ($input['contact_name'] ?? ''));
$email = strtolower(trim((string) ($input['email'] ?? '')));
$phone = trim((string) ($input['phone'] ?? ''));
$customBranding = filter_var($input['custom_branding'] ?? false, FILTER_VALIDATE_BOOLEAN);

if ($organizationName === '') {
    http_response_code(422);
    echo json_encode(['success' => false, 'message' => 'Enter the assignor organization or workspace name.']);
    exit;
}

if ($contactName === '') {
    http_response_code(422);
    echo json_encode(['success' => false, 'message' => 'Enter the assignor contact name.']);
    exit;
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(422);
    echo json_encode(['success' => false, 'message' => 'Enter a valid billing email address.']);
    exit;
}

try {
    $plan = rtbo_assignor_subscription_plan($planId);
    if (!rtbo_config_value_is_configured((string) ($plan['price_id'] ?? ''))) {
        throw new RuntimeException('This assignor subscription plan is not connected to a live Stripe Price yet. Add the plan Price ID in api/.env before accepting subscriptions.');
    }

    if ($customBranding) {
        if (!rtbo_config_value_is_configured(STRIPE_ASSIGNOR_CUSTOM_BRANDING_PRICE_ID)) {
            throw new RuntimeException('Custom branding is not connected to a live Stripe Price yet. Add STRIPE_ASSIGNOR_CUSTOM_BRANDING_PRICE_ID in api/.env or submit without the branding add-on.');
        }
    }

    $record = rtbo_assignor_subscription_create_record(array_merge($input, [
        'organization_name' => $organizationName,
        'contact_name' => $contactName,
        'email' => $email,
        'phone' => $phone,
        'custom_branding' => $customBranding,
    ]), $plan);

    $lineItems = [[
        'price' => (string) $plan['price_id'],
        'quantity' => 1,
    ]];

    if ($customBranding) {
        $lineItems[] = [
            'price' => STRIPE_ASSIGNOR_CUSTOM_BRANDING_PRICE_ID,
            'quantity' => 1,
        ];
    }

    $session = create_stripe_checkout_session([
        'mode' => 'subscription',
        'success_url' => RTBO_BASE_URL . '/payment-success.php?provider=stripe&type=assignor_workspace&application=' . rawurlencode((string) $record['id']) . '&session_id={CHECKOUT_SESSION_ID}',
        'cancel_url' => RTBO_BASE_URL . '/payment-cancel.php?type=assignor_workspace&application=' . rawurlencode((string) $record['id']),
        'customer_email' => $email,
        'client_reference_id' => (string) $record['id'],
        'line_items' => $lineItems,
        'trial_period_days' => (int) ($plan['trial_days'] ?? 0),
        'metadata' => [
            'type' => 'assignor_workspace',
            'application_id' => (string) $record['id'],
            'plan_id' => (string) $plan['id'],
            'organization_name' => $organizationName,
            'contact_name' => $contactName,
            'email' => $email,
            'custom_branding' => $customBranding ? 'yes' : 'no',
        ],
        'subscription_metadata' => [
            'type' => 'assignor_workspace',
            'application_id' => (string) $record['id'],
            'plan_id' => (string) $plan['id'],
            'organization_name' => $organizationName,
            'custom_branding' => $customBranding ? 'yes' : 'no',
        ],
    ]);

    rtbo_assignor_subscription_update_payment((string) $record['id'], 'checkout_created', [
        'stripe_checkout_session_id' => (string) ($session['id'] ?? ''),
    ]);

    try {
        rtbo_notify_admins([
            'type' => 'assignor_workspace_started',
            'title' => 'Got U Nex Ref assignor workspace checkout started',
            'body' => "{$organizationName} started checkout for {$plan['name']}.",
            'related_type' => 'assignor_workspace',
            'metadata' => [
                'application_id' => (string) $record['id'],
                'organization_name' => $organizationName,
                'contact_name' => $contactName,
                'email' => $email,
                'phone' => $phone,
                'plan_id' => (string) $plan['id'],
                'custom_branding' => $customBranding ? 'yes' : 'no',
            ],
        ]);
    } catch (Throwable $notificationError) {
        error_log('RTBO assignor workspace checkout notification failed: ' . $notificationError->getMessage());
    }

    echo json_encode([
        'success' => true,
        'redirect' => (string) $session['url'],
        'session_id' => (string) ($session['id'] ?? ''),
        'application_id' => (string) $record['id'],
    ], JSON_UNESCAPED_SLASHES);
} catch (Throwable $error) {
    http_response_code(503);
    echo json_encode(['success' => false, 'message' => $error->getMessage()]);
}

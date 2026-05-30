<?php
declare(strict_types=1);

function payment_ready(string $provider): bool
{
    return $provider === 'stripe'
        ? rtbo_config_value_is_configured(STRIPE_SECRET_KEY)
        : ($provider === 'paypal' && rtbo_config_value_is_configured(PAYPAL_CLIENT_ID) && rtbo_config_value_is_configured(PAYPAL_CLIENT_SECRET));
}

function http_json(string $url, string $method, array $headers, ?string $body = null): array
{
    if (!function_exists('curl_init')) {
        throw new RuntimeException('PHP cURL is required for payment processing.');
    }

    $curl = curl_init($url);
    curl_setopt_array($curl, [
        CURLOPT_CUSTOMREQUEST => $method,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => $headers,
        CURLOPT_POSTFIELDS => $body,
        CURLOPT_TIMEOUT => 30,
    ]);

    $response = curl_exec($curl);
    $status = (int) curl_getinfo($curl, CURLINFO_RESPONSE_CODE);
    $error = curl_error($curl);
    curl_close($curl);

    if ($response === false || $error !== '') {
        throw new RuntimeException('Payment gateway request failed.');
    }

    $decoded = json_decode((string) $response, true);
    return ['status' => $status, 'body' => is_array($decoded) ? $decoded : []];
}

function create_payment_checkout(array $registration): string
{
    $provider = $registration['payment_provider'];

    if (!payment_ready($provider)) {
        throw new RuntimeException(ucfirst($provider) . ' is not configured yet. Add credentials in api/.env on the live server.');
    }

    return $provider === 'stripe' ? create_stripe_checkout($registration) : create_paypal_order($registration);
}

function create_stripe_checkout(array $registration): string
{
    $session = create_stripe_checkout_session([
        'mode' => 'payment',
        'success_url' => RTBO_BASE_URL . '/payment-success.php?provider=stripe&registration=' . rawurlencode($registration['id']) . '&session_id={CHECKOUT_SESSION_ID}',
        'cancel_url' => RTBO_BASE_URL . '/payment-cancel.php?registration=' . rawurlencode($registration['id']),
        'customer_email' => $registration['email'],
        'client_reference_id' => $registration['id'],
        'line_items' => [[
            'name' => 'RTBO School Registration',
            'amount_cents' => (int) $registration['amount_cents'],
            'quantity' => 1,
        ]],
        'metadata' => [
            'type' => 'registration',
            'registration_id' => $registration['id'],
        ],
    ]);

    return (string) $session['url'];
}

function stripe_api_request(string $path, string $method = 'GET', array $params = []): array
{
    if (!rtbo_config_value_is_configured(STRIPE_SECRET_KEY)) {
        throw new RuntimeException('Stripe is not configured yet. Add STRIPE_SECRET_KEY in api/.env on the live server.');
    }

    $url = 'https://api.stripe.com' . $path;
    $body = $method === 'GET' ? null : http_build_query($params);
    $response = http_json($url, $method, [
        'Authorization: Bearer ' . STRIPE_SECRET_KEY,
        'Stripe-Version: 2026-02-25.clover',
        'Content-Type: application/x-www-form-urlencoded',
    ], $body);

    if ($response['status'] >= 400) {
        $message = (string) ($response['body']['error']['message'] ?? 'Stripe request failed.');
        throw new RuntimeException($message);
    }

    return $response['body'];
}

function stripe_flatten_params(array $value, string $prefix = ''): array
{
    $result = [];
    foreach ($value as $key => $item) {
        $name = $prefix === '' ? (string) $key : $prefix . '[' . $key . ']';
        if (is_array($item)) {
            $result += stripe_flatten_params($item, $name);
        } else {
            $result[$name] = $item;
        }
    }

    return $result;
}

function create_stripe_checkout_session(array $options): array
{
    $mode = (string) ($options['mode'] ?? 'payment');
    if (!in_array($mode, ['payment', 'subscription'], true)) {
        throw new RuntimeException('Unsupported Stripe checkout mode.');
    }

    $params = [
        'mode' => $mode,
        'success_url' => (string) ($options['success_url'] ?? (RTBO_BASE_URL . '/payment-success.php?provider=stripe&session_id={CHECKOUT_SESSION_ID}')),
        'cancel_url' => (string) ($options['cancel_url'] ?? (RTBO_BASE_URL . '/payment-cancel.php')),
    ];

    foreach (['customer_email', 'client_reference_id'] as $key) {
        if (!empty($options[$key])) {
            $params[$key] = (string) $options[$key];
        }
    }

    foreach (($options['metadata'] ?? []) as $key => $value) {
        if ((string) $value !== '') {
            $params['metadata[' . $key . ']'] = (string) $value;
        }
    }

    $lineItems = array_values($options['line_items'] ?? []);
    if (!$lineItems) {
        throw new RuntimeException('At least one checkout item is required.');
    }

    foreach ($lineItems as $index => $item) {
        $quantity = max(1, (int) ($item['quantity'] ?? 1));
        $params["line_items[$index][quantity]"] = $quantity;

        if (!empty($item['price'])) {
            $params["line_items[$index][price]"] = (string) $item['price'];
            continue;
        }

        $amountCents = (int) ($item['amount_cents'] ?? 0);
        if ($amountCents < 50) {
            throw new RuntimeException('Stripe payment amounts must be at least $0.50.');
        }

        $params["line_items[$index][price_data][currency]"] = strtolower((string) ($item['currency'] ?? 'usd'));
        $params["line_items[$index][price_data][product_data][name]"] = (string) ($item['name'] ?? 'RTBO Payment');
        $params["line_items[$index][price_data][unit_amount]"] = $amountCents;

        if ($mode === 'subscription') {
            $interval = strtolower((string) ($item['recurring_interval'] ?? 'month'));
            if (!in_array($interval, ['day', 'week', 'month', 'year'], true)) {
                throw new RuntimeException('Unsupported Stripe subscription interval.');
            }
            $params["line_items[$index][price_data][recurring][interval]"] = $interval;

            $intervalCount = max(1, (int) ($item['recurring_interval_count'] ?? 1));
            if ($intervalCount > 1) {
                $params["line_items[$index][price_data][recurring][interval_count]"] = $intervalCount;
            }
        }
    }

    if ($mode === 'subscription') {
        foreach (($options['subscription_metadata'] ?? []) as $key => $value) {
            if ((string) $value !== '') {
                $params['subscription_data[metadata][' . $key . ']'] = (string) $value;
            }
        }
    }

    $session = stripe_api_request('/v1/checkout/sessions', 'POST', $params);
    if (empty($session['url'])) {
        throw new RuntimeException('Stripe checkout could not be created.');
    }

    return $session;
}

function stripe_payment_offers(): array
{
    return [
        'one_time' => [
            'label' => 'One-time payment',
            'mode' => 'payment',
            'name' => 'RTBO One-Time Payment',
            'amount_cents' => STRIPE_ONE_TIME_PAYMENT_AMOUNT_CENTS,
        ],
        'booking_deposit' => [
            'label' => 'Booking deposit',
            'mode' => 'payment',
            'name' => 'RTBO Booking Deposit',
            'amount_cents' => STRIPE_BOOKING_DEPOSIT_AMOUNT_CENTS,
        ],
        'booking_payment' => [
            'label' => 'Booking payment',
            'mode' => 'payment',
            'name' => 'RTBO Booking Payment',
            'amount_cents' => STRIPE_BOOKING_PAYMENT_AMOUNT_CENTS,
        ],
        'membership' => [
            'label' => 'Membership',
            'mode' => 'subscription',
            'name' => 'RTBO Membership',
            'price' => STRIPE_MEMBERSHIP_PRICE_ID,
        ],
        'subscription' => [
            'label' => 'Subscription',
            'mode' => 'subscription',
            'name' => 'RTBO Subscription',
            'price' => STRIPE_SUBSCRIPTION_PRICE_ID,
        ],
    ];
}

function create_stripe_offer_checkout(string $offerKey, array $customer = []): array
{
    $offers = stripe_payment_offers();
    if (!isset($offers[$offerKey])) {
        throw new RuntimeException('Unknown RTBO payment option.');
    }

    $offer = $offers[$offerKey];
    $lineItem = [
        'name' => $offer['name'],
        'quantity' => 1,
    ];

    if (!empty($offer['price'])) {
        $lineItem['price'] = $offer['price'];
    } else {
        $lineItem['amount_cents'] = (int) ($offer['amount_cents'] ?? 0);
    }

    return create_stripe_checkout_session([
        'mode' => $offer['mode'],
        'success_url' => RTBO_BASE_URL . '/payment-success.php?provider=stripe&type=' . rawurlencode($offerKey) . '&session_id={CHECKOUT_SESSION_ID}',
        'cancel_url' => RTBO_BASE_URL . '/payment-cancel.php?type=' . rawurlencode($offerKey),
        'customer_email' => $customer['email'] ?? '',
        'client_reference_id' => $customer['reference'] ?? '',
        'line_items' => [$lineItem],
        'metadata' => [
            'type' => $offerKey,
            'name' => $customer['name'] ?? '',
            'email' => $customer['email'] ?? '',
            'reference' => $customer['reference'] ?? '',
        ],
    ]);
}

function create_stripe_invoice(array $invoice): array
{
    $email = strtolower(trim((string) ($invoice['email'] ?? '')));
    $amountCents = (int) ($invoice['amount_cents'] ?? 0);
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        throw new RuntimeException('A valid customer email is required.');
    }
    if ($amountCents < 50) {
        throw new RuntimeException('Invoice amounts must be at least $0.50.');
    }

    $customer = stripe_api_request('/v1/customers', 'POST', array_filter([
        'email' => $email,
        'name' => trim((string) ($invoice['name'] ?? '')),
        'metadata[source]' => 'rtboofficiating.com',
    ], static fn($value) => $value !== ''));

    stripe_api_request('/v1/invoiceitems', 'POST', [
        'customer' => (string) $customer['id'],
        'amount' => $amountCents,
        'currency' => 'usd',
        'description' => trim((string) ($invoice['description'] ?? 'RTBO Invoice')),
        'metadata[type]' => 'invoice',
    ]);

    $draft = stripe_api_request('/v1/invoices', 'POST', [
        'customer' => (string) $customer['id'],
        'collection_method' => 'send_invoice',
        'days_until_due' => max(1, (int) ($invoice['days_until_due'] ?? 14)),
        'description' => trim((string) ($invoice['description'] ?? 'RTBO Invoice')),
        'metadata[type]' => 'invoice',
        'metadata[source]' => 'rtboofficiating.com',
    ]);

    return stripe_api_request('/v1/invoices/' . rawurlencode((string) $draft['id']) . '/finalize', 'POST');
}

function retrieve_stripe_checkout_session(string $sessionId): array
{
    return stripe_api_request('/v1/checkout/sessions/' . rawurlencode($sessionId), 'GET');
}

function verify_stripe_webhook_signature(string $payload, string $signatureHeader): bool
{
    if (STRIPE_WEBHOOK_SECRET === '' || $signatureHeader === '') {
        return false;
    }

    $timestamp = '';
    $signatures = [];
    foreach (explode(',', $signatureHeader) as $part) {
        [$key, $value] = array_pad(explode('=', trim($part), 2), 2, '');
        if ($key === 't') {
            $timestamp = $value;
        } elseif ($key === 'v1') {
            $signatures[] = $value;
        }
    }

    if ($timestamp === '' || !$signatures || abs(time() - (int) $timestamp) > 300) {
        return false;
    }

    $expected = hash_hmac('sha256', $timestamp . '.' . $payload, STRIPE_WEBHOOK_SECRET);
    foreach ($signatures as $signature) {
        if (hash_equals($expected, $signature)) {
            return true;
        }
    }

    return false;
}

function paypal_base_url(): string
{
    return PAYPAL_MODE === 'sandbox' ? 'https://api-m.sandbox.paypal.com' : 'https://api-m.paypal.com';
}

function paypal_access_token(): string
{
    if (!rtbo_config_value_is_configured(PAYPAL_CLIENT_ID) || !rtbo_config_value_is_configured(PAYPAL_CLIENT_SECRET)) {
        throw new RuntimeException('PayPal is not configured yet. Add PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET in api/.env on the live server.');
    }

    $response = http_json(paypal_base_url() . '/v1/oauth2/token', 'POST', [
        'Authorization: Basic ' . base64_encode(PAYPAL_CLIENT_ID . ':' . PAYPAL_CLIENT_SECRET),
        'Content-Type: application/x-www-form-urlencoded',
    ], 'grant_type=client_credentials');

    if ($response['status'] >= 400 || empty($response['body']['access_token'])) {
        throw new RuntimeException('PayPal access token could not be created.');
    }

    return (string) $response['body']['access_token'];
}

function create_paypal_order(array $registration): string
{
    $token = paypal_access_token();
    $payload = json_encode([
        'intent' => 'CAPTURE',
        'purchase_units' => [[
            'reference_id' => $registration['id'],
            'description' => 'RTBO School Registration',
            'amount' => [
                'currency_code' => 'USD',
                'value' => number_format(((int) $registration['amount_cents']) / 100, 2, '.', ''),
            ],
        ]],
        'application_context' => [
            'return_url' => RTBO_BASE_URL . '/payment-success.php?provider=paypal&registration=' . rawurlencode($registration['id']),
            'cancel_url' => RTBO_BASE_URL . '/payment-cancel.php?registration=' . rawurlencode($registration['id']),
            'user_action' => 'PAY_NOW',
        ],
    ]);

    $response = http_json(paypal_base_url() . '/v2/checkout/orders', 'POST', [
        'Authorization: Bearer ' . $token,
        'Content-Type: application/json',
    ], $payload);

    foreach (($response['body']['links'] ?? []) as $link) {
        if (($link['rel'] ?? '') === 'approve') {
            return (string) $link['href'];
        }
    }

    throw new RuntimeException('PayPal order could not be created.');
}

function paypal_json_request(string $path, string $method, string $token, array $payload = []): array
{
    $response = http_json(paypal_base_url() . $path, $method, [
        'Authorization: Bearer ' . $token,
        'Content-Type: application/json',
        'Accept: application/json',
    ], $payload === [] ? null : json_encode($payload, JSON_UNESCAPED_SLASHES));

    if ($response['status'] >= 400) {
        $message = (string) ($response['body']['message'] ?? $response['body']['error_description'] ?? 'PayPal request failed.');
        throw new RuntimeException($message);
    }

    return $response['body'];
}

function paypal_subscription_plan_cache_path(): string
{
    ensure_dir(STORAGE_DIR);

    return STORAGE_DIR . '/paypal-subscription-plans.json';
}

function paypal_subscription_plan_cache_ensure_table(): void
{
    db()->exec(
        "CREATE TABLE IF NOT EXISTS paypal_subscription_plans (
            cache_key CHAR(64) PRIMARY KEY,
            plan_id VARCHAR(120) NOT NULL,
            product_id VARCHAR(120) NULL,
            package_id VARCHAR(80) NULL,
            amount_cents INT NOT NULL DEFAULT 0,
            currency VARCHAR(12) NOT NULL DEFAULT 'USD',
            mode VARCHAR(20) NOT NULL DEFAULT 'live',
            payload LONGTEXT NULL,
            created_at DATETIME NULL,
            updated_at DATETIME NULL,
            UNIQUE KEY uniq_paypal_plan_id (plan_id),
            INDEX idx_paypal_plan_package (package_id)
        )"
    );
}

function paypal_subscription_plan_cache_file(): array
{
    $path = paypal_subscription_plan_cache_path();
    if (!is_file($path)) {
        return [];
    }

    $plans = json_decode((string) file_get_contents($path), true);

    return is_array($plans) ? $plans : [];
}

function paypal_subscription_plan_cache(): array
{
    try {
        paypal_subscription_plan_cache_ensure_table();
        $rows = db()->query('SELECT cache_key, payload FROM paypal_subscription_plans ORDER BY COALESCE(updated_at, created_at) DESC')->fetchAll();
        if (!$rows) {
            $legacy = paypal_subscription_plan_cache_file();
            if ($legacy) {
                paypal_subscription_plan_cache_save($legacy);
                $rows = db()->query('SELECT cache_key, payload FROM paypal_subscription_plans ORDER BY COALESCE(updated_at, created_at) DESC')->fetchAll();
            }
        }

        $records = [];
        foreach ($rows as $row) {
            $payload = json_decode((string) ($row['payload'] ?? ''), true);
            if (is_array($payload)) {
                $records[(string) $row['cache_key']] = $payload;
            }
        }

        return $records;
    } catch (Throwable $error) {
        error_log('RTBO PayPal plan cache database unavailable, using legacy file fallback: ' . $error->getMessage());
        return paypal_subscription_plan_cache_file();
    }
}

function paypal_subscription_plan_cache_save_file(array $plans): void
{
    file_put_contents(
        paypal_subscription_plan_cache_path(),
        json_encode($plans, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES),
        LOCK_EX
    );
}

function paypal_subscription_plan_cache_save(array $plans): void
{
    $pdo = null;
    try {
        paypal_subscription_plan_cache_ensure_table();
        $pdo = db();
        $pdo->beginTransaction();
        $pdo->exec('DELETE FROM paypal_subscription_plans');
        $stmt = $pdo->prepare(
            "INSERT INTO paypal_subscription_plans(cache_key, plan_id, product_id, package_id, amount_cents, currency, mode, payload, created_at, updated_at)
             VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())"
        );
        foreach ($plans as $cacheKey => $plan) {
            if (!is_array($plan) || trim((string) ($plan['plan_id'] ?? '')) === '') {
                continue;
            }
            $stmt->execute([
                (string) $cacheKey,
                (string) ($plan['plan_id'] ?? ''),
                (string) ($plan['product_id'] ?? ''),
                (string) ($plan['package_id'] ?? ''),
                (int) ($plan['amount_cents'] ?? 0),
                strtoupper((string) ($plan['currency'] ?? 'USD')),
                (string) ($plan['mode'] ?? PAYPAL_MODE),
                json_encode($plan, JSON_UNESCAPED_SLASHES),
                rtbo_paypal_cache_datetime_or_null((string) ($plan['created_at'] ?? '')),
            ]);
        }
        $pdo->commit();
    } catch (Throwable $error) {
        if ($pdo instanceof PDO && $pdo->inTransaction()) {
            $pdo->rollBack();
        }
        error_log('RTBO PayPal plan cache database save failed, using legacy file fallback: ' . $error->getMessage());
        paypal_subscription_plan_cache_save_file($plans);
    }
}

function rtbo_paypal_cache_datetime_or_null(string $value): ?string
{
    $value = trim($value);
    if ($value === '') {
        return null;
    }

    $time = strtotime($value);
    return $time ? date('Y-m-d H:i:s', $time) : null;
}

function paypal_subscription_plan_cache_key(array $package): string
{
    return hash('sha256', implode('|', [
        PAYPAL_MODE,
        (string) ($package['id'] ?? ''),
        (string) ($package['name'] ?? ''),
        (string) ($package['amount_cents'] ?? 0),
        (string) ($package['currency'] ?? 'USD'),
        (string) ($package['interval'] ?? 'MONTH'),
    ]));
}

function paypal_ensure_monthly_subscription_plan(array $package): string
{
    $configuredPlanId = trim((string) ($package['paypal_plan_id'] ?? ''));
    if ($configuredPlanId !== '') {
        return $configuredPlanId;
    }

    $cache = paypal_subscription_plan_cache();
    $cacheKey = paypal_subscription_plan_cache_key($package);
    if (!empty($cache[$cacheKey]['plan_id'])) {
        return (string) $cache[$cacheKey]['plan_id'];
    }

    $token = paypal_access_token();
    $currency = strtoupper((string) ($package['currency'] ?? 'USD'));
    $amount = number_format(((int) ($package['amount_cents'] ?? 0)) / 100, 2, '.', '');
    if ((float) $amount <= 0) {
        throw new RuntimeException('PayPal subscription amount is not valid.');
    }

    $product = paypal_json_request('/v1/catalogs/products', 'POST', $token, [
        'name' => 'RefZone University',
        'description' => 'Raising The Bar Officiating RefZone University online officiating education memberships.',
        'type' => 'SERVICE',
        'category' => 'EDUCATIONAL_AND_TEXTBOOKS',
        'home_url' => RTBO_BASE_URL . '/#education',
    ]);

    $productId = (string) ($product['id'] ?? '');
    if ($productId === '') {
        throw new RuntimeException('PayPal subscription product could not be created.');
    }

    $plan = paypal_json_request('/v1/billing/plans', 'POST', $token, [
        'product_id' => $productId,
        'name' => (string) ($package['name'] ?? 'RefZone University Membership'),
        'description' => (string) ($package['description'] ?? 'Monthly RefZone University membership.'),
        'billing_cycles' => [[
            'frequency' => [
                'interval_unit' => 'MONTH',
                'interval_count' => 1,
            ],
            'tenure_type' => 'REGULAR',
            'sequence' => 1,
            'total_cycles' => 0,
            'pricing_scheme' => [
                'fixed_price' => [
                    'value' => $amount,
                    'currency_code' => $currency,
                ],
            ],
        ]],
        'payment_preferences' => [
            'auto_bill_outstanding' => true,
            'setup_fee' => [
                'value' => '0.00',
                'currency_code' => $currency,
            ],
            'setup_fee_failure_action' => 'CONTINUE',
            'payment_failure_threshold' => 3,
        ],
    ]);

    $planId = (string) ($plan['id'] ?? '');
    if ($planId === '') {
        throw new RuntimeException('PayPal subscription plan could not be created.');
    }

    if (($plan['status'] ?? '') !== 'ACTIVE') {
        paypal_json_request('/v1/billing/plans/' . rawurlencode($planId) . '/activate', 'POST', $token);
    }

    $cache[$cacheKey] = [
        'plan_id' => $planId,
        'product_id' => $productId,
        'package_id' => (string) ($package['id'] ?? ''),
        'amount_cents' => (int) ($package['amount_cents'] ?? 0),
        'currency' => $currency,
        'mode' => PAYPAL_MODE,
        'created_at' => date('c'),
    ];
    paypal_subscription_plan_cache_save($cache);

    return $planId;
}

function create_paypal_subscription_checkout(array $enrollment, array $package): string
{
    $token = paypal_access_token();
    $nameParts = preg_split('/\s+/', trim((string) ($enrollment['full_name'] ?? ''))) ?: [];
    $givenName = $nameParts[0] ?? '';
    $surname = count($nameParts) > 1 ? implode(' ', array_slice($nameParts, 1)) : '';
    $planId = paypal_ensure_monthly_subscription_plan($package);

    $payload = [
        'plan_id' => $planId,
        'custom_id' => (string) ($enrollment['id'] ?? ''),
        'subscriber' => [
            'name' => [
                'given_name' => $givenName,
                'surname' => $surname,
            ],
            'email_address' => (string) ($enrollment['email'] ?? ''),
        ],
        'application_context' => [
            'brand_name' => RTBO_COMPANY_NAME,
            'locale' => 'en-US',
            'shipping_preference' => 'NO_SHIPPING',
            'user_action' => 'SUBSCRIBE_NOW',
            'return_url' => RTBO_BASE_URL . '/payment-success.php?provider=paypal&type=refzone&enrollment=' . rawurlencode((string) ($enrollment['id'] ?? '')),
            'cancel_url' => RTBO_BASE_URL . '/payment-cancel.php?type=refzone&enrollment=' . rawurlencode((string) ($enrollment['id'] ?? '')),
        ],
    ];

    $response = paypal_json_request('/v1/billing/subscriptions', 'POST', $token, $payload);
    foreach (($response['links'] ?? []) as $link) {
        if (($link['rel'] ?? '') === 'approve') {
            return (string) $link['href'];
        }
    }

    throw new RuntimeException('PayPal subscription approval link could not be created.');
}

function retrieve_paypal_subscription(string $subscriptionId): array
{
    if ($subscriptionId === '') {
        throw new RuntimeException('PayPal subscription ID is required.');
    }

    return paypal_json_request('/v1/billing/subscriptions/' . rawurlencode($subscriptionId), 'GET', paypal_access_token());
}

function verify_payment(string $provider, string $registrationId): bool
{
    if (!payment_ready($provider)) {
        return false;
    }

    if ($provider === 'stripe') {
        $sessionId = trim((string) ($_GET['session_id'] ?? ''));
        if ($sessionId === '') {
            return false;
        }
        $response = http_json('https://api.stripe.com/v1/checkout/sessions/' . rawurlencode($sessionId), 'GET', [
            'Authorization: Bearer ' . STRIPE_SECRET_KEY,
        ]);
        $body = $response['body'];
        return $response['status'] < 400
            && ($body['payment_status'] ?? '') === 'paid'
            && (($body['metadata']['registration_id'] ?? '') === $registrationId || ($body['client_reference_id'] ?? '') === $registrationId);
    }

    if ($provider === 'paypal') {
        $orderId = trim((string) ($_GET['token'] ?? ''));
        if ($orderId === '') {
            return false;
        }
        $response = http_json(paypal_base_url() . '/v2/checkout/orders/' . rawurlencode($orderId) . '/capture', 'POST', [
            'Authorization: Bearer ' . paypal_access_token(),
            'Content-Type: application/json',
        ], '{}');
        $body = $response['body'];
        return $response['status'] < 400
            && ($body['status'] ?? '') === 'COMPLETED'
            && (($body['purchase_units'][0]['reference_id'] ?? '') === $registrationId);
    }

    return false;
}

<?php
declare(strict_types=1);

function payment_ready(string $provider): bool
{
    return $provider === 'stripe'
        ? STRIPE_SECRET_KEY !== ''
        : ($provider === 'paypal' && PAYPAL_CLIENT_ID !== '' && PAYPAL_CLIENT_SECRET !== '');
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
    if (STRIPE_SECRET_KEY === '') {
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

<?php
declare(strict_types=1);

require_once __DIR__ . '/includes/bootstrap.php';
require_once __DIR__ . '/includes/payments.php';
require_once __DIR__ . '/includes/shop-inventory.php';

header('Content-Type: application/json');

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Store checkout requires a POST request.']);
    exit;
}

require_same_origin_request();

function rtbo_store_catalog(): array
{
    $inventoryCatalog = rtbo_shop_inventory_catalog();
    if ($inventoryCatalog !== []) {
        return $inventoryCatalog;
    }

    return [
        'RTBO-JERSEY-PRO' => ['name' => 'RTBO Pro Referee Jersey', 'category' => 'apparel', 'amount_cents' => 3999],
        'RTBO-POLO-PERFORMANCE' => ['name' => 'RTBO Performance Polo', 'category' => 'apparel', 'amount_cents' => 4499],
        'RTBO-QZIP-LS-POCKET' => ['name' => 'Quarter Zip Long Sleeve With Pocket', 'category' => 'apparel', 'amount_cents' => 5499],
        'RTBO-QZIP-SS' => ['name' => 'Quarter Zip Short Sleeve', 'category' => 'apparel', 'amount_cents' => 4999],
        'RTBO-TSHIRT-TRAIN' => ['name' => 'RTBO Training T-Shirt', 'category' => 'apparel', 'amount_cents' => 2499],
        'RTBO-WINDBREAKER' => ['name' => 'RTBO Windbreaker', 'category' => 'apparel', 'amount_cents' => 6999],
        'RTBO-TRACK-SUIT' => ['name' => 'RTBO Track Suit', 'category' => 'apparel', 'amount_cents' => 10999],
        'FOX40-CLASSIC-BLACK' => ['name' => 'Fox 40 Classic Official Whistle', 'category' => 'equipment', 'amount_cents' => 1499],
        'FOX40-LANYARD-RTBO' => ['name' => 'Fox 40 RTBO Lanyard', 'category' => 'equipment', 'amount_cents' => 999],
        'RTBO-CLIPBOARD' => ['name' => 'Official Clipboard', 'category' => 'equipment', 'amount_cents' => 1999],
        'RTBO-HAT-FLEXFIT' => ['name' => 'RTBO Flexfit Hat', 'category' => 'apparel', 'amount_cents' => 2499],
        'RTBO-SKULL-CAP' => ['name' => 'RTBO Skull Cap', 'category' => 'apparel', 'amount_cents' => 1999],
        'RTBO-SCARF' => ['name' => 'RTBO Scarf', 'category' => 'apparel', 'amount_cents' => 2299],
        'RTBO-BACKPACK' => ['name' => 'RTBO Official Backpack', 'category' => 'bags', 'amount_cents' => 7499],
        'ATHLETES-R-US-BACKPACK' => ['name' => 'Athletes Are Us Backpack', 'category' => 'bags', 'amount_cents' => 8499],
        'IRONBACKPACK-TRAVEL' => ['name' => 'IronBackpack Travel Pack', 'category' => 'bags', 'amount_cents' => 8999],
        'RTBO-DUFFLE' => ['name' => 'RTBO Duffle Bag', 'category' => 'bags', 'amount_cents' => 6499],
        'RTBO-LUGGAGE' => ['name' => 'RTBO Travel Luggage', 'category' => 'bags', 'amount_cents' => 13999],
        'RTBO-RUNNING-SHOES' => ['name' => 'Official Running Shoes', 'category' => 'footwear', 'amount_cents' => 11999],
        'RTBO-OFFICIAL-SOCKS' => ['name' => 'RTBO Official Socks', 'category' => 'footwear', 'amount_cents' => 1499],
        'RTBO-COFFEE-MUG' => ['name' => 'RTBO Coffee Mug', 'category' => 'drinkware', 'amount_cents' => 1799],
        'RTBO-TUMBLER' => ['name' => 'RTBO Tumbler', 'category' => 'drinkware', 'amount_cents' => 2999],
        'RTBO-WATER-BOTTLE' => ['name' => 'RTBO Water Bottle', 'category' => 'drinkware', 'amount_cents' => 2499],
        'RTBO-HYGIENE-KIT' => ['name' => 'Official Hygiene Kit', 'category' => 'bags', 'amount_cents' => 2799],
        'RTBO-MEMBERSHIP-ELITE' => ['name' => 'Elite Official Membership', 'category' => 'memberships', 'amount_cents' => 12999],
        'RTBO-FILM-LAB-PASS' => ['name' => 'Film Lab Training Pass', 'category' => 'training', 'amount_cents' => 5999],
    ];
}

function rtbo_store_json_response(array $payload, int $status = 200): never
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_SLASHES);
    exit;
}

function rtbo_store_text(array $source, string $key): string
{
    return trim((string) ($source[$key] ?? ''));
}

function rtbo_store_storage_path(): string
{
    ensure_dir(STORAGE_DIR);

    return STORAGE_DIR . '/store-orders.json';
}

function rtbo_store_read_orders(): array
{
    $path = rtbo_store_storage_path();
    if (!is_file($path)) {
        return [];
    }

    $orders = json_decode((string) file_get_contents($path), true);

    return is_array($orders) ? $orders : [];
}

function rtbo_store_write_orders(array $orders): void
{
    file_put_contents(
        rtbo_store_storage_path(),
        json_encode(array_values($orders), JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES),
        LOCK_EX
    );
}

function rtbo_store_save_order(array $order): void
{
    $orders = rtbo_store_read_orders();
    $orders[] = $order;
    rtbo_store_write_orders($orders);
}

function rtbo_store_update_order(string $orderId, array $updates): void
{
    $orders = rtbo_store_read_orders();
    foreach ($orders as &$order) {
        if (($order['id'] ?? '') === $orderId) {
            $order = array_merge($order, $updates, ['updated_at' => gmdate('c')]);
            break;
        }
    }
    unset($order);
    rtbo_store_write_orders($orders);
}

function rtbo_store_validate_customer(array $customer): array
{
    $clean = [
        'first_name' => rtbo_store_text($customer, 'firstName'),
        'last_name' => rtbo_store_text($customer, 'lastName'),
        'email' => strtolower(rtbo_store_text($customer, 'email')),
        'phone' => rtbo_format_phone_number(rtbo_store_text($customer, 'phone')),
        'address' => rtbo_store_text($customer, 'address'),
        'address2' => rtbo_store_text($customer, 'address2'),
        'city' => rtbo_store_text($customer, 'city'),
        'state' => rtbo_store_text($customer, 'state'),
        'zip' => rtbo_store_text($customer, 'zip'),
        'notes' => rtbo_store_text($customer, 'notes'),
    ];

    foreach (['first_name', 'last_name', 'email', 'phone', 'address', 'city', 'state', 'zip'] as $field) {
        if ($clean[$field] === '') {
            throw new RuntimeException('Complete all required checkout fields before payment.');
        }
    }

    if (!filter_var($clean['email'], FILTER_VALIDATE_EMAIL)) {
        throw new RuntimeException('A valid email address is required.');
    }

    if (!preg_match('/^\(\d{3}\) \d{3}-\d{4}$/', $clean['phone'])) {
        throw new RuntimeException('Phone number must use the format (xxx) xxx-xxxx.');
    }

    if (!preg_match('/^\d{5}(?:-\d{4})?$/', $clean['zip'])) {
        throw new RuntimeException('A valid ZIP code is required.');
    }

    return $clean;
}

function rtbo_store_build_order_items(array $items): array
{
    $catalog = rtbo_store_catalog();
    $orderItems = [];
    $subtotal = 0;
    $hasShippable = false;

    foreach ($items as $item) {
        if (!is_array($item)) {
            continue;
        }

        $sku = strtoupper(rtbo_store_text($item, 'sku'));
        if (!isset($catalog[$sku])) {
            throw new RuntimeException('One or more cart items are no longer available.');
        }

        $quantity = max(1, min(99, (int) ($item['quantity'] ?? 1)));
        $product = $catalog[$sku];
        $lineTotal = (int) $product['amount_cents'] * $quantity;
        $subtotal += $lineTotal;
        $hasShippable = $hasShippable || !in_array($product['category'], ['memberships', 'training'], true);

        $orderItems[] = [
            'sku' => $sku,
            'name' => $product['name'],
            'category' => $product['category'],
            'amount_cents' => (int) $product['amount_cents'],
            'quantity' => $quantity,
            'size' => rtbo_store_text($item, 'size'),
            'color' => rtbo_store_text($item, 'color'),
            'line_total_cents' => $lineTotal,
        ];
    }

    if (!$orderItems) {
        throw new RuntimeException('Add at least one item to the cart before checkout.');
    }

    $shipping = $hasShippable && $subtotal > 0 && $subtotal < 10000 ? 895 : 0;
    $tax = (int) round($subtotal * 0.085);

    return [
        'items' => $orderItems,
        'subtotal_cents' => $subtotal,
        'shipping_cents' => $shipping,
        'tax_cents' => $tax,
        'total_cents' => $subtotal + $shipping + $tax,
    ];
}

function rtbo_store_gateway_provider(string $provider): string
{
    $provider = strtolower(trim($provider));
    if (in_array($provider, ['stripe', 'affirm', 'klarna'], true)) {
        return 'stripe';
    }
    if ($provider === 'paypal') {
        return 'paypal';
    }

    throw new RuntimeException('Choose a supported payment method.');
}

function rtbo_store_line_name(array $item): string
{
    $details = array_values(array_filter([$item['size'] ?? '', $item['color'] ?? '']));

    return $details ? $item['name'] . ' (' . implode(' / ', $details) . ')' : $item['name'];
}

function rtbo_store_create_stripe_checkout(array $order): string
{
    $lineItems = array_map(static fn(array $item): array => [
        'name' => rtbo_store_line_name($item),
        'amount_cents' => (int) $item['amount_cents'],
        'quantity' => (int) $item['quantity'],
    ], $order['items']);

    foreach ([
        ['name' => 'Estimated Shipping', 'amount_cents' => (int) $order['shipping_cents']],
        ['name' => 'Estimated Sales Tax', 'amount_cents' => (int) $order['tax_cents']],
    ] as $fee) {
        if ($fee['amount_cents'] >= 50) {
            $lineItems[] = ['name' => $fee['name'], 'amount_cents' => $fee['amount_cents'], 'quantity' => 1];
        }
    }

    $session = create_stripe_checkout_session([
        'mode' => 'payment',
        'success_url' => RTBO_BASE_URL . '/payment-success.php?provider=stripe&type=store&order=' . rawurlencode($order['id']) . '&session_id={CHECKOUT_SESSION_ID}',
        'cancel_url' => RTBO_BASE_URL . '/payment-cancel.php?type=store&order=' . rawurlencode($order['id']),
        'customer_email' => $order['customer']['email'],
        'client_reference_id' => $order['id'],
        'line_items' => $lineItems,
        'metadata' => [
            'type' => 'store',
            'order_id' => $order['id'],
            'payment_preference' => $order['payment_provider'],
            'customer_name' => trim($order['customer']['first_name'] . ' ' . $order['customer']['last_name']),
        ],
    ]);

    return (string) $session['url'];
}

function rtbo_store_create_paypal_order(array $order): string
{
    $token = paypal_access_token();
    $payload = json_encode([
        'intent' => 'CAPTURE',
        'purchase_units' => [[
            'reference_id' => $order['id'],
            'description' => 'RTBO Store Order ' . $order['id'],
            'amount' => [
                'currency_code' => 'USD',
                'value' => number_format(((int) $order['total_cents']) / 100, 2, '.', ''),
            ],
        ]],
        'application_context' => [
            'brand_name' => RTBO_COMPANY_NAME,
            'return_url' => RTBO_BASE_URL . '/payment-success.php?provider=paypal&type=store&order=' . rawurlencode($order['id']),
            'cancel_url' => RTBO_BASE_URL . '/payment-cancel.php?type=store&order=' . rawurlencode($order['id']),
            'user_action' => 'PAY_NOW',
        ],
    ], JSON_UNESCAPED_SLASHES);

    $response = http_json(paypal_base_url() . '/v2/checkout/orders', 'POST', [
        'Authorization: Bearer ' . $token,
        'Content-Type: application/json',
    ], $payload);

    if ($response['status'] >= 400) {
        throw new RuntimeException('PayPal order could not be created.');
    }

    foreach (($response['body']['links'] ?? []) as $link) {
        if (($link['rel'] ?? '') === 'approve') {
            return (string) $link['href'];
        }
    }

    throw new RuntimeException('PayPal did not return an approval link.');
}

try {
    $payload = json_decode((string) file_get_contents('php://input'), true);
    if (!is_array($payload)) {
        throw new RuntimeException('Invalid checkout payload.');
    }

    $paymentProvider = strtolower(trim((string) ($payload['payment_provider'] ?? 'stripe')));
    $gatewayProvider = rtbo_store_gateway_provider($paymentProvider);
    $customer = rtbo_store_validate_customer(is_array($payload['customer'] ?? null) ? $payload['customer'] : []);
    $totals = rtbo_store_build_order_items(is_array($payload['items'] ?? null) ? $payload['items'] : []);
    $orderId = 'RTBO-STORE-' . gmdate('Ymd-His') . '-' . strtoupper(bin2hex(random_bytes(3)));

    $order = array_merge($totals, [
        'id' => $orderId,
        'customer' => $customer,
        'payment_provider' => $paymentProvider,
        'gateway_provider' => $gatewayProvider,
        'status' => 'checkout_pending',
        'created_at' => gmdate('c'),
    ]);

    rtbo_store_save_order($order);

    if (!payment_ready($gatewayProvider)) {
        rtbo_store_update_order($orderId, ['status' => 'gateway_not_configured']);
        throw new RuntimeException(ucfirst($gatewayProvider) . ' is not configured yet. Add credentials in api/.env on the live server.');
    }

    $checkoutUrl = $gatewayProvider === 'paypal'
        ? rtbo_store_create_paypal_order($order)
        : rtbo_store_create_stripe_checkout($order);

    rtbo_store_update_order($orderId, [
        'status' => 'checkout_created',
        'checkout_url' => $checkoutUrl,
    ]);

    rtbo_store_json_response([
        'success' => true,
        'order_id' => $orderId,
        'provider' => $gatewayProvider,
        'checkout_url' => $checkoutUrl,
        'message' => $gatewayProvider === 'stripe' && in_array($paymentProvider, ['affirm', 'klarna'], true)
            ? 'Stripe Checkout is ready. Affirm or Klarna will appear when enabled and eligible.'
            : 'Secure checkout is ready.',
    ]);
} catch (Throwable $error) {
    rtbo_store_json_response([
        'success' => false,
        'message' => $error->getMessage(),
    ], 400);
}

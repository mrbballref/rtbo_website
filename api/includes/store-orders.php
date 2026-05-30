<?php
declare(strict_types=1);

require_once __DIR__ . '/email.php';
require_once __DIR__ . '/notifications.php';
require_once __DIR__ . '/pdf.php';

function rtbo_store_orders_storage_path(): string
{
    ensure_dir(STORAGE_DIR);

    return STORAGE_DIR . '/store-orders.json';
}

function rtbo_store_orders_ensure_table(): void
{
    db()->exec(
        "CREATE TABLE IF NOT EXISTS store_orders (
            id VARCHAR(120) PRIMARY KEY,
            customer_email VARCHAR(190) NULL,
            status VARCHAR(60) NOT NULL DEFAULT 'pending',
            total_cents INT NOT NULL DEFAULT 0,
            payload LONGTEXT NOT NULL,
            created_at DATETIME NOT NULL,
            updated_at DATETIME NULL,
            INDEX idx_store_orders_customer (customer_email),
            INDEX idx_store_orders_status (status),
            INDEX idx_store_orders_created (created_at)
        )"
    );
}

function rtbo_store_orders_from_row(array $row): array
{
    $payload = json_decode((string) ($row['payload'] ?? ''), true);

    return is_array($payload) ? $payload : [];
}

function rtbo_store_orders_file_all(): array
{
    $path = rtbo_store_orders_storage_path();
    if (!is_file($path)) {
        return [];
    }

    $orders = json_decode((string) file_get_contents($path), true);

    return is_array($orders) ? $orders : [];
}

function rtbo_store_orders_all(): array
{
    try {
        rtbo_store_orders_ensure_table();
        $stmt = db()->query('SELECT payload FROM store_orders ORDER BY created_at DESC');
        $orders = array_values(array_filter(array_map('rtbo_store_orders_from_row', $stmt->fetchAll())));
        if ($orders !== []) {
            return $orders;
        }
    } catch (Throwable $error) {
        error_log('RTBO store order database read failed: ' . $error->getMessage());
    }

    return rtbo_store_orders_file_all();
}

function rtbo_store_order_find(string $orderId): ?array
{
    $orderId = trim($orderId);
    if ($orderId === '') {
        return null;
    }

    foreach (rtbo_store_orders_all() as $order) {
        if (is_array($order) && (string) ($order['id'] ?? '') === $orderId) {
            return $order;
        }
    }

    return null;
}

function rtbo_store_order_save_payload(array $order): void
{
    $orderId = trim((string) ($order['id'] ?? ''));
    if ($orderId === '') {
        return;
    }

    try {
        rtbo_store_orders_ensure_table();
        $stmt = db()->prepare(
            "INSERT INTO store_orders(id, customer_email, status, total_cents, payload, created_at, updated_at)
             VALUES(?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
                customer_email = VALUES(customer_email),
                status = VALUES(status),
                total_cents = VALUES(total_cents),
                payload = VALUES(payload),
                updated_at = VALUES(updated_at)"
        );
        $stmt->execute([
            $orderId,
            strtolower((string) ($order['customer']['email'] ?? $order['customer_email'] ?? '')),
            (string) ($order['status'] ?? 'pending'),
            (int) ($order['total_cents'] ?? 0),
            json_encode($order, JSON_UNESCAPED_SLASHES),
            date('Y-m-d H:i:s', strtotime((string) ($order['created_at'] ?? 'now')) ?: time()),
            date('Y-m-d H:i:s', strtotime((string) ($order['updated_at'] ?? 'now')) ?: time()),
        ]);
        return;
    } catch (Throwable $error) {
        error_log('RTBO store order database save failed, using file fallback: ' . $error->getMessage());
    }

    $orders = rtbo_store_orders_file_all();
    $saved = false;
    foreach ($orders as &$existing) {
        if (is_array($existing) && (string) ($existing['id'] ?? '') === $orderId) {
            $existing = $order;
            $saved = true;
            break;
        }
    }
    unset($existing);
    if (!$saved) {
        array_unshift($orders, $order);
    }

    file_put_contents(
        rtbo_store_orders_storage_path(),
        json_encode($orders, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES),
        LOCK_EX
    );
}

function rtbo_store_order_update_record(string $orderId, array $updates): ?array
{
    $order = rtbo_store_order_find($orderId);
    if (!$order) {
        return null;
    }

    $order = array_merge($order, $updates, ['updated_at' => gmdate('c')]);
    rtbo_store_order_save_payload($order);

    return $order;
}

function rtbo_store_order_item_summary(array $order): string
{
    $items = is_array($order['items'] ?? null) ? $order['items'] : [];
    $lines = [];
    foreach ($items as $item) {
        if (!is_array($item)) {
            continue;
        }
        $details = array_values(array_filter([
            (string) ($item['size'] ?? ''),
            (string) ($item['color'] ?? ''),
        ]));
        $name = (string) ($item['name'] ?? $item['sku'] ?? 'Store item');
        if ($details !== []) {
            $name .= ' (' . implode(' / ', $details) . ')';
        }
        $lines[] = (int) ($item['quantity'] ?? 1) . ' x ' . $name;
    }

    return $lines !== [] ? implode('; ', $lines) : 'No item details available';
}

function rtbo_store_order_notify_purchase_completed(array $order): void
{
    if (!empty($order['purchase_admin_notified_at'])) {
        return;
    }

    try {
        $pdfPath = build_store_order_receipt_pdf($order);
        $sent = send_super_admin_store_purchase_email($order, $pdfPath);
        $customer = is_array($order['customer'] ?? null) ? $order['customer'] : [];
        $customerName = trim((string) ($customer['first_name'] ?? '') . ' ' . (string) ($customer['last_name'] ?? ''));
        $customerName = $customerName !== '' ? $customerName : 'Store customer';
        $total = '$' . number_format(((int) ($order['total_cents'] ?? 0)) / 100, 2);

        rtbo_notify_admins([
            'type' => 'store_purchase_completed',
            'title' => 'Shop purchase completed',
            'body' => "{$customerName} completed a {$total} shop purchase: " . rtbo_store_order_item_summary($order) . '.',
            'related_type' => 'store_order',
            'related_id' => (string) ($order['id'] ?? ''),
            'metadata' => [
                'order_id' => (string) ($order['id'] ?? ''),
                'customer_name' => $customerName,
                'customer_email' => (string) ($customer['email'] ?? ''),
                'total_cents' => (int) ($order['total_cents'] ?? 0),
                'payment_provider' => (string) ($order['payment_provider'] ?? $order['gateway_provider'] ?? ''),
                'items' => is_array($order['items'] ?? null) ? $order['items'] : [],
                'professional_pdf_attached' => is_file($pdfPath),
                'email_sent' => $sent,
            ],
            'actor' => [
                'name' => $customerName,
                'email' => (string) ($customer['email'] ?? ''),
            ],
        ]);

        $order['purchase_admin_notified_at'] = gmdate('c');
        $order['purchase_receipt_pdf_path'] = $pdfPath;
        rtbo_store_order_save_payload($order);
    } catch (Throwable $error) {
        error_log('RTBO store purchase notification failed: ' . $error->getMessage());
    }
}

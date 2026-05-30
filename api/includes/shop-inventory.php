<?php
declare(strict_types=1);

require_once __DIR__ . '/feature-store.php';

const RTBO_SHOP_INVENTORY_STORE_TABLE = 'shop_inventory_store';

function rtbo_shop_inventory_path(): string
{
    ensure_dir(STORAGE_DIR);

    return STORAGE_DIR . '/shop-inventory.json';
}

function rtbo_shop_inventory_empty(): array
{
    return [
        'products' => [],
        'audit' => [],
        'updated_at' => null,
    ];
}

function rtbo_shop_inventory_load(): array
{
    $data = rtbo_feature_store_load(RTBO_SHOP_INVENTORY_STORE_TABLE);
    if (!is_array($data)) {
        $data = rtbo_shop_inventory_load_file();
        rtbo_shop_inventory_save_data($data);
    }

    $empty = rtbo_shop_inventory_empty();
    $data['products'] = is_array($data['products'] ?? null) ? $data['products'] : $empty['products'];
    $data['audit'] = is_array($data['audit'] ?? null) ? $data['audit'] : $empty['audit'];
    $data['updated_at'] = $data['updated_at'] ?? null;

    return $data;
}

function rtbo_shop_inventory_load_file(): array
{
    $path = rtbo_shop_inventory_path();
    if (!is_file($path)) {
        return rtbo_shop_inventory_empty();
    }

    $data = json_decode((string) file_get_contents($path), true);
    if (!is_array($data)) {
        return rtbo_shop_inventory_empty();
    }

    $empty = rtbo_shop_inventory_empty();
    $data['products'] = is_array($data['products'] ?? null) ? $data['products'] : $empty['products'];
    $data['audit'] = is_array($data['audit'] ?? null) ? $data['audit'] : $empty['audit'];
    $data['updated_at'] = $data['updated_at'] ?? null;

    return $data;
}

function rtbo_shop_inventory_save_data(array $data): void
{
    rtbo_feature_store_save(RTBO_SHOP_INVENTORY_STORE_TABLE, $data);
}

function rtbo_shop_inventory_text(mixed $value, int $maxLength = 500): string
{
    $text = trim(strip_tags((string) $value));
    if ($maxLength > 0 && strlen($text) > $maxLength) {
        return substr($text, 0, $maxLength);
    }

    return $text;
}

function rtbo_shop_inventory_list_value(mixed $value): array
{
    $items = is_array($value) ? $value : explode(',', (string) $value);
    $items = array_map(static fn(mixed $item): string => rtbo_shop_inventory_text($item, 60), $items);

    return array_values(array_filter($items, static fn(string $item): bool => $item !== ''));
}

function rtbo_shop_inventory_sku(mixed $value, string $fallbackName): string
{
    $sku = strtoupper(rtbo_shop_inventory_text($value, 80));
    if ($sku === '') {
        $sku = strtoupper($fallbackName);
    }

    $sku = preg_replace('/[^A-Z0-9]+/', '-', $sku) ?: '';
    $sku = trim($sku, '-');

    return substr($sku !== '' ? $sku : 'RTBO-PRODUCT-' . gmdate('His'), 0, 80);
}

function rtbo_shop_inventory_cents(mixed $value): int
{
    if (is_string($value) && str_contains($value, '.')) {
        return max(0, (int) round((float) preg_replace('/[^0-9.]/', '', $value) * 100));
    }

    if (is_float($value) && $value > 0 && $value < 1000) {
        return max(0, (int) round($value * 100));
    }

    return max(0, (int) round((float) $value));
}

function rtbo_shop_inventory_normalize_product(array $product, int $index = 0): array
{
    $name = rtbo_shop_inventory_text($product['name'] ?? '', 180);
    if ($name === '') {
        throw new RuntimeException('Product name is required.');
    }

    $category = rtbo_shop_inventory_text($product['category'] ?? 'apparel', 40);
    if ($category === '' || $category === 'all') {
        $category = 'apparel';
    }

    $status = rtbo_shop_inventory_text($product['status'] ?? 'active', 20);
    if (!in_array($status, ['active', 'draft', 'hidden'], true)) {
        $status = 'active';
    }

    return [
        'sku' => rtbo_shop_inventory_sku($product['sku'] ?? '', $name),
        'name' => $name,
        'category' => $category,
        'price' => rtbo_shop_inventory_cents($product['price'] ?? 0),
        'image' => rtbo_shop_inventory_text($product['image'] ?? '', 500),
        'description' => rtbo_shop_inventory_text($product['description'] ?? '', 1000),
        'sizes' => rtbo_shop_inventory_list_value($product['sizes'] ?? []),
        'colors' => rtbo_shop_inventory_list_value($product['colors'] ?? []),
        'stock' => max(0, (int) ($product['stock'] ?? (8 + ($index * 3) % 24))),
        'status' => $status,
        'updated_at' => gmdate('c'),
    ];
}

function rtbo_shop_inventory_normalize_products(array $products): array
{
    $normalized = [];
    $seen = [];

    foreach ($products as $index => $product) {
        if (!is_array($product)) {
            continue;
        }

        $item = rtbo_shop_inventory_normalize_product($product, (int) $index);
        if (isset($seen[$item['sku']])) {
            continue;
        }

        $seen[$item['sku']] = true;
        $normalized[] = $item;
    }

    return $normalized;
}

function rtbo_shop_inventory_products(bool $publicOnly = false): array
{
    $products = rtbo_shop_inventory_normalize_products(rtbo_shop_inventory_load()['products']);
    if (!$publicOnly) {
        return $products;
    }

    return array_values(array_filter(
        $products,
        static fn(array $product): bool => ($product['status'] ?? 'active') === 'active'
    ));
}

function rtbo_shop_inventory_audit_entry(?array $user, string $action, array $details = []): array
{
    return [
        'actor_id' => isset($user['id']) ? (int) $user['id'] : null,
        'actor_email' => (string) ($user['email'] ?? ''),
        'action' => $action,
        'details' => $details,
        'created_at' => gmdate('c'),
    ];
}

function rtbo_shop_inventory_replace(array $products, ?array $user = null): array
{
    $savedProducts = rtbo_shop_inventory_normalize_products($products);
    $data = rtbo_shop_inventory_load();
    $data['products'] = $savedProducts;
    $data['updated_at'] = gmdate('c');
    $data['audit'][] = rtbo_shop_inventory_audit_entry($user, 'replace', ['count' => count($savedProducts)]);
    rtbo_shop_inventory_save_data($data);

    return $savedProducts;
}

function rtbo_shop_inventory_save_product(array $product, ?array $user = null): array
{
    $data = rtbo_shop_inventory_load();
    $products = rtbo_shop_inventory_normalize_products($data['products']);
    $saved = rtbo_shop_inventory_normalize_product($product, count($products));
    $updated = false;

    foreach ($products as &$existing) {
        if (($existing['sku'] ?? '') !== $saved['sku']) {
            continue;
        }
        $existing = $saved;
        $updated = true;
        break;
    }
    unset($existing);

    if (!$updated) {
        array_unshift($products, $saved);
    }

    $data['products'] = $products;
    $data['updated_at'] = gmdate('c');
    $data['audit'][] = rtbo_shop_inventory_audit_entry($user, $updated ? 'update' : 'create', ['sku' => $saved['sku']]);
    rtbo_shop_inventory_save_data($data);

    return $saved;
}

function rtbo_shop_inventory_delete_product(string $sku, ?array $user = null): array
{
    $sku = rtbo_shop_inventory_sku($sku, '');
    if ($sku === '') {
        throw new RuntimeException('A valid product SKU is required.');
    }

    $data = rtbo_shop_inventory_load();
    $products = rtbo_shop_inventory_normalize_products($data['products']);
    $deleted = null;
    $products = array_values(array_filter($products, static function (array $product) use ($sku, &$deleted): bool {
        if (($product['sku'] ?? '') === $sku) {
            $deleted = $product;
            return false;
        }

        return true;
    }));

    if (!$deleted) {
        throw new RuntimeException('The inventory product could not be found.');
    }

    $data['products'] = $products;
    $data['updated_at'] = gmdate('c');
    $data['audit'][] = rtbo_shop_inventory_audit_entry($user, 'delete', ['sku' => $sku, 'name' => $deleted['name'] ?? '']);
    rtbo_shop_inventory_save_data($data);

    return $deleted;
}

function rtbo_shop_inventory_catalog(): array
{
    $catalog = [];

    foreach (rtbo_shop_inventory_products(true) as $product) {
        $sku = (string) ($product['sku'] ?? '');
        if ($sku === '') {
            continue;
        }

        $catalog[$sku] = [
            'name' => (string) ($product['name'] ?? $sku),
            'category' => (string) ($product['category'] ?? 'apparel'),
            'amount_cents' => (int) ($product['price'] ?? 0),
        ];
    }

    return $catalog;
}

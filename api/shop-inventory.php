<?php
declare(strict_types=1);

require_once __DIR__ . '/includes/bootstrap.php';
require_once __DIR__ . '/includes/users.php';
require_once __DIR__ . '/includes/shop-inventory.php';

header('Content-Type: application/json');

function rtbo_shop_inventory_json(array $payload, int $status = 200): never
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_SLASHES);
    exit;
}

function rtbo_shop_inventory_input(): array
{
    $raw = file_get_contents('php://input') ?: '';
    $data = json_decode($raw, true);

    return is_array($data) ? $data : [];
}

function rtbo_shop_inventory_current_admin(): ?array
{
    $databaseUser = current_database_user();
    $user = $databaseUser ? public_auth_user($databaseUser) : current_user();

    return $user && is_admin_user($user) ? $user : null;
}

try {
    $method = strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET'));
    $adminScope = (string) ($_GET['scope'] ?? '') === 'admin';

    if ($method === 'GET') {
        if ($adminScope && !rtbo_shop_inventory_current_admin()) {
            rtbo_shop_inventory_json(['success' => false, 'message' => 'Admin sign-in is required.'], 401);
        }

        $inventory = rtbo_shop_inventory_load();
        $allProducts = rtbo_shop_inventory_normalize_products($inventory['products'] ?? []);
        $products = $adminScope ? $allProducts : array_values(array_filter(
            $allProducts,
            static fn(array $product): bool => ($product['status'] ?? 'active') === 'active'
        ));

        rtbo_shop_inventory_json([
            'success' => true,
            'products' => $products,
            'managed' => ($inventory['updated_at'] ?? null) !== null || $allProducts !== [],
            'updated_at' => $inventory['updated_at'] ?? null,
        ]);
    }

    if ($method !== 'POST') {
        rtbo_shop_inventory_json(['success' => false, 'message' => 'Unsupported inventory request method.'], 405);
    }

    require_same_origin_request();
    $user = rtbo_shop_inventory_current_admin();
    if (!$user) {
        rtbo_shop_inventory_json(['success' => false, 'message' => 'Admin sign-in is required.'], 401);
    }

    $input = rtbo_shop_inventory_input();
    $action = strtolower(trim((string) ($input['action'] ?? 'list')));

    if (in_array($action, ['replace', 'bulk_save'], true)) {
        $products = is_array($input['products'] ?? null) ? $input['products'] : [];
        $saved = rtbo_shop_inventory_replace($products, $user);
        rtbo_shop_inventory_json([
            'success' => true,
            'products' => $saved,
            'message' => 'Shop inventory saved.',
        ]);
    }

    if (in_array($action, ['create', 'update', 'save'], true)) {
        $product = is_array($input['product'] ?? null) ? $input['product'] : [];
        $saved = rtbo_shop_inventory_save_product($product, $user);
        rtbo_shop_inventory_json([
            'success' => true,
            'product' => $saved,
            'products' => rtbo_shop_inventory_products(false),
            'message' => 'Product saved.',
        ]);
    }

    if ($action === 'delete') {
        $deleted = rtbo_shop_inventory_delete_product((string) ($input['sku'] ?? ''), $user);
        rtbo_shop_inventory_json([
            'success' => true,
            'deleted' => $deleted,
            'products' => rtbo_shop_inventory_products(false),
            'message' => 'Product removed from the shop.',
        ]);
    }

    rtbo_shop_inventory_json(['success' => false, 'message' => 'Unsupported inventory action.'], 400);
} catch (Throwable $error) {
    error_log('RTBO shop inventory action failed: ' . $error->getMessage());
    rtbo_shop_inventory_json(['success' => false, 'message' => $error->getMessage()], 400);
}

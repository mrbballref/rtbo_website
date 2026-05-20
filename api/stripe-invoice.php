<?php
declare(strict_types=1);

require_once __DIR__ . '/includes/bootstrap.php';
require_once __DIR__ . '/includes/payments.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'POST required.']);
    exit;
}

require_same_origin_request();

if (!is_admin_user()) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Admin access is required to create invoices.']);
    exit;
}

$raw = file_get_contents('php://input') ?: '';
$json = json_decode($raw, true);
$input = array_merge($_POST, is_array($json) ? $json : []);

$amount = (string) ($input['amount'] ?? '');
$amountCents = isset($input['amount_cents'])
    ? (int) $input['amount_cents']
    : (int) round(((float) preg_replace('/[^0-9.]/', '', $amount)) * 100);

try {
    $invoice = create_stripe_invoice([
        'name' => $input['name'] ?? '',
        'email' => $input['email'] ?? '',
        'amount_cents' => $amountCents,
        'description' => $input['description'] ?? 'RTBO Invoice',
        'days_until_due' => $input['days_until_due'] ?? 14,
    ]);

    echo json_encode([
        'success' => true,
        'invoice_id' => $invoice['id'] ?? '',
        'hosted_invoice_url' => $invoice['hosted_invoice_url'] ?? '',
        'invoice_pdf' => $invoice['invoice_pdf'] ?? '',
        'status' => $invoice['status'] ?? '',
    ], JSON_UNESCAPED_SLASHES);
} catch (Throwable $error) {
    http_response_code(503);
    echo json_encode(['success' => false, 'message' => $error->getMessage()]);
}

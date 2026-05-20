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

$raw = file_get_contents('php://input') ?: '';
$json = json_decode($raw, true);
$input = array_merge($_POST, is_array($json) ? $json : []);

$offer = strtolower(trim((string) ($input['offer'] ?? $input['type'] ?? '')));
$name = trim((string) ($input['name'] ?? ''));
$email = strtolower(trim((string) ($input['email'] ?? '')));
$reference = trim((string) ($input['reference'] ?? ''));

if ($offer === '') {
    http_response_code(422);
    echo json_encode(['success' => false, 'message' => 'Choose a payment option.']);
    exit;
}

if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(422);
    echo json_encode(['success' => false, 'message' => 'Enter a valid email address.']);
    exit;
}

try {
    $session = create_stripe_offer_checkout($offer, [
        'name' => $name,
        'email' => $email,
        'reference' => $reference,
    ]);

    echo json_encode([
        'success' => true,
        'redirect' => $session['url'],
        'session_id' => $session['id'] ?? '',
    ], JSON_UNESCAPED_SLASHES);
} catch (Throwable $error) {
    http_response_code(503);
    echo json_encode(['success' => false, 'message' => $error->getMessage()]);
}

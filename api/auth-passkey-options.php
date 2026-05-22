<?php
declare(strict_types=1);

require_once __DIR__ . '/includes/bootstrap.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'GET required.']);
    exit;
}

if (strtolower(env_value('RTBO_PASSKEY_ENABLED', 'false')) !== 'true') {
    http_response_code(501);
    echo json_encode([
        'success' => false,
        'message' => 'Passkey sign-in is ready in the interface, but server passkey registration is not enabled yet.',
    ]);
    exit;
}

function rtbo_passkey_base64url(string $value): string
{
    return rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
}

$challenge = rtbo_passkey_base64url(random_bytes(32));
$_SESSION['rtbo_passkey_challenge'] = [
    'challenge' => $challenge,
    'created_at' => time(),
];

$rpId = parse_url(RTBO_BASE_URL, PHP_URL_HOST);
if (!$rpId) {
    $rpId = (string) ($_SERVER['HTTP_HOST'] ?? 'localhost');
}

echo json_encode([
    'success' => true,
    'options' => [
        'challenge' => $challenge,
        'timeout' => 60000,
        'rpId' => $rpId,
        'userVerification' => 'preferred',
        'allowCredentials' => [],
    ],
], JSON_UNESCAPED_SLASHES);

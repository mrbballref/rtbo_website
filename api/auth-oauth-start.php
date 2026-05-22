<?php
declare(strict_types=1);

require_once __DIR__ . '/includes/bootstrap.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'GET required.']);
    exit;
}

$provider = strtolower(trim((string) ($_GET['provider'] ?? '')));
$providers = [
    'google' => [
        'label' => 'Google',
        'client_id' => env_value('RTBO_GOOGLE_CLIENT_ID'),
        'redirect_uri' => env_value('RTBO_GOOGLE_REDIRECT_URI', RTBO_BASE_URL . '/api/auth-oauth-callback.php?provider=google'),
        'authorize_url' => 'https://accounts.google.com/o/oauth2/v2/auth',
        'scope' => 'openid email profile',
        'extra' => [],
    ],
    'microsoft' => [
        'label' => 'Microsoft',
        'client_id' => env_value('RTBO_MICROSOFT_CLIENT_ID'),
        'redirect_uri' => env_value('RTBO_MICROSOFT_REDIRECT_URI', RTBO_BASE_URL . '/api/auth-oauth-callback.php?provider=microsoft'),
        'authorize_url' => 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
        'scope' => 'openid email profile User.Read',
        'extra' => [],
    ],
    'apple' => [
        'label' => 'Apple',
        'client_id' => env_value('RTBO_APPLE_CLIENT_ID'),
        'redirect_uri' => env_value('RTBO_APPLE_REDIRECT_URI', RTBO_BASE_URL . '/api/auth-oauth-callback.php?provider=apple'),
        'authorize_url' => 'https://appleid.apple.com/auth/authorize',
        'scope' => 'name email',
        'extra' => [],
    ],
];

if (!isset($providers[$provider])) {
    http_response_code(422);
    echo json_encode(['success' => false, 'message' => 'Unsupported sign-in provider.']);
    exit;
}

$config = $providers[$provider];
if ((string) $config['client_id'] === '') {
    http_response_code(501);
    echo json_encode([
        'success' => false,
        'message' => $config['label'] . ' sign-in is not configured yet. Add the ' . strtoupper($provider) . ' OAuth client settings in api/.env.',
    ]);
    exit;
}

$state = bin2hex(random_bytes(16));
$_SESSION['rtbo_oauth_state'][$state] = [
    'provider' => $provider,
    'created_at' => time(),
];

$query = array_merge([
    'client_id' => $config['client_id'],
    'redirect_uri' => $config['redirect_uri'],
    'response_type' => 'code',
    'scope' => $config['scope'],
    'state' => $state,
], $config['extra']);

echo json_encode([
    'success' => true,
    'provider' => $provider,
    'authorization_url' => $config['authorize_url'] . '?' . http_build_query($query),
], JSON_UNESCAPED_SLASHES);

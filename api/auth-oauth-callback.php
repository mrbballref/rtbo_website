<?php
declare(strict_types=1);

require_once __DIR__ . '/includes/bootstrap.php';
require_once __DIR__ . '/includes/users.php';

$provider = strtolower(trim((string) ($_GET['provider'] ?? $_POST['provider'] ?? '')));
$code = trim((string) ($_GET['code'] ?? $_POST['code'] ?? ''));
$state = trim((string) ($_GET['state'] ?? $_POST['state'] ?? ''));

function rtbo_oauth_redirect(string $message = ''): never
{
    $target = RTBO_BASE_URL . '/';
    if ($message !== '') {
        $target .= '?auth_message=' . rawurlencode($message);
    }
    header('Location: ' . $target, true, 303);
    exit;
}

function rtbo_oauth_provider_config(string $provider): array
{
    $configs = [
        'google' => [
            'label' => 'Google',
            'client_id' => env_value('RTBO_GOOGLE_CLIENT_ID'),
            'client_secret' => env_value('RTBO_GOOGLE_CLIENT_SECRET'),
            'redirect_uri' => env_value('RTBO_GOOGLE_REDIRECT_URI', RTBO_BASE_URL . '/api/auth-oauth-callback.php?provider=google'),
            'token_url' => 'https://oauth2.googleapis.com/token',
            'userinfo_url' => 'https://openidconnect.googleapis.com/v1/userinfo',
        ],
        'microsoft' => [
            'label' => 'Microsoft',
            'client_id' => env_value('RTBO_MICROSOFT_CLIENT_ID'),
            'client_secret' => env_value('RTBO_MICROSOFT_CLIENT_SECRET'),
            'redirect_uri' => env_value('RTBO_MICROSOFT_REDIRECT_URI', RTBO_BASE_URL . '/api/auth-oauth-callback.php?provider=microsoft'),
            'token_url' => 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
            'userinfo_url' => 'https://graph.microsoft.com/oidc/userinfo',
        ],
        'apple' => [
            'label' => 'Apple',
            'client_id' => env_value('RTBO_APPLE_CLIENT_ID'),
            'client_secret' => env_value('RTBO_APPLE_CLIENT_SECRET'),
            'redirect_uri' => env_value('RTBO_APPLE_REDIRECT_URI', RTBO_BASE_URL . '/api/auth-oauth-callback.php?provider=apple'),
            'token_url' => 'https://appleid.apple.com/auth/token',
            'userinfo_url' => '',
        ],
    ];

    return $configs[$provider] ?? [];
}

function rtbo_oauth_json_post(string $url, array $fields): array
{
    if (!function_exists('curl_init')) {
        throw new RuntimeException('PHP cURL extension is not available.');
    }

    $handle = curl_init($url);
    curl_setopt_array($handle, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => http_build_query($fields),
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 15,
        CURLOPT_HTTPHEADER => ['Accept: application/json'],
    ]);
    $body = (string) curl_exec($handle);
    $error = (string) curl_error($handle);
    $statusCode = (int) curl_getinfo($handle, CURLINFO_RESPONSE_CODE);
    curl_close($handle);

    if ($error !== '') {
        throw new RuntimeException($error);
    }

    $decoded = json_decode($body, true);
    if ($statusCode < 200 || $statusCode >= 300 || !is_array($decoded)) {
        throw new RuntimeException('OAuth token exchange failed.');
    }

    return $decoded;
}

function rtbo_oauth_json_get(string $url, string $accessToken): array
{
    if (!function_exists('curl_init')) {
        throw new RuntimeException('PHP cURL extension is not available.');
    }

    $handle = curl_init($url);
    curl_setopt_array($handle, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 15,
        CURLOPT_HTTPHEADER => [
            'Accept: application/json',
            'Authorization: Bearer ' . $accessToken,
        ],
    ]);
    $body = (string) curl_exec($handle);
    $error = (string) curl_error($handle);
    $statusCode = (int) curl_getinfo($handle, CURLINFO_RESPONSE_CODE);
    curl_close($handle);

    if ($error !== '') {
        throw new RuntimeException($error);
    }

    $decoded = json_decode($body, true);
    if ($statusCode < 200 || $statusCode >= 300 || !is_array($decoded)) {
        throw new RuntimeException('OAuth profile lookup failed.');
    }

    return $decoded;
}

function rtbo_oauth_decode_jwt_payload(string $jwt): array
{
    $parts = explode('.', $jwt);
    if (count($parts) < 2) {
        return [];
    }

    $payload = strtr($parts[1], '-_', '+/');
    $payload .= str_repeat('=', (4 - strlen($payload) % 4) % 4);
    $decoded = json_decode((string) base64_decode($payload), true);

    return is_array($decoded) ? $decoded : [];
}

function rtbo_oauth_name_parts(array $profile): array
{
    $firstName = trim((string) ($profile['given_name'] ?? $profile['first_name'] ?? ''));
    $lastName = trim((string) ($profile['family_name'] ?? $profile['last_name'] ?? ''));
    if ($firstName === '' && $lastName === '') {
        $name = trim((string) ($profile['name'] ?? ''));
        $parts = preg_split('/\s+/', $name, 2) ?: [];
        $firstName = trim((string) ($parts[0] ?? ''));
        $lastName = trim((string) ($parts[1] ?? ''));
    }

    return [
        $firstName !== '' ? $firstName : 'RTBO',
        $lastName !== '' ? $lastName : 'Member',
    ];
}

function rtbo_oauth_find_or_create_user(array $profile): array
{
    $email = strtolower(trim((string) ($profile['email'] ?? '')));
    if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        throw new RuntimeException('OAuth provider did not return a verified email address.');
    }

    ensure_users_table();
    $stmt = db()->prepare("SELECT * FROM users WHERE LOWER(email) = ? AND status <> 'deleted' LIMIT 1");
    $stmt->execute([$email]);
    $user = $stmt->fetch();
    if ($user) {
        return $user;
    }

    [$firstName, $lastName] = rtbo_oauth_name_parts($profile);
    $insert = db()->prepare(
        "INSERT INTO users(role, first_name, last_name, email, phone, password_hash, status)
         VALUES('official', ?, ?, ?, '', ?, 'active')"
    );
    $insert->execute([
        $firstName,
        $lastName,
        $email,
        password_hash(bin2hex(random_bytes(24)), PASSWORD_DEFAULT),
    ]);

    $fresh = db()->prepare('SELECT * FROM users WHERE id = ? LIMIT 1');
    $fresh->execute([(int) db()->lastInsertId()]);
    $user = $fresh->fetch();
    if (!$user) {
        throw new RuntimeException('Unable to create OAuth account.');
    }

    return $user;
}

try {
    $stateRecord = $_SESSION['rtbo_oauth_state'][$state] ?? null;
    if (!$stateRecord || ($stateRecord['provider'] ?? '') !== $provider || time() - (int) ($stateRecord['created_at'] ?? 0) > 900) {
        throw new RuntimeException('The sign-in session expired. Please try again.');
    }
    unset($_SESSION['rtbo_oauth_state'][$state]);

    if ($code === '') {
        throw new RuntimeException('The provider did not return a sign-in code.');
    }

    $config = rtbo_oauth_provider_config($provider);
    if (!$config || $config['client_id'] === '' || $config['client_secret'] === '') {
        throw new RuntimeException('This sign-in provider is missing server credentials.');
    }

    $token = rtbo_oauth_json_post($config['token_url'], [
        'grant_type' => 'authorization_code',
        'code' => $code,
        'client_id' => $config['client_id'],
        'client_secret' => $config['client_secret'],
        'redirect_uri' => $config['redirect_uri'],
    ]);

    if ($provider === 'apple') {
        $profile = rtbo_oauth_decode_jwt_payload((string) ($token['id_token'] ?? ''));
    } else {
        $profile = rtbo_oauth_json_get($config['userinfo_url'], (string) ($token['access_token'] ?? ''));
    }

    if (($profile['email_verified'] ?? true) === false) {
        throw new RuntimeException('The provider email address is not verified.');
    }

    $user = rtbo_oauth_find_or_create_user($profile);
    session_regenerate_id(true);
    $_SESSION['user'] = public_auth_user($user);
    rtbo_oauth_redirect('Signed in successfully.');
} catch (Throwable $error) {
    error_log('RTBO OAuth callback failed: ' . $error->getMessage());
    rtbo_oauth_redirect($error->getMessage());
}

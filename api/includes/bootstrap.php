<?php
declare(strict_types=1);

require_once __DIR__ . '/config.php';

ini_set('display_errors', '0');

function rtbo_is_api_request(): bool
{
    return str_contains((string) ($_SERVER['REQUEST_URI'] ?? ''), '/api/')
        || str_ends_with((string) ($_SERVER['SCRIPT_NAME'] ?? ''), '.php');
}

set_exception_handler(static function (Throwable $error): void {
    error_log('RTBO uncaught exception: ' . $error->getMessage());
    if (!headers_sent() && rtbo_is_api_request()) {
        http_response_code(500);
        header('Content-Type: application/json');
        echo json_encode(['success' => false, 'message' => 'The server could not complete this request right now.']);
    }
});

register_shutdown_function(static function (): void {
    $error = error_get_last();
    if (!$error || !in_array($error['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR], true)) {
        return;
    }

    error_log('RTBO fatal error: ' . $error['message'] . ' in ' . $error['file'] . ':' . $error['line']);
    if (!headers_sent() && rtbo_is_api_request()) {
        http_response_code(500);
        header('Content-Type: application/json');
        echo json_encode(['success' => false, 'message' => 'The server could not complete this request right now.']);
    }
});

if (PHP_SAPI !== 'cli' && session_status() !== PHP_SESSION_ACTIVE) {
    $sessionPath = STORAGE_DIR . '/sessions';
    if (!is_dir($sessionPath)) {
        mkdir($sessionPath, 0755, true);
    }
    $isHttps = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
    session_name('RTBOSESSID');
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'secure' => $isHttps,
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    session_save_path($sessionPath);
    session_start();
}

if (!headers_sent()) {
    header('X-Frame-Options: SAMEORIGIN');
    header('X-Content-Type-Options: nosniff');
    header('Referrer-Policy: strict-origin-when-cross-origin');
    header('Permissions-Policy: camera=(), microphone=(), geolocation=(self)');
}

function redirect(string $path): never
{
    header('Location: ' . $path, true, 303);
    exit;
}

function current_user(): ?array
{
    return $_SESSION['user'] ?? null;
}

function require_user(): array
{
    $user = current_user();
    if (!$user) {
        redirect('signin.php');
    }
    return $user;
}

function is_super_admin(?array $user = null): bool
{
    $user ??= current_user();
    return ($user['role'] ?? '') === 'super_admin';
}

function is_admin_user(?array $user = null): bool
{
    $user ??= current_user();
    return in_array(($user['role'] ?? ''), ['super_admin', 'admin'], true);
}

function flash(?string $message = null): string
{
    if ($message !== null) {
        $_SESSION['flash'] = $message;
        return '';
    }

    $existing = $_SESSION['flash'] ?? '';
    unset($_SESSION['flash']);
    return (string) $existing;
}

function ensure_dir(string $path): void
{
    if (!is_dir($path)) {
        mkdir($path, 0755, true);
    }
}

function clean(string $key): string
{
    return trim((string) ($_POST[$key] ?? ''));
}

function rtbo_format_phone_number(string $value): string
{
    $value = trim($value);
    if ($value === '') {
        return '';
    }

    $digits = preg_replace('/\D+/', '', $value) ?: '';
    if (strlen($digits) > 10 && str_starts_with($digits, '1')) {
        $digits = substr($digits, 1);
    }
    $digits = substr($digits, 0, 10);

    if (strlen($digits) !== 10) {
        return $value;
    }

    return sprintf('(%s) %s-%s', substr($digits, 0, 3), substr($digits, 3, 3), substr($digits, 6));
}

function clean_list(string $key): array
{
    $value = $_POST[$key] ?? [];
    if (!is_array($value)) {
        return [];
    }
    return array_values(array_filter(array_map(static fn($item) => trim((string) $item), $value)));
}

function rtbo_normalized_origin_host(string $value): string
{
    $value = trim($value);
    if ($value === '') {
        return '';
    }

    $url = str_contains($value, '://') ? $value : 'http://' . $value;
    $host = strtolower((string) (parse_url($url, PHP_URL_HOST) ?: ''));
    $port = parse_url($url, PHP_URL_PORT);

    return $host === '' ? '' : $host . ($port ? ':' . $port : '');
}

function rtbo_same_origin_allowed_hosts(): array
{
    $hosts = [
        rtbo_normalized_origin_host((string) ($_SERVER['HTTP_HOST'] ?? '')),
        rtbo_normalized_origin_host((string) ($_SERVER['HTTP_X_FORWARDED_HOST'] ?? '')),
        rtbo_normalized_origin_host((string) ($_SERVER['SERVER_NAME'] ?? '')),
    ];

    foreach (explode(',', RTBO_ALLOWED_ORIGINS) as $origin) {
        $hosts[] = rtbo_normalized_origin_host($origin);
    }

    return array_values(array_unique(array_filter($hosts)));
}

function require_same_origin_request(): void
{
    $origin = (string) ($_SERVER['HTTP_ORIGIN'] ?? '');
    $referer = (string) ($_SERVER['HTTP_REFERER'] ?? '');
    $allowedHosts = rtbo_same_origin_allowed_hosts();

    if ($allowedHosts === []) {
        return;
    }

    $source = $origin !== '' ? $origin : $referer;
    if ($source === '') {
        return;
    }

    $sourceHost = rtbo_normalized_origin_host($source);
    foreach ($allowedHosts as $host) {
        if (hash_equals($host, $sourceHost)) {
            return;
        }
    }

    if (!headers_sent()) {
        header('Content-Type: application/json');
    }
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Request origin is not allowed.']);
    exit;
}

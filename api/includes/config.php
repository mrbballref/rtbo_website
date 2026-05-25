<?php
declare(strict_types=1);

function rtbo_load_local_env(string $path): void
{
    if (!is_file($path) || !is_readable($path)) {
        return;
    }

    foreach (file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [] as $line) {
        $line = trim($line);
        if ($line === '' || str_starts_with($line, '#') || !str_contains($line, '=')) {
            continue;
        }

        [$key, $value] = array_map('trim', explode('=', $line, 2));
        $value = trim($value, "\"'");

        if ($key !== '' && getenv($key) === false) {
            putenv($key . '=' . $value);
            $_ENV[$key] = $value;
        }
    }
}

rtbo_load_local_env(__DIR__ . '/../.env');

function env_value(string $key, string $default = ''): string
{
    $value = getenv($key);
    return $value === false || $value === '' ? $default : (string) $value;
}

const RTBO_COMPANY_NAME = 'Raising The Bar Officiating Inc.';

define('RTBO_ADMIN_EMAIL', env_value('RTBO_ADMIN_EMAIL', 'admin@rtboofficiating.com'));
define('RTBO_OWNER_EMAIL', env_value('RTBO_OWNER_EMAIL', 'montrel.simmons@rtboofficiating.com'));
define('RTBO_FROM_EMAIL', env_value('RTBO_FROM_EMAIL', RTBO_ADMIN_EMAIL));
define('RTBO_BASE_URL', rtrim(env_value('RTBO_BASE_URL', 'https://rtbofficiating.com'), '/'));
define('RTBO_ALLOWED_ORIGINS', env_value('RTBO_ALLOWED_ORIGINS', ''));
define('RTBO_SUPER_ADMIN_EMAIL', env_value('RTBO_SUPER_ADMIN_EMAIL', RTBO_ADMIN_EMAIL));
define('RTBO_REGISTRATION_ADMIN_EMAIL', env_value('RTBO_REGISTRATION_ADMIN_EMAIL', RTBO_ADMIN_EMAIL));
define('RTBO_REGISTRATION_SECONDARY_EMAIL', env_value('RTBO_REGISTRATION_SECONDARY_EMAIL', 'mrbballref1775@yahoo.com'));
define('RTBO_CONTACT_EMAIL', env_value('RTBO_CONTACT_EMAIL', 'mrbballref1775@yahoo.com'));
define('RTBO_SMTP_HOST', env_value('RTBO_SMTP_HOST'));
define('RTBO_SMTP_PORT', (int) env_value('RTBO_SMTP_PORT', '587'));
define('RTBO_SMTP_USERNAME', env_value('RTBO_SMTP_USERNAME'));
define('RTBO_SMTP_PASSWORD', env_value('RTBO_SMTP_PASSWORD'));
define('RTBO_SMTP_ENCRYPTION', strtolower(env_value('RTBO_SMTP_ENCRYPTION', 'tls')));
define('RTBO_SMTP_TIMEOUT', (int) env_value('RTBO_SMTP_TIMEOUT', '15'));

define('DB_HOST', env_value('DB_HOST', 'localhost'));
define('DB_NAME', env_value('DB_NAME', 'rtbo_platform'));
define('DB_USER', env_value('DB_USER', ''));
define('DB_PASS', env_value('DB_PASS', ''));

define('STRIPE_SECRET_KEY', env_value('STRIPE_SECRET_KEY'));
define('STRIPE_PUBLISHABLE_KEY', env_value('STRIPE_PUBLISHABLE_KEY'));
define('STRIPE_WEBHOOK_SECRET', env_value('STRIPE_WEBHOOK_SECRET'));
define('STRIPE_MEMBERSHIP_PRICE_ID', env_value('STRIPE_MEMBERSHIP_PRICE_ID'));
define('STRIPE_SUBSCRIPTION_PRICE_ID', env_value('STRIPE_SUBSCRIPTION_PRICE_ID'));
define('STRIPE_BOOKING_DEPOSIT_AMOUNT_CENTS', (int) env_value('STRIPE_BOOKING_DEPOSIT_AMOUNT_CENTS', '0'));
define('STRIPE_BOOKING_PAYMENT_AMOUNT_CENTS', (int) env_value('STRIPE_BOOKING_PAYMENT_AMOUNT_CENTS', '0'));
define('STRIPE_ONE_TIME_PAYMENT_AMOUNT_CENTS', (int) env_value('STRIPE_ONE_TIME_PAYMENT_AMOUNT_CENTS', '0'));
define('PAYPAL_CLIENT_ID', env_value('PAYPAL_CLIENT_ID'));
define('PAYPAL_CLIENT_SECRET', env_value('PAYPAL_CLIENT_SECRET'));
define('PAYPAL_MODE', env_value('PAYPAL_MODE', 'live'));

define('TWILIO_ACCOUNT_SID', env_value('TWILIO_ACCOUNT_SID'));
define('TWILIO_AUTH_TOKEN', env_value('TWILIO_AUTH_TOKEN'));
define('TWILIO_FROM_NUMBER', env_value('TWILIO_FROM_NUMBER'));
define('RTBO_SMS_ENABLED', strtolower(env_value(
    'RTBO_SMS_ENABLED',
    TWILIO_ACCOUNT_SID !== '' && TWILIO_AUTH_TOKEN !== '' && TWILIO_FROM_NUMBER !== '' ? 'true' : 'false'
)) === 'true');
define('RTBO_SMS_DRY_RUN', strtolower(env_value('RTBO_SMS_DRY_RUN', 'false')) === 'true');
define('RTBO_SMS_DEFAULT_COUNTRY_CODE', env_value('RTBO_SMS_DEFAULT_COUNTRY_CODE', '1'));

const STORAGE_DIR = __DIR__ . '/../storage';
const REGISTRATION_DIR = STORAGE_DIR . '/registrations';
const PDF_DIR = STORAGE_DIR . '/pdf';
const PROFILE_PHOTO_DIR = STORAGE_DIR . '/profile-photos';
const REVIEW_PHOTO_DIR = STORAGE_DIR . '/review-photos';
const GOT_U_NEX_REF_SYNC_DIR = STORAGE_DIR . '/got-u-nex-ref-sync';

define('GOT_U_NEX_REF_API_URL', rtrim(env_value('GOT_U_NEX_REF_API_URL', ''), '/'));
define('GOT_U_NEX_REF_SYNC_TOKEN', env_value('GOT_U_NEX_REF_SYNC_TOKEN', ''));

function rtbo_internal_recipients(): array
{
    return array_values(array_unique(array_filter([
        RTBO_ADMIN_EMAIL,
        RTBO_OWNER_EMAIL,
    ])));
}

function rtbo_config_safe_email(string $email): string
{
    $email = str_replace(["\r", "\n"], '', trim($email));

    return filter_var($email, FILTER_VALIDATE_EMAIL) ? strtolower($email) : '';
}

function rtbo_super_admin_database_email(): string
{
    try {
        $stmt = db()->query("SELECT email FROM users WHERE role = 'super_admin' AND status <> 'deleted' ORDER BY id ASC LIMIT 1");

        return rtbo_config_safe_email((string) ($stmt->fetchColumn() ?: ''));
    } catch (Throwable $error) {
        error_log('RTBO super admin email database lookup failed: ' . $error->getMessage());

        return '';
    }
}

function rtbo_super_admin_file_email(): string
{
    $path = STORAGE_DIR . '/admin-members.json';
    if (!is_file($path)) {
        return '';
    }

    $members = json_decode((string) file_get_contents($path), true);
    if (!is_array($members)) {
        return '';
    }

    foreach ($members as $member) {
        if (($member['role'] ?? '') === 'super_admin' && ($member['status'] ?? 'active') !== 'deleted') {
            return rtbo_config_safe_email((string) ($member['email'] ?? ''));
        }
    }

    return '';
}

function rtbo_super_admin_notification_email(): string
{
    foreach ([
        rtbo_super_admin_database_email(),
        rtbo_super_admin_file_email(),
        RTBO_SUPER_ADMIN_EMAIL,
        RTBO_CONTACT_EMAIL,
        RTBO_REGISTRATION_SECONDARY_EMAIL,
        RTBO_ADMIN_EMAIL,
    ] as $email) {
        $safeEmail = rtbo_config_safe_email((string) $email);
        if ($safeEmail !== '') {
            return $safeEmail;
        }
    }

    return '';
}

function rtbo_super_admin_recipients(): array
{
    return array_values(array_unique(array_filter([
        rtbo_super_admin_notification_email(),
    ])));
}

function rtbo_registration_recipients(): array
{
    return rtbo_super_admin_recipients();
}

function rtbo_contact_recipients(): array
{
    return rtbo_super_admin_recipients();
}

function db(): PDO
{
    static $pdo = null;

    if ($pdo instanceof PDO) {
        return $pdo;
    }

    $pdo = new PDO(
        'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4',
        DB_USER,
        DB_PASS,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]
    );

    return $pdo;
}

function e(string $value): string
{
    return htmlspecialchars($value, ENT_QUOTES, 'UTF-8');
}

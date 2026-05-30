<?php
declare(strict_types=1);

require_once __DIR__ . '/database-setup.php';

function rtbo_service_readiness_status(): array
{
    $database = ['configured' => false, 'message' => 'Database connection has not been checked.', 'tables' => []];
    try {
        $schema = rtbo_ensure_database_schema();
        $database = [
            'configured' => true,
            'message' => 'Database connection and required tables are available.',
            'name' => (string) ($schema['database'] ?? DB_NAME),
            'tables' => $schema['tables'] ?? [],
        ];
    } catch (Throwable $error) {
        $database = [
            'configured' => false,
            'message' => 'Database setup failed: ' . $error->getMessage(),
            'tables' => [],
        ];
    }

    $smtpConfigured = rtbo_config_value_is_configured(RTBO_SMTP_HOST)
        && rtbo_config_value_is_configured(RTBO_SMTP_USERNAME)
        && rtbo_config_value_is_configured(RTBO_SMTP_PASSWORD);

    $stripeConfigured = rtbo_config_value_is_configured(STRIPE_SECRET_KEY);
    $paypalConfigured = rtbo_config_value_is_configured(PAYPAL_CLIENT_ID)
        && rtbo_config_value_is_configured(PAYPAL_CLIENT_SECRET);
    $twilioConfigured = rtbo_config_value_is_configured(TWILIO_ACCOUNT_SID)
        && rtbo_config_value_is_configured(TWILIO_AUTH_TOKEN)
        && rtbo_config_value_is_configured(TWILIO_FROM_NUMBER);

    return [
        'database' => $database,
        'providers' => [
            'smtp' => [
                'configured' => $smtpConfigured,
                'required_for' => ['registration email', 'invoice email', 'contract email', 'RefRoom invitations', 'RTBOMAIL', 'password reset email'],
                'missing' => $smtpConfigured ? [] : ['RTBO_SMTP_HOST', 'RTBO_SMTP_USERNAME', 'RTBO_SMTP_PASSWORD'],
            ],
            'stripe' => [
                'configured' => $stripeConfigured,
                'required_for' => ['credit card checkout', 'Stripe invoices', 'direct deposit transfers', 'RefZone Stripe memberships'],
                'missing' => $stripeConfigured ? [] : ['STRIPE_SECRET_KEY'],
            ],
            'paypal' => [
                'configured' => $paypalConfigured,
                'required_for' => ['PayPal checkout', 'RefZone PayPal memberships'],
                'missing' => $paypalConfigured ? [] : ['PAYPAL_CLIENT_ID', 'PAYPAL_CLIENT_SECRET'],
            ],
            'twilio' => [
                'configured' => $twilioConfigured && RTBO_SMS_ENABLED,
                'required_for' => ['SMS notifications', 'phone password reset'],
                'missing' => $twilioConfigured ? [] : ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_FROM_NUMBER'],
                'enabled' => RTBO_SMS_ENABLED,
            ],
            'got_u_nex_ref' => [
                'configured' => rtbo_config_value_is_configured(GOT_U_NEX_REF_API_URL) && rtbo_config_value_is_configured(GOT_U_NEX_REF_SYNC_TOKEN),
                'required_for' => ['Got U Nex Ref external sync'],
                'missing' => (rtbo_config_value_is_configured(GOT_U_NEX_REF_API_URL) && rtbo_config_value_is_configured(GOT_U_NEX_REF_SYNC_TOKEN))
                    ? []
                    : ['GOT_U_NEX_REF_API_URL', 'GOT_U_NEX_REF_SYNC_TOKEN'],
            ],
        ],
        'rule' => 'Every RTBO feature must use a database-backed endpoint, validate required provider credentials, return explicit configuration errors when a provider is missing, and avoid fake/sample data in production paths.',
    ];
}

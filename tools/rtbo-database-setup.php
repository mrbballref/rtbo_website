<?php
declare(strict_types=1);

require_once __DIR__ . '/../api/includes/bootstrap.php';
require_once __DIR__ . '/../api/includes/database-setup.php';

$args = array_slice($argv ?? [], 1);
$seedSuperAdmin = in_array('--seed-super-admin', $args, true);
$password = env_value('RTBO_LOCAL_ADMIN_PASSWORD', '');
$email = env_value('RTBO_SUPER_ADMIN_EMAIL', RTBO_SUPER_ADMIN_EMAIL);

foreach ($args as $index => $arg) {
    if ($arg === '--password' && isset($args[$index + 1])) {
        $password = (string) $args[$index + 1];
    }
    if ($arg === '--email' && isset($args[$index + 1])) {
        $email = (string) $args[$index + 1];
    }
}

try {
    $schema = rtbo_ensure_database_schema();
    $result = [
        'success' => true,
        'database' => $schema['database'],
        'tables' => $schema['tables'],
    ];

    if ($seedSuperAdmin) {
        if ($password === '') {
            throw new RuntimeException('Provide RTBO_LOCAL_ADMIN_PASSWORD or pass --password for the temporary Super Admin password.');
        }
        $result['super_admin'] = rtbo_seed_super_admin_account($password, $email, true);
        $result['super_admin']['temporaryPasswordSeeded'] = true;
    }

    echo json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . PHP_EOL;
} catch (Throwable $error) {
    fwrite(STDERR, 'RTBO database setup failed: ' . $error->getMessage() . PHP_EOL);
    exit(1);
}

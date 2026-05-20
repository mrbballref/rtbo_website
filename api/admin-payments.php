<?php
declare(strict_types=1);

require_once __DIR__ . '/includes/bootstrap.php';
require_once __DIR__ . '/includes/users.php';
require_once __DIR__ . '/includes/admin-members.php';
require_once __DIR__ . '/includes/payments.php';

header('Content-Type: application/json');

function rtbo_payment_input(): array
{
    $data = json_decode((string) file_get_contents('php://input'), true);

    return is_array($data) ? $data : [];
}

function rtbo_payment_storage_path(): string
{
    ensure_dir(STORAGE_DIR);

    return STORAGE_DIR . '/admin-payments.json';
}

function rtbo_payment_default_store(): array
{
    return [
        'incoming_payments' => [],
        'official_accounts' => [],
        'official_payouts' => [],
    ];
}

function rtbo_payment_read_file(): array
{
    $path = rtbo_payment_storage_path();
    if (!is_file($path)) {
        return rtbo_payment_default_store();
    }

    $data = json_decode((string) file_get_contents($path), true);
    if (!is_array($data)) {
        return rtbo_payment_default_store();
    }

    return array_merge(rtbo_payment_default_store(), $data);
}

function rtbo_payment_write_file(array $store): void
{
    file_put_contents(
        rtbo_payment_storage_path(),
        json_encode(array_merge(rtbo_payment_default_store(), $store), JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES),
        LOCK_EX
    );
}

function rtbo_payment_db_available(): bool
{
    try {
        rtbo_ensure_payment_tables();

        return true;
    } catch (Throwable $error) {
        error_log('RTBO payment database unavailable, using JSON fallback: ' . $error->getMessage());

        return false;
    }
}

function rtbo_ensure_payment_tables(): void
{
    db()->exec(
        "CREATE TABLE IF NOT EXISTS payment_incoming (
            id INT AUTO_INCREMENT PRIMARY KEY,
            payer_type VARCHAR(80) NOT NULL DEFAULT 'school',
            payer_name VARCHAR(190) NOT NULL,
            contact_name VARCHAR(190) NULL,
            email VARCHAR(190) NULL,
            phone VARCHAR(80) NULL,
            description TEXT NULL,
            amount_cents INT NOT NULL DEFAULT 0,
            due_date DATE NULL,
            payment_method VARCHAR(80) NOT NULL DEFAULT 'stripe_checkout',
            status VARCHAR(40) NOT NULL DEFAULT 'pending',
            stripe_checkout_session_id VARCHAR(190) NULL,
            payment_url TEXT NULL,
            created_by INT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NULL,
            INDEX idx_payment_incoming_status (status),
            INDEX idx_payment_incoming_created (created_at)
        )"
    );

    db()->exec(
        "CREATE TABLE IF NOT EXISTS official_payment_accounts (
            id INT AUTO_INCREMENT PRIMARY KEY,
            official_id INT NOT NULL,
            official_name VARCHAR(190) NULL,
            official_email VARCHAR(190) NULL,
            direct_deposit_status VARCHAR(60) NOT NULL DEFAULT 'not_configured',
            payout_method VARCHAR(80) NOT NULL DEFAULT 'stripe_connect',
            stripe_account_id VARCHAR(190) NULL,
            bank_last4 VARCHAR(4) NULL,
            routing_last4 VARCHAR(4) NULL,
            notes TEXT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NULL,
            UNIQUE KEY uniq_official_payment_account (official_id),
            INDEX idx_official_payment_status (direct_deposit_status)
        )"
    );

    db()->exec(
        "CREATE TABLE IF NOT EXISTS official_payouts (
            id INT AUTO_INCREMENT PRIMARY KEY,
            official_id INT NOT NULL,
            official_name VARCHAR(190) NULL,
            amount_cents INT NOT NULL DEFAULT 0,
            service_date DATE NULL,
            event_name VARCHAR(190) NULL,
            description TEXT NULL,
            status VARCHAR(40) NOT NULL DEFAULT 'queued',
            payment_account_id INT NULL,
            stripe_transfer_id VARCHAR(190) NULL,
            paid_at DATETIME NULL,
            created_by INT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NULL,
            INDEX idx_official_payout_status (status),
            INDEX idx_official_payout_created (created_at)
        )"
    );
}

function rtbo_payment_text(array $source, string $key): string
{
    return trim((string) ($source[$key] ?? ''));
}

function rtbo_payment_money_cents(array $source, string $key = 'amount'): int
{
    if (isset($source['amount_cents']) && is_numeric($source['amount_cents'])) {
        return max(0, (int) $source['amount_cents']);
    }

    $value = preg_replace('/[^0-9.\-]/', '', (string) ($source[$key] ?? '0')) ?: '0';

    return max(0, (int) round(((float) $value) * 100));
}

function rtbo_payment_safe_status(string $status, array $allowed, string $fallback): string
{
    $status = strtolower(trim($status));

    return in_array($status, $allowed, true) ? $status : $fallback;
}

function rtbo_payment_safe_method(string $method): string
{
    return rtbo_payment_safe_status($method, ['stripe_checkout', 'ach_bank_transfer', 'check', 'wire', 'cash', 'other'], 'stripe_checkout');
}

function rtbo_payment_safe_payer_type(string $payerType): string
{
    return rtbo_payment_safe_status($payerType, ['school', 'organization', 'tournament_director', 'conference', 'event_center', 'other'], 'school');
}

function rtbo_payment_safe_payout_status(string $status): string
{
    return rtbo_payment_safe_status($status, ['queued', 'approved', 'paid', 'void'], 'queued');
}

function rtbo_payment_safe_deposit_status(string $status): string
{
    return rtbo_payment_safe_status($status, ['not_configured', 'onboarding_needed', 'pending_verification', 'ready', 'disabled'], 'not_configured');
}

function rtbo_payment_officials(): array
{
    $officials = array_values(array_filter(admin_members_list(), static function (array $member): bool {
        return ($member['role'] ?? '') === 'official' && ($member['status'] ?? 'active') !== 'deleted';
    }));
    usort($officials, static fn (array $a, array $b): int => strcmp((string) ($a['name'] ?? ''), (string) ($b['name'] ?? '')));

    return array_map(static fn (array $official): array => [
        'id' => (int) ($official['id'] ?? 0),
        'name' => trim((string) ($official['name'] ?? '')) ?: trim((string) ($official['first_name'] ?? '') . ' ' . (string) ($official['last_name'] ?? '')),
        'email' => (string) ($official['email'] ?? ''),
    ], $officials);
}

function rtbo_payment_find_official(int $officialId): ?array
{
    foreach (rtbo_payment_officials() as $official) {
        if ((int) ($official['id'] ?? 0) === $officialId) {
            return $official;
        }
    }

    return null;
}

function rtbo_payment_incoming_public(array $row): array
{
    return [
        'id' => (int) ($row['id'] ?? 0),
        'payer_type' => rtbo_payment_safe_payer_type((string) ($row['payer_type'] ?? 'school')),
        'payer_name' => (string) ($row['payer_name'] ?? ''),
        'contact_name' => (string) ($row['contact_name'] ?? ''),
        'email' => (string) ($row['email'] ?? ''),
        'phone' => rtbo_format_phone_number((string) ($row['phone'] ?? '')),
        'description' => (string) ($row['description'] ?? ''),
        'amount_cents' => (int) ($row['amount_cents'] ?? 0),
        'due_date' => (string) ($row['due_date'] ?? ''),
        'payment_method' => rtbo_payment_safe_method((string) ($row['payment_method'] ?? 'stripe_checkout')),
        'status' => rtbo_payment_safe_status((string) ($row['status'] ?? 'pending'), ['pending', 'sent', 'paid', 'failed', 'void'], 'pending'),
        'stripe_checkout_session_id' => (string) ($row['stripe_checkout_session_id'] ?? ''),
        'payment_url' => (string) ($row['payment_url'] ?? ''),
        'created_at' => (string) ($row['created_at'] ?? ''),
        'updated_at' => (string) ($row['updated_at'] ?? ''),
    ];
}

function rtbo_payment_account_public(array $row): array
{
    return [
        'id' => (int) ($row['id'] ?? 0),
        'official_id' => (int) ($row['official_id'] ?? 0),
        'official_name' => (string) ($row['official_name'] ?? ''),
        'official_email' => (string) ($row['official_email'] ?? ''),
        'direct_deposit_status' => rtbo_payment_safe_deposit_status((string) ($row['direct_deposit_status'] ?? 'not_configured')),
        'payout_method' => (string) ($row['payout_method'] ?? 'stripe_connect'),
        'stripe_account_id' => (string) ($row['stripe_account_id'] ?? ''),
        'bank_last4' => preg_replace('/\D+/', '', (string) ($row['bank_last4'] ?? '')) ?: '',
        'routing_last4' => preg_replace('/\D+/', '', (string) ($row['routing_last4'] ?? '')) ?: '',
        'notes' => (string) ($row['notes'] ?? ''),
        'created_at' => (string) ($row['created_at'] ?? ''),
        'updated_at' => (string) ($row['updated_at'] ?? ''),
    ];
}

function rtbo_payment_payout_public(array $row): array
{
    return [
        'id' => (int) ($row['id'] ?? 0),
        'official_id' => (int) ($row['official_id'] ?? 0),
        'official_name' => (string) ($row['official_name'] ?? ''),
        'amount_cents' => (int) ($row['amount_cents'] ?? 0),
        'service_date' => (string) ($row['service_date'] ?? ''),
        'event_name' => (string) ($row['event_name'] ?? ''),
        'description' => (string) ($row['description'] ?? ''),
        'status' => rtbo_payment_safe_payout_status((string) ($row['status'] ?? 'queued')),
        'payment_account_id' => (int) ($row['payment_account_id'] ?? 0),
        'stripe_transfer_id' => (string) ($row['stripe_transfer_id'] ?? ''),
        'paid_at' => (string) ($row['paid_at'] ?? ''),
        'created_at' => (string) ($row['created_at'] ?? ''),
        'updated_at' => (string) ($row['updated_at'] ?? ''),
    ];
}

function rtbo_payment_list_database(): array
{
    $incoming = db()->query('SELECT * FROM payment_incoming ORDER BY created_at DESC, id DESC LIMIT 300')->fetchAll();
    $accounts = db()->query('SELECT * FROM official_payment_accounts ORDER BY official_name ASC, id DESC LIMIT 300')->fetchAll();
    $payouts = db()->query('SELECT * FROM official_payouts ORDER BY created_at DESC, id DESC LIMIT 300')->fetchAll();

    return [
        'incoming_payments' => array_map('rtbo_payment_incoming_public', $incoming),
        'official_accounts' => array_map('rtbo_payment_account_public', $accounts),
        'official_payouts' => array_map('rtbo_payment_payout_public', $payouts),
    ];
}

function rtbo_payment_list_file(): array
{
    $store = rtbo_payment_read_file();

    return [
        'incoming_payments' => array_map('rtbo_payment_incoming_public', $store['incoming_payments']),
        'official_accounts' => array_map('rtbo_payment_account_public', $store['official_accounts']),
        'official_payouts' => array_map('rtbo_payment_payout_public', $store['official_payouts']),
    ];
}

function rtbo_payment_summary(array $data): array
{
    $incoming = $data['incoming_payments'] ?? [];
    $payouts = $data['official_payouts'] ?? [];
    $accounts = $data['official_accounts'] ?? [];

    $receivable = array_reduce($incoming, static function (int $sum, array $payment): int {
        return in_array($payment['status'] ?? '', ['paid', 'void'], true) ? $sum : $sum + (int) ($payment['amount_cents'] ?? 0);
    }, 0);
    $collected = array_reduce($incoming, static function (int $sum, array $payment): int {
        return ($payment['status'] ?? '') === 'paid' ? $sum + (int) ($payment['amount_cents'] ?? 0) : $sum;
    }, 0);
    $queuedPayouts = array_reduce($payouts, static function (int $sum, array $payout): int {
        return in_array($payout['status'] ?? '', ['queued', 'approved'], true) ? $sum + (int) ($payout['amount_cents'] ?? 0) : $sum;
    }, 0);
    $readyAccounts = count(array_filter($accounts, static fn (array $account): bool => ($account['direct_deposit_status'] ?? '') === 'ready'));

    return [
        'receivable_cents' => $receivable,
        'collected_cents' => $collected,
        'queued_payout_cents' => $queuedPayouts,
        'ready_direct_deposit_officials' => $readyAccounts,
    ];
}

function rtbo_payment_response(): array
{
    $data = rtbo_payment_db_available() ? rtbo_payment_list_database() : rtbo_payment_list_file();
    $officials = rtbo_payment_officials();

    return [
        'success' => true,
        ...$data,
        'officials' => $officials,
        'summary' => rtbo_payment_summary($data),
        'stripe_configured' => STRIPE_SECRET_KEY !== '',
        'direct_deposit_note' => 'Use Stripe Connect for official direct deposit. Do not store full bank or routing numbers in RTBO.',
    ];
}

function rtbo_payment_next_file_id(array $records): int
{
    return max([0, ...array_map(static fn (array $record): int => (int) ($record['id'] ?? 0), $records)]) + 1;
}

function rtbo_payment_create_checkout_for_incoming(array $payment): array
{
    $amountCents = (int) ($payment['amount_cents'] ?? 0);
    if ($amountCents < 50) {
        throw new RuntimeException('Stripe checkout payments must be at least $0.50.');
    }

    return create_stripe_checkout_session([
        'mode' => 'payment',
        'success_url' => RTBO_BASE_URL . '/payment-success.php?provider=stripe&type=accounts_receivable&payment=' . rawurlencode((string) ($payment['id'] ?? '')) . '&session_id={CHECKOUT_SESSION_ID}',
        'cancel_url' => RTBO_BASE_URL . '/payment-cancel.php?type=accounts_receivable&payment=' . rawurlencode((string) ($payment['id'] ?? '')),
        'customer_email' => $payment['email'] ?? '',
        'client_reference_id' => 'rtbo-payment-' . (string) ($payment['id'] ?? ''),
        'line_items' => [[
            'name' => $payment['description'] ?: 'RTBO Payment',
            'amount_cents' => $amountCents,
            'quantity' => 1,
        ]],
        'metadata' => [
            'type' => 'accounts_receivable',
            'payment_id' => (string) ($payment['id'] ?? ''),
            'payer_name' => $payment['payer_name'] ?? '',
            'source' => 'rtbo_payment_system',
        ],
    ]);
}

function rtbo_payment_create_incoming_database(array $input, array $user): array
{
    $amountCents = rtbo_payment_money_cents($input);
    if ($amountCents <= 0) {
        throw new RuntimeException('Enter an incoming payment amount.');
    }

    $stmt = db()->prepare(
        "INSERT INTO payment_incoming(payer_type, payer_name, contact_name, email, phone, description, amount_cents, due_date, payment_method, status, created_by, updated_at)
         VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())"
    );
    $stmt->execute([
        rtbo_payment_safe_payer_type(rtbo_payment_text($input, 'payer_type')),
        rtbo_payment_text($input, 'payer_name'),
        rtbo_payment_text($input, 'contact_name'),
        strtolower(rtbo_payment_text($input, 'email')),
        rtbo_format_phone_number(rtbo_payment_text($input, 'phone')),
        rtbo_payment_text($input, 'description'),
        $amountCents,
        rtbo_payment_text($input, 'due_date') ?: null,
        rtbo_payment_safe_method(rtbo_payment_text($input, 'payment_method')),
        rtbo_payment_safe_status(rtbo_payment_text($input, 'status'), ['pending', 'sent', 'paid', 'failed', 'void'], 'pending'),
        (int) ($user['id'] ?? 0) ?: null,
    ]);

    $id = (int) db()->lastInsertId();
    $payment = rtbo_payment_get_incoming_database($id);
    if (($payment['payment_method'] ?? '') === 'stripe_checkout' && !empty($input['create_checkout'])) {
        $session = rtbo_payment_create_checkout_for_incoming($payment);
        $update = db()->prepare('UPDATE payment_incoming SET stripe_checkout_session_id = ?, payment_url = ?, status = ?, updated_at = NOW() WHERE id = ?');
        $update->execute([(string) ($session['id'] ?? ''), (string) ($session['url'] ?? ''), 'sent', $id]);
        $payment = rtbo_payment_get_incoming_database($id);
    }

    return $payment;
}

function rtbo_payment_get_incoming_database(int $id): array
{
    $stmt = db()->prepare('SELECT * FROM payment_incoming WHERE id = ? LIMIT 1');
    $stmt->execute([$id]);
    $row = $stmt->fetch();
    if (!$row) {
        throw new RuntimeException('Incoming payment record was not found.');
    }

    return rtbo_payment_incoming_public($row);
}

function rtbo_payment_create_incoming_file(array $input, array $user): array
{
    $store = rtbo_payment_read_file();
    $amountCents = rtbo_payment_money_cents($input);
    if ($amountCents <= 0) {
        throw new RuntimeException('Enter an incoming payment amount.');
    }

    $record = rtbo_payment_incoming_public([
        'id' => rtbo_payment_next_file_id($store['incoming_payments']),
        'payer_type' => rtbo_payment_safe_payer_type(rtbo_payment_text($input, 'payer_type')),
        'payer_name' => rtbo_payment_text($input, 'payer_name'),
        'contact_name' => rtbo_payment_text($input, 'contact_name'),
        'email' => strtolower(rtbo_payment_text($input, 'email')),
        'phone' => rtbo_format_phone_number(rtbo_payment_text($input, 'phone')),
        'description' => rtbo_payment_text($input, 'description'),
        'amount_cents' => $amountCents,
        'due_date' => rtbo_payment_text($input, 'due_date'),
        'payment_method' => rtbo_payment_safe_method(rtbo_payment_text($input, 'payment_method')),
        'status' => rtbo_payment_safe_status(rtbo_payment_text($input, 'status'), ['pending', 'sent', 'paid', 'failed', 'void'], 'pending'),
        'created_by' => (int) ($user['id'] ?? 0),
        'created_at' => date('c'),
        'updated_at' => date('c'),
    ]);

    if ($record['payment_method'] === 'stripe_checkout' && !empty($input['create_checkout'])) {
        $session = rtbo_payment_create_checkout_for_incoming($record);
        $record['stripe_checkout_session_id'] = (string) ($session['id'] ?? '');
        $record['payment_url'] = (string) ($session['url'] ?? '');
        $record['status'] = 'sent';
    }

    array_unshift($store['incoming_payments'], $record);
    rtbo_payment_write_file($store);

    return $record;
}

function rtbo_payment_update_status(string $table, int $id, string $status): void
{
    $column = $table === 'official_payouts' ? 'status' : 'status';
    $stmt = db()->prepare("UPDATE {$table} SET {$column} = ?, updated_at = NOW() WHERE id = ?");
    $stmt->execute([$status, $id]);
}

function rtbo_payment_delete_database(string $table, int $id): void
{
    $stmt = db()->prepare("DELETE FROM {$table} WHERE id = ?");
    $stmt->execute([$id]);
}

function rtbo_payment_update_file_record(string $collection, int $id, callable $updater): array
{
    $store = rtbo_payment_read_file();
    foreach ($store[$collection] as $index => $record) {
        if ((int) ($record['id'] ?? 0) === $id) {
            $store[$collection][$index] = $updater($record);
            rtbo_payment_write_file($store);

            return $store[$collection][$index];
        }
    }

    throw new RuntimeException('Payment record was not found.');
}

function rtbo_payment_delete_file_record(string $collection, int $id): void
{
    $store = rtbo_payment_read_file();
    $store[$collection] = array_values(array_filter($store[$collection], static fn (array $record): bool => (int) ($record['id'] ?? 0) !== $id));
    rtbo_payment_write_file($store);
}

function rtbo_payment_save_account_database(array $input): array
{
    $officialId = (int) ($input['official_id'] ?? 0);
    $official = rtbo_payment_find_official($officialId);
    if (!$official) {
        throw new RuntimeException('Select an official before saving direct deposit setup.');
    }

    $stmt = db()->prepare(
        "INSERT INTO official_payment_accounts(official_id, official_name, official_email, direct_deposit_status, payout_method, stripe_account_id, bank_last4, routing_last4, notes, updated_at)
         VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
         ON DUPLICATE KEY UPDATE
            official_name = VALUES(official_name),
            official_email = VALUES(official_email),
            direct_deposit_status = VALUES(direct_deposit_status),
            payout_method = VALUES(payout_method),
            stripe_account_id = VALUES(stripe_account_id),
            bank_last4 = VALUES(bank_last4),
            routing_last4 = VALUES(routing_last4),
            notes = VALUES(notes),
            updated_at = NOW()"
    );
    $stmt->execute([
        $officialId,
        (string) ($official['name'] ?? ''),
        (string) ($official['email'] ?? ''),
        rtbo_payment_safe_deposit_status(rtbo_payment_text($input, 'direct_deposit_status')),
        rtbo_payment_text($input, 'payout_method') ?: 'stripe_connect',
        rtbo_payment_text($input, 'stripe_account_id'),
        substr(preg_replace('/\D+/', '', rtbo_payment_text($input, 'bank_last4')) ?: '', -4),
        substr(preg_replace('/\D+/', '', rtbo_payment_text($input, 'routing_last4')) ?: '', -4),
        rtbo_payment_text($input, 'notes'),
    ]);

    $stmt = db()->prepare('SELECT * FROM official_payment_accounts WHERE official_id = ? LIMIT 1');
    $stmt->execute([$officialId]);

    return rtbo_payment_account_public($stmt->fetch() ?: []);
}

function rtbo_payment_save_account_file(array $input): array
{
    $officialId = (int) ($input['official_id'] ?? 0);
    $official = rtbo_payment_find_official($officialId);
    if (!$official) {
        throw new RuntimeException('Select an official before saving direct deposit setup.');
    }

    $store = rtbo_payment_read_file();
    $record = rtbo_payment_account_public([
        'id' => rtbo_payment_next_file_id($store['official_accounts']),
        'official_id' => $officialId,
        'official_name' => (string) ($official['name'] ?? ''),
        'official_email' => (string) ($official['email'] ?? ''),
        'direct_deposit_status' => rtbo_payment_safe_deposit_status(rtbo_payment_text($input, 'direct_deposit_status')),
        'payout_method' => rtbo_payment_text($input, 'payout_method') ?: 'stripe_connect',
        'stripe_account_id' => rtbo_payment_text($input, 'stripe_account_id'),
        'bank_last4' => substr(preg_replace('/\D+/', '', rtbo_payment_text($input, 'bank_last4')) ?: '', -4),
        'routing_last4' => substr(preg_replace('/\D+/', '', rtbo_payment_text($input, 'routing_last4')) ?: '', -4),
        'notes' => rtbo_payment_text($input, 'notes'),
        'created_at' => date('c'),
        'updated_at' => date('c'),
    ]);

    $updated = false;
    foreach ($store['official_accounts'] as $index => $existing) {
        if ((int) ($existing['official_id'] ?? 0) === $officialId) {
            $record['id'] = (int) ($existing['id'] ?? $record['id']);
            $record['created_at'] = (string) ($existing['created_at'] ?? $record['created_at']);
            $store['official_accounts'][$index] = $record;
            $updated = true;
            break;
        }
    }
    if (!$updated) {
        array_unshift($store['official_accounts'], $record);
    }
    rtbo_payment_write_file($store);

    return $record;
}

function rtbo_payment_create_payout_database(array $input, array $user): array
{
    $officialId = (int) ($input['official_id'] ?? 0);
    $official = rtbo_payment_find_official($officialId);
    if (!$official) {
        throw new RuntimeException('Select an official before creating a payout.');
    }
    $amountCents = rtbo_payment_money_cents($input);
    if ($amountCents <= 0) {
        throw new RuntimeException('Enter an official payout amount.');
    }

    $accountStmt = db()->prepare('SELECT id FROM official_payment_accounts WHERE official_id = ? LIMIT 1');
    $accountStmt->execute([$officialId]);
    $accountId = (int) ($accountStmt->fetchColumn() ?: 0);

    $stmt = db()->prepare(
        "INSERT INTO official_payouts(official_id, official_name, amount_cents, service_date, event_name, description, status, payment_account_id, created_by, updated_at)
         VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())"
    );
    $stmt->execute([
        $officialId,
        (string) ($official['name'] ?? ''),
        $amountCents,
        rtbo_payment_text($input, 'service_date') ?: null,
        rtbo_payment_text($input, 'event_name'),
        rtbo_payment_text($input, 'description'),
        rtbo_payment_safe_payout_status(rtbo_payment_text($input, 'status')),
        $accountId ?: null,
        (int) ($user['id'] ?? 0) ?: null,
    ]);

    $id = (int) db()->lastInsertId();
    $stmt = db()->prepare('SELECT * FROM official_payouts WHERE id = ? LIMIT 1');
    $stmt->execute([$id]);

    return rtbo_payment_payout_public($stmt->fetch() ?: []);
}

function rtbo_payment_create_payout_file(array $input, array $user): array
{
    $officialId = (int) ($input['official_id'] ?? 0);
    $official = rtbo_payment_find_official($officialId);
    if (!$official) {
        throw new RuntimeException('Select an official before creating a payout.');
    }
    $amountCents = rtbo_payment_money_cents($input);
    if ($amountCents <= 0) {
        throw new RuntimeException('Enter an official payout amount.');
    }

    $store = rtbo_payment_read_file();
    $account = array_values(array_filter($store['official_accounts'], static fn (array $candidate): bool => (int) ($candidate['official_id'] ?? 0) === $officialId))[0] ?? [];
    $record = rtbo_payment_payout_public([
        'id' => rtbo_payment_next_file_id($store['official_payouts']),
        'official_id' => $officialId,
        'official_name' => (string) ($official['name'] ?? ''),
        'amount_cents' => $amountCents,
        'service_date' => rtbo_payment_text($input, 'service_date'),
        'event_name' => rtbo_payment_text($input, 'event_name'),
        'description' => rtbo_payment_text($input, 'description'),
        'status' => rtbo_payment_safe_payout_status(rtbo_payment_text($input, 'status')),
        'payment_account_id' => (int) ($account['id'] ?? 0),
        'created_by' => (int) ($user['id'] ?? 0),
        'created_at' => date('c'),
        'updated_at' => date('c'),
    ]);
    array_unshift($store['official_payouts'], $record);
    rtbo_payment_write_file($store);

    return $record;
}

function rtbo_payment_send_direct_deposit_database(int $payoutId): array
{
    $stmt = db()->prepare(
        "SELECT p.*, a.direct_deposit_status, a.stripe_account_id
         FROM official_payouts p
         LEFT JOIN official_payment_accounts a ON a.official_id = p.official_id
         WHERE p.id = ?
         LIMIT 1"
    );
    $stmt->execute([$payoutId]);
    $payout = $stmt->fetch();
    if (!$payout) {
        throw new RuntimeException('Official payout was not found.');
    }
    if ((string) ($payout['direct_deposit_status'] ?? '') !== 'ready' || trim((string) ($payout['stripe_account_id'] ?? '')) === '') {
        throw new RuntimeException('This official is not marked ready for direct deposit.');
    }
    if ((int) ($payout['amount_cents'] ?? 0) < 50) {
        throw new RuntimeException('Direct deposit transfers must be at least $0.50.');
    }

    $transfer = stripe_api_request('/v1/transfers', 'POST', [
        'amount' => (int) $payout['amount_cents'],
        'currency' => 'usd',
        'destination' => (string) $payout['stripe_account_id'],
        'description' => trim((string) ($payout['event_name'] ?? 'RTBO official payout')),
        'metadata[type]' => 'official_direct_deposit',
        'metadata[payout_id]' => (string) $payoutId,
        'metadata[official_id]' => (string) ($payout['official_id'] ?? ''),
    ]);

    $update = db()->prepare("UPDATE official_payouts SET status = 'paid', stripe_transfer_id = ?, paid_at = NOW(), updated_at = NOW() WHERE id = ?");
    $update->execute([(string) ($transfer['id'] ?? ''), $payoutId]);
    $fresh = db()->prepare('SELECT * FROM official_payouts WHERE id = ? LIMIT 1');
    $fresh->execute([$payoutId]);

    return rtbo_payment_payout_public($fresh->fetch() ?: []);
}

function rtbo_payment_send_direct_deposit_file(int $payoutId): array
{
    $store = rtbo_payment_read_file();
    foreach ($store['official_payouts'] as $index => $payout) {
        if ((int) ($payout['id'] ?? 0) !== $payoutId) {
            continue;
        }
        $account = array_values(array_filter($store['official_accounts'], static fn (array $candidate): bool => (int) ($candidate['official_id'] ?? 0) === (int) ($payout['official_id'] ?? 0)))[0] ?? [];
        if (($account['direct_deposit_status'] ?? '') !== 'ready' || trim((string) ($account['stripe_account_id'] ?? '')) === '') {
            throw new RuntimeException('This official is not marked ready for direct deposit.');
        }
        $transfer = stripe_api_request('/v1/transfers', 'POST', [
            'amount' => (int) ($payout['amount_cents'] ?? 0),
            'currency' => 'usd',
            'destination' => (string) ($account['stripe_account_id'] ?? ''),
            'description' => trim((string) ($payout['event_name'] ?? 'RTBO official payout')),
            'metadata[type]' => 'official_direct_deposit',
            'metadata[payout_id]' => (string) $payoutId,
            'metadata[official_id]' => (string) ($payout['official_id'] ?? ''),
        ]);
        $store['official_payouts'][$index]['status'] = 'paid';
        $store['official_payouts'][$index]['stripe_transfer_id'] = (string) ($transfer['id'] ?? '');
        $store['official_payouts'][$index]['paid_at'] = date('c');
        $store['official_payouts'][$index]['updated_at'] = date('c');
        rtbo_payment_write_file($store);

        return rtbo_payment_payout_public($store['official_payouts'][$index]);
    }

    throw new RuntimeException('Official payout was not found.');
}

$databaseUser = current_database_user();
$user = $databaseUser ? public_auth_user($databaseUser) : current_user();
if (!$user) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Sign-in is required.']);
    exit;
}

if (!is_admin_user($user)) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Payment system access is reserved for Super Admin and admin accounts.']);
    exit;
}

try {
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        echo json_encode(rtbo_payment_response(), JSON_UNESCAPED_SLASHES);
        exit;
    }

    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['success' => false, 'message' => 'GET or POST required.']);
        exit;
    }

    require_same_origin_request();
    $input = rtbo_payment_input();
    $action = (string) ($input['action'] ?? '');
    $record = is_array($input['record'] ?? null) ? $input['record'] : $input;
    $id = (int) ($input['id'] ?? $record['id'] ?? 0);
    $db = rtbo_payment_db_available();

    if ($action === 'create_incoming_payment') {
        $payment = $db ? rtbo_payment_create_incoming_database($record, $user) : rtbo_payment_create_incoming_file($record, $user);
        echo json_encode(['success' => true, 'message' => 'Incoming payment saved.', 'incoming_payment' => $payment, ...rtbo_payment_response()], JSON_UNESCAPED_SLASHES);
        exit;
    }

    if ($action === 'update_incoming_status') {
        $status = rtbo_payment_safe_status((string) ($input['status'] ?? $record['status'] ?? 'pending'), ['pending', 'sent', 'paid', 'failed', 'void'], 'pending');
        if ($db) {
            rtbo_payment_update_status('payment_incoming', $id, $status);
        } else {
            rtbo_payment_update_file_record('incoming_payments', $id, static function (array $payment) use ($status): array {
                $payment['status'] = $status;
                $payment['updated_at'] = date('c');

                return $payment;
            });
        }
        echo json_encode(['success' => true, 'message' => 'Incoming payment updated.', ...rtbo_payment_response()], JSON_UNESCAPED_SLASHES);
        exit;
    }

    if ($action === 'delete_incoming_payment') {
        $db ? rtbo_payment_delete_database('payment_incoming', $id) : rtbo_payment_delete_file_record('incoming_payments', $id);
        echo json_encode(['success' => true, 'message' => 'Incoming payment deleted.', ...rtbo_payment_response()], JSON_UNESCAPED_SLASHES);
        exit;
    }

    if ($action === 'save_official_payment_account') {
        $account = $db ? rtbo_payment_save_account_database($record) : rtbo_payment_save_account_file($record);
        echo json_encode(['success' => true, 'message' => 'Official direct deposit setup saved.', 'official_account' => $account, ...rtbo_payment_response()], JSON_UNESCAPED_SLASHES);
        exit;
    }

    if ($action === 'create_official_payout') {
        $payout = $db ? rtbo_payment_create_payout_database($record, $user) : rtbo_payment_create_payout_file($record, $user);
        echo json_encode(['success' => true, 'message' => 'Official payout saved.', 'official_payout' => $payout, ...rtbo_payment_response()], JSON_UNESCAPED_SLASHES);
        exit;
    }

    if ($action === 'update_official_payout_status') {
        $status = rtbo_payment_safe_payout_status((string) ($input['status'] ?? $record['status'] ?? 'queued'));
        if ($db) {
            rtbo_payment_update_status('official_payouts', $id, $status);
        } else {
            rtbo_payment_update_file_record('official_payouts', $id, static function (array $payout) use ($status): array {
                $payout['status'] = $status;
                $payout['updated_at'] = date('c');
                if ($status === 'paid' && empty($payout['paid_at'])) {
                    $payout['paid_at'] = date('c');
                }

                return $payout;
            });
        }
        echo json_encode(['success' => true, 'message' => 'Official payout updated.', ...rtbo_payment_response()], JSON_UNESCAPED_SLASHES);
        exit;
    }

    if ($action === 'delete_official_payout') {
        $db ? rtbo_payment_delete_database('official_payouts', $id) : rtbo_payment_delete_file_record('official_payouts', $id);
        echo json_encode(['success' => true, 'message' => 'Official payout deleted.', ...rtbo_payment_response()], JSON_UNESCAPED_SLASHES);
        exit;
    }

    if ($action === 'send_direct_deposit') {
        if (!is_super_admin($user)) {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'Only the Super Admin can send direct deposit transfers.']);
            exit;
        }
        $payout = $db ? rtbo_payment_send_direct_deposit_database($id) : rtbo_payment_send_direct_deposit_file($id);
        echo json_encode(['success' => true, 'message' => 'Direct deposit transfer sent to Stripe Connect.', 'official_payout' => $payout, ...rtbo_payment_response()], JSON_UNESCAPED_SLASHES);
        exit;
    }

    http_response_code(422);
    echo json_encode(['success' => false, 'message' => 'Unknown payment system action.']);
} catch (Throwable $error) {
    error_log('RTBO admin payment system failed: ' . $error->getMessage());
    http_response_code(422);
    echo json_encode(['success' => false, 'message' => $error->getMessage()]);
}

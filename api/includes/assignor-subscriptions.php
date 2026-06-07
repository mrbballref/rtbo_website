<?php
declare(strict_types=1);

function rtbo_assignor_subscription_plans(): array
{
    return [
        'trial' => [
            'id' => 'trial',
            'name' => 'Trial Workspace',
            'price_id' => STRIPE_ASSIGNOR_TRIAL_PRICE_ID !== '' ? STRIPE_ASSIGNOR_TRIAL_PRICE_ID : STRIPE_ASSIGNOR_MONTHLY_PRICE_ID,
            'trial_days' => STRIPE_ASSIGNOR_TRIAL_DAYS,
            'billing_interval' => 'trial',
            'workspace_limit' => 1,
            'official_limit' => 25,
            'game_limit' => 50,
            'storage_limit_gb' => 5,
            'video_storage_limit_gb' => 2,
            'whiteboard_access' => 'included',
        ],
        'monthly' => [
            'id' => 'monthly',
            'name' => 'Assignor Pro Monthly',
            'price_id' => STRIPE_ASSIGNOR_MONTHLY_PRICE_ID,
            'trial_days' => 0,
            'billing_interval' => 'month',
            'workspace_limit' => 1,
            'official_limit' => 150,
            'game_limit' => 500,
            'storage_limit_gb' => 50,
            'video_storage_limit_gb' => 25,
            'whiteboard_access' => 'full',
        ],
        'annual' => [
            'id' => 'annual',
            'name' => 'Assignor Enterprise Annual',
            'price_id' => STRIPE_ASSIGNOR_ANNUAL_PRICE_ID,
            'trial_days' => 0,
            'billing_interval' => 'year',
            'workspace_limit' => 3,
            'official_limit' => 500,
            'game_limit' => 2500,
            'storage_limit_gb' => 250,
            'video_storage_limit_gb' => 150,
            'whiteboard_access' => 'full',
        ],
    ];
}

function rtbo_assignor_subscription_plan(string $planId): array
{
    $plans = rtbo_assignor_subscription_plans();
    if (!isset($plans[$planId])) {
        throw new RuntimeException('Choose a valid Got U Nex Ref assignor subscription plan.');
    }

    return $plans[$planId];
}

function rtbo_assignor_subscription_ensure_table(): void
{
    db()->exec(
        "CREATE TABLE IF NOT EXISTS assignor_workspace_applications (
            id VARCHAR(64) PRIMARY KEY,
            organization_name VARCHAR(190) NOT NULL,
            contact_name VARCHAR(190) NOT NULL,
            email VARCHAR(190) NOT NULL,
            phone VARCHAR(60) NULL,
            plan_id VARCHAR(80) NOT NULL,
            plan_name VARCHAR(160) NOT NULL,
            workspace_limit INT NOT NULL DEFAULT 1,
            official_limit INT NOT NULL DEFAULT 0,
            game_limit INT NOT NULL DEFAULT 0,
            storage_limit_gb INT NOT NULL DEFAULT 0,
            video_storage_limit_gb INT NOT NULL DEFAULT 0,
            whiteboard_access VARCHAR(80) NOT NULL DEFAULT 'included',
            custom_branding TINYINT(1) NOT NULL DEFAULT 0,
            status VARCHAR(60) NOT NULL DEFAULT 'pending_checkout',
            payment_provider VARCHAR(40) NOT NULL DEFAULT 'stripe',
            stripe_checkout_session_id VARCHAR(190) NULL,
            stripe_subscription_id VARCHAR(190) NULL,
            paid_at DATETIME NULL,
            payload JSON NULL,
            submitted_at DATETIME NOT NULL,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_assignor_workspace_email (email),
            INDEX idx_assignor_workspace_plan (plan_id),
            INDEX idx_assignor_workspace_status (status),
            INDEX idx_assignor_workspace_submitted (submitted_at)
        )"
    );
}

function rtbo_assignor_subscription_storage_path(): string
{
    return STORAGE_DIR . '/assignor-workspace-applications.json';
}

function rtbo_assignor_subscription_load_file_store(): array
{
    $path = rtbo_assignor_subscription_storage_path();
    if (!is_file($path)) {
        return [];
    }

    $records = json_decode((string) file_get_contents($path), true);
    return is_array($records) ? $records : [];
}

function rtbo_assignor_subscription_save_file_store(array $records): void
{
    if (!is_dir(STORAGE_DIR)) {
        mkdir(STORAGE_DIR, 0755, true);
    }

    file_put_contents(rtbo_assignor_subscription_storage_path(), json_encode(array_values($records), JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES), LOCK_EX);
}

function rtbo_assignor_subscription_save_file_record(array $record): array
{
    $records = rtbo_assignor_subscription_load_file_store();
    $updated = false;
    foreach ($records as $index => $candidate) {
        if ((string) ($candidate['id'] ?? '') === (string) ($record['id'] ?? '')) {
            $records[$index] = array_merge($candidate, $record, ['updated_at' => gmdate('c')]);
            $updated = true;
            break;
        }
    }
    if (!$updated) {
        $records[] = $record;
    }
    rtbo_assignor_subscription_save_file_store($records);

    return $record;
}

function rtbo_assignor_subscription_create_record(array $input, array $plan): array
{
    $record = [
        'id' => 'aws_' . bin2hex(random_bytes(8)),
        'organization_name' => trim((string) ($input['organization_name'] ?? '')),
        'contact_name' => trim((string) ($input['contact_name'] ?? '')),
        'email' => strtolower(trim((string) ($input['email'] ?? ''))),
        'phone' => trim((string) ($input['phone'] ?? '')),
        'plan_id' => $plan['id'],
        'plan_name' => $plan['name'],
        'workspace_limit' => (int) $plan['workspace_limit'],
        'official_limit' => (int) $plan['official_limit'],
        'game_limit' => (int) $plan['game_limit'],
        'storage_limit_gb' => (int) $plan['storage_limit_gb'],
        'video_storage_limit_gb' => (int) $plan['video_storage_limit_gb'],
        'whiteboard_access' => (string) $plan['whiteboard_access'],
        'custom_branding' => !empty($input['custom_branding']) ? 1 : 0,
        'status' => 'pending_checkout',
        'payment_provider' => 'stripe',
        'payload' => [
            'expected_officials' => trim((string) ($input['expected_officials'] ?? '')),
            'expected_games' => trim((string) ($input['expected_games'] ?? '')),
            'notes' => trim((string) ($input['notes'] ?? '')),
            'billing_interval' => (string) $plan['billing_interval'],
        ],
        'submitted_at' => gmdate('c'),
        'updated_at' => gmdate('c'),
    ];

    try {
        rtbo_assignor_subscription_ensure_table();
        $stmt = db()->prepare(
            "INSERT INTO assignor_workspace_applications
                (id, organization_name, contact_name, email, phone, plan_id, plan_name, workspace_limit, official_limit, game_limit, storage_limit_gb, video_storage_limit_gb, whiteboard_access, custom_branding, status, payment_provider, payload, submitted_at)
             VALUES
                (:id, :organization_name, :contact_name, :email, :phone, :plan_id, :plan_name, :workspace_limit, :official_limit, :game_limit, :storage_limit_gb, :video_storage_limit_gb, :whiteboard_access, :custom_branding, :status, :payment_provider, :payload, :submitted_at)"
        );
        $stmt->execute([
            ':id' => $record['id'],
            ':organization_name' => $record['organization_name'],
            ':contact_name' => $record['contact_name'],
            ':email' => $record['email'],
            ':phone' => $record['phone'],
            ':plan_id' => $record['plan_id'],
            ':plan_name' => $record['plan_name'],
            ':workspace_limit' => $record['workspace_limit'],
            ':official_limit' => $record['official_limit'],
            ':game_limit' => $record['game_limit'],
            ':storage_limit_gb' => $record['storage_limit_gb'],
            ':video_storage_limit_gb' => $record['video_storage_limit_gb'],
            ':whiteboard_access' => $record['whiteboard_access'],
            ':custom_branding' => $record['custom_branding'],
            ':status' => $record['status'],
            ':payment_provider' => $record['payment_provider'],
            ':payload' => json_encode($record['payload'], JSON_UNESCAPED_SLASHES),
            ':submitted_at' => gmdate('Y-m-d H:i:s'),
        ]);
    } catch (Throwable $error) {
        error_log('RTBO assignor workspace database insert failed: ' . $error->getMessage());
    }

    return rtbo_assignor_subscription_save_file_record($record);
}

function rtbo_assignor_subscription_find(string $id): ?array
{
    $id = trim($id);
    if ($id === '') {
        return null;
    }

    try {
        rtbo_assignor_subscription_ensure_table();
        $stmt = db()->prepare('SELECT * FROM assignor_workspace_applications WHERE id = ? LIMIT 1');
        $stmt->execute([$id]);
        $record = $stmt->fetch();
        if ($record) {
            $record['payload'] = json_decode((string) ($record['payload'] ?? '{}'), true) ?: [];
            return $record;
        }
    } catch (Throwable $error) {
        error_log('RTBO assignor workspace database lookup failed: ' . $error->getMessage());
    }

    foreach (rtbo_assignor_subscription_load_file_store() as $record) {
        if ((string) ($record['id'] ?? '') === $id) {
            return $record;
        }
    }

    return null;
}

function rtbo_assignor_subscription_update_payment(string $id, string $status, array $updates = []): ?array
{
    $record = rtbo_assignor_subscription_find($id);
    if (!$record) {
        return null;
    }

    $next = array_merge($record, $updates, [
        'status' => $status,
        'updated_at' => gmdate('c'),
    ]);
    if ($status === 'active' && empty($next['paid_at'])) {
        $next['paid_at'] = gmdate('c');
    }

    try {
        rtbo_assignor_subscription_ensure_table();
        $stmt = db()->prepare(
            "UPDATE assignor_workspace_applications
             SET status = ?, stripe_checkout_session_id = ?, stripe_subscription_id = ?, paid_at = COALESCE(?, paid_at), updated_at = NOW()
             WHERE id = ?"
        );
        $stmt->execute([
            $next['status'],
            (string) ($next['stripe_checkout_session_id'] ?? ''),
            (string) ($next['stripe_subscription_id'] ?? ''),
            !empty($next['paid_at']) ? gmdate('Y-m-d H:i:s', strtotime((string) $next['paid_at'])) : null,
            $id,
        ]);
    } catch (Throwable $error) {
        error_log('RTBO assignor workspace database update failed: ' . $error->getMessage());
    }

    return rtbo_assignor_subscription_save_file_record($next);
}

function rtbo_assignor_subscription_normalize_record(array $record): array
{
    $payload = $record['payload'] ?? [];
    if (is_string($payload)) {
        $payload = json_decode($payload, true) ?: [];
    }
    if (!is_array($payload)) {
        $payload = [];
    }

    foreach (['workspace_limit', 'official_limit', 'game_limit', 'storage_limit_gb', 'video_storage_limit_gb'] as $field) {
        $record[$field] = (int) ($record[$field] ?? 0);
    }

    $record['custom_branding'] = !empty($record['custom_branding']) ? 1 : 0;
    $record['payload'] = $payload;

    return $record;
}

function rtbo_assignor_subscription_all(): array
{
    $records = [];

    try {
        rtbo_assignor_subscription_ensure_table();
        $stmt = db()->query(
            "SELECT *
             FROM assignor_workspace_applications
             ORDER BY submitted_at DESC"
        );
        foreach ($stmt->fetchAll() as $record) {
            $normalized = rtbo_assignor_subscription_normalize_record($record);
            $records[(string) ($normalized['id'] ?? '')] = $normalized;
        }
    } catch (Throwable $error) {
        error_log('RTBO assignor workspace database list failed: ' . $error->getMessage());
    }

    foreach (rtbo_assignor_subscription_load_file_store() as $record) {
        $normalized = rtbo_assignor_subscription_normalize_record($record);
        $id = (string) ($normalized['id'] ?? '');
        if ($id !== '' && !isset($records[$id])) {
            $records[$id] = $normalized;
        }
    }

    $items = array_values($records);
    usort($items, static function (array $a, array $b): int {
        return strtotime((string) ($b['submitted_at'] ?? '')) <=> strtotime((string) ($a['submitted_at'] ?? ''));
    });

    return $items;
}

function rtbo_assignor_subscription_summary(array $records): array
{
    $activeStatuses = ['active', 'subscription_updated'];
    $pendingStatuses = ['pending_checkout', 'checkout_created'];

    return [
        'total' => count($records),
        'active' => count(array_filter($records, static fn (array $record): bool => in_array((string) ($record['status'] ?? ''), $activeStatuses, true))),
        'pending' => count(array_filter($records, static fn (array $record): bool => in_array((string) ($record['status'] ?? ''), $pendingStatuses, true))),
        'custom_branding' => count(array_filter($records, static fn (array $record): bool => !empty($record['custom_branding']))),
    ];
}

<?php
declare(strict_types=1);

require_once __DIR__ . '/includes/bootstrap.php';
require_once __DIR__ . '/includes/users.php';
require_once __DIR__ . '/includes/notifications.php';
require_once __DIR__ . '/includes/pdf.php';
require_once __DIR__ . '/includes/email.php';
require_once __DIR__ . '/includes/payments.php';

header('Content-Type: application/json');

function rtbo_invoice_input(): array
{
    $data = json_decode((string) file_get_contents('php://input'), true);
    return is_array($data) ? $data : [];
}

function rtbo_invoice_columns(): array
{
    $stmt = db()->prepare(
        "SELECT COLUMN_NAME
         FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = 'admin_invoices'"
    );
    $stmt->execute();
    return array_map('strval', $stmt->fetchAll(PDO::FETCH_COLUMN));
}

function rtbo_invoice_add_column_if_missing(array $columns, string $column, string $sql): array
{
    if (!in_array($column, $columns, true)) {
        db()->exec($sql);
        $columns[] = $column;
    }

    return $columns;
}

function rtbo_ensure_admin_invoices_table(): void
{
    db()->exec(
        "CREATE TABLE IF NOT EXISTS admin_invoices (
            id INT AUTO_INCREMENT PRIMARY KEY,
            invoice_number VARCHAR(80) NOT NULL,
            invoice_date DATE NULL,
            due_date DATE NULL,
            school_name VARCHAR(190) NULL,
            contact_name VARCHAR(190) NULL,
            email VARCHAR(190) NULL,
            phone VARCHAR(80) NULL,
	            billing_address TEXT NULL,
	            event_name VARCHAR(190) NULL,
	            game_level VARCHAR(120) NULL,
	            assigning_fee_type VARCHAR(120) NULL,
	            assigning_qty DECIMAL(10,2) NOT NULL DEFAULT 1,
	            assigning_rate DECIMAL(10,2) NOT NULL DEFAULT 0,
	            assigning_fee DECIMAL(10,2) NOT NULL DEFAULT 0,
	            assigning_fee_items TEXT NULL,
	            officials_fee_type VARCHAR(120) NULL,
	            officials_qty DECIMAL(10,2) NOT NULL DEFAULT 1,
	            officials_rate DECIMAL(10,2) NOT NULL DEFAULT 0,
	            officials_fee DECIMAL(10,2) NOT NULL DEFAULT 0,
	            officials_fee_items TEXT NULL,
	            travel_fee_type VARCHAR(120) NULL,
	            travel_qty DECIMAL(10,2) NOT NULL DEFAULT 1,
	            travel_rate DECIMAL(10,2) NOT NULL DEFAULT 0,
	            travel_fee DECIMAL(10,2) NOT NULL DEFAULT 0,
	            travel_fee_items TEXT NULL,
	            additional_fee_type VARCHAR(120) NULL,
	            additional_qty DECIMAL(10,2) NOT NULL DEFAULT 1,
	            additional_rate DECIMAL(10,2) NOT NULL DEFAULT 0,
	            additional_fee DECIMAL(10,2) NOT NULL DEFAULT 0,
	            additional_fee_items TEXT NULL,
	            credit_card_requested TINYINT(1) NOT NULL DEFAULT 0,
	            notes TEXT NULL,
            status VARCHAR(40) NOT NULL DEFAULT 'draft',
            created_by INT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NULL,
            INDEX idx_admin_invoices_number (invoice_number),
            INDEX idx_admin_invoices_created (created_at)
        )"
    );

    $columns = rtbo_invoice_columns();
    $columns = rtbo_invoice_add_column_if_missing($columns, 'invoice_number', 'ALTER TABLE admin_invoices ADD COLUMN invoice_number VARCHAR(80) NOT NULL AFTER id');
    $columns = rtbo_invoice_add_column_if_missing($columns, 'invoice_date', 'ALTER TABLE admin_invoices ADD COLUMN invoice_date DATE NULL AFTER invoice_number');
    $columns = rtbo_invoice_add_column_if_missing($columns, 'due_date', 'ALTER TABLE admin_invoices ADD COLUMN due_date DATE NULL AFTER invoice_date');
    $columns = rtbo_invoice_add_column_if_missing($columns, 'school_name', 'ALTER TABLE admin_invoices ADD COLUMN school_name VARCHAR(190) NULL AFTER due_date');
    $columns = rtbo_invoice_add_column_if_missing($columns, 'contact_name', 'ALTER TABLE admin_invoices ADD COLUMN contact_name VARCHAR(190) NULL AFTER school_name');
    $columns = rtbo_invoice_add_column_if_missing($columns, 'email', 'ALTER TABLE admin_invoices ADD COLUMN email VARCHAR(190) NULL AFTER contact_name');
    $columns = rtbo_invoice_add_column_if_missing($columns, 'phone', 'ALTER TABLE admin_invoices ADD COLUMN phone VARCHAR(80) NULL AFTER email');
    $columns = rtbo_invoice_add_column_if_missing($columns, 'billing_address', 'ALTER TABLE admin_invoices ADD COLUMN billing_address TEXT NULL AFTER phone');
    $columns = rtbo_invoice_add_column_if_missing($columns, 'event_name', 'ALTER TABLE admin_invoices ADD COLUMN event_name VARCHAR(190) NULL AFTER billing_address');
    $columns = rtbo_invoice_add_column_if_missing($columns, 'game_level', 'ALTER TABLE admin_invoices ADD COLUMN game_level VARCHAR(120) NULL AFTER event_name');
    $columns = rtbo_invoice_add_column_if_missing($columns, 'assigning_fee_type', 'ALTER TABLE admin_invoices ADD COLUMN assigning_fee_type VARCHAR(120) NULL AFTER game_level');
    $columns = rtbo_invoice_add_column_if_missing($columns, 'assigning_qty', 'ALTER TABLE admin_invoices ADD COLUMN assigning_qty DECIMAL(10,2) NOT NULL DEFAULT 1 AFTER assigning_fee_type');
    $columns = rtbo_invoice_add_column_if_missing($columns, 'assigning_rate', 'ALTER TABLE admin_invoices ADD COLUMN assigning_rate DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER assigning_qty');
    $columns = rtbo_invoice_add_column_if_missing($columns, 'assigning_fee', 'ALTER TABLE admin_invoices ADD COLUMN assigning_fee DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER game_level');
    $columns = rtbo_invoice_add_column_if_missing($columns, 'assigning_fee_items', 'ALTER TABLE admin_invoices ADD COLUMN assigning_fee_items TEXT NULL AFTER assigning_fee');
    $columns = rtbo_invoice_add_column_if_missing($columns, 'officials_fee_type', 'ALTER TABLE admin_invoices ADD COLUMN officials_fee_type VARCHAR(120) NULL AFTER assigning_fee');
    $columns = rtbo_invoice_add_column_if_missing($columns, 'officials_qty', 'ALTER TABLE admin_invoices ADD COLUMN officials_qty DECIMAL(10,2) NOT NULL DEFAULT 1 AFTER officials_fee_type');
    $columns = rtbo_invoice_add_column_if_missing($columns, 'officials_rate', 'ALTER TABLE admin_invoices ADD COLUMN officials_rate DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER officials_qty');
    $columns = rtbo_invoice_add_column_if_missing($columns, 'officials_fee', 'ALTER TABLE admin_invoices ADD COLUMN officials_fee DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER assigning_fee');
    $columns = rtbo_invoice_add_column_if_missing($columns, 'officials_fee_items', 'ALTER TABLE admin_invoices ADD COLUMN officials_fee_items TEXT NULL AFTER officials_fee');
    $columns = rtbo_invoice_add_column_if_missing($columns, 'travel_fee_type', 'ALTER TABLE admin_invoices ADD COLUMN travel_fee_type VARCHAR(120) NULL AFTER officials_fee');
    $columns = rtbo_invoice_add_column_if_missing($columns, 'travel_qty', 'ALTER TABLE admin_invoices ADD COLUMN travel_qty DECIMAL(10,2) NOT NULL DEFAULT 1 AFTER travel_fee_type');
    $columns = rtbo_invoice_add_column_if_missing($columns, 'travel_rate', 'ALTER TABLE admin_invoices ADD COLUMN travel_rate DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER travel_qty');
    $columns = rtbo_invoice_add_column_if_missing($columns, 'travel_fee', 'ALTER TABLE admin_invoices ADD COLUMN travel_fee DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER officials_fee');
    $columns = rtbo_invoice_add_column_if_missing($columns, 'travel_fee_items', 'ALTER TABLE admin_invoices ADD COLUMN travel_fee_items TEXT NULL AFTER travel_fee');
    $columns = rtbo_invoice_add_column_if_missing($columns, 'additional_fee_type', 'ALTER TABLE admin_invoices ADD COLUMN additional_fee_type VARCHAR(120) NULL AFTER travel_fee');
    $columns = rtbo_invoice_add_column_if_missing($columns, 'additional_qty', 'ALTER TABLE admin_invoices ADD COLUMN additional_qty DECIMAL(10,2) NOT NULL DEFAULT 1 AFTER additional_fee_type');
    $columns = rtbo_invoice_add_column_if_missing($columns, 'additional_rate', 'ALTER TABLE admin_invoices ADD COLUMN additional_rate DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER additional_qty');
    $columns = rtbo_invoice_add_column_if_missing($columns, 'additional_fee', 'ALTER TABLE admin_invoices ADD COLUMN additional_fee DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER travel_fee');
    $columns = rtbo_invoice_add_column_if_missing($columns, 'additional_fee_items', 'ALTER TABLE admin_invoices ADD COLUMN additional_fee_items TEXT NULL AFTER additional_fee');
    $columns = rtbo_invoice_add_column_if_missing($columns, 'credit_card_requested', 'ALTER TABLE admin_invoices ADD COLUMN credit_card_requested TINYINT(1) NOT NULL DEFAULT 0 AFTER additional_fee_items');
    $columns = rtbo_invoice_add_column_if_missing($columns, 'notes', 'ALTER TABLE admin_invoices ADD COLUMN notes TEXT NULL AFTER additional_fee');
    $columns = rtbo_invoice_add_column_if_missing($columns, 'status', "ALTER TABLE admin_invoices ADD COLUMN status VARCHAR(40) NOT NULL DEFAULT 'draft' AFTER notes");
    $columns = rtbo_invoice_add_column_if_missing($columns, 'created_by', 'ALTER TABLE admin_invoices ADD COLUMN created_by INT NULL AFTER status');
    rtbo_invoice_add_column_if_missing($columns, 'updated_at', 'ALTER TABLE admin_invoices ADD COLUMN updated_at DATETIME NULL AFTER created_at');
}

function rtbo_invoice_text(array $source, string $key): string
{
    return trim((string) ($source[$key] ?? ''));
}

function rtbo_invoice_amount(array $source, string $key): float
{
    $value = (float) preg_replace('/[^0-9.\-]/', '', (string) ($source[$key] ?? '0'));
    return max(0, round($value, 2));
}

function rtbo_invoice_quantity(array $source, string $key): float
{
    $raw = (string) ($source[$key] ?? '');
    if (trim($raw) === '') {
        return 1.0;
    }

    $value = (float) preg_replace('/[^0-9.\-]/', '', $raw);
    return max(0, round($value, 2));
}

function rtbo_invoice_number_string(float $value): string
{
    $formatted = rtrim(rtrim(number_format($value, 2, '.', ''), '0'), '.');
    return $formatted === '' ? '0' : $formatted;
}

function rtbo_invoice_decode_items($value): array
{
    $source = $value;
    if (is_string($value)) {
        $decoded = json_decode($value, true);
        $source = is_array($decoded) ? $decoded : [];
    }
    if (!is_array($source)) {
        return [];
    }

    $items = [];
    foreach ($source as $item) {
        if (!is_array($item)) {
            continue;
        }
        $description = trim((string) ($item['description'] ?? $item['label'] ?? ''));
        if ($description === '') {
            continue;
        }
        $qty = rtbo_invoice_quantity($item, 'qty');
        $rate = rtbo_invoice_amount($item, 'rate');
        $items[] = [
            'description' => $description,
            'qty' => rtbo_invoice_number_string($qty),
            'rate' => number_format($rate, 2, '.', ''),
            'total' => number_format(round($qty * $rate, 2), 2, '.', ''),
        ];
    }

    return $items;
}

function rtbo_invoice_public_line(array $row, string $prefix, string $label): array
{
    $items = rtbo_invoice_decode_items($row["{$prefix}_fee_items"] ?? []);
    $fee = (float) ($row["{$prefix}_fee"] ?? 0);
    $qty = (float) ($row["{$prefix}_qty"] ?? 1);
    $rate = (float) ($row["{$prefix}_rate"] ?? 0);
    $type = trim((string) ($row["{$prefix}_fee_type"] ?? ''));
    if ($items) {
        $total = array_reduce($items, static fn (float $sum, array $item): float => $sum + (float) ($item['total'] ?? 0), 0.0);
        return [
            'type' => implode(', ', array_map(static fn (array $item): string => (string) $item['description'], $items)),
            'qty' => (float) ($items[0]['qty'] ?? 1),
            'rate' => (float) ($items[0]['rate'] ?? 0),
            'total' => $total,
            'items' => $items,
        ];
    }

    if ($fee > 0 && $rate <= 0) {
        $qty = 1.0;
        $rate = $fee;
    }

    $total = round($qty * $rate, 2);
    if ($total <= 0 && $fee > 0) {
        $total = $fee;
    }
    $description = $total > 0 ? ($type !== '' ? $type : $label) : '';

    return [
        'type' => $description,
        'qty' => $qty,
        'rate' => $rate,
        'total' => $total,
        'items' => $description !== '' && $total > 0 ? [[
            'description' => $description,
            'qty' => rtbo_invoice_number_string($qty),
            'rate' => number_format($rate, 2, '.', ''),
            'total' => number_format($total, 2, '.', ''),
        ]] : [],
    ];
}

function rtbo_invoice_payload_line(array $invoice, string $itemsKey, string $typeKey, string $qtyKey, string $rateKey, string $totalKey, string $defaultType): array
{
    $items = rtbo_invoice_decode_items($invoice[$itemsKey] ?? []);
    if (!$items) {
        $typeValue = $invoice[$typeKey] ?? '';
        $types = is_array($typeValue)
            ? array_values(array_filter(array_map(static fn ($item): string => trim((string) $item), $typeValue)))
            : array_values(array_filter(array_map('trim', explode(',', (string) $typeValue))));
        $qty = rtbo_invoice_quantity($invoice, $qtyKey);
        $rate = rtbo_invoice_amount($invoice, $rateKey);
        $fallback = rtbo_invoice_amount($invoice, $totalKey);
        if ($rate <= 0 && $fallback > 0) {
            $qty = 1.0;
            $rate = $fallback;
        }
        foreach ($types as $type) {
            $items[] = [
                'description' => $type,
                'qty' => rtbo_invoice_number_string($qty),
                'rate' => number_format($rate, 2, '.', ''),
                'total' => number_format(round($qty * $rate, 2), 2, '.', ''),
            ];
        }
    }

    $items = array_values(array_filter($items, static function (array $item): bool {
        return trim((string) ($item['description'] ?? '')) !== ''
            && (float) ($item['qty'] ?? 0) > 0
            && (float) ($item['rate'] ?? 0) > 0
            && (float) ($item['total'] ?? 0) > 0;
    }));
    $total = array_reduce($items, static fn (float $sum, array $item): float => $sum + (float) ($item['total'] ?? 0), 0.0);
    $type = $items
        ? implode(', ', array_map(static fn (array $item): string => (string) $item['description'], $items))
        : '';

    return [
        'type' => $type,
        'qty' => isset($items[0]) ? (float) ($items[0]['qty'] ?? 1) : 0.0,
        'rate' => isset($items[0]) ? (float) ($items[0]['rate'] ?? 0) : 0.0,
        'total' => round($total, 2),
        'items' => $items,
        'items_json' => json_encode($items, JSON_UNESCAPED_SLASHES),
    ];
}

function rtbo_invoice_public(array $row): array
{
    $assigning = rtbo_invoice_public_line($row, 'assigning', 'Assigning Fees');
    $officials = rtbo_invoice_public_line($row, 'officials', 'Officials Fees');
    $travel = rtbo_invoice_public_line($row, 'travel', 'Travel Fees');
    $additional = rtbo_invoice_public_line($row, 'additional', 'Additional Fees');
    $subtotal = $assigning['total'] + $officials['total'] + $travel['total'] + $additional['total'];

    return [
        'id' => (int) ($row['id'] ?? 0),
        'invoiceNumber' => (string) ($row['invoice_number'] ?? ''),
        'invoiceDate' => (string) ($row['invoice_date'] ?? ''),
        'dueDate' => (string) ($row['due_date'] ?? ''),
        'schoolName' => (string) ($row['school_name'] ?? ''),
        'contactName' => (string) ($row['contact_name'] ?? ''),
        'email' => (string) ($row['email'] ?? ''),
        'phone' => rtbo_format_phone_number((string) ($row['phone'] ?? '')),
        'address' => (string) ($row['billing_address'] ?? ''),
        'eventName' => (string) ($row['event_name'] ?? ''),
        'gameLevel' => (string) ($row['game_level'] ?? ''),
        'assigningFeeType' => $assigning['type'],
        'assigningItems' => $assigning['items'],
        'assigningQty' => rtbo_invoice_number_string($assigning['qty']),
        'assigningRate' => number_format($assigning['rate'], 2, '.', ''),
        'assigningFee' => number_format($assigning['total'], 2, '.', ''),
        'officialsFeeType' => $officials['type'],
        'officialsItems' => $officials['items'],
        'officialsQty' => rtbo_invoice_number_string($officials['qty']),
        'officialsRate' => number_format($officials['rate'], 2, '.', ''),
        'officialsFee' => number_format($officials['total'], 2, '.', ''),
        'travelFeeType' => $travel['type'],
        'travelItems' => $travel['items'],
        'travelQty' => rtbo_invoice_number_string($travel['qty']),
        'travelRate' => number_format($travel['rate'], 2, '.', ''),
        'travelFee' => number_format($travel['total'], 2, '.', ''),
        'additionalFeeType' => $additional['type'],
        'additionalItems' => $additional['items'],
        'additionalQty' => rtbo_invoice_number_string($additional['qty']),
        'additionalRate' => number_format($additional['rate'], 2, '.', ''),
        'additionalFee' => number_format($additional['total'], 2, '.', ''),
        'subtotal' => number_format($subtotal, 2, '.', ''),
        'total' => number_format($subtotal, 2, '.', ''),
        'creditCardRequested' => (bool) ($row['credit_card_requested'] ?? false),
        'notes' => (string) ($row['notes'] ?? ''),
        'status' => (string) ($row['status'] ?? 'draft'),
        'createdBy' => (int) ($row['created_by'] ?? 0),
        'createdAt' => (string) ($row['created_at'] ?? ''),
        'updatedAt' => (string) ($row['updated_at'] ?? ''),
    ];
}

function rtbo_invoice_storage_path(): string
{
    ensure_dir(STORAGE_DIR);
    return STORAGE_DIR . '/admin-invoices.json';
}

function rtbo_invoice_read_file(): array
{
    $path = rtbo_invoice_storage_path();
    if (!is_file($path)) {
        return [];
    }

    $data = json_decode((string) file_get_contents($path), true);
    return is_array($data) ? $data : [];
}

function rtbo_invoice_write_file(array $invoices): void
{
    file_put_contents(rtbo_invoice_storage_path(), json_encode(array_values($invoices), JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
}

function rtbo_invoice_list_file(): array
{
    $invoices = rtbo_invoice_read_file();
    usort($invoices, static fn (array $a, array $b): int => strcmp((string) ($b['createdAt'] ?? ''), (string) ($a['createdAt'] ?? '')));
    return array_slice($invoices, 0, 100);
}

function rtbo_invoice_save_file(array $invoice, array $user): array
{
    $invoices = rtbo_invoice_read_file();
    $id = (int) ($invoice['id'] ?? 0);
    $now = date('Y-m-d H:i:s');

    if ($id <= 0) {
        $maxId = 0;
        foreach ($invoices as $existing) {
            $maxId = max($maxId, (int) ($existing['id'] ?? 0));
        }
        $id = $maxId + 1;
        $invoice['id'] = $id;
        $invoice['createdAt'] = $now;
        $invoice['createdBy'] = (int) ($user['id'] ?? 0);
        array_unshift($invoices, $invoice);
    } else {
        $updated = false;
        foreach ($invoices as $index => $existing) {
            if ((int) ($existing['id'] ?? 0) === $id) {
                $invoice['id'] = $id;
                $invoice['createdAt'] = (string) ($existing['createdAt'] ?? $now);
                $invoice['createdBy'] = (int) ($existing['createdBy'] ?? $user['id'] ?? 0);
                $invoice['updatedAt'] = $now;
                $invoices[$index] = $invoice;
                $updated = true;
                break;
            }
        }
        if (!$updated) {
            $invoice['id'] = $id;
            $invoice['createdAt'] = $now;
            $invoice['createdBy'] = (int) ($user['id'] ?? 0);
            array_unshift($invoices, $invoice);
        }
    }

    rtbo_invoice_write_file($invoices);
    return $invoice;
}

function rtbo_invoice_delete_file(int $id): void
{
    $invoices = array_values(array_filter(rtbo_invoice_read_file(), static fn (array $invoice): bool => (int) ($invoice['id'] ?? 0) !== $id));
    rtbo_invoice_write_file($invoices);
}

function rtbo_invoice_payload(array $input, array $user): array
{
    $invoice = (array) ($input['invoice'] ?? []);
    $assigning = rtbo_invoice_payload_line($invoice, 'assigningItems', 'assigningFeeType', 'assigningQty', 'assigningRate', 'assigningFee', 'Assigning Fees');
    $officials = rtbo_invoice_payload_line($invoice, 'officialsItems', 'officialsFeeType', 'officialsQty', 'officialsRate', 'officialsFee', 'Officials Fees');
    $travel = rtbo_invoice_payload_line($invoice, 'travelItems', 'travelFeeType', 'travelQty', 'travelRate', 'travelFee', 'Travel Fees');
    $additional = rtbo_invoice_payload_line($invoice, 'additionalItems', 'additionalFeeType', 'additionalQty', 'additionalRate', 'additionalFee', 'Additional Fees');
    $invoiceNumber = rtbo_invoice_text($invoice, 'invoiceNumber');

    if ($invoiceNumber === '') {
        throw new RuntimeException('Invoice number is required.');
    }
    if (rtbo_invoice_text($invoice, 'schoolName') === '') {
        throw new RuntimeException('School or organization name is required.');
    }

    return [
        'id' => (int) ($invoice['id'] ?? 0),
        'invoice_number' => $invoiceNumber,
        'invoice_date' => rtbo_invoice_text($invoice, 'invoiceDate'),
        'due_date' => rtbo_invoice_text($invoice, 'dueDate'),
        'school_name' => rtbo_invoice_text($invoice, 'schoolName'),
        'contact_name' => rtbo_invoice_text($invoice, 'contactName'),
        'email' => rtbo_invoice_text($invoice, 'email'),
        'phone' => rtbo_format_phone_number(rtbo_invoice_text($invoice, 'phone')),
        'billing_address' => rtbo_invoice_text($invoice, 'address'),
        'event_name' => rtbo_invoice_text($invoice, 'eventName'),
        'game_level' => rtbo_invoice_text($invoice, 'gameLevel'),
        'assigning_fee_type' => $assigning['type'],
        'assigning_qty' => $assigning['qty'],
        'assigning_rate' => $assigning['rate'],
        'assigning_fee' => $assigning['total'],
        'assigning_fee_items' => $assigning['items_json'],
        'officials_fee_type' => $officials['type'],
        'officials_qty' => $officials['qty'],
        'officials_rate' => $officials['rate'],
        'officials_fee' => $officials['total'],
        'officials_fee_items' => $officials['items_json'],
        'travel_fee_type' => $travel['type'],
        'travel_qty' => $travel['qty'],
        'travel_rate' => $travel['rate'],
        'travel_fee' => $travel['total'],
        'travel_fee_items' => $travel['items_json'],
        'additional_fee_type' => $additional['type'],
        'additional_qty' => $additional['qty'],
        'additional_rate' => $additional['rate'],
        'additional_fee' => $additional['total'],
        'additional_fee_items' => $additional['items_json'],
        'credit_card_requested' => !empty($invoice['creditCardRequested']) || !empty($invoice['credit_card_requested']) ? 1 : 0,
        'notes' => rtbo_invoice_text($invoice, 'notes'),
        'status' => in_array((string) ($invoice['status'] ?? ''), ['draft', 'ready', 'printed'], true) ? (string) $invoice['status'] : 'ready',
        'created_by' => (int) ($user['id'] ?? 0),
        'created_at' => (string) ($invoice['createdAt'] ?? date('Y-m-d H:i:s')),
        'updated_at' => date('Y-m-d H:i:s'),
    ];
}

function rtbo_invoice_validate_delivery_payload(array $payload): void
{
    $required = [
        'invoice_number' => 'Invoice number is required.',
        'invoice_date' => 'Invoice date is required.',
        'due_date' => 'Due date is required.',
        'school_name' => 'School or organization name is required.',
        'contact_name' => 'Contact person is required.',
        'email' => 'Email address is required.',
        'phone' => 'Phone number is required.',
        'billing_address' => 'Billing address is required.',
        'event_name' => 'Event or game name is required.',
        'game_level' => 'Game level is required.',
    ];

    foreach ($required as $field => $message) {
        if (trim((string) ($payload[$field] ?? '')) === '') {
            throw new RuntimeException($message);
        }
    }

    if (!filter_var((string) ($payload['email'] ?? ''), FILTER_VALIDATE_EMAIL)) {
        throw new RuntimeException('A valid recipient email address is required.');
    }
}

function rtbo_invoice_pdf_response(string $pdfPath): array
{
    if (!is_file($pdfPath)) {
        throw new RuntimeException('Invoice PDF could not be created.');
    }

    return [
        'fileName' => basename($pdfPath),
        'mimeType' => 'application/pdf',
        'contentBase64' => base64_encode((string) file_get_contents($pdfPath)),
    ];
}

function rtbo_invoice_checkout_session(array $invoice): array
{
    $total = (float) ($invoice['total'] ?? $invoice['subtotal'] ?? 0);
    $amountCents = (int) round($total * 100);
    if ($amountCents < 50) {
        throw new RuntimeException('Stripe checkout payments must be at least $0.50.');
    }

    $invoiceNumber = (string) ($invoice['invoiceNumber'] ?? 'RTBO Invoice');
    $schoolName = (string) ($invoice['schoolName'] ?? '');

    return create_stripe_checkout_session([
        'mode' => 'payment',
        'success_url' => RTBO_BASE_URL . '/payment-success.php?provider=stripe&type=invoice&invoice=' . rawurlencode($invoiceNumber) . '&session_id={CHECKOUT_SESSION_ID}',
        'cancel_url' => RTBO_BASE_URL . '/payment-cancel.php?type=invoice&invoice=' . rawurlencode($invoiceNumber),
        'customer_email' => (string) ($invoice['email'] ?? ''),
        'client_reference_id' => 'rtbo-invoice-' . $invoiceNumber,
        'line_items' => [[
            'name' => trim('RTBO Invoice ' . $invoiceNumber . ($schoolName !== '' ? ' - ' . $schoolName : '')),
            'amount_cents' => $amountCents,
            'quantity' => 1,
        ]],
        'metadata' => [
            'type' => 'admin_invoice',
            'invoice_number' => $invoiceNumber,
            'school_name' => $schoolName,
        ],
    ]);
}

require_same_origin_request();

$databaseUser = current_database_user();
$user = $databaseUser ? public_auth_user($databaseUser) : current_user();
if (!$user || !is_super_admin($user)) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Super Admin access is required for invoices.']);
    exit;
}

$method = strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET'));
$input = rtbo_invoice_input();
$action = (string) ($input['action'] ?? ($_GET['action'] ?? ($method === 'GET' ? 'list' : 'save')));

try {
    if ($method === 'GET' || $action === 'list') {
        try {
            rtbo_ensure_admin_invoices_table();
            $stmt = db()->query('SELECT * FROM admin_invoices ORDER BY created_at DESC LIMIT 100');
            $invoices = array_map('rtbo_invoice_public', $stmt->fetchAll());
        } catch (Throwable $databaseError) {
            error_log('RTBO invoice database list unavailable, using JSON fallback: ' . $databaseError->getMessage());
            $invoices = rtbo_invoice_list_file();
        }

        echo json_encode(['success' => true, 'invoices' => $invoices], JSON_UNESCAPED_SLASHES);
        exit;
    }

    if ($method !== 'POST') {
        http_response_code(405);
        echo json_encode(['success' => false, 'message' => 'Unsupported invoice request method.']);
        exit;
    }

    if ($action === 'checkout') {
        $payload = rtbo_invoice_payload($input, $user);
        rtbo_invoice_validate_delivery_payload($payload);
        $invoice = rtbo_invoice_public($payload);
        $session = rtbo_invoice_checkout_session($invoice);

        echo json_encode([
            'success' => true,
            'message' => 'Stripe checkout created.',
            'redirect' => $session['url'] ?? '',
            'session_id' => $session['id'] ?? '',
        ], JSON_UNESCAPED_SLASHES);
        exit;
    }

    if ($action === 'pdf' || $action === 'email') {
        $payload = rtbo_invoice_payload($input, $user);
        rtbo_invoice_validate_delivery_payload($payload);
        $invoice = rtbo_invoice_public($payload);
        $pdfPath = build_invoice_pdf($invoice);
        $pdf = rtbo_invoice_pdf_response($pdfPath);

        if ($action === 'email') {
            $recipient = rtbo_safe_header_email(rtbo_invoice_text($input, 'recipientEmail') ?: (string) ($invoice['email'] ?? ''));
            if ($recipient === '') {
                throw new RuntimeException('A valid recipient email address is required.');
            }
            if (!send_invoice_email($invoice, $pdfPath, $recipient)) {
                $mailError = rtbo_mail_last_error();
                throw new RuntimeException('Invoice email could not be sent. ' . ($mailError !== '' ? $mailError : 'Check SMTP/mail configuration and recipient email address.'));
            }

            echo json_encode([
                'success' => true,
                'message' => 'Invoice PDF emailed to ' . $recipient . '.',
                'pdf' => $pdf,
                'mail_transport' => rtbo_mail_transport_status(),
            ], JSON_UNESCAPED_SLASHES);
            exit;
        }

        echo json_encode([
            'success' => true,
            'message' => 'Invoice PDF created.',
            'pdf' => $pdf,
            'mail_transport' => rtbo_mail_transport_status(),
        ], JSON_UNESCAPED_SLASHES);
        exit;
    }

    if ($action === 'save') {
        $payload = rtbo_invoice_payload($input, $user);
        try {
            rtbo_ensure_admin_invoices_table();
            if ((int) ($payload['id'] ?? 0) > 0) {
                $stmt = db()->prepare(
	                    "UPDATE admin_invoices
	                     SET invoice_number = ?, invoice_date = ?, due_date = ?, school_name = ?, contact_name = ?,
	                         email = ?, phone = ?, billing_address = ?, event_name = ?, game_level = ?,
	                         assigning_fee_type = ?, assigning_qty = ?, assigning_rate = ?, assigning_fee = ?, assigning_fee_items = ?,
	                         officials_fee_type = ?, officials_qty = ?, officials_rate = ?, officials_fee = ?, officials_fee_items = ?,
	                         travel_fee_type = ?, travel_qty = ?, travel_rate = ?, travel_fee = ?, travel_fee_items = ?,
	                         additional_fee_type = ?, additional_qty = ?, additional_rate = ?, additional_fee = ?, additional_fee_items = ?,
	                         credit_card_requested = ?, notes = ?, status = ?, updated_at = NOW()
	                     WHERE id = ?"
	                );
                $stmt->execute([
                    $payload['invoice_number'],
                    $payload['invoice_date'] !== '' ? $payload['invoice_date'] : null,
                    $payload['due_date'] !== '' ? $payload['due_date'] : null,
                    $payload['school_name'],
                    $payload['contact_name'],
                    $payload['email'],
                    $payload['phone'],
	                    $payload['billing_address'],
	                    $payload['event_name'],
	                    $payload['game_level'],
	                    $payload['assigning_fee_type'],
	                    $payload['assigning_qty'],
	                    $payload['assigning_rate'],
	                    $payload['assigning_fee'],
	                    $payload['assigning_fee_items'],
	                    $payload['officials_fee_type'],
	                    $payload['officials_qty'],
	                    $payload['officials_rate'],
	                    $payload['officials_fee'],
	                    $payload['officials_fee_items'],
	                    $payload['travel_fee_type'],
	                    $payload['travel_qty'],
	                    $payload['travel_rate'],
	                    $payload['travel_fee'],
	                    $payload['travel_fee_items'],
	                    $payload['additional_fee_type'],
	                    $payload['additional_qty'],
	                    $payload['additional_rate'],
	                    $payload['additional_fee'],
	                    $payload['additional_fee_items'],
	                    $payload['credit_card_requested'],
	                    $payload['notes'],
	                    $payload['status'],
                    $payload['id'],
                ]);
                $id = (int) $payload['id'];
            } else {
                $stmt = db()->prepare(
	                    "INSERT INTO admin_invoices (
	                        invoice_number, invoice_date, due_date, school_name, contact_name, email, phone,
	                        billing_address, event_name, game_level,
	                        assigning_fee_type, assigning_qty, assigning_rate, assigning_fee, assigning_fee_items,
	                        officials_fee_type, officials_qty, officials_rate, officials_fee, officials_fee_items,
	                        travel_fee_type, travel_qty, travel_rate, travel_fee, travel_fee_items,
	                        additional_fee_type, additional_qty, additional_rate, additional_fee, additional_fee_items,
	                        credit_card_requested, notes, status, created_by, updated_at
	                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())"
	                );
                $stmt->execute([
                    $payload['invoice_number'],
                    $payload['invoice_date'] !== '' ? $payload['invoice_date'] : null,
                    $payload['due_date'] !== '' ? $payload['due_date'] : null,
                    $payload['school_name'],
                    $payload['contact_name'],
                    $payload['email'],
                    $payload['phone'],
	                    $payload['billing_address'],
	                    $payload['event_name'],
	                    $payload['game_level'],
	                    $payload['assigning_fee_type'],
	                    $payload['assigning_qty'],
	                    $payload['assigning_rate'],
	                    $payload['assigning_fee'],
	                    $payload['assigning_fee_items'],
	                    $payload['officials_fee_type'],
	                    $payload['officials_qty'],
	                    $payload['officials_rate'],
	                    $payload['officials_fee'],
	                    $payload['officials_fee_items'],
	                    $payload['travel_fee_type'],
	                    $payload['travel_qty'],
	                    $payload['travel_rate'],
	                    $payload['travel_fee'],
	                    $payload['travel_fee_items'],
	                    $payload['additional_fee_type'],
	                    $payload['additional_qty'],
	                    $payload['additional_rate'],
	                    $payload['additional_fee'],
	                    $payload['additional_fee_items'],
	                    $payload['credit_card_requested'],
	                    $payload['notes'],
                    $payload['status'],
                    $payload['created_by'],
                ]);
                $id = (int) db()->lastInsertId();
            }

            $stmt = db()->prepare('SELECT * FROM admin_invoices WHERE id = ? LIMIT 1');
            $stmt->execute([$id]);
            $saved = rtbo_invoice_public($stmt->fetch() ?: $payload);
        } catch (Throwable $databaseError) {
            error_log('RTBO invoice database save unavailable, using JSON fallback: ' . $databaseError->getMessage());
            $saved = rtbo_invoice_save_file(rtbo_invoice_public($payload), $user);
        }

        echo json_encode(['success' => true, 'invoice' => $saved, 'message' => 'Invoice saved.'], JSON_UNESCAPED_SLASHES);
        exit;
    }

    if ($action === 'delete') {
        $id = (int) ($input['id'] ?? 0);
        if ($id <= 0) {
            throw new RuntimeException('A valid invoice ID is required.');
        }

        try {
            rtbo_ensure_admin_invoices_table();
            $stmt = db()->prepare('DELETE FROM admin_invoices WHERE id = ?');
            $stmt->execute([$id]);
        } catch (Throwable $databaseError) {
            error_log('RTBO invoice database delete unavailable, using JSON fallback: ' . $databaseError->getMessage());
            rtbo_invoice_delete_file($id);
        }

        echo json_encode(['success' => true, 'message' => 'Invoice deleted.']);
        exit;
    }

    throw new RuntimeException('Unsupported invoice action.');
} catch (Throwable $error) {
    error_log('RTBO invoice action failed: ' . $error->getMessage());
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => $error->getMessage()]);
}

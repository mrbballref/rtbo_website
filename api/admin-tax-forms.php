<?php
declare(strict_types=1);

require_once __DIR__ . '/includes/bootstrap.php';
require_once __DIR__ . '/includes/users.php';
require_once __DIR__ . '/includes/pdf.php';

header('Content-Type: application/json');
require_same_origin_request();

function rtbo_tax_input(): array
{
    $data = json_decode((string) file_get_contents('php://input'), true);
    return is_array($data) ? $data : [];
}

function rtbo_tax_current_user(): ?array
{
    $databaseUser = current_database_user();
    return $databaseUser ? public_auth_user($databaseUser) : current_user();
}

function rtbo_tax_can_manage(?array $user): bool
{
    return is_admin_user($user);
}

function rtbo_tax_can_access(?array $user): bool
{
    if (!$user) {
        return false;
    }

    $role = (string) ($user['role'] ?? '');
    return rtbo_tax_can_manage($user) || in_array($role, [
        'school_admin',
        'athletic_director',
        'assistant_athletic_director',
        'sports_information_director',
        'conference_commissioner',
        'game_day_admin',
        'coach',
        'assistant_coach',
    ], true);
}

function rtbo_tax_storage_path(): string
{
    ensure_dir(STORAGE_DIR);
    return STORAGE_DIR . '/admin-tax-forms.json';
}

function rtbo_tax_read_file(): array
{
    $path = rtbo_tax_storage_path();
    if (!is_file($path)) {
        return [];
    }

    $data = json_decode((string) file_get_contents($path), true);
    return is_array($data) ? array_values(array_filter($data, 'is_array')) : [];
}

function rtbo_tax_write_file(array $records): void
{
    file_put_contents(rtbo_tax_storage_path(), json_encode(array_values($records), JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES), LOCK_EX);
}

function rtbo_tax_clean_value(mixed $value): mixed
{
    if (is_array($value)) {
        $clean = [];
        foreach ($value as $key => $item) {
            $clean[(string) $key] = rtbo_tax_clean_value($item);
        }
        return $clean;
    }

    if (is_bool($value) || is_int($value) || is_float($value) || $value === null) {
        return $value;
    }

    return trim((string) $value);
}

function rtbo_tax_text(array $source, string $key, string $fallback = ''): string
{
    $value = trim((string) ($source[$key] ?? $source[$fallback] ?? ''));
    return $value;
}

function rtbo_tax_mask_tin(string $tin): string
{
    $digits = preg_replace('/\D+/', '', $tin) ?: '';
    if ($digits === '') {
        return '';
    }

    $last = substr($digits, -4);
    return str_repeat('*', max(0, strlen($digits) - 4)) . $last;
}

function rtbo_tax_next_id(array $records): int
{
    return array_reduce($records, static fn (int $carry, array $record): int => max($carry, (int) ($record['id'] ?? 0)), 0) + 1;
}

function rtbo_tax_find_index(array $records, int $id = 0, string $formNumber = ''): int
{
    foreach ($records as $index => $record) {
        if ($id > 0 && (int) ($record['id'] ?? 0) === $id) {
            return (int) $index;
        }
        if ($formNumber !== '' && hash_equals((string) ($record['formNumber'] ?? ''), $formNumber)) {
            return (int) $index;
        }
    }

    return -1;
}

function rtbo_tax_payload(array $input, array $user = [], array $existing = []): array
{
    $source = (array) ($input['taxForm'] ?? $input['record'] ?? []);
    $clean = [];
    foreach ($source as $key => $value) {
        $clean[(string) $key] = rtbo_tax_clean_value($value);
    }

    $now = date('Y-m-d H:i:s');
    $year = date('Y');
    $formNumber = trim((string) ($clean['formNumber'] ?? $clean['form_number'] ?? $existing['formNumber'] ?? ''));
    if ($formNumber === '') {
        $formNumber = 'RTBO-W9-' . $year . '-' . substr((string) time(), -6);
    }

    $tin = trim((string) ($clean['tin'] ?? ''));
    if ($tin === '' && isset($existing['tin'])) {
        $tin = (string) $existing['tin'];
    }

    return [
        'id' => (int) ($clean['id'] ?? $existing['id'] ?? 0),
        'formNumber' => $formNumber,
        'revision' => trim((string) ($clean['revision'] ?? $existing['revision'] ?? 'March 2024')) ?: 'March 2024',
        'recordName' => trim((string) ($clean['recordName'] ?? $clean['record_name'] ?? $existing['recordName'] ?? 'RTBO W-9')),
        'requesterType' => trim((string) ($clean['requesterType'] ?? $clean['requester_type'] ?? $existing['requesterType'] ?? 'School')),
        'requesterName' => trim((string) ($clean['requesterName'] ?? $clean['requester_name'] ?? $existing['requesterName'] ?? '')),
        'requesterEmail' => trim((string) ($clean['requesterEmail'] ?? $clean['requester_email'] ?? $existing['requesterEmail'] ?? '')),
        'availableForDownload' => filter_var($clean['availableForDownload'] ?? $clean['available_for_download'] ?? $existing['availableForDownload'] ?? true, FILTER_VALIDATE_BOOLEAN),
        'name' => trim((string) ($clean['name'] ?? $existing['name'] ?? '')),
        'businessName' => trim((string) ($clean['businessName'] ?? $clean['business_name'] ?? $existing['businessName'] ?? '')),
        'taxClassification' => trim((string) ($clean['taxClassification'] ?? $clean['tax_classification'] ?? $existing['taxClassification'] ?? '')),
        'llcTaxClassification' => trim((string) ($clean['llcTaxClassification'] ?? $clean['llc_tax_classification'] ?? $existing['llcTaxClassification'] ?? '')),
        'otherClassification' => trim((string) ($clean['otherClassification'] ?? $clean['other_classification'] ?? $existing['otherClassification'] ?? '')),
        'foreignPartners' => filter_var($clean['foreignPartners'] ?? $clean['foreign_partners'] ?? $existing['foreignPartners'] ?? false, FILTER_VALIDATE_BOOLEAN),
        'exemptPayeeCode' => trim((string) ($clean['exemptPayeeCode'] ?? $clean['exempt_payee_code'] ?? $existing['exemptPayeeCode'] ?? '')),
        'fatcaCode' => trim((string) ($clean['fatcaCode'] ?? $clean['fatca_code'] ?? $existing['fatcaCode'] ?? '')),
        'addressLine1' => trim((string) ($clean['addressLine1'] ?? $clean['address_line1'] ?? $existing['addressLine1'] ?? '')),
        'addressLine2' => trim((string) ($clean['addressLine2'] ?? $clean['address_line2'] ?? $existing['addressLine2'] ?? '')),
        'city' => trim((string) ($clean['city'] ?? $existing['city'] ?? '')),
        'state' => trim((string) ($clean['state'] ?? $existing['state'] ?? '')),
        'zip' => trim((string) ($clean['zip'] ?? $existing['zip'] ?? '')),
        'requesterAddress' => trim((string) ($clean['requesterAddress'] ?? $clean['requester_address'] ?? $existing['requesterAddress'] ?? '')),
        'accountNumbers' => trim((string) ($clean['accountNumbers'] ?? $clean['account_numbers'] ?? $existing['accountNumbers'] ?? '')),
        'tinType' => in_array((string) ($clean['tinType'] ?? $clean['tin_type'] ?? $existing['tinType'] ?? 'ein'), ['ein', 'ssn'], true) ? (string) ($clean['tinType'] ?? $clean['tin_type'] ?? $existing['tinType'] ?? 'ein') : 'ein',
        'tin' => $tin,
        'signatureName' => trim((string) ($clean['signatureName'] ?? $clean['signature_name'] ?? $existing['signatureName'] ?? '')),
        'signatureDate' => trim((string) ($clean['signatureDate'] ?? $clean['signature_date'] ?? $existing['signatureDate'] ?? date('Y-m-d'))),
        'status' => trim((string) ($clean['status'] ?? $existing['status'] ?? 'ready')) ?: 'ready',
        'createdBy' => (int) ($existing['createdBy'] ?? $clean['createdBy'] ?? $user['id'] ?? 0),
        'createdAt' => (string) ($existing['createdAt'] ?? $clean['createdAt'] ?? $now),
        'updatedAt' => $now,
    ];
}

function rtbo_tax_validate(array $record): void
{
    $required = [
        'recordName' => 'Record name is required.',
        'name' => 'Line 1 name is required.',
        'taxClassification' => 'Federal tax classification is required.',
        'addressLine1' => 'Address is required.',
        'city' => 'City is required.',
        'state' => 'State is required.',
        'zip' => 'ZIP code is required.',
        'tin' => 'TIN is required.',
        'signatureName' => 'Signature name is required.',
        'signatureDate' => 'Signature date is required.',
    ];

    foreach ($required as $key => $message) {
        if (trim((string) ($record[$key] ?? '')) === '') {
            throw new RuntimeException($message);
        }
    }

    if ($record['taxClassification'] === 'llc' && trim((string) ($record['llcTaxClassification'] ?? '')) === '') {
        throw new RuntimeException('LLC tax classification is required.');
    }

    if ($record['taxClassification'] === 'other' && trim((string) ($record['otherClassification'] ?? '')) === '') {
        throw new RuntimeException('Other tax classification description is required.');
    }

    $email = trim((string) ($record['requesterEmail'] ?? ''));
    if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        throw new RuntimeException('Requester email address is not valid.');
    }
}

function rtbo_tax_public(array $record, bool $includeSensitive = false): array
{
    $public = $record;
    $public['tinMasked'] = rtbo_tax_mask_tin((string) ($record['tin'] ?? ''));
    if (!$includeSensitive) {
        unset($public['tin']);
    }

    return $public;
}

function rtbo_tax_pdf_response(string $path): array
{
    if (!is_file($path)) {
        throw new RuntimeException('W-9 PDF could not be created.');
    }

    return [
        'fileName' => basename($path),
        'mimeType' => 'application/pdf',
        'contentBase64' => base64_encode((string) file_get_contents($path)),
    ];
}

$method = strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET'));
$input = rtbo_tax_input();
$action = (string) ($input['action'] ?? ($_GET['action'] ?? ($method === 'GET' ? 'list' : 'save')));
$user = rtbo_tax_current_user();
$canManage = rtbo_tax_can_manage($user);

try {
    if (!rtbo_tax_can_access($user)) {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'Tax Center access is required.']);
        exit;
    }

    $records = rtbo_tax_read_file();

    if ($method === 'GET' || $action === 'list') {
        $visible = $canManage
            ? $records
            : array_values(array_filter($records, static fn (array $record): bool => !empty($record['availableForDownload'])));
        echo json_encode(['success' => true, 'records' => array_map('rtbo_tax_public', $visible)], JSON_UNESCAPED_SLASHES);
        exit;
    }

    if ($action === 'save') {
        if (!$canManage) {
            throw new RuntimeException('Admin access is required to save W-9 records.');
        }

        $id = (int) ($input['taxForm']['id'] ?? 0);
        $formNumber = trim((string) ($input['taxForm']['formNumber'] ?? ''));
        $index = rtbo_tax_find_index($records, $id, $formNumber);
        $existing = $index >= 0 ? $records[$index] : [];
        $record = rtbo_tax_payload($input, $user ?? [], $existing);
        if ((int) ($record['id'] ?? 0) <= 0) {
            $record['id'] = rtbo_tax_next_id($records);
        }
        rtbo_tax_validate($record);

        if ($index >= 0) {
            $records[$index] = $record;
        } else {
            array_unshift($records, $record);
        }
        rtbo_tax_write_file($records);

        echo json_encode(['success' => true, 'message' => 'W-9 saved and available in Tax Center.', 'record' => rtbo_tax_public($record)], JSON_UNESCAPED_SLASHES);
        exit;
    }

    if ($action === 'pdf') {
        $id = (int) ($input['id'] ?? 0);
        if ($id > 0) {
            $index = rtbo_tax_find_index($records, $id);
            if ($index < 0) {
                throw new RuntimeException('W-9 record could not be found.');
            }
            $record = $records[$index];
            if (!$canManage && empty($record['availableForDownload'])) {
                throw new RuntimeException('This W-9 is not available for download.');
            }
        } else {
            if (!$canManage) {
                throw new RuntimeException('Admin access is required to generate a custom W-9 PDF.');
            }
            $record = rtbo_tax_payload($input, $user ?? []);
            rtbo_tax_validate($record);
        }

        $pdfPath = build_w9_pdf($record);
        echo json_encode(['success' => true, 'pdf' => rtbo_tax_pdf_response($pdfPath)], JSON_UNESCAPED_SLASHES);
        exit;
    }

    if ($action === 'delete') {
        if (!$canManage) {
            throw new RuntimeException('Admin access is required to delete W-9 records.');
        }

        $id = (int) ($input['id'] ?? 0);
        $next = array_values(array_filter($records, static fn (array $record): bool => (int) ($record['id'] ?? 0) !== $id));
        if (count($next) === count($records)) {
            throw new RuntimeException('W-9 record could not be found.');
        }
        rtbo_tax_write_file($next);
        echo json_encode(['success' => true, 'message' => 'W-9 record deleted.'], JSON_UNESCAPED_SLASHES);
        exit;
    }

    throw new RuntimeException('Unsupported Tax Center action.');
} catch (Throwable $error) {
    http_response_code($error instanceof RuntimeException ? 400 : 500);
    echo json_encode(['success' => false, 'message' => $error->getMessage()], JSON_UNESCAPED_SLASHES);
}

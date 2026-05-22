<?php
declare(strict_types=1);

require_once __DIR__ . '/includes/bootstrap.php';
require_once __DIR__ . '/includes/users.php';
require_once __DIR__ . '/includes/pdf.php';
require_once __DIR__ . '/includes/email.php';

header('Content-Type: application/json');
require_same_origin_request();

function rtbo_contract_input(): array
{
    $data = json_decode((string) file_get_contents('php://input'), true);
    return is_array($data) ? $data : [];
}

function rtbo_contract_storage_path(): string
{
    ensure_dir(STORAGE_DIR);
    return STORAGE_DIR . '/admin-contracts.json';
}

function rtbo_contract_read_file(): array
{
    $path = rtbo_contract_storage_path();
    if (!is_file($path)) {
        return [];
    }

    $data = json_decode((string) file_get_contents($path), true);
    return is_array($data) ? array_values(array_filter($data, 'is_array')) : [];
}

function rtbo_contract_write_file(array $contracts): void
{
    file_put_contents(rtbo_contract_storage_path(), json_encode(array_values($contracts), JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES), LOCK_EX);
}

function rtbo_contract_clean_value(mixed $value): mixed
{
    if (is_array($value)) {
        $clean = [];
        foreach ($value as $key => $item) {
            $clean[(string) $key] = rtbo_contract_clean_value($item);
        }
        return $clean;
    }

    if (is_bool($value) || is_int($value) || is_float($value) || $value === null) {
        return $value;
    }

    return trim((string) $value);
}

function rtbo_contract_payload(array $input, array $user = []): array
{
    $contract = (array) ($input['contract'] ?? []);
    $clean = [];
    foreach ($contract as $key => $value) {
        $clean[(string) $key] = rtbo_contract_clean_value($value);
    }

    $now = date('Y-m-d H:i:s');
    $agreementNumber = trim((string) ($clean['agreementNumber'] ?? ''));
    if ($agreementNumber === '') {
        $agreementNumber = 'RTBO-CONTRACT-' . date('Y') . '-' . substr((string) time(), -6);
    }

    $id = trim((string) ($clean['id'] ?? ''));
    if ($id === '') {
        $id = 'contract-' . preg_replace('/[^A-Za-z0-9_-]+/', '-', strtolower($agreementNumber));
    }

    $token = trim((string) ($clean['signatureToken'] ?? ''));
    if ($token === '') {
        $token = bin2hex(random_bytes(24));
    }

    $clean['id'] = $id;
    $clean['agreementNumber'] = $agreementNumber;
    $clean['signatureToken'] = $token;
    $clean['contractStatus'] = trim((string) ($clean['contractStatus'] ?? 'Draft')) ?: 'Draft';
    $clean['createdBy'] = $clean['createdBy'] ?? (int) ($user['id'] ?? 0);
    $clean['savedAt'] = trim((string) ($clean['savedAt'] ?? '')) ?: $now;
    $clean['updatedAt'] = $now;

    return $clean;
}

function rtbo_contract_find_index(array $contracts, string $id = '', string $agreementNumber = '', string $token = ''): int
{
    foreach ($contracts as $index => $contract) {
        if ($id !== '' && hash_equals((string) ($contract['id'] ?? ''), $id)) {
            return (int) $index;
        }
        if ($agreementNumber !== '' && hash_equals((string) ($contract['agreementNumber'] ?? ''), $agreementNumber)) {
            return (int) $index;
        }
        if ($token !== '' && hash_equals((string) ($contract['signatureToken'] ?? ''), $token)) {
            return (int) $index;
        }
    }

    return -1;
}

function rtbo_contract_save_record(array $contract): array
{
    $contracts = rtbo_contract_read_file();
    $index = rtbo_contract_find_index($contracts, (string) ($contract['id'] ?? ''), (string) ($contract['agreementNumber'] ?? ''));
    if ($index >= 0) {
        $contract['savedAt'] = (string) ($contracts[$index]['savedAt'] ?? $contract['savedAt'] ?? date('Y-m-d H:i:s'));
        $contracts[$index] = $contract;
    } else {
        array_unshift($contracts, $contract);
    }

    rtbo_contract_write_file($contracts);
    return $contract;
}

function rtbo_contract_pdf_response(string $pdfPath): array
{
    if (!is_file($pdfPath)) {
        throw new RuntimeException('Contract PDF could not be created.');
    }

    return [
        'fileName' => basename($pdfPath),
        'mimeType' => 'application/pdf',
        'contentBase64' => base64_encode((string) file_get_contents($pdfPath)),
    ];
}

function rtbo_contract_signing_url(array $contract): string
{
    $token = rawurlencode((string) ($contract['signatureToken'] ?? ''));
    return RTBO_BASE_URL . '/#contract-sign?token=' . $token;
}

function rtbo_contract_public_for_signing(array $contract): array
{
    return [
        'templateId' => (string) ($contract['templateId'] ?? ''),
        'agreementNumber' => (string) ($contract['agreementNumber'] ?? ''),
        'contractStatus' => (string) ($contract['contractStatus'] ?? 'Draft'),
        'contractCategory' => (string) ($contract['contractCategory'] ?? ''),
        'clientName' => (string) ($contract['clientName'] ?? ''),
        'eventName' => (string) ($contract['eventName'] ?? ''),
        'primaryContact' => (string) ($contract['primaryContact'] ?? ''),
        'contactTitle' => (string) ($contract['contactTitle'] ?? ''),
        'effectiveDate' => (string) ($contract['effectiveDate'] ?? ''),
        'expirationDate' => (string) ($contract['expirationDate'] ?? ''),
        'rtboRepresentative' => (string) ($contract['rtboRepresentative'] ?? 'Montrel Simmons'),
        'clientSigner' => (string) ($contract['clientSigner'] ?? ''),
        'clientSignerTitle' => (string) ($contract['clientSignerTitle'] ?? ''),
        'clientSignedAt' => (string) ($contract['clientSignedAt'] ?? ''),
        'rtboSignedAt' => (string) ($contract['rtboSignedAt'] ?? ''),
        'summary' => (string) ($contract['executiveSummary'] ?? ''),
    ];
}

function rtbo_contract_require_admin(): array
{
    $databaseUser = current_database_user();
    $user = $databaseUser ? public_auth_user($databaseUser) : current_user();
    if (!$user || !is_admin_user($user)) {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'Admin access is required for contracts.']);
        exit;
    }

    return $user;
}

$method = strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET'));
$input = rtbo_contract_input();
$action = (string) ($input['action'] ?? ($_GET['action'] ?? ($method === 'GET' ? 'list' : 'save')));

try {
    if ($method === 'GET' && $action === 'signing-contract') {
        $token = trim((string) ($_GET['token'] ?? ''));
        $contracts = rtbo_contract_read_file();
        $index = rtbo_contract_find_index($contracts, '', '', $token);
        if ($token === '' || $index < 0) {
            throw new RuntimeException('This contract signing link is invalid or has expired.');
        }

        echo json_encode(['success' => true, 'contract' => rtbo_contract_public_for_signing($contracts[$index])], JSON_UNESCAPED_SLASHES);
        exit;
    }

    if ($method === 'POST' && $action === 'sign') {
        $token = trim((string) ($input['token'] ?? ''));
        $signerName = trim((string) ($input['signerName'] ?? ''));
        $signerTitle = trim((string) ($input['signerTitle'] ?? ''));
        $signature = trim((string) ($input['signature'] ?? $signerName));
        if ($token === '' || $signerName === '' || $signature === '' || empty($input['acceptedTerms'])) {
            throw new RuntimeException('Signature, printed name, and acceptance are required.');
        }

        $contracts = rtbo_contract_read_file();
        $index = rtbo_contract_find_index($contracts, '', '', $token);
        if ($index < 0) {
            throw new RuntimeException('This contract signing link is invalid or has expired.');
        }

        $contract = $contracts[$index];
        $contract['clientSigner'] = $signerName;
        $contract['clientSignerTitle'] = $signerTitle;
        $contract['clientSignature'] = $signature;
        $contract['clientSignedAt'] = date('Y-m-d H:i:s');
        $contract['clientSignatureIp'] = (string) ($_SERVER['REMOTE_ADDR'] ?? '');
        $contract['clientSignatureConsent'] = true;
        $contract['contractStatus'] = 'Client Signed';
        $contract['updatedAt'] = date('Y-m-d H:i:s');
        $contracts[$index] = $contract;
        rtbo_contract_write_file($contracts);

        $pdfPath = build_contract_pdf($contract);
        $pdf = rtbo_contract_pdf_response($pdfPath);
        if (!send_signed_contract_email($contract, $pdfPath)) {
            $mailError = rtbo_mail_last_error();
            throw new RuntimeException('Contract was signed, but the signed PDF email could not be sent. ' . ($mailError !== '' ? $mailError : 'Check SMTP/mail configuration.'));
        }

        echo json_encode([
            'success' => true,
            'message' => 'Contract signed. A signed PDF was emailed to the RTBO Super Admin for countersignature.',
            'contract' => rtbo_contract_public_for_signing($contract),
            'pdf' => $pdf,
            'mail_transport' => rtbo_mail_transport_status(),
        ], JSON_UNESCAPED_SLASHES);
        exit;
    }

    $user = rtbo_contract_require_admin();

    if ($method === 'GET' || $action === 'list') {
        $contracts = rtbo_contract_read_file();
        usort($contracts, static fn (array $a, array $b): int => strcmp((string) ($b['updatedAt'] ?? $b['savedAt'] ?? ''), (string) ($a['updatedAt'] ?? $a['savedAt'] ?? '')));
        echo json_encode(['success' => true, 'contracts' => array_slice($contracts, 0, 200)], JSON_UNESCAPED_SLASHES);
        exit;
    }

    if ($method !== 'POST') {
        http_response_code(405);
        echo json_encode(['success' => false, 'message' => 'Unsupported contract request method.']);
        exit;
    }

    if ($action === 'save') {
        $contract = rtbo_contract_save_record(rtbo_contract_payload($input, $user));
        echo json_encode(['success' => true, 'message' => 'Contract saved.', 'contract' => $contract], JSON_UNESCAPED_SLASHES);
        exit;
    }

    if ($action === 'delete') {
        $id = trim((string) ($input['id'] ?? ''));
        $agreementNumber = trim((string) ($input['agreementNumber'] ?? ''));
        $contracts = rtbo_contract_read_file();
        $contracts = array_values(array_filter($contracts, static fn (array $contract): bool => !(
            ($id !== '' && hash_equals((string) ($contract['id'] ?? ''), $id))
            || ($agreementNumber !== '' && hash_equals((string) ($contract['agreementNumber'] ?? ''), $agreementNumber))
        )));
        rtbo_contract_write_file($contracts);
        echo json_encode(['success' => true, 'message' => 'Contract deleted.'], JSON_UNESCAPED_SLASHES);
        exit;
    }

    if ($action === 'admin-sign') {
        if (!is_super_admin($user)) {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'Super Admin access is required to countersign contracts.']);
            exit;
        }

        $incoming = rtbo_contract_payload($input, $user);
        $contracts = rtbo_contract_read_file();
        $index = rtbo_contract_find_index($contracts, (string) ($incoming['id'] ?? ''), (string) ($incoming['agreementNumber'] ?? ''), (string) ($incoming['signatureToken'] ?? ''));
        $contract = $index >= 0 ? array_merge($contracts[$index], $incoming) : $incoming;
        if (trim((string) ($contract['clientSignedAt'] ?? '')) === '') {
            throw new RuntimeException('The recipient must digitally sign this contract before the Super Admin countersigns it.');
        }

        $rtboSigner = trim((string) ($input['rtboSigner'] ?? $contract['rtboSigner'] ?? $user['name'] ?? 'Montrel Simmons'));
        $contract['rtboSigner'] = $rtboSigner !== '' ? $rtboSigner : 'Montrel Simmons';
        $contract['rtboSignature'] = $contract['rtboSigner'];
        $contract['rtboSignedAt'] = date('Y-m-d H:i:s');
        $contract['rtboSignatureIp'] = (string) ($_SERVER['REMOTE_ADDR'] ?? '');
        $contract['contractStatus'] = 'Fully Executed';
        $contract['updatedAt'] = date('Y-m-d H:i:s');
        if ($index >= 0) {
            $contracts[$index] = $contract;
            rtbo_contract_write_file($contracts);
        } else {
            $contract = rtbo_contract_save_record($contract);
        }

        $recipient = rtbo_safe_header_email((string) ($contract['contactEmail'] ?? ''));
        if ($recipient === '') {
            throw new RuntimeException('A valid recipient email address is required before the final signed contract can be emailed.');
        }

        $pdfPath = build_contract_pdf($contract);
        $pdf = rtbo_contract_pdf_response($pdfPath);
        if (!send_final_contract_email($contract, $pdfPath, $recipient)) {
            $mailError = rtbo_mail_last_error();
            throw new RuntimeException('Final signed contract email could not be sent. ' . ($mailError !== '' ? $mailError : 'Check SMTP/mail configuration and recipient email address.'));
        }

        echo json_encode([
            'success' => true,
            'message' => 'Super Admin countersigned the contract. The final fully signed PDF was emailed to ' . $recipient . '.',
            'contract' => $contract,
            'pdf' => $pdf,
            'mail_transport' => rtbo_mail_transport_status(),
        ], JSON_UNESCAPED_SLASHES);
        exit;
    }

    if ($action === 'pdf' || $action === 'email') {
        $contract = rtbo_contract_payload($input, $user);
        if ($action === 'email') {
            $recipient = rtbo_safe_header_email((string) ($input['recipientEmail'] ?? $contract['contactEmail'] ?? ''));
            if ($recipient === '') {
                throw new RuntimeException('A valid recipient email address is required.');
            }
            $contract['contractStatus'] = 'Sent for Signature';
            $contract = rtbo_contract_save_record($contract);
        }

        $pdfPath = build_contract_pdf($contract);
        $pdf = rtbo_contract_pdf_response($pdfPath);

        if ($action === 'email') {
            $recipient = rtbo_safe_header_email((string) ($input['recipientEmail'] ?? $contract['contactEmail'] ?? ''));
            $signingUrl = rtbo_contract_signing_url($contract);
            if (!send_contract_email($contract, $pdfPath, $recipient, $signingUrl)) {
                $mailError = rtbo_mail_last_error();
                throw new RuntimeException('Contract email could not be sent. ' . ($mailError !== '' ? $mailError : 'Check SMTP/mail configuration and recipient email address.'));
            }

            echo json_encode([
                'success' => true,
                'message' => 'Contract PDF emailed to ' . $recipient . ' with a secure digital signing link.',
                'contract' => $contract,
                'pdf' => $pdf,
                'signing_url' => $signingUrl,
                'mail_transport' => rtbo_mail_transport_status(),
            ], JSON_UNESCAPED_SLASHES);
            exit;
        }

        echo json_encode(['success' => true, 'message' => 'Contract PDF created.', 'pdf' => $pdf], JSON_UNESCAPED_SLASHES);
        exit;
    }

    throw new RuntimeException('Unsupported contract action.');
} catch (Throwable $error) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => $error->getMessage()], JSON_UNESCAPED_SLASHES);
}

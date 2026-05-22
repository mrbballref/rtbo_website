<?php
declare(strict_types=1);

const RTBO_INVOICE_BLIND_COPY_EMAIL = 'mrbballref1775@yahoo.com';
const RTBO_CONTRACT_BLIND_COPY_EMAIL = 'mrbballref1775@yahoo.com';

function rtbo_safe_header_email(string $email): string
{
    $email = str_replace(["\r", "\n"], '', trim($email));

    return filter_var($email, FILTER_VALIDATE_EMAIL) ? $email : '';
}

function rtbo_safe_email_subject(string $subject): string
{
    return trim((string) preg_replace('/[\r\n]+/', ' ', $subject));
}

function rtbo_plain_email_headers(string $replyTo = ''): array
{
    $headers = [
        'From: ' . RTBO_COMPANY_NAME . ' <' . RTBO_FROM_EMAIL . '>',
        'Content-Type: text/plain; charset=UTF-8',
    ];

    $replyTo = rtbo_safe_header_email($replyTo);
    if ($replyTo !== '') {
        $headers[] = 'Reply-To: ' . $replyTo;
    }

    return $headers;
}

function rtbo_normalize_email_list(array $emails): array
{
    $normalized = [];
    foreach ($emails as $email) {
        $safe = rtbo_safe_header_email((string) $email);
        if ($safe !== '') {
            $normalized[strtolower($safe)] = $safe;
        }
    }

    return array_values($normalized);
}

function rtbo_mail_set_last_error(string $message): void
{
    $GLOBALS['rtbo_mail_last_error'] = $message;
}

function rtbo_mail_last_error(): string
{
    return (string) ($GLOBALS['rtbo_mail_last_error'] ?? '');
}

function rtbo_mail_header_lines(array|string $headers): array
{
    if (is_array($headers)) {
        $lines = $headers;
    } else {
        $lines = preg_split('/\r\n|\r|\n/', $headers) ?: [];
    }

    return array_values(array_filter(array_map(static fn ($line): string => trim((string) $line), $lines)));
}

function rtbo_mail_header_value(array $headers, string $name): string
{
    $prefix = strtolower($name) . ':';
    foreach ($headers as $header) {
        if (strtolower(substr($header, 0, strlen($prefix))) === $prefix) {
            return trim(substr($header, strlen($prefix)));
        }
    }

    return '';
}

function rtbo_mail_strip_headers(array $headers, array $names): array
{
    $blocked = array_map(static fn (string $name): string => strtolower($name) . ':', $names);

    return array_values(array_filter($headers, static function (string $header) use ($blocked): bool {
        $lower = strtolower($header);
        foreach ($blocked as $prefix) {
            if (str_starts_with($lower, $prefix)) {
                return false;
            }
        }

        return true;
    }));
}

function rtbo_mail_recipients_from_header(string $value): array
{
    $recipients = [];
    foreach (explode(',', $value) as $entry) {
        $entry = trim($entry);
        if ($entry === '') {
            continue;
        }
        if (preg_match('/<([^>]+)>/', $entry, $match)) {
            $entry = $match[1];
        }
        $safe = rtbo_safe_header_email($entry);
        if ($safe !== '') {
            $recipients[] = $safe;
        }
    }

    return $recipients;
}

function rtbo_mail_all_recipients(string $to, array $headers): array
{
    return rtbo_normalize_email_list(array_merge(
        rtbo_mail_recipients_from_header($to),
        rtbo_mail_recipients_from_header(rtbo_mail_header_value($headers, 'Cc')),
        rtbo_mail_recipients_from_header(rtbo_mail_header_value($headers, 'Bcc'))
    ));
}

function rtbo_mail_sender(array $headers): string
{
    $from = rtbo_mail_header_value($headers, 'From');
    if (preg_match('/<([^>]+)>/', $from, $match)) {
        $from = $match[1];
    }
    $safe = rtbo_safe_header_email($from);

    return $safe !== '' ? $safe : RTBO_FROM_EMAIL;
}

function rtbo_smtp_read($socket): string
{
    $response = '';
    while (($line = fgets($socket, 515)) !== false) {
        $response .= $line;
        if (strlen($line) < 4 || substr($line, 3, 1) !== '-') {
            break;
        }
    }

    return trim($response);
}

function rtbo_smtp_expect($socket, array $codes, string $context): bool
{
    $response = rtbo_smtp_read($socket);
    $code = (int) substr($response, 0, 3);
    if (!in_array($code, $codes, true)) {
        rtbo_mail_set_last_error($context . ' failed: ' . ($response !== '' ? $response : 'no SMTP response'));

        return false;
    }

    return true;
}

function rtbo_smtp_command($socket, string $command, array $codes, string $context): bool
{
    if (@fwrite($socket, $command . "\r\n") === false) {
        rtbo_mail_set_last_error($context . ' failed: SMTP write failed.');

        return false;
    }

    return rtbo_smtp_expect($socket, $codes, $context);
}

function rtbo_smtp_send(string $to, string $subject, string $message, array|string $headers): bool
{
    if (RTBO_SMTP_HOST === '') {
        rtbo_mail_set_last_error('SMTP host is not configured.');

        return false;
    }

    $headerLines = rtbo_mail_header_lines($headers);
    $recipients = rtbo_mail_all_recipients($to, $headerLines);
    if ($recipients === []) {
        rtbo_mail_set_last_error('No valid email recipients were provided.');

        return false;
    }

    $port = RTBO_SMTP_PORT > 0 ? RTBO_SMTP_PORT : 587;
    $encryption = RTBO_SMTP_ENCRYPTION;
    $remote = $encryption === 'ssl' ? 'ssl://' . RTBO_SMTP_HOST : RTBO_SMTP_HOST;
    $timeout = RTBO_SMTP_TIMEOUT > 0 ? RTBO_SMTP_TIMEOUT : 15;
    $socket = @fsockopen($remote, $port, $errno, $errstr, $timeout);
    if (!$socket) {
        rtbo_mail_set_last_error('SMTP connection failed: ' . trim((string) $errstr));

        return false;
    }
    stream_set_timeout($socket, $timeout);

    $hostname = gethostname() ?: 'rtbofficiating.com';
    if (!rtbo_smtp_expect($socket, [220], 'SMTP greeting')
        || !rtbo_smtp_command($socket, 'EHLO ' . $hostname, [250], 'SMTP EHLO')) {
        fclose($socket);
        return false;
    }

    if ($encryption === 'tls') {
        if (!rtbo_smtp_command($socket, 'STARTTLS', [220], 'SMTP STARTTLS')) {
            fclose($socket);
            return false;
        }
        if (!@stream_socket_enable_crypto($socket, true, STREAM_CRYPTO_METHOD_TLS_CLIENT)) {
            rtbo_mail_set_last_error('SMTP STARTTLS negotiation failed.');
            fclose($socket);
            return false;
        }
        if (!rtbo_smtp_command($socket, 'EHLO ' . $hostname, [250], 'SMTP EHLO after STARTTLS')) {
            fclose($socket);
            return false;
        }
    }

    if (RTBO_SMTP_USERNAME !== '' || RTBO_SMTP_PASSWORD !== '') {
        if (!rtbo_smtp_command($socket, 'AUTH LOGIN', [334], 'SMTP AUTH')
            || !rtbo_smtp_command($socket, base64_encode(RTBO_SMTP_USERNAME), [334], 'SMTP username')
            || !rtbo_smtp_command($socket, base64_encode(RTBO_SMTP_PASSWORD), [235], 'SMTP password')) {
            fclose($socket);
            return false;
        }
    }

    $sender = rtbo_mail_sender($headerLines);
    if (!rtbo_smtp_command($socket, 'MAIL FROM:<' . $sender . '>', [250], 'SMTP MAIL FROM')) {
        fclose($socket);
        return false;
    }
    foreach ($recipients as $recipient) {
        if (!rtbo_smtp_command($socket, 'RCPT TO:<' . $recipient . '>', [250, 251], 'SMTP RCPT TO ' . $recipient)) {
            fclose($socket);
            return false;
        }
    }
    if (!rtbo_smtp_command($socket, 'DATA', [354], 'SMTP DATA')) {
        fclose($socket);
        return false;
    }

    $dataHeaders = rtbo_mail_strip_headers($headerLines, ['Bcc', 'Subject', 'To', 'Date', 'Message-ID']);
    array_unshift($dataHeaders, 'To: ' . $to);
    array_unshift($dataHeaders, 'Subject: ' . rtbo_safe_email_subject($subject));
    array_unshift($dataHeaders, 'Date: ' . date(DATE_RFC2822));
    $dataHeaders[] = 'Message-ID: <' . bin2hex(random_bytes(12)) . '@rtbofficiating.com>';
    $payload = implode("\r\n", $dataHeaders) . "\r\n\r\n" . $message;
    $payload = preg_replace('/^\./m', '..', $payload) ?? $payload;
    if (@fwrite($socket, $payload . "\r\n.\r\n") === false || !rtbo_smtp_expect($socket, [250], 'SMTP message send')) {
        fclose($socket);
        return false;
    }

    rtbo_smtp_command($socket, 'QUIT', [221, 250], 'SMTP QUIT');
    fclose($socket);
    rtbo_mail_set_last_error('');

    return true;
}

function rtbo_send_mail(string $to, string $subject, string $message, array|string $headers): bool
{
    rtbo_mail_set_last_error('');
    if (RTBO_SMTP_HOST !== '') {
        return rtbo_smtp_send($to, $subject, $message, $headers);
    }

    $headerText = is_array($headers) ? implode("\r\n", $headers) : $headers;
    $sent = @mail($to, rtbo_safe_email_subject($subject), $message, $headerText);
    if (!$sent) {
        rtbo_mail_set_last_error('PHP mail() returned false. Configure SMTP in api/.env for production delivery.');
    }

    return $sent;
}

function rtbo_mail_transport_status(): array
{
    return [
        'transport' => RTBO_SMTP_HOST !== '' ? 'smtp' : 'php_mail',
        'smtp_configured' => RTBO_SMTP_HOST !== '',
        'last_error' => rtbo_mail_last_error(),
    ];
}

function rtbo_mail_attachment_payloads(array $attachments): array
{
    $payloads = [];
    $totalBytes = 0;
    $maxBytes = max(1, (int) env_value('RTBOMAIL_MAX_ATTACHMENT_BYTES', '15728640'));

    foreach ($attachments as $index => $attachment) {
        if (!is_array($attachment)) {
            continue;
        }

        $content = (string) ($attachment['content'] ?? '');
        if ($content === '' && isset($attachment['dataUrl'])) {
            $parts = explode(',', (string) $attachment['dataUrl'], 2);
            $content = $parts[1] ?? '';
        }

        $bytes = base64_decode($content, true);
        if ($bytes === false || $bytes === '') {
            continue;
        }

        $totalBytes += strlen($bytes);
        if ($totalBytes > $maxBytes) {
            throw new RuntimeException('RTBOMAIL attachments exceed the configured limit of ' . number_format($maxBytes / 1048576, 1) . ' MB.');
        }

        $name = basename(str_replace(["\r", "\n"], '', (string) ($attachment['name'] ?? '')));
        $name = trim((string) preg_replace('/[^A-Za-z0-9._ -]+/', '_', $name), ' ._');
        if ($name === '') {
            $name = 'Attachment-' . ($index + 1);
        }

        $type = (string) ($attachment['type'] ?? 'application/octet-stream');
        $type = preg_match('/^[A-Za-z0-9.+-]+\/[A-Za-z0-9.+-]+$/', $type) ? $type : 'application/octet-stream';

        $payloads[] = [
            'name' => $name,
            'type' => $type,
            'bytes' => $bytes,
        ];
    }

    return $payloads;
}

function rtbo_mail_mixed_body(string $message, array $attachments, string $boundary): string
{
    $body = "--{$boundary}\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\n";
    $body .= $message . "\r\n\r\n";

    foreach ($attachments as $attachment) {
        $name = str_replace('"', '', (string) $attachment['name']);
        $type = (string) $attachment['type'];
        $body .= "--{$boundary}\r\n";
        $body .= "Content-Type: {$type}; name=\"{$name}\"\r\n";
        $body .= "Content-Transfer-Encoding: base64\r\n";
        $body .= "Content-Disposition: attachment; filename=\"{$name}\"\r\n\r\n";
        $body .= chunk_split(base64_encode((string) $attachment['bytes'])) . "\r\n";
    }

    return $body . "--{$boundary}--";
}

function rtbo_mail_bcc_batches(array $recipients, string $subject, string $message, string $replyTo = '', int $batchSize = 80, array $attachments = []): array
{
    $recipients = rtbo_normalize_email_list($recipients);
    $batchSize = max(1, $batchSize);
    if ($recipients === []) {
        return ['sent' => false, 'recipient_count' => 0, 'batch_count' => 0, 'failed_batches' => 0, 'attachment_count' => 0];
    }

    $attachmentPayloads = rtbo_mail_attachment_payloads($attachments);
    $sentBatches = 0;
    $failedBatches = 0;
    foreach (array_chunk($recipients, $batchSize) as $batch) {
        if ($attachmentPayloads !== []) {
            $boundary = 'rtbo_mail_' . bin2hex(random_bytes(10));
            $headers = [
                'From: ' . RTBO_COMPANY_NAME . ' <' . RTBO_FROM_EMAIL . '>',
                'MIME-Version: 1.0',
                'Content-Type: multipart/mixed; boundary="' . $boundary . '"',
            ];
            $safeReplyTo = rtbo_safe_header_email($replyTo);
            if ($safeReplyTo !== '') {
                $headers[] = 'Reply-To: ' . $safeReplyTo;
            }
            $batchMessage = rtbo_mail_mixed_body($message, $attachmentPayloads, $boundary);
        } else {
            $headers = rtbo_plain_email_headers($replyTo);
            $batchMessage = $message;
        }
        $headers[] = 'Bcc: ' . implode(', ', $batch);
        $sent = rtbo_send_mail(RTBO_FROM_EMAIL, $subject, $batchMessage, $headers);
        if ($sent) {
            $sentBatches++;
        } else {
            $failedBatches++;
        }
    }

    return [
        'sent' => $sentBatches > 0 && $failedBatches === 0,
        'recipient_count' => count($recipients),
        'batch_count' => $sentBatches + $failedBatches,
        'failed_batches' => $failedBatches,
        'attachment_count' => count($attachmentPayloads),
    ];
}

function rtbo_mail_with_pdf(array $to, string $subject, string $message, string $pdfPath, string $replyTo = '', array $bcc = []): bool
{
    $to = array_values(array_unique(array_filter(array_map('rtbo_safe_header_email', $to))));
    $bcc = rtbo_normalize_email_list($bcc);
    if ($to === [] || !is_file($pdfPath)) {
        return false;
    }

    $boundary = 'rtbo_' . bin2hex(random_bytes(10));
    $pdf = (string) file_get_contents($pdfPath);
    $pdfName = basename($pdfPath);
    $headers = [
        'From: ' . RTBO_COMPANY_NAME . ' <' . RTBO_FROM_EMAIL . '>',
        'MIME-Version: 1.0',
        'Content-Type: multipart/mixed; boundary="' . $boundary . '"',
    ];

    $replyTo = rtbo_safe_header_email($replyTo);
    if ($replyTo !== '') {
        $headers[] = 'Reply-To: ' . $replyTo;
    }
    if ($bcc !== []) {
        $headers[] = 'Bcc: ' . implode(', ', $bcc);
    }

    $body = "--{$boundary}\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\n";
    $body .= $message . "\r\n\r\n";
    $body .= "--{$boundary}\r\nContent-Type: application/pdf; name=\"{$pdfName}\"\r\n";
    $body .= "Content-Transfer-Encoding: base64\r\nContent-Disposition: attachment; filename=\"{$pdfName}\"\r\n\r\n";
    $body .= chunk_split(base64_encode($pdf)) . "\r\n--{$boundary}--";

    return rtbo_send_mail(implode(', ', $to), $subject, $body, $headers);
}

function send_registration_email(array $registration): bool
{
    $name = trim((string) ($registration['full_name'] ?? 'Student'));
    $studentEmail = (string) ($registration['email'] ?? '');
    $pdfPath = (string) ($registration['pdf_path'] ?? '');
    $amount = number_format(((int) ($registration['amount_cents'] ?? 0)) / 100, 2);
    $sessions = implode(', ', array_map('strval', $registration['sessions'] ?? []));

    $studentBody = "Thank you for registering with RTBO. Your payment has been confirmed and your completed profile PDF is attached.\n\n";
    $studentBody .= "Applicant: {$name}\n";
    $studentBody .= "Selected Session(s): {$sessions}\n";
    $studentBody .= "Amount Paid: \${$amount}\n";
    $studentBody .= "Registration ID: " . (string) ($registration['id'] ?? '') . "\n";

    $internalBody = "A school registration payment has been confirmed.\n\n";
    $internalBody .= "Applicant: {$name}\n";
    $internalBody .= "Email: {$studentEmail}\n";
    $internalBody .= "Selected Session(s): {$sessions}\n";
    $internalBody .= "Payment Provider: " . (string) ($registration['payment_provider'] ?? '') . "\n";
    $internalBody .= "Amount Paid: \${$amount}\n";
    $internalBody .= "Registration ID: " . (string) ($registration['id'] ?? '') . "\n";

    $sentInternal = rtbo_mail_with_pdf(
        rtbo_registration_recipients(),
        'RTBO Registration Payment Confirmed - ' . $name,
        $internalBody,
        $pdfPath,
        $studentEmail
    );
    $sentStudent = rtbo_mail_with_pdf(
        [$studentEmail],
        'RTBO Payment Confirmation',
        $studentBody,
        $pdfPath
    );

    return $sentInternal && $sentStudent;
}

function send_school_registration_notification(array $registration): bool
{
    $sessions = implode(', ', array_map('strval', $registration['sessions'] ?? []));
    $amount = number_format(((int) ($registration['amount_cents'] ?? 0)) / 100, 2);
    $name = trim((string) ($registration['full_name'] ?? ''));
    $email = (string) ($registration['email'] ?? '');
    $phone = rtbo_format_phone_number((string) ($registration['phone'] ?? ''));
    $pdfPath = (string) ($registration['pdf_path'] ?? '');

    $internalBody = "A new school application has been submitted and is awaiting checkout completion.\n\n";
    $internalBody .= "Applicant: {$name}\n";
    $internalBody .= "Email: {$email}\n";
    $internalBody .= "Phone: {$phone}\n";
    $internalBody .= "Selected Session(s): {$sessions}\n";
    $internalBody .= "Payment Provider: " . (string) ($registration['payment_provider'] ?? '') . "\n";
    $internalBody .= "Amount Due: \${$amount}\n";
    $internalBody .= "Registration ID: " . (string) ($registration['id'] ?? '') . "\n";
    $internalBody .= "Submitted: " . (string) ($registration['submitted_at'] ?? date('c')) . "\n";

    $studentBody = "Thank you for submitting your RTBO school application. A copy of your application profile is attached for your records.\n\n";
    $studentBody .= "Applicant: {$name}\n";
    $studentBody .= "Selected Session(s): {$sessions}\n";
    $studentBody .= "Amount Due: \${$amount}\n";
    $studentBody .= "Next Step: Complete checkout to confirm your seat.\n";
    $studentBody .= "Registration ID: " . (string) ($registration['id'] ?? '') . "\n";

    $sentInternal = rtbo_mail_with_pdf(
        rtbo_registration_recipients(),
        'New RTBO School Application - ' . $name,
        $internalBody,
        $pdfPath,
        $email
    );
    $sentStudent = rtbo_mail_with_pdf(
        [$email],
        'RTBO Application Confirmation',
        $studentBody,
        $pdfPath
    );

    return $sentInternal && $sentStudent;
}

function send_newsletter_signup_notification(string $email, string $firstName = '', string $lastName = ''): bool
{
    $name = trim($firstName . ' ' . $lastName);
    $subject = 'New RTBO Newsletter Signup';
    $body = "A new subscriber has signed up for RTBO newsletter updates.\n\n";
    $body .= "Name: " . ($name !== '' ? $name : 'Not provided') . "\n";
    $body .= "Email: {$email}\n";
    $body .= "Subscribed: " . date('c') . "\n\n";
    $body .= "You can manage newsletter subscribers from the RTBO Newsletter Center.";

    return rtbo_send_mail(
        implode(', ', rtbo_internal_recipients()),
        $subject,
        $body,
        rtbo_plain_email_headers($email)
    );
}

function send_contact_message_notification(array $message): bool
{
    $name = trim((string) ($message['full_name'] ?? 'Website visitor'));
    $email = rtbo_safe_header_email((string) ($message['email'] ?? ''));
    $phone = rtbo_format_phone_number((string) ($message['phone'] ?? ''));
    $bodyText = trim((string) ($message['message'] ?? ''));
    $submittedAt = (string) ($message['submitted_at'] ?? date('c'));
    $pdfPath = (string) ($message['pdf_path'] ?? '');

    $safeName = preg_replace('/[\r\n]+/', ' ', $name) ?: 'Website visitor';
    $subject = 'New RTBO Website Contact Message - ' . $safeName;
    $body = "A new RTBO website contact form message was submitted.\n\n";
    $body .= "Name: {$safeName}\n";
    $body .= "Email: " . ($email !== '' ? $email : 'Not provided') . "\n";
    $body .= "Phone: " . ($phone !== '' ? $phone : 'Not provided') . "\n";
    $body .= "Submitted: {$submittedAt}\n\n";
    $body .= "Message:\n{$bodyText}\n";

    return rtbo_mail_with_pdf(
        rtbo_contact_recipients(),
        $subject,
        $body,
        $pdfPath,
        $email
    );
}

function send_event_interest_notification(array $message): bool
{
    $name = trim((string) ($message['full_name'] ?? 'Official'));
    $email = rtbo_safe_header_email((string) ($message['email'] ?? ''));
    $phone = rtbo_format_phone_number((string) ($message['phone'] ?? ''));
    $availability = trim((string) ($message['availability'] ?? ''));
    $eventName = trim((string) ($message['event_name'] ?? 'RTBO paid event'));
    $eventDate = trim((string) ($message['event_date'] ?? ''));
    $eventAddress = trim((string) ($message['event_address'] ?? ''));
    $submittedAt = (string) ($message['submitted_at'] ?? date('c'));
    $pdfPath = (string) ($message['pdf_path'] ?? '');

    $safeName = preg_replace('/[\r\n]+/', ' ', $name) ?: 'Official';
    $safeEvent = preg_replace('/[\r\n]+/', ' ', $eventName) ?: 'RTBO paid event';
    $subject = 'New RTBO Paid Event Availability - ' . $safeName;
    $body = "A new RTBO paid event availability form was submitted.\n\n";
    $body .= "Event: {$safeEvent}\n";
    $body .= "Date: {$eventDate}\n";
    $body .= "Location: {$eventAddress}\n\n";
    $body .= "Official: {$safeName}\n";
    $body .= "Email: " . ($email !== '' ? $email : 'Not provided') . "\n";
    $body .= "Phone: " . ($phone !== '' ? $phone : 'Not provided') . "\n";
    $body .= "Submitted: {$submittedAt}\n\n";
    $body .= "Availability:\n{$availability}\n";

    return rtbo_mail_with_pdf(
        rtbo_contact_recipients(),
        $subject,
        $body,
        $pdfPath,
        $email
    );
}

function send_invoice_email(array $invoice, string $pdfPath, string $recipientEmail = ''): bool
{
    $recipient = rtbo_safe_header_email($recipientEmail !== '' ? $recipientEmail : (string) ($invoice['email'] ?? ''));
    if ($recipient === '') {
        return false;
    }

    $invoiceNumber = trim((string) ($invoice['invoiceNumber'] ?? $invoice['invoice_number'] ?? 'RTBO Invoice'));
    $schoolName = trim((string) ($invoice['schoolName'] ?? $invoice['school_name'] ?? ''));
    $eventName = trim((string) ($invoice['eventName'] ?? $invoice['event_name'] ?? ''));
    $dueDate = trim((string) ($invoice['dueDate'] ?? $invoice['due_date'] ?? ''));
    $total = (float) ($invoice['total'] ?? $invoice['subtotal'] ?? 0);
    $subject = 'RTBO Invoice ' . ($invoiceNumber !== '' ? $invoiceNumber : '');

    $body = "Attached is your invoice from Raising The Bar Officiating Inc.\n\n";
    $body .= 'Invoice Number: ' . ($invoiceNumber !== '' ? $invoiceNumber : 'Not provided') . "\n";
    $body .= 'School / Organization: ' . ($schoolName !== '' ? $schoolName : 'Not provided') . "\n";
    $body .= 'Event / Game: ' . ($eventName !== '' ? $eventName : 'Not provided') . "\n";
    $body .= 'Due Date: ' . ($dueDate !== '' ? $dueDate : 'Not provided') . "\n";
    $body .= 'Total Due: $' . number_format($total, 2) . "\n\n";
    $body .= "Payment is due within 14 days.\n";
    $body .= "You may pay by check by submitting it to Pay to the order of Montrel Simmons, DBA Raising The Bar Officiating Inc.\n";
    $body .= "Please contact RTBO if any invoice details need to be corrected before payment.\n";

    return rtbo_mail_with_pdf([$recipient], $subject, $body, $pdfPath, RTBO_ADMIN_EMAIL, [RTBO_INVOICE_BLIND_COPY_EMAIL]);
}

function rtbo_contract_is_official_agreement(array $contract): bool
{
    return (string) ($contract['templateId'] ?? '') === 'official-independent-contractor'
        || (string) ($contract['contractCategory'] ?? '') === 'Independent Contractor Agreement';
}

function rtbo_contract_counterparty_label(array $contract): string
{
    return rtbo_contract_is_official_agreement($contract) ? 'Contractor / Official' : 'Client / Organization';
}

function send_contract_email(array $contract, string $pdfPath, string $recipientEmail = '', string $signingUrl = ''): bool
{
    $recipient = rtbo_safe_header_email($recipientEmail !== '' ? $recipientEmail : (string) ($contract['contactEmail'] ?? ''));
    if ($recipient === '') {
        return false;
    }

    $agreementNumber = trim((string) ($contract['agreementNumber'] ?? 'RTBO Contract'));
    $clientName = trim((string) ($contract['clientName'] ?? ''));
    $eventName = trim((string) ($contract['eventName'] ?? ''));
    $title = trim((string) ($contract['contractCategory'] ?? 'Basketball Officials Assigning Agreement'));
    $subject = 'RTBO Contract for Review and Signature - ' . ($agreementNumber !== '' ? $agreementNumber : 'Agreement');

    $body = "Attached is your contract from Raising The Bar Officiating Inc.\n\n";
    $body .= 'Agreement Number: ' . ($agreementNumber !== '' ? $agreementNumber : 'Not provided') . "\n";
    $body .= rtbo_contract_counterparty_label($contract) . ': ' . ($clientName !== '' ? $clientName : 'Not provided') . "\n";
    $body .= (rtbo_contract_is_official_agreement($contract) ? 'Covered Services' : 'Event / Schedule') . ': ' . ($eventName !== '' ? $eventName : 'Not provided') . "\n";
    $body .= 'Contract Type: ' . ($title !== '' ? $title : 'Basketball Officials Assigning Agreement') . "\n\n";
    if ($signingUrl !== '') {
        $body .= "To digitally sign this agreement, open this secure signing link:\n{$signingUrl}\n\n";
    }
    $body .= "After the contract is signed, a signed PDF copy will automatically be emailed back to the RTBO Super Admin.\n";
    $body .= "Once both parties have signed the contract, you will receive a final fully signed PDF copy for your records.\n";
    $body .= "Please contact RTBO if any contract details need to be corrected before signing.\n";

    return rtbo_mail_with_pdf([$recipient], $subject, $body, $pdfPath, RTBO_ADMIN_EMAIL, [RTBO_CONTRACT_BLIND_COPY_EMAIL]);
}

function send_signed_contract_email(array $contract, string $pdfPath): bool
{
    $agreementNumber = trim((string) ($contract['agreementNumber'] ?? 'RTBO Contract'));
    $clientName = trim((string) ($contract['clientName'] ?? ''));
    $isOfficialAgreement = rtbo_contract_is_official_agreement($contract);
    $signer = trim((string) ($contract['clientSigner'] ?? $contract['clientSignature'] ?? ($isOfficialAgreement ? 'Contractor / Official' : 'Client')));
    $signedAt = trim((string) ($contract['clientSignedAt'] ?? date('c')));
    $subject = 'Signed RTBO Contract Returned - ' . ($agreementNumber !== '' ? $agreementNumber : 'Agreement');

    $body = ($isOfficialAgreement ? 'A contractor / official' : 'A client') . " has digitally signed an RTBO contract. The signed PDF is attached and is ready for Super Admin countersignature.\n\n";
    $body .= 'Agreement Number: ' . ($agreementNumber !== '' ? $agreementNumber : 'Not provided') . "\n";
    $body .= rtbo_contract_counterparty_label($contract) . ': ' . ($clientName !== '' ? $clientName : 'Not provided') . "\n";
    $body .= 'Signed By: ' . ($signer !== '' ? $signer : 'Not provided') . "\n";
    $body .= 'Signed At: ' . $signedAt . "\n\n";
    $body .= 'Review the attached signed PDF, then countersign the contract from the Contract Generator. Once the Super Admin signature is applied, the final fully signed PDF will be emailed back to the ' . ($isOfficialAgreement ? 'contractor / official' : 'client') . " for their records.\n";

    return rtbo_mail_with_pdf(rtbo_super_admin_recipients(), $subject, $body, $pdfPath, RTBO_ADMIN_EMAIL, [RTBO_CONTRACT_BLIND_COPY_EMAIL]);
}

function send_final_contract_email(array $contract, string $pdfPath, string $recipientEmail = ''): bool
{
    $recipient = rtbo_safe_header_email($recipientEmail !== '' ? $recipientEmail : (string) ($contract['contactEmail'] ?? ''));
    if ($recipient === '') {
        return false;
    }

    $agreementNumber = trim((string) ($contract['agreementNumber'] ?? 'RTBO Contract'));
    $clientName = trim((string) ($contract['clientName'] ?? ''));
    $eventName = trim((string) ($contract['eventName'] ?? ''));
    $subject = 'Final Fully Signed RTBO Contract - ' . ($agreementNumber !== '' ? $agreementNumber : 'Agreement');

    $body = "Attached is the final fully signed contract from Raising The Bar Officiating Inc.\n\n";
    $body .= "Both parties have digitally signed this agreement, and this final PDF copy is being provided for your records.\n\n";
    $body .= 'Agreement Number: ' . ($agreementNumber !== '' ? $agreementNumber : 'Not provided') . "\n";
    $body .= rtbo_contract_counterparty_label($contract) . ': ' . ($clientName !== '' ? $clientName : 'Not provided') . "\n";
    $body .= (rtbo_contract_is_official_agreement($contract) ? 'Covered Services' : 'Event / Schedule') . ': ' . ($eventName !== '' ? $eventName : 'Not provided') . "\n";
    $body .= (rtbo_contract_is_official_agreement($contract) ? 'Contractor / Official Signed' : 'Client Signed') . ': ' . trim((string) ($contract['clientSignedAt'] ?? 'Not provided')) . "\n";
    $body .= 'RTBO Signed: ' . trim((string) ($contract['rtboSignedAt'] ?? 'Not provided')) . "\n\n";
    $body .= "Please keep this final signed PDF with your records.\n";

    return rtbo_mail_with_pdf([$recipient], $subject, $body, $pdfPath, RTBO_ADMIN_EMAIL, [RTBO_CONTRACT_BLIND_COPY_EMAIL]);
}

function send_member_invitation_email(array $member, string $temporaryPassword = ''): bool
{
    $email = rtbo_safe_header_email((string) ($member['email'] ?? ''));
    if ($email === '') {
        return false;
    }

    $name = trim((string) ($member['name'] ?? (($member['first_name'] ?? '') . ' ' . ($member['last_name'] ?? ''))));
    $name = $name !== '' ? $name : 'Official';
    $loginUrl = env_value('RTBO_SITE_URL', 'https://rtbofficiating.com');
    $loginUrl = rtrim($loginUrl, '/') . '/';

    $body = "Hello {$name},\n\n";
    $body .= "You have been added to the Raising The Bar Officiating site.\n\n";
    $body .= "Your account is currently inactive until you sign in, update your password, and complete your profile. ";
    $body .= "Once your profile is saved with the required information, your status will change to active and you will be ready to receive game assignments.\n\n";
    $body .= "Sign in here: {$loginUrl}\n";
    $body .= "Email: {$email}\n";
    if ($temporaryPassword !== '') {
        $body .= "Temporary Password: {$temporaryPassword}\n";
    }
    $body .= "\nAfter signing in, go to My Profile, update your contact information, conferences/levels worked, experience, profile picture, and change your password.\n\n";
    $body .= "Raising The Bar Officiating Inc.\n";

    return rtbo_send_mail(
        $email,
        'You have been added to Raising The Bar Officiating',
        $body,
        rtbo_plain_email_headers(RTBO_ADMIN_EMAIL)
    );
}

function send_password_reset_email(array $account, string $resetUrl): bool
{
    $email = rtbo_safe_header_email((string) ($account['email'] ?? ''));
    if ($email === '') {
        return false;
    }

    $name = trim((string) ($account['name'] ?? ''));
    $name = $name !== '' ? $name : 'RTBO member';
    $body = "Hello {$name},\n\n";
    $body .= "We received a request to reset the password for your Raising The Bar Officiating account.\n\n";
    $body .= "Reset your password here:\n{$resetUrl}\n\n";
    $body .= "This link expires in 60 minutes. If you did not request this reset, you can ignore this email and your password will remain unchanged.\n\n";
    $body .= "Raising The Bar Officiating Inc.\n";

    return rtbo_send_mail(
        $email,
        'Reset your RTBO password',
        $body,
        rtbo_plain_email_headers(RTBO_ADMIN_EMAIL)
    );
}

function send_tba_game_list_notification(array $officials, array $games): array
{
    $recipients = [];
    foreach ($officials as $official) {
        $email = rtbo_safe_header_email((string) ($official['email'] ?? ''));
        if ($email !== '') {
            $recipients[] = $email;
        }
    }

    $recipients = array_values(array_unique($recipients));
    if ($recipients === [] || $games === []) {
        return ['sent' => false, 'recipient_count' => count($recipients)];
    }

    $body = "A new TBA game list is available in your Raising The Bar Officiating profile.\n\n";
    $body .= "Please sign in, review the open games, and request any game you are available to work. ";
    $body .= "Requesting a game does not assign you automatically; the Super Admin will review requests and make the final assignment.\n\n";
    $body .= "Open games:\n";

    foreach ($games as $game) {
        $date = trim((string) ($game['game_date'] ?? ''));
        $time = trim((string) ($game['game_time'] ?? ''));
        $home = trim((string) ($game['home_team'] ?? 'Home Team'));
        $away = trim((string) ($game['away_team'] ?? 'Visiting Team'));
        $location = trim((string) ($game['location_name'] ?? 'Location TBA'));
        $address = trim((string) ($game['location_address'] ?? ''));
        $court = trim((string) ($game['court_label'] ?? ''));

        $body .= "- {$date} {$time}: {$away} at {$home}";
        $body .= " | {$location}";
        if ($court !== '') {
            $body .= " | {$court}";
        }
        if ($address !== '') {
            $body .= " | {$address}";
        }
        $body .= "\n";
    }

    $body .= "\nRaising The Bar Officiating Inc.\n";

    $sent = rtbo_send_mail(
        implode(', ', $recipients),
        'RTBO TBA Game List Available',
        $body,
        rtbo_plain_email_headers(RTBO_ADMIN_EMAIL)
    );

    return ['sent' => $sent, 'recipient_count' => count($recipients)];
}

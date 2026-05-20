<?php
declare(strict_types=1);

function pdf_escape(string $value): string
{
    return str_replace(['\\', '(', ')'], ['\\\\', '\\(', '\\)'], $value);
}

function pdf_money(int $cents): string
{
    return '$' . number_format($cents / 100, 2);
}

function pdf_date(?string $date): string
{
    if (!$date) {
        return 'Not recorded';
    }

    $timestamp = strtotime($date);
    return $timestamp ? date('M j, Y g:i A', $timestamp) : $date;
}

function pdf_value(mixed $value): string
{
    $value = trim((string) $value);
    return $value !== '' ? $value : 'Not provided';
}

function pdf_text(string $text, float $x, float $y, int $size = 10, string $font = 'F1', string $color = '0.07 0.08 0.10'): string
{
    return "BT /{$font} {$size} Tf {$color} rg {$x} {$y} Td (" . pdf_escape($text) . ") Tj ET";
}

function pdf_text_scaled(string $text, float $x, float $y, int $size = 10, float $scale = 100, string $font = 'F1', string $color = '0.07 0.08 0.10'): string
{
    return "BT /{$font} {$size} Tf {$color} rg {$scale} Tz {$x} {$y} Td (" . pdf_escape($text) . ") Tj ET";
}

function pdf_line(float $x1, float $y1, float $x2, float $y2, string $color = '0.976 0.451 0.086', float $width = 1): string
{
    return "q {$color} RG {$width} w {$x1} {$y1} m {$x2} {$y2} l S Q";
}

function pdf_rect(float $x, float $y, float $w, float $h, string $fill, string $stroke = ''): string
{
    $strokeCommand = $stroke !== '' ? "{$stroke} RG {$x} {$y} {$w} {$h} re B" : "{$x} {$y} {$w} {$h} re f";
    return "q {$fill} rg {$strokeCommand} Q";
}

function pdf_image_command(string $name, float $x, float $y, float $w, float $h): string
{
    return "q {$w} 0 0 {$h} {$x} {$y} cm /{$name} Do Q";
}

function pdf_image_command_opacity(string $name, float $x, float $y, float $w, float $h, string $state = 'GS1'): string
{
    return "q /{$state} gs {$w} 0 0 {$h} {$x} {$y} cm /{$name} Do Q";
}

function pdf_jpeg_data(string $path): ?array
{
    if (!is_file($path)) {
        return null;
    }

    $info = getimagesize($path);
    if ($info === false || ($info['mime'] ?? '') !== 'image/jpeg') {
        return null;
    }

    return [
        'width' => (int) $info[0],
        'height' => (int) $info[1],
        'data' => (string) file_get_contents($path),
    ];
}

function pdf_image_data_as_jpeg(string $path, array $background = [255, 255, 255]): ?array
{
    if (!is_file($path)) {
        return null;
    }

    $info = getimagesize($path);
    if ($info === false) {
        return null;
    }

    if (($info['mime'] ?? '') === 'image/jpeg') {
        return pdf_jpeg_data($path);
    }

    if (!function_exists('imagecreatetruecolor')) {
        return null;
    }

    $source = null;
    if (($info['mime'] ?? '') === 'image/png' && function_exists('imagecreatefrompng')) {
        $source = @imagecreatefrompng($path);
    } elseif (($info['mime'] ?? '') === 'image/webp' && function_exists('imagecreatefromwebp')) {
        $source = @imagecreatefromwebp($path);
    }

    if (!$source) {
        return null;
    }

    $width = (int) imagesx($source);
    $height = (int) imagesy($source);
    $canvas = imagecreatetruecolor($width, $height);
    $red = max(0, min(255, (int) ($background[0] ?? 255)));
    $green = max(0, min(255, (int) ($background[1] ?? 255)));
    $blue = max(0, min(255, (int) ($background[2] ?? 255)));
    $fill = imagecolorallocate($canvas, $red, $green, $blue);
    imagefilledrectangle($canvas, 0, 0, $width, $height, $fill);
    imagecopy($canvas, $source, 0, 0, 0, 0, $width, $height);

    ob_start();
    imagejpeg($canvas, null, 90);
    $data = (string) ob_get_clean();
    imagedestroy($source);
    imagedestroy($canvas);

    return [
        'width' => $width,
        'height' => $height,
        'data' => $data,
    ];
}

function pdf_wrap(string $text, int $characters = 78): array
{
    $text = preg_replace('/\s+/', ' ', trim($text)) ?? '';
    if ($text === '') {
        return ['Not provided'];
    }

    return explode("\n", wordwrap($text, $characters, "\n", true));
}

function build_registration_pdf(array $registration): string
{
    ensure_dir(PDF_DIR);

    $profilePhoto = pdf_image_data_as_jpeg((string) ($registration['profile_photo_path'] ?? ''));
    $logoPath = dirname(__DIR__, 2) . '/frontend/public/assets/images/logo.png';
    $logoImage = pdf_image_data_as_jpeg($logoPath);
    $pages = [];
    $page = [];
    $y = 742;

    $addHeader = static function () use (&$page, $logoImage): void {
        $page[] = pdf_rect(0, 0, 612, 792, '1 1 1');
        $page[] = pdf_rect(0, 678, 612, 114, '0.031 0.039 0.059');
        $page[] = pdf_rect(0, 678, 612, 7, '0.976 0.451 0.086');
        if ($logoImage !== null) {
            $page[] = pdf_image_command('Logo', 54, 704, 58, 58);
        }
        $page[] = pdf_text(RTBO_COMPANY_NAME, 126, 742, 22, 'F2', '1 1 1');
        $page[] = pdf_text('Professional Student Registration Profile', 126, 716, 15, 'F2', '0.976 0.451 0.086');
        $page[] = pdf_text('Generated for application review, applicant confirmation, and Super Admin records.', 126, 696, 9, 'F1', '0.86 0.88 0.91');
    };

    $newPage = static function (bool $withHeader = false) use (&$pages, &$page, &$y, $addHeader): void {
        if ($page !== []) {
            $pages[] = implode("\n", $page);
        }
        $page = [];
        $y = $withHeader ? 650 : 738;
        if ($withHeader) {
            $addHeader();
        }
    };

    $ensureSpace = static function (float $height) use (&$y, $newPage): void {
        if ($y - $height < 54) {
            $newPage(true);
        }
    };

    $section = static function (string $title) use (&$page, &$y, $ensureSpace): void {
        $ensureSpace(38);
        $page[] = pdf_text(strtoupper($title), 54, $y, 12, 'F2', '0.976 0.451 0.086');
        $page[] = pdf_line(54, $y - 8, 558, $y - 8);
        $y -= 28;
    };

    $field = static function (string $label, string $value) use (&$page, &$y, $ensureSpace): void {
        $lines = pdf_wrap($value, 76);
        $height = 18 + (count($lines) * 13);
        $ensureSpace($height);
        $page[] = pdf_text($label, 54, $y, 9, 'F2', '0.23 0.25 0.30');
        $y -= 14;
        foreach ($lines as $line) {
            $page[] = pdf_text($line, 74, $y, 10, 'F1', '0.07 0.08 0.10');
            $y -= 13;
        }
        $y -= 6;
    };

    $addHeader();
    $y = 650;

    $name = pdf_value($registration['full_name'] ?? '');
    $status = strtoupper(pdf_value($registration['payment_status'] ?? 'pending'));
    $provider = strtoupper(pdf_value($registration['payment_provider'] ?? ''));
    $amount = pdf_money((int) ($registration['amount_cents'] ?? 0));

    if ($profilePhoto !== null) {
        $page[] = pdf_rect(54, 546, 118, 118, '1 0.969 0.922', '0.976 0.451 0.086');
        $page[] = pdf_image_command('ProfilePhoto', 62, 554, 102, 102);
    } else {
        $page[] = pdf_rect(54, 546, 118, 118, '1 0.969 0.922', '0.976 0.451 0.086');
        $page[] = pdf_text('Profile picture', 72, 612, 10, 'F2', '0.55 0.20 0.05');
        $page[] = pdf_text('not available', 78, 596, 9, 'F1', '0.23 0.25 0.30');
    }
    $page[] = pdf_rect(188, 584, 370, 80, '1 0.969 0.922', '0.976 0.451 0.086');
    $page[] = pdf_text($name, 206, 630, 20, 'F2', '0.07 0.08 0.10');
    $page[] = pdf_text(pdf_value($registration['email'] ?? '') . '  |  ' . pdf_value(rtbo_format_phone_number((string) ($registration['phone'] ?? ''))), 206, 610, 10, 'F1', '0.23 0.25 0.30');
    $page[] = pdf_text('Status: ' . $status . '   |   Provider: ' . $provider . '   |   Amount: ' . $amount, 206, 594, 10, 'F2', '0.55 0.20 0.05');
    $y = 526;

    $section('Contact Information');
    $field('First Name', pdf_value($registration['first_name'] ?? ''));
    $field('Last Name', pdf_value($registration['last_name'] ?? ''));
    $field('Email', pdf_value($registration['email'] ?? ''));
    $field('Phone', pdf_value(rtbo_format_phone_number((string) ($registration['phone'] ?? ''))));
    $field('Address 1', pdf_value($registration['address_1'] ?? ''));
    $field('Address 2', pdf_value($registration['address_2'] ?? ''));
    $field('City / State / Zip', trim(pdf_value($registration['city'] ?? '') . ', ' . pdf_value($registration['state'] ?? '') . ' ' . pdf_value($registration['zip'] ?? '')));

    $section('Application Details');
    $field('Years of Officiating Experience', pdf_value($registration['experience'] ?? ''));
    $field('Sex', pdf_value($registration['sex'] ?? $registration['gender'] ?? ''));
    $field('Race', pdf_value($registration['race'] ?? ''));
    $levels = $registration['levels'] ?? [];
    $field('Level of Experience', is_array($levels) && $levels !== [] ? implode(', ', array_map('strval', $levels)) : 'Not provided');
    $field('Conferences Currently Working', pdf_value($registration['current_conferences'] ?? ''));
    $field('Recommended by Anyone?', pdf_value($registration['referred'] ?? ''));
    $field('Referral Name', pdf_value($registration['referral_name'] ?? ''));
    $field('Goals as a Basketball Official', pdf_value($registration['goals'] ?? ''));

    $section('Selected School Sessions');
    $sessions = $registration['sessions'] ?? [];
    if (!is_array($sessions) || $sessions === []) {
        $field('Sessions', 'No sessions selected');
    } else {
        foreach ($sessions as $index => $session) {
            $field('Session ' . ((int) $index + 1), pdf_value($session));
        }
    }
    $field('Payment Provider', $provider);
    $field('Tuition Amount', $amount);

    $section('Waiver and Confirmation');
    $field('Printed Signature', pdf_value($registration['printed_signature'] ?? ''));
    $ensureSpace(76);
    $page[] = pdf_text('Actual Signature', 54, $y, 9, 'F2', '0.23 0.25 0.30');
    $y -= 28;
    $page[] = pdf_text(pdf_value($registration['signature'] ?? ''), 74, $y, 18, 'F3', '0.07 0.08 0.10');
    $page[] = pdf_line(74, $y - 8, 320, $y - 8, '0.23 0.25 0.30', 0.6);
    $y -= 28;
    $field('Waiver Agreement', pdf_value($registration['waiver_agreement'] ?? 'Agree'));
    $field('Submitted', pdf_date((string) ($registration['submitted_at'] ?? '')));
    $field('Paid', pdf_date((string) ($registration['paid_at'] ?? '')));
    $field('Registration ID', pdf_value($registration['id'] ?? ''));

    $pages[] = implode("\n", $page);

    $objects = [
        "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj",
        "3 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj",
        "4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj",
        "5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /ZapfChancery-MediumItalic >>\nendobj",
    ];

    $pageRefs = [];
    $nextObject = 6;
    $xObjects = [];
    if ($profilePhoto !== null) {
        $imageObject = $nextObject++;
        $xObjects[] = "/ProfilePhoto {$imageObject} 0 R";
        $objects[] = "{$imageObject} 0 obj\n<< /Type /XObject /Subtype /Image /Width " . $profilePhoto['width'] . " /Height " . $profilePhoto['height'] . " /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length " . strlen($profilePhoto['data']) . " >>\nstream\n" . $profilePhoto['data'] . "\nendstream\nendobj";
    }
    if ($logoImage !== null) {
        $imageObject = $nextObject++;
        $xObjects[] = "/Logo {$imageObject} 0 R";
        $objects[] = "{$imageObject} 0 obj\n<< /Type /XObject /Subtype /Image /Width " . $logoImage['width'] . " /Height " . $logoImage['height'] . " /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length " . strlen($logoImage['data']) . " >>\nstream\n" . $logoImage['data'] . "\nendstream\nendobj";
    }
    $xObjectResources = $xObjects !== [] ? " /XObject << " . implode(' ', $xObjects) . " >>" : '';

    foreach ($pages as $content) {
        $pageObject = $nextObject++;
        $contentObject = $nextObject++;
        $pageRefs[] = "{$pageObject} 0 R";
        $objects[] = "{$pageObject} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R /F2 4 0 R /F3 5 0 R >>{$xObjectResources} >> /Contents {$contentObject} 0 R >>\nendobj";
        $objects[] = "{$contentObject} 0 obj\n<< /Length " . strlen($content) . " >>\nstream\n{$content}\nendstream\nendobj";
    }

    array_splice(
        $objects,
        1,
        0,
        "2 0 obj\n<< /Type /Pages /Kids [" . implode(' ', $pageRefs) . "] /Count " . count($pages) . " >>\nendobj"
    );

    usort($objects, static function (string $a, string $b): int {
        preg_match('/^(\d+)/', $a, $left);
        preg_match('/^(\d+)/', $b, $right);
        return ((int) $left[1]) <=> ((int) $right[1]);
    });

    $pdf = "%PDF-1.4\n";
    $offsets = [0];
    foreach ($objects as $object) {
        preg_match('/^(\d+)/', $object, $match);
        $offsets[(int) $match[1]] = strlen($pdf);
        $pdf .= $object . "\n";
    }

    $maxObject = max(array_keys($offsets));
    $xref = strlen($pdf);
    $pdf .= "xref\n0 " . ($maxObject + 1) . "\n0000000000 65535 f \n";
    for ($i = 1; $i <= $maxObject; $i++) {
        $pdf .= str_pad((string) ($offsets[$i] ?? 0), 10, '0', STR_PAD_LEFT) . " 00000 n \n";
    }
    $pdf .= "trailer\n<< /Size " . ($maxObject + 1) . " /Root 1 0 R >>\nstartxref\n{$xref}\n%%EOF";

    $path = PDF_DIR . '/registration_' . $registration['id'] . '.pdf';
    file_put_contents($path, $pdf, LOCK_EX);
    return $path;
}

function build_contact_pdf(array $message): string
{
    ensure_dir(PDF_DIR);

    $logoPath = dirname(__DIR__, 2) . '/frontend/public/assets/images/logo.png';
    $logoImage = pdf_image_data_as_jpeg($logoPath);
    $pages = [];
    $page = [];
    $y = 742;
    $documentTitle = pdf_value($message['pdf_title'] ?? 'Website Contact Message');
    $documentNote = pdf_value($message['pdf_note'] ?? 'Generated for Super Admin review, response tracking, and RTBO records.');
    $sourceLabel = pdf_value($message['source_label'] ?? 'RTBO public website contact form');
    $messageSectionTitle = pdf_value($message['message_section_title'] ?? 'Message');
    $messageFieldLabel = pdf_value($message['message_field_label'] ?? 'Website Message');
    $recommendedNextStep = pdf_value($message['recommended_next_step'] ?? 'Reply directly to the sender from the email notification or log this contact in the dashboard after follow-up.');

    $addHeader = static function () use (&$page, $logoImage, $documentTitle, $documentNote): void {
        $page[] = pdf_rect(0, 0, 612, 792, '1 1 1');
        $page[] = pdf_rect(0, 678, 612, 114, '0.031 0.039 0.059');
        $page[] = pdf_rect(0, 678, 612, 7, '0.976 0.451 0.086');
        if ($logoImage !== null) {
            $page[] = pdf_image_command('Logo', 54, 704, 58, 58);
        }
        $page[] = pdf_text(RTBO_COMPANY_NAME, 126, 742, 22, 'F2', '1 1 1');
        $page[] = pdf_text($documentTitle, 126, 716, 15, 'F2', '0.976 0.451 0.086');
        $page[] = pdf_text($documentNote, 126, 696, 9, 'F1', '0.86 0.88 0.91');
    };

    $newPage = static function (bool $withHeader = false) use (&$pages, &$page, &$y, $addHeader): void {
        if ($page !== []) {
            $pages[] = implode("\n", $page);
        }
        $page = [];
        $y = $withHeader ? 650 : 738;
        if ($withHeader) {
            $addHeader();
        }
    };

    $ensureSpace = static function (float $height) use (&$y, $newPage): void {
        if ($y - $height < 54) {
            $newPage(true);
        }
    };

    $section = static function (string $title) use (&$page, &$y, $ensureSpace): void {
        $ensureSpace(38);
        $page[] = pdf_text(strtoupper($title), 54, $y, 12, 'F2', '0.976 0.451 0.086');
        $page[] = pdf_line(54, $y - 8, 558, $y - 8);
        $y -= 28;
    };

    $field = static function (string $label, string $value, int $characters = 82) use (&$page, &$y, $ensureSpace): void {
        $lines = pdf_wrap($value, $characters);
        $height = 18 + (count($lines) * 13);
        $ensureSpace($height);
        $page[] = pdf_text($label, 54, $y, 9, 'F2', '0.23 0.25 0.30');
        $y -= 14;
        foreach ($lines as $line) {
            $page[] = pdf_text($line, 74, $y, 10, 'F1', '0.07 0.08 0.10');
            $y -= 13;
        }
        $y -= 6;
    };

    $addHeader();
    $y = 650;

    $name = pdf_value($message['full_name'] ?? '');
    $email = pdf_value($message['email'] ?? '');
    $phone = pdf_value(rtbo_format_phone_number((string) ($message['phone'] ?? '')));
    $submittedAt = pdf_date((string) ($message['submitted_at'] ?? date('c')));
    $contactId = pdf_value($message['contact_id'] ?? $message['id'] ?? '');

    $page[] = pdf_rect(54, 552, 504, 112, '1 0.969 0.922', '0.976 0.451 0.086');
    $page[] = pdf_text($name, 76, 628, 20, 'F2', '0.07 0.08 0.10');
    $page[] = pdf_text($email . '  |  ' . $phone, 76, 606, 10, 'F1', '0.23 0.25 0.30');
    $page[] = pdf_text('Submitted: ' . $submittedAt . '   |   Contact ID: ' . $contactId, 76, 586, 10, 'F2', '0.55 0.20 0.05');
    $page[] = pdf_text('Source: ' . $sourceLabel, 76, 568, 9, 'F1', '0.23 0.25 0.30');
    $y = 526;

    $section('Contact Details');
    $field('Name', $name);
    $field('Email', $email);
    $field('Phone', $phone);
    $field('Submitted', $submittedAt);
    $field('Contact ID', $contactId);

    $section($messageSectionTitle);
    $field($messageFieldLabel, pdf_value($message['message'] ?? ''), 86);

    $section('Routing');
    $field('Recipient Source', 'Current Super Admin profile email');
    $field('Recommended Next Step', $recommendedNextStep);

    $pages[] = implode("\n", $page);

    $objects = [
        "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj",
        "3 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj",
        "4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj",
        "5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /ZapfChancery-MediumItalic >>\nendobj",
    ];

    $pageRefs = [];
    $nextObject = 6;
    $xObjects = [];
    if ($logoImage !== null) {
        $imageObject = $nextObject++;
        $xObjects[] = "/Logo {$imageObject} 0 R";
        $objects[] = "{$imageObject} 0 obj\n<< /Type /XObject /Subtype /Image /Width " . $logoImage['width'] . " /Height " . $logoImage['height'] . " /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length " . strlen($logoImage['data']) . " >>\nstream\n" . $logoImage['data'] . "\nendstream\nendobj";
    }
    $xObjectResources = $xObjects !== [] ? " /XObject << " . implode(' ', $xObjects) . " >>" : '';

    foreach ($pages as $content) {
        $pageObject = $nextObject++;
        $contentObject = $nextObject++;
        $pageRefs[] = "{$pageObject} 0 R";
        $objects[] = "{$pageObject} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R /F2 4 0 R /F3 5 0 R >>{$xObjectResources} >> /Contents {$contentObject} 0 R >>\nendobj";
        $objects[] = "{$contentObject} 0 obj\n<< /Length " . strlen($content) . " >>\nstream\n{$content}\nendstream\nendobj";
    }

    array_splice(
        $objects,
        1,
        0,
        "2 0 obj\n<< /Type /Pages /Kids [" . implode(' ', $pageRefs) . "] /Count " . count($pages) . " >>\nendobj"
    );

    usort($objects, static function (string $a, string $b): int {
        preg_match('/^(\d+)/', $a, $left);
        preg_match('/^(\d+)/', $b, $right);
        return ((int) $left[1]) <=> ((int) $right[1]);
    });

    $pdf = "%PDF-1.4\n";
    $offsets = [0];
    foreach ($objects as $object) {
        preg_match('/^(\d+)/', $object, $match);
        $offsets[(int) $match[1]] = strlen($pdf);
        $pdf .= $object . "\n";
    }

    $maxObject = max(array_keys($offsets));
    $xref = strlen($pdf);
    $pdf .= "xref\n0 " . ($maxObject + 1) . "\n0000000000 65535 f \n";
    for ($i = 1; $i <= $maxObject; $i++) {
        $pdf .= str_pad((string) ($offsets[$i] ?? 0), 10, '0', STR_PAD_LEFT) . " 00000 n \n";
    }
    $pdf .= "trailer\n<< /Size " . ($maxObject + 1) . " /Root 1 0 R >>\nstartxref\n{$xref}\n%%EOF";

    $safeId = preg_replace('/[^A-Za-z0-9_-]+/', '', (string) ($message['contact_id'] ?? $message['id'] ?? ''));
    if (!$safeId) {
        $safeId = bin2hex(random_bytes(8));
    }
    $prefix = preg_replace('/[^A-Za-z0-9_-]+/', '', (string) ($message['pdf_file_prefix'] ?? 'contact'));
    $path = PDF_DIR . '/' . ($prefix ?: 'contact') . '_' . $safeId . '.pdf';
    file_put_contents($path, $pdf, LOCK_EX);

    return $path;
}

function rtbo_invoice_pdf_text(array $invoice, string $primary, string $fallback = ''): string
{
    return trim((string) ($invoice[$primary] ?? ($fallback !== '' ? ($invoice[$fallback] ?? '') : '')));
}

function rtbo_invoice_pdf_money(float $amount): string
{
    return '$' . number_format($amount, 2);
}

function rtbo_invoice_pdf_file_name(array $invoice): string
{
    $source = rtbo_invoice_pdf_text($invoice, 'invoiceNumber', 'invoice_number') ?: 'RTBO-Invoice';
    $safe = preg_replace('/[^A-Za-z0-9._-]+/', '-', $source) ?: 'RTBO-Invoice';

    return trim($safe, '-') . '.pdf';
}

function rtbo_invoice_pdf_clip(string $value, int $length): string
{
    $value = preg_replace('/\s+/', ' ', trim($value)) ?? '';
    if (strlen($value) <= $length) {
        return $value;
    }

    return rtrim(substr($value, 0, max(0, $length - 3))) . '...';
}

function rtbo_invoice_pdf_short_date(string $value): string
{
    $value = trim($value);
    if ($value === '') {
        return 'Date Pending';
    }

    $timestamp = strtotime($value);
    return $timestamp ? date('m/d/y', $timestamp) : $value;
}

function rtbo_invoice_pdf_lines(string $value, string $fallback): array
{
    $lines = array_values(array_filter(array_map('trim', preg_split('/\R+/', $value) ?: [])));
    return $lines !== [] ? $lines : [$fallback];
}

function rtbo_invoice_pdf_right_text(string $text, float $rightX, float $y, int $size = 10, string $font = 'F1', string $color = '0.07 0.08 0.10'): string
{
    $width = strlen($text) * $size * 0.52;
    return pdf_text($text, max(0, $rightX - $width), $y, $size, $font, $color);
}

function rtbo_invoice_pdf_items(array $invoice): array
{
    $groups = [
        'assigningItems' => 'Assigning Fees',
        'officialsItems' => 'Officials Fees',
        'travelItems' => 'Travel Fees',
        'additionalItems' => 'Additional Fees',
    ];
    $items = [];

    foreach ($groups as $key => $category) {
        $source = $invoice[$key] ?? [];
        if (is_string($source)) {
            $decoded = json_decode($source, true);
            $source = is_array($decoded) ? $decoded : [];
        }
        if (!is_array($source)) {
            continue;
        }

        foreach ($source as $item) {
            if (!is_array($item)) {
                continue;
            }
            $description = trim((string) ($item['description'] ?? $item['label'] ?? ''));
            $qty = max(0.0, (float) preg_replace('/[^0-9.\-]/', '', (string) ($item['qty'] ?? '0')));
            $rate = max(0.0, (float) preg_replace('/[^0-9.\-]/', '', (string) ($item['rate'] ?? '0')));
            $amount = round($qty * $rate, 2);
            if ($description === '' || $qty <= 0 || $rate <= 0 || $amount <= 0) {
                continue;
            }

            $items[] = [
                'category' => $category,
                'description' => $description,
                'qty' => $qty,
                'rate' => $rate,
                'amount' => $amount,
            ];
        }
    }

    return $items;
}

function build_invoice_pdf(array $invoice): string
{
    ensure_dir(PDF_DIR);

    $logoPath = dirname(__DIR__, 2) . '/frontend/public/assets/images/logo.png';
    $logoImage = pdf_image_data_as_jpeg($logoPath);
    $logoHeaderImage = pdf_image_data_as_jpeg($logoPath, [5, 5, 5]);
    $lineItems = rtbo_invoice_pdf_items($invoice);
    $subtotal = array_reduce($lineItems, static fn (float $sum, array $item): float => $sum + (float) $item['amount'], 0.0);
    $notes = trim((string) ($invoice['notes'] ?? ''));
    $creditCardRequested = !empty($invoice['creditCardRequested']) || !empty($invoice['credit_card_requested']);

    $invoiceNumber = pdf_value(rtbo_invoice_pdf_text($invoice, 'invoiceNumber', 'invoice_number'));
    $invoiceDate = rtbo_invoice_pdf_short_date(rtbo_invoice_pdf_text($invoice, 'invoiceDate', 'invoice_date'));
    $dueDate = rtbo_invoice_pdf_short_date(rtbo_invoice_pdf_text($invoice, 'dueDate', 'due_date'));
    $schoolName = pdf_value(rtbo_invoice_pdf_text($invoice, 'schoolName', 'school_name'));
    $contactName = rtbo_invoice_pdf_text($invoice, 'contactName', 'contact_name');
    $email = rtbo_invoice_pdf_text($invoice, 'email');
    $phone = rtbo_invoice_pdf_text($invoice, 'phone');
    $address = rtbo_invoice_pdf_text($invoice, 'address', 'billing_address');
    $eventName = rtbo_invoice_pdf_text($invoice, 'eventName', 'event_name');
    $gameLevel = rtbo_invoice_pdf_text($invoice, 'gameLevel', 'game_level');
    $reference = pdf_value(rtbo_invoice_pdf_text($invoice, 'referenceNumber', 'reference') ?: $invoiceNumber);
    $orange = '0.961 0.510 0.125';

    $page = [];
    $page[] = pdf_rect(0, 0, 612, 792, '1 1 1');
    $page[] = pdf_rect(0, 668, 612, 124, '0.02 0.02 0.02');
    if ($logoImage !== null) {
        $page[] = pdf_image_command_opacity('Logo', 118, 142, 380, 380);
    }
    $page[] = pdf_text('INVOICE', 43, 704, 34, 'F2', $orange);
    if ($logoHeaderImage !== null) {
        $page[] = pdf_image_command('LogoHeader', 477, 688, 74, 74);
    } elseif ($logoImage !== null) {
        $page[] = pdf_image_command('Logo', 477, 688, 74, 74);
    }

    $billLines = array_values(array_filter(array_merge(
        [$schoolName],
        $contactName !== '' ? ['Attn: ' . $contactName] : [],
        $email !== '' ? ['Email: ' . $email] : [],
        $phone !== '' ? ['Phone: ' . rtbo_format_phone_number($phone)] : [],
        rtbo_invoice_pdf_lines($address, 'Billing Address')
    )));
    $shipLines = array_merge([$schoolName], rtbo_invoice_pdf_lines($address, 'Shipping Address'));
    $y = 642;
    $page[] = pdf_text('Bill To:', 48, $y, 11, 'F2', '0 0 0');
    $y -= 14;
    foreach (array_slice($billLines, 0, 6) as $line) {
        $page[] = pdf_text(rtbo_invoice_pdf_clip($line, 42), 48, $y, 9, 'F1', '0 0 0');
        $y -= 11;
    }
    $y -= 8;
    $page[] = pdf_text('Ship To:', 48, $y, 11, 'F2', '0 0 0');
    $y -= 14;
    foreach (array_slice($shipLines, 0, 4) as $line) {
        $page[] = pdf_text(rtbo_invoice_pdf_clip($line, 42), 48, $y, 9, 'F1', '0 0 0');
        $y -= 11;
    }

    $detailRows = [
        ['Invoice #:', $invoiceNumber],
        ['Invoice Date:', $invoiceDate],
        ['Reference #:', $reference],
        ['Due Date:', $dueDate],
        ['Event:', $eventName],
        ['Game Level:', $gameLevel],
    ];
    $y = 642;
    foreach ($detailRows as [$label, $value]) {
        if (trim((string) $value) === '') {
            continue;
        }
        $page[] = rtbo_invoice_pdf_right_text($label, 420, $y, 11, 'F2', '0 0 0');
        $page[] = rtbo_invoice_pdf_right_text(rtbo_invoice_pdf_clip($value, 20), 552, $y, 11, $label === 'Invoice #:' ? 'F2' : 'F1', '0 0 0');
        $y -= 15;
    }

    $mailLines = [
        'Montrel Simmons, DBA',
        'Raising The Bar Officiating Inc.',
        '815 Technology Dr., Box 241445',
        'Little Rock, AR 72223',
    ];
    $y = 542;
    $page[] = pdf_text('Mail To:', 392, $y, 11, 'F2', '0 0 0');
    $y -= 15;
    foreach ($mailLines as $line) {
        $page[] = rtbo_invoice_pdf_right_text($line, 552, $y, 11, 'F1', '0 0 0');
        $y -= 13;
    }

    $y = 470;
    if ($lineItems !== []) {
        $page[] = pdf_rect(42, $y - 7, 528, 22, $orange);
        $page[] = pdf_line(300, $y - 7, 300, $y + 15, '1 0.62 0.32', .4);
        $page[] = pdf_line(378, $y - 7, 378, $y + 15, '1 0.62 0.32', .4);
        $page[] = pdf_line(450, $y - 7, 450, $y + 15, '1 0.62 0.32', .4);
        $page[] = pdf_text('Description', 48, $y, 11, 'F2', '0 0 0');
        $page[] = pdf_text('Price', 324, $y, 11, 'F2', '0 0 0');
        $page[] = pdf_text('Quantity', 389, $y, 11, 'F2', '0 0 0');
        $page[] = pdf_text('Amount', 520, $y, 11, 'F2', '0 0 0');
        $y -= 30;

        $rowHeight = count($lineItems) > 8 ? 19 : 28;
        $fontSize = count($lineItems) > 8 ? 9 : 11;

        foreach ($lineItems as $index => $item) {
            $page[] = pdf_text(rtbo_invoice_pdf_clip((string) $item['description'], 34), 48, $y, $fontSize, 'F2', '0 0 0');
            $page[] = rtbo_invoice_pdf_right_text(rtbo_invoice_pdf_money((float) $item['rate']), 362, $y - 8, $fontSize, 'F1', '0 0 0');
            $page[] = pdf_text(rtrim(rtrim(number_format((float) $item['qty'], 2), '0'), '.'), 408, $y - 8, $fontSize, 'F1', '0 0 0');
            $page[] = rtbo_invoice_pdf_right_text(rtbo_invoice_pdf_money((float) $item['amount']), 565, $y - 8, $fontSize, 'F1', '0 0 0');
            $y -= $rowHeight;
        }

        $page[] = pdf_text('Sub-total', 380, 238, 10, 'F1', '0 0 0');
        $page[] = pdf_line(374, 218, 570, 218, '0 0 0', .6);
        $page[] = rtbo_invoice_pdf_right_text('Total', 500, 202, 9, 'F2', '0 0 0');
        $page[] = rtbo_invoice_pdf_right_text(rtbo_invoice_pdf_money($subtotal), 564, 202, 9, 'F2', '0 0 0');
    }

    $termsY = 148;
    $page[] = pdf_text('Terms & Conditions', 42, $termsY, 11, 'F2', '0 0 0');
    $page[] = pdf_text('Payment is due within 14 days.', 42, $termsY - 14, 11, 'F1', '0 0 0');
    $page[] = pdf_text('You may pay by check by submitting it to Pay to the order of', 42, $termsY - 28, 11, 'F1', '0 0 0');
    $page[] = pdf_text('Montrel Simmons, DBA Raising The Bar Officiating Inc.', 42, $termsY - 42, 11, 'F1', '0 0 0');
    if ($notes !== '') {
        $noteY = $termsY - 56;
        foreach (array_slice(pdf_wrap($notes, 58), 0, 2) as $line) {
            $page[] = pdf_text(rtbo_invoice_pdf_clip($line, 64), 42, $noteY, 8, 'F1', '0 0 0');
            $noteY -= 10;
        }
    }

    $page[] = pdf_text('We Will Serve, and Will Be Of Service To The Game!', 136, 72, 14, 'F3', '0 0 0');
    $page[] = pdf_text('Thank you for your trust!', 220, 54, 14, 'F3', '0 0 0');
    $page[] = pdf_text('Home: 815 Technology Dr., Box 241445. Little Rock, AR 72223', 54, 26, 9, 'F2', '0 0 0');
    $page[] = pdf_text('Phone: (501) 240-4961', 54, 14, 9, 'F2', '0 0 0');
    $page[] = pdf_text('Email: admin@rtboofficiating.com', 54, 3, 9, 'F2', '0 0 0');
    $page[] = pdf_text('1/1', 548, 14, 10, 'F2', '0 0 0');

    $objects = [
        "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj",
        "3 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj",
        "4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj",
        "5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Times-BoldItalic >>\nendobj",
    ];

    $nextObject = 6;
    $xObjects = [];
    if ($logoImage !== null) {
        $imageObject = $nextObject++;
        $xObjects[] = "/Logo {$imageObject} 0 R";
        $objects[] = "{$imageObject} 0 obj\n<< /Type /XObject /Subtype /Image /Width " . $logoImage['width'] . " /Height " . $logoImage['height'] . " /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length " . strlen($logoImage['data']) . " >>\nstream\n" . $logoImage['data'] . "\nendstream\nendobj";
    }
    if ($logoHeaderImage !== null) {
        $imageObject = $nextObject++;
        $xObjects[] = "/LogoHeader {$imageObject} 0 R";
        $objects[] = "{$imageObject} 0 obj\n<< /Type /XObject /Subtype /Image /Width " . $logoHeaderImage['width'] . " /Height " . $logoHeaderImage['height'] . " /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length " . strlen($logoHeaderImage['data']) . " >>\nstream\n" . $logoHeaderImage['data'] . "\nendstream\nendobj";
    }

    $pageObject = $nextObject++;
    $contentObject = $nextObject++;
    $xObjectResources = $xObjects !== [] ? " /XObject << " . implode(' ', $xObjects) . " >>" : '';
    $graphicsResources = " /ExtGState << /GS1 << /ca 0.15 /CA 0.15 >> >>";
    $content = implode("\n", $page);
    $objects[] = "{$pageObject} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R /F2 4 0 R /F3 5 0 R >>{$xObjectResources}{$graphicsResources} >> /Contents {$contentObject} 0 R >>\nendobj";
    $objects[] = "{$contentObject} 0 obj\n<< /Length " . strlen($content) . " >>\nstream\n{$content}\nendstream\nendobj";

    array_splice(
        $objects,
        1,
        0,
        "2 0 obj\n<< /Type /Pages /Kids [{$pageObject} 0 R] /Count 1 >>\nendobj"
    );

    usort($objects, static function (string $a, string $b): int {
        preg_match('/^(\d+)/', $a, $left);
        preg_match('/^(\d+)/', $b, $right);
        return ((int) $left[1]) <=> ((int) $right[1]);
    });

    $pdf = "%PDF-1.4\n";
    $offsets = [0];
    foreach ($objects as $object) {
        preg_match('/^(\d+)/', $object, $match);
        $offsets[(int) $match[1]] = strlen($pdf);
        $pdf .= $object . "\n";
    }

    $maxObject = max(array_keys($offsets));
    $xref = strlen($pdf);
    $pdf .= "xref\n0 " . ($maxObject + 1) . "\n0000000000 65535 f \n";
    for ($i = 1; $i <= $maxObject; $i++) {
        $pdf .= str_pad((string) ($offsets[$i] ?? 0), 10, '0', STR_PAD_LEFT) . " 00000 n \n";
    }
    $pdf .= "trailer\n<< /Size " . ($maxObject + 1) . " /Root 1 0 R >>\nstartxref\n{$xref}\n%%EOF";

    $path = PDF_DIR . '/' . rtbo_invoice_pdf_file_name($invoice);
    file_put_contents($path, $pdf, LOCK_EX);

    return $path;
}

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

function pdf_png_data(string $path): ?array
{
    if (!is_file($path)) {
        return null;
    }

    $info = getimagesize($path);
    if ($info === false || ($info['mime'] ?? '') !== 'image/png') {
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

function rtbo_pdf_sanitize_file_part(string $value, string $fallback = 'rtbo-document'): string
{
    $value = strtolower(trim((string) preg_replace('/[^A-Za-z0-9._-]+/', '-', $value), '-._'));

    return $value !== '' ? substr($value, 0, 80) : $fallback;
}

function rtbo_pdf_write_pages(array $pages, string $path, array $images = []): string
{
    ensure_dir(dirname($path));
    if ($pages === []) {
        $pages = [pdf_rect(0, 0, 612, 792, '1 1 1')];
    }

    $objects = [
        "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj",
        "3 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj",
        "4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj",
        "5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /ZapfChancery-MediumItalic >>\nendobj",
    ];

    $nextObject = 6;
    $xObjects = [];
    foreach ($images as $name => $image) {
        if (!is_array($image) || empty($image['data']) || empty($image['width']) || empty($image['height'])) {
            continue;
        }
        $safeName = preg_replace('/[^A-Za-z0-9]+/', '', (string) $name) ?: 'Image';
        $imageObject = $nextObject++;
        $xObjects[] = "/{$safeName} {$imageObject} 0 R";
        $objects[] = "{$imageObject} 0 obj\n<< /Type /XObject /Subtype /Image /Width " . (int) $image['width'] . " /Height " . (int) $image['height'] . " /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length " . strlen((string) $image['data']) . " >>\nstream\n" . (string) $image['data'] . "\nendstream\nendobj";
    }
    $xObjectResources = $xObjects !== [] ? " /XObject << " . implode(' ', $xObjects) . " >>" : '';

    $pageRefs = [];
    foreach ($pages as $content) {
        $pageObject = $nextObject++;
        $contentObject = $nextObject++;
        $pageRefs[] = "{$pageObject} 0 R";
        $objects[] = "{$pageObject} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R /F2 4 0 R /F3 5 0 R >>{$xObjectResources} >> /Contents {$contentObject} 0 R >>\nendobj";
        $objects[] = "{$contentObject} 0 obj\n<< /Length " . strlen((string) $content) . " >>\nstream\n{$content}\nendstream\nendobj";
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
        return ((int) ($left[1] ?? 0)) <=> ((int) ($right[1] ?? 0));
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

    file_put_contents($path, $pdf, LOCK_EX);

    return $path;
}

function build_email_notice_pdf(string $subject, string $message, array $context = []): string
{
    ensure_dir(PDF_DIR);

    $logoPath = dirname(__DIR__, 2) . '/frontend/public/assets/images/logo.png';
    $logoImage = pdf_image_data_as_jpeg($logoPath);
    $pages = [];
    $page = [];
    $y = 650;

    $addHeader = static function () use (&$page, $logoImage, $subject): void {
        $page[] = pdf_rect(0, 0, 612, 792, '1 1 1');
        $page[] = pdf_rect(0, 672, 612, 120, '0.031 0.039 0.059');
        $page[] = pdf_rect(0, 672, 612, 8, '0.976 0.451 0.086');
        if ($logoImage !== null) {
            $page[] = pdf_image_command('Logo', 48, 704, 60, 60);
        }
        $page[] = pdf_text(RTBO_COMPANY_NAME, 124, 744, 20, 'F2', '1 1 1');
        $page[] = pdf_text('Professional Email Notice', 124, 720, 15, 'F2', '0.976 0.451 0.086');
        foreach (array_slice(pdf_wrap($subject, 68), 0, 2) as $index => $line) {
            $page[] = pdf_text($line, 124, 698 - ($index * 13), 10, 'F1', '0.86 0.88 0.91');
        }
    };

    $newPage = static function () use (&$pages, &$page, &$y, $addHeader): void {
        if ($page !== []) {
            $pages[] = implode("\n", $page);
        }
        $page = [];
        $y = 650;
        $addHeader();
    };

    $ensureSpace = static function (float $height) use (&$y, $newPage): void {
        if ($y - $height < 54) {
            $newPage();
        }
    };

    $field = static function (string $label, string $value, int $wrap = 88) use (&$page, &$y, $ensureSpace): void {
        $lines = pdf_wrap($value, $wrap);
        $ensureSpace(24 + (count($lines) * 13));
        $page[] = pdf_text($label, 54, $y, 9, 'F2', '0.55 0.20 0.05');
        $y -= 16;
        foreach ($lines as $line) {
            $page[] = pdf_text($line, 72, $y, 10, 'F1', '0.07 0.08 0.10');
            $y -= 13;
        }
        $y -= 8;
    };

    $addHeader();
    $field('Subject', $subject, 86);
    $field('Generated', (string) ($context['generated_at'] ?? date('M j, Y g:i A')), 86);
    if (!empty($context['delivery_context'])) {
        $field('Delivery Context', (string) $context['delivery_context'], 86);
    }

    $page[] = pdf_text('EMAIL MESSAGE', 54, $y, 11, 'F2', '0.976 0.451 0.086');
    $page[] = pdf_line(54, $y - 8, 558, $y - 8, '0.976 0.451 0.086');
    $y -= 28;
    foreach (preg_split('/\r\n|\r|\n/', trim($message)) ?: [] as $paragraph) {
        $paragraph = trim($paragraph);
        if ($paragraph === '') {
            $y -= 8;
            continue;
        }
        foreach (pdf_wrap($paragraph, 92) as $line) {
            $ensureSpace(18);
            $page[] = pdf_text($line, 54, $y, 10, 'F1', '0.07 0.08 0.10');
            $y -= 13;
        }
        $y -= 7;
    }

    $pages[] = implode("\n", $page);
    $hash = substr(hash('sha256', $subject . "\0" . $message . "\0" . microtime(true)), 0, 10);

    return rtbo_pdf_write_pages(
        $pages,
        PDF_DIR . '/email_notice_' . date('Ymd_His') . '_' . $hash . '.pdf',
        $logoImage !== null ? ['Logo' => $logoImage] : []
    );
}

function build_store_order_receipt_pdf(array $order): string
{
    ensure_dir(PDF_DIR);

    $logoPath = dirname(__DIR__, 2) . '/frontend/public/assets/images/logo.png';
    $logoImage = pdf_image_data_as_jpeg($logoPath);
    $customer = is_array($order['customer'] ?? null) ? $order['customer'] : [];
    $customerName = trim((string) ($customer['first_name'] ?? '') . ' ' . (string) ($customer['last_name'] ?? ''));
    $customerName = $customerName !== '' ? $customerName : 'Store customer';
    $orderId = pdf_value((string) ($order['id'] ?? 'RTBO Store Order'));
    $items = is_array($order['items'] ?? null) ? $order['items'] : [];
    $pages = [];
    $page = [];
    $y = 650;

    $addHeader = static function () use (&$page, $logoImage, $orderId): void {
        $page[] = pdf_rect(0, 0, 612, 792, '1 1 1');
        $page[] = pdf_rect(0, 672, 612, 120, '0.031 0.039 0.059');
        $page[] = pdf_rect(0, 672, 612, 8, '0.976 0.451 0.086');
        if ($logoImage !== null) {
            $page[] = pdf_image_command('Logo', 48, 704, 60, 60);
        }
        $page[] = pdf_text(RTBO_COMPANY_NAME, 124, 744, 20, 'F2', '1 1 1');
        $page[] = pdf_text('Professional Store Purchase Receipt', 124, 720, 15, 'F2', '0.976 0.451 0.086');
        $page[] = pdf_text('Order ' . $orderId, 124, 698, 10, 'F1', '0.86 0.88 0.91');
    };

    $newPage = static function () use (&$pages, &$page, &$y, $addHeader): void {
        if ($page !== []) {
            $pages[] = implode("\n", $page);
        }
        $page = [];
        $y = 650;
        $addHeader();
    };

    $ensureSpace = static function (float $height) use (&$y, $newPage): void {
        if ($y - $height < 54) {
            $newPage();
        }
    };

    $field = static function (string $label, string $value) use (&$page, &$y, $ensureSpace): void {
        $lines = pdf_wrap($value, 78);
        $ensureSpace(22 + (count($lines) * 13));
        $page[] = pdf_text($label, 54, $y, 9, 'F2', '0.23 0.25 0.30');
        $y -= 15;
        foreach ($lines as $line) {
            $page[] = pdf_text($line, 72, $y, 10, 'F1', '0.07 0.08 0.10');
            $y -= 13;
        }
        $y -= 7;
    };

    $money = static fn (int $cents): string => '$' . number_format($cents / 100, 2);

    $addHeader();
    $field('Customer', $customerName);
    $field('Email', pdf_value((string) ($customer['email'] ?? $order['customer_email'] ?? '')));
    $field('Phone', pdf_value((string) ($customer['phone'] ?? '')));
    $field('Shipping Address', trim(implode(', ', array_filter([
        (string) ($customer['address'] ?? ''),
        (string) ($customer['address2'] ?? ''),
        trim((string) ($customer['city'] ?? '') . ', ' . (string) ($customer['state'] ?? '') . ' ' . (string) ($customer['zip'] ?? '')),
    ]))));
    $field('Payment Provider', strtoupper((string) ($order['payment_provider'] ?? $order['gateway_provider'] ?? '')));
    $field('Payment Status', (string) ($order['status'] ?? 'paid'));
    $field('Paid', pdf_date((string) ($order['paid_at'] ?? date('c'))));

    $ensureSpace(54);
    $page[] = pdf_text('ITEMS PURCHASED', 54, $y, 11, 'F2', '0.976 0.451 0.086');
    $page[] = pdf_line(54, $y - 8, 558, $y - 8, '0.976 0.451 0.086');
    $y -= 30;
    foreach ($items as $item) {
        if (!is_array($item)) {
            continue;
        }
        $details = array_values(array_filter([
            (string) ($item['size'] ?? ''),
            (string) ($item['color'] ?? ''),
        ]));
        $name = (string) ($item['name'] ?? $item['sku'] ?? 'Store item');
        if ($details !== []) {
            $name .= ' (' . implode(' / ', $details) . ')';
        }
        $ensureSpace(28);
        $page[] = pdf_text((string) ((int) ($item['quantity'] ?? 1)) . ' x ' . $name, 54, $y, 10, 'F2', '0.07 0.08 0.10');
        $page[] = pdf_text($money((int) ($item['line_total_cents'] ?? 0)), 480, $y, 10, 'F2', '0.07 0.08 0.10');
        $y -= 19;
    }

    $ensureSpace(88);
    $page[] = pdf_line(344, $y, 558, $y, '0.23 0.25 0.30', 0.6);
    $y -= 20;
    foreach ([
        'Subtotal' => (int) ($order['subtotal_cents'] ?? 0),
        'Shipping' => (int) ($order['shipping_cents'] ?? 0),
        'Estimated Tax' => (int) ($order['tax_cents'] ?? 0),
        'Total Paid' => (int) ($order['total_cents'] ?? 0),
    ] as $label => $cents) {
        $font = $label === 'Total Paid' ? 'F2' : 'F1';
        $size = $label === 'Total Paid' ? 13 : 10;
        $page[] = pdf_text($label, 358, $y, $size, $font, '0.07 0.08 0.10');
        $page[] = pdf_text($money($cents), 480, $y, $size, $font, $label === 'Total Paid' ? '0.976 0.451 0.086' : '0.07 0.08 0.10');
        $y -= 18;
    }

    $pages[] = implode("\n", $page);

    return rtbo_pdf_write_pages(
        $pages,
        PDF_DIR . '/store_order_' . rtbo_pdf_sanitize_file_part($orderId, 'store-order') . '.pdf',
        $logoImage !== null ? ['Logo' => $logoImage] : []
    );
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
        $page[] = pdf_rect(54, 546, 118, 118, '0.973 0.933 0.945', '0.976 0.451 0.086');
        $page[] = pdf_image_command('ProfilePhoto', 62, 554, 102, 102);
    } else {
        $page[] = pdf_rect(54, 546, 118, 118, '0.973 0.933 0.945', '0.976 0.451 0.086');
        $page[] = pdf_text('Profile picture', 72, 612, 10, 'F2', '0.55 0.20 0.05');
        $page[] = pdf_text('not available', 78, 596, 9, 'F1', '0.23 0.25 0.30');
    }
    $page[] = pdf_rect(188, 584, 370, 80, '0.973 0.933 0.945', '0.976 0.451 0.086');
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

    $page[] = pdf_rect(54, 552, 504, 112, '0.973 0.933 0.945', '0.976 0.451 0.086');
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
    $orange = '0.561 0.114 0.173';

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
        $page[] = pdf_text(rtbo_invoice_pdf_clip($line, 58), 48, $y, 9, 'F1', '0 0 0');
        $y -= 11;
    }
    $y -= 8;
    $page[] = pdf_text('Ship To:', 48, $y, 11, 'F2', '0 0 0');
    $y -= 14;
    foreach (array_slice($shipLines, 0, 4) as $line) {
        $page[] = pdf_text(rtbo_invoice_pdf_clip($line, 58), 48, $y, 9, 'F1', '0 0 0');
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
    $detailLabelRight = 420;
    $detailValueLeft = 438;
    foreach ($detailRows as [$label, $value]) {
        if (trim((string) $value) === '') {
            continue;
        }
        $page[] = rtbo_invoice_pdf_right_text($label, $detailLabelRight, $y, 11, 'F2', '0 0 0');
        $page[] = pdf_text(rtbo_invoice_pdf_clip($value, 24), $detailValueLeft, $y, 11, $label === 'Invoice #:' ? 'F2' : 'F1', '0 0 0');
        $y -= 15;
    }

    $mailLines = [
        'Montrel Simmons, DBA',
        'Raising The Bar Officiating Inc.',
        '815 Technology Dr., Box 241445',
        'Little Rock, AR 72223',
    ];
    $y = 542;
    $page[] = rtbo_invoice_pdf_right_text('Mail To:', $detailLabelRight, $y, 11, 'F2', '0 0 0');
    $y -= 15;
    foreach ($mailLines as $line) {
        $page[] = pdf_text(rtbo_invoice_pdf_clip($line, 42), $detailValueLeft, $y, 11, 'F1', '0 0 0');
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

function rtbo_contract_pdf_text(array $contract, string $key, string $fallback = ''): string
{
    return trim((string) ($contract[$key] ?? $fallback));
}

function rtbo_contract_pdf_file_name(array $contract): string
{
    $source = rtbo_contract_pdf_text($contract, 'agreementNumber') ?: rtbo_contract_pdf_text($contract, 'clientName') ?: 'RTBO-Contract';
    $safe = preg_replace('/[^A-Za-z0-9._-]+/', '-', $source) ?: 'RTBO-Contract';
    return trim($safe, '-') . '.pdf';
}

function rtbo_contract_pdf_money(mixed $value): string
{
    $amount = (float) preg_replace('/[^0-9.\-]/', '', (string) $value);
    return '$' . number_format(max(0, $amount), 2);
}

function rtbo_contract_pdf_total(array $contract): float
{
    $fields = [
        'assigningFee', 'perSchoolAssigningFee', 'perGameAssigningFee', 'middleSchoolFee',
        'juniorVarsityFee', 'juniorHighFee', 'varsityFee', 'showcaseFee', 'collegeFee',
        'tournamentFee', 'conferenceTournamentFee', 'specialEventFee', 'travelFee',
        'mealPerDiem', 'lateScheduleFee', 'cancellationFee', 'replacementFee', 'adminFee',
    ];
    $total = 0.0;
    foreach ($fields as $field) {
        $total += (float) preg_replace('/[^0-9.\-]/', '', (string) ($contract[$field] ?? '0'));
    }
    return max(0, $total);
}

function rtbo_contract_pdf_is_official_agreement(array $contract): bool
{
    return (string) ($contract['templateId'] ?? '') === 'official-independent-contractor'
        || (string) ($contract['contractCategory'] ?? '') === 'Independent Contractor Agreement';
}

function rtbo_contract_pdf_is_celebrity_fundraising_agreement(array $contract): bool
{
    return (string) ($contract['templateId'] ?? '') === 'celebrity-fundraising-sponsorship'
        || (string) ($contract['contractCategory'] ?? '') === 'Celebrity Game / Fundraising / Sponsorship';
}

function rtbo_contract_pdf_title(array $contract): string
{
    if (rtbo_contract_pdf_is_official_agreement($contract)) {
        return 'Independent Contractor Officiating Agreement | Basketball';
    }

    if (rtbo_contract_pdf_is_celebrity_fundraising_agreement($contract)) {
        return 'Celebrity Game, Fundraising, and Sponsorship Basketball Officials Assigning Agreement';
    }

    return rtbo_contract_pdf_text($contract, 'contractCategory', 'Basketball') . ' Basketball Officials Assigning Agreement';
}

function rtbo_contract_pdf_counterparty_label(array $contract): string
{
    return rtbo_contract_pdf_is_official_agreement($contract) ? 'Contractor / Official' : 'Client / Organization';
}

function rtbo_contract_pdf_event_label(array $contract): string
{
    return rtbo_contract_pdf_is_official_agreement($contract) ? 'Covered Services' : 'Event / Schedule';
}

function rtbo_contract_pdf_official_sections(array $contract, float $total, string $contractorName, string $serviceName): array
{
    $rtboAddress = rtbo_contract_pdf_text($contract, 'rtboAddress', '815 Technology Dr., Box 241445, Little Rock, Arkansas 72223');
    $contractorAddress = rtbo_contract_pdf_text($contract, 'billingAddress', 'To be completed');
    $classification = rtbo_contract_pdf_text($contract, 'levelOfPlay', 'Applicable classification');
    $governingState = rtbo_contract_pdf_text($contract, 'governingState', 'AR');
    $paymentMadeBy = rtbo_contract_pdf_text($contract, 'paymentMadeBy', RTBO_COMPANY_NAME);
    $paymentMadeTo = rtbo_contract_pdf_text($contract, 'paymentMadeTo', 'Contractor / Official');
    $paymentProcessing = rtbo_contract_pdf_text($contract, 'paymentProcessingTime', 'By RTBO payment schedule');
    $travelFee = rtbo_contract_pdf_money($contract['travelFee'] ?? 0);
    $mealPerDiem = rtbo_contract_pdf_money($contract['mealPerDiem'] ?? 0);

    return [
        ['Introduction and Identification of Parties', "This Independent Contractor Officiating Agreement is entered into by and between " . RTBO_COMPANY_NAME . ", an Arkansas non-profit corporation with an address of {$rtboAddress}, and {$contractorName}, with a mailing address of {$contractorAddress}.\nRTBO engages Contractor as an independent contractor for basketball officiating services and related officiating work for accepted assignments. Contractor desires to perform those services on an independent contractor basis subject to this Agreement."],
        ['Term', 'The term of this Agreement begins on ' . rtbo_contract_pdf_text($contract, 'effectiveDate', 'To be completed') . ' and ends on ' . rtbo_contract_pdf_text($contract, 'expirationDate', 'To be completed') . ', unless renewed, extended, suspended, or terminated under this Agreement. Unless RTBO states otherwise in writing, the Agreement applies to one basketball season.'],
        ['Contractor Status', "Contractor is engaged as an independent contractor to perform basketball officiating and officiating-related work for {$serviceName}, including games, scrimmages, exhibitions, tournaments, schools, clinics, meetings, seminars, travel, and related activities sanctioned or approved by RTBO, {$classification}, or another approved governing body.\nContractor is not an employee, agent, partner, joint venturer, or legal representative of RTBO. Contractor is solely responsible for federal, state, and local taxes, Social Security taxes, unemployment insurance taxes, business license fees, and other obligations arising from the services. RTBO will not withhold federal or state taxes from compensation and may issue a Form 1099 when required by law."],
        ['Game Assignments', "This Agreement does not obligate RTBO to make any assignment to Contractor and does not guarantee any minimum number, level, quality, location, or type of assignment. Contractor may accept or decline assignments when offered.\nRTBO may require Contractor to attend clinics, meetings, seminars, schools, trainings, qualifying tests, examinations, and, when applicable, a physical examination. All assignments remain subject to change, reassignment, removal, or cancellation in RTBO's sole discretion. Contractor may revoke acceptance no later than ninety-six (96) hours before the original posted game time, except for illness, family emergency, business emergency, or another reason accepted by RTBO."],
        ['Assignment Criteria and Communication Platform', rtbo_contract_pdf_text($contract, 'assigningCriteria', 'Assignments may be offered based on availability, classification, location, training completion, test results, professional conduct, evaluation history, communication, game level, event needs, and RTBO discretion.') . "\n" . rtbo_contract_pdf_text($contract, 'technologyPlatform', 'RTBO may use its website, assigning platform, email, text messaging, phone communication, payment system, forms, reports, calendars, digital signature tools, or other approved technology.')],
        ['Payment and Tax Responsibility', 'For each assignment fulfilled by Contractor, Contractor shall receive the applicable game fee, assignment fee, or approved compensation entered into this Agreement or otherwise communicated by RTBO. Estimated completed fee schedule total: ' . rtbo_contract_pdf_money($total) . ".\nPayment shall be made by {$paymentMadeBy} to {$paymentMadeTo} through the payment system and schedule established by RTBO. Current payment processing selection: {$paymentProcessing}.\nContractor is responsible for providing accurate payment information. Contractor may, at RTBO's or a host institution's discretion, receive additional compensation such as lodging, meals, mileage, travel reimbursement, per diem, or other approved benefits."],
        ['Expenses, Equipment, Tools, and Materials', "Contractor is responsible for expenses incurred while performing services unless RTBO and Contractor mutually agree otherwise in writing. Contractor will furnish all vehicles, uniforms, whistles, equipment, tools, materials, and other items necessary to provide the services unless RTBO states otherwise in writing.\nTravel fee: {$travelFee}. Mileage rate: " . rtbo_contract_pdf_text($contract, 'mileageRate', 'To be completed if applicable') . ". Lodging policy: " . rtbo_contract_pdf_text($contract, 'hotelPolicy', 'To be completed if applicable') . ". Meal per diem: {$mealPerDiem}."],
        ['Policies, Location Rules, and Conduct', "Contractor acknowledges access to RTBO personal conduct policies, anti-harassment policies, sportsmanship expectations, assignment procedures, and professional standards. Contractor shall perform all services consistently with RTBO policies, location rules, applicable law, approved mechanics, assignment instructions, and professional standards.\nRTBO may immediately suspend or terminate this Agreement or remove Contractor from assignments for policy violations, misconduct, safety concerns, dishonesty, unprofessional conduct, or conduct that prejudices RTBO, schools, institutions, participants, fans, coaches, officials, coordinators, supervisors, or observers."],
        ['NCAA, Sport-Specific, and Wagering Rules', 'Contractor agrees to comply with applicable rules and regulations of the NCAA, NFHS, NJCAA, NAIA, professional, school, conference, tournament, RTBO, and sport-specific bodies applicable to the assignment. Contractor also agrees to conform to published basketball officiating mechanics unless modified by RTBO or the applicable assignment authority. Contractor shall not wager, gamble, or participate in any game of chance relating to the outcome of any athletic contest.'],
        ['Termination', 'Either party may terminate this Agreement at any time and for any reason by giving at least forty-eight (48) hours written notice to the other party, subject to the assignment revocation rules in this Agreement. RTBO may suspend or terminate this Agreement immediately without prior notice for cause, including misconduct, policy violations, rule violations, safety concerns, dishonesty, wagering, failure to meet requirements, or conduct inconsistent with RTBO standards.'],
        ['Indemnification', 'Contractor shall observe and comply with all applicable laws, ordinances, regulations, rules, certificates, licenses, permits, bonds, insurance requirements, and other obligations. To the fullest extent permitted by law, Contractor shall defend, indemnify, and hold harmless RTBO and its directors, officers, employees, members, affiliates, agents, representatives, successors, and assigns from claims, damages, liabilities, losses, and expenses arising from Contractor performance, acts, omissions, failure to comply with this Agreement, bodily injury, death, or property damage.'],
        ['Insurance', 'Contractor shall purchase and maintain insurance sufficient to protect Contractor from claims for damages, personal injury, bodily injury, sickness, death, property damage, or other exposure related to Contractor services. Contractor represents that Contractor has and will maintain health insurance or other coverage sufficient for performance of services and any potential injury, sickness, or death connected to those services. Contractor shall provide proof of insurance upon request.'],
        ['Assumption of Risk and Release', 'Contractor understands and assumes all risks related to performing services, including travel to and from assignments, services performed at any location or facility, meetings, seminars, schools, clinics, events incidental to services, and potential exposure to infectious disease or other known or unknown risks. To the fullest extent permitted by law, Contractor releases RTBO and its directors, officers, employees, members, affiliates, agents, representatives, successors, and assigns from claims arising out of personal or bodily injury, illness, death, property loss, property damage, economic loss, travel, assignment performance, or events incidental to services, except where prohibited by law.'],
        ['Governing Law and Jurisdiction', "This Agreement, performance under this Agreement, and claims arising out of or relating to this Agreement are governed by the laws of {$governingState}, without regard to conflict-of-law principles. The parties agree to first attempt to resolve disputes by " . rtbo_contract_pdf_text($contract, 'disputeResolution', 'Good Faith Meeting') . ', unless urgent legal or equitable relief is required.'],
        ['Severability, Entire Agreement, Counterparts, and Binding Effect', 'If any term or condition is invalid, illegal, or unenforceable, that determination does not affect any other term or condition. This Agreement constitutes the entire agreement between RTBO and Contractor with respect to the subject matter and supersedes all prior or contemporaneous understandings. This Agreement may only be amended by a writing signed by both parties. This Agreement may be executed in counterparts and by digital signature. It is binding on RTBO successors and assigns and Contractor successors, legal representatives, and heirs. Contractor may not assign this Agreement without RTBO written consent.'],
        ['Closing Statement', rtbo_contract_pdf_text($contract, 'closingStatement', 'By signing this Agreement, RTBO and Contractor acknowledge that they have reviewed the Agreement, understand the independent contractor relationship, and agree to follow the professional standards required for RTBO basketball officiating services.')],
    ];
}

function rtbo_contract_pdf_celebrity_sections(array $contract): array
{
    return [
        ['Celebrity Game, Fundraising, and Sponsorship Terms', 'Beneficiary / cause: ' . rtbo_contract_pdf_text($contract, 'fundraisingBeneficiary', 'To be completed by Client') . '. Fundraising goal: ' . rtbo_contract_pdf_text($contract, 'fundraisingGoal', 'To be completed if applicable') . '. Sponsorship package / level: ' . rtbo_contract_pdf_text($contract, 'sponsorshipPackage', 'To be completed if applicable') . ".\nClient is responsible for celebrity appearance agreements, VIP or guest lists, travel or hospitality for celebrity participants, sponsor inventory, promotional copy, fundraising compliance, donation handling, ticketing, admissions, tax receipts, beneficiary payment instructions, prize or auction rules, and public statements unless RTBO agrees otherwise in a separate written addendum.\nRTBO is responsible only for basketball officials assigning services, officials communication, and related officiating support described in this Agreement."],
        ['Sponsor Deliverables, Recognition, and Event Presentation', rtbo_contract_pdf_text($contract, 'sponsorshipDeliverables', 'Sponsor deliverables must be completed by Client or sponsor unless RTBO accepts a specific written responsibility.') . "\nSponsor recognition plan: " . rtbo_contract_pdf_text($contract, 'sponsorRecognition', 'To be completed by Client') . "\nCelebrity participant requirements: " . rtbo_contract_pdf_text($contract, 'celebrityParticipantRequirements', 'To be completed by Client') . "\nPublic relations approval: " . rtbo_contract_pdf_text($contract, 'publicRelationsApproval', 'Client controls promotional, sponsor, beneficiary, celebrity, and media approvals unless otherwise agreed in writing.')],
        ['Donation, Revenue, Ticketing, and Beneficiary Handling', 'Donation / revenue handling: ' . rtbo_contract_pdf_text($contract, 'donationHandling', 'Client is responsible for donation processing, ticket revenue, sponsor funds, beneficiary payments, and charitable solicitation compliance.') . "\nTicketing / admission plan: " . rtbo_contract_pdf_text($contract, 'ticketingPlan', 'Client is responsible for ticketing, admission, credentials, guest lists, and VIP access unless otherwise agreed in writing.') . "\nRTBO does not provide tax, fundraising, charitable solicitation, sponsorship, celebrity appearance, securities, or accounting advice. Client should obtain appropriate legal, tax, accounting, insurance, and sponsorship review for the fundraising and sponsorship portions of the event."],
    ];
}

function build_contract_pdf(array $contract): string
{
    ensure_dir(PDF_DIR);

    $logoPath = dirname(__DIR__, 2) . '/frontend/public/assets/images/logo.png';
    $logoImage = pdf_image_data_as_jpeg($logoPath);
    $orange = '0.561 0.114 0.173';
    $black = '0.02 0.02 0.02';
    $isOfficialAgreement = rtbo_contract_pdf_is_official_agreement($contract);
    $title = pdf_value(rtbo_contract_pdf_title($contract));
    $agreementNumber = pdf_value(rtbo_contract_pdf_text($contract, 'agreementNumber', 'RTBO-CONTRACT'));
    $clientName = pdf_value(rtbo_contract_pdf_text($contract, 'clientName', $isOfficialAgreement ? 'Contractor / Official' : 'Client / Organization'));
    $eventName = pdf_value(rtbo_contract_pdf_text($contract, 'eventName', $isOfficialAgreement ? 'Basketball Officiating Services' : 'Covered Event / Schedule'));
    $counterpartyLabel = rtbo_contract_pdf_counterparty_label($contract);
    $eventLabel = rtbo_contract_pdf_event_label($contract);
    $total = rtbo_contract_pdf_total($contract);
    $signedAt = rtbo_contract_pdf_text($contract, 'clientSignedAt');

    $sections = $isOfficialAgreement ? rtbo_contract_pdf_official_sections($contract, $total, $clientName, $eventName) : [
        ['Executive Summary', rtbo_contract_pdf_text($contract, 'executiveSummary', 'Raising The Bar Officiating Inc. will provide professional basketball officials assigning services for the covered client, schedule, event, or organization.')],
        ['Client and Event', "Client / Organization: {$clientName}\nPrimary Contact: " . rtbo_contract_pdf_text($contract, 'primaryContact', 'To be completed') . "\nEmail: " . rtbo_contract_pdf_text($contract, 'contactEmail', 'To be completed') . "\nPhone: " . rtbo_format_phone_number(rtbo_contract_pdf_text($contract, 'contactPhone')) . "\nEvent / Schedule: {$eventName}\nVenue: " . rtbo_contract_pdf_text($contract, 'venueAddress', 'To be completed')],
        ['Officials and Rules', 'Officials System: ' . rtbo_contract_pdf_text($contract, 'officialsSystem', 'To be completed') . "\nRule Set: " . rtbo_contract_pdf_text($contract, 'ruleSet', 'To be completed') . "\nLevel of Play: " . rtbo_contract_pdf_text($contract, 'levelOfPlay', 'To be completed') . "\nAssignment Platform: " . rtbo_contract_pdf_text($contract, 'assignmentPlatform', 'RTBO Platform')],
        ['Assigning Criteria', rtbo_contract_pdf_text($contract, 'assigningCriteria', 'Assignments may be based on availability, location, level of play, professional readiness, conflict avoidance, evaluation history, and event needs.')],
        ['Technology and Communication', rtbo_contract_pdf_text($contract, 'technologyPlatform', 'RTBO may use digital assignment, communication, evaluation, reporting, and scheduling tools to support covered games and events.')],
        ['Financial Schedule', 'Estimated completed fee schedule total: ' . rtbo_contract_pdf_money($total) . "\nPayment made by: " . rtbo_contract_pdf_text($contract, 'paymentMadeBy', 'Client') . "\nPayment made to: " . rtbo_contract_pdf_text($contract, 'paymentMadeTo', RTBO_COMPANY_NAME) . "\nPayment due date: " . rtbo_contract_pdf_text($contract, 'paymentDueDate', 'To be completed') . "\nPayment processing time: " . rtbo_contract_pdf_text($contract, 'paymentProcessingTime', 'By written agreement')],
        ['Operations and Expectations', rtbo_contract_pdf_text($contract, 'assignorDuties', '') . "\n" . rtbo_contract_pdf_text($contract, 'officialExpectations', '') . "\n" . rtbo_contract_pdf_text($contract, 'administrationExpectations', '')],
        ['Training and Review', rtbo_contract_pdf_text($contract, 'trainingEvaluationModel', '') . "\nComplaint / Film Review: " . rtbo_contract_pdf_text($contract, 'complaintFilmReviewProcess', '')],
        ['Legal Terms', 'Confidentiality: ' . rtbo_contract_pdf_text($contract, 'confidentiality', 'Yes') . "\nNon-Discrimination: " . rtbo_contract_pdf_text($contract, 'nondiscrimination', 'Yes') . "\nDispute Resolution: " . rtbo_contract_pdf_text($contract, 'disputeResolution', 'Good Faith Meeting') . "\nGoverning State: " . rtbo_contract_pdf_text($contract, 'governingState', 'AR') . "\nTermination Notice: " . rtbo_contract_pdf_text($contract, 'terminationNotice', '30 Days') . "\n" . rtbo_contract_pdf_text($contract, 'closingStatement', '')],
    ];
    if (!$isOfficialAgreement && rtbo_contract_pdf_is_celebrity_fundraising_agreement($contract)) {
        array_splice($sections, 8, 0, rtbo_contract_pdf_celebrity_sections($contract));
    }
    if (rtbo_contract_pdf_text($contract, 'specialTerms') !== '') {
        $sections[] = ['Special Terms', rtbo_contract_pdf_text($contract, 'specialTerms')];
    }

    $pages = [];
    $page = [];
    $y = 0.0;
    $pageNumber = 0;

    $addHeader = static function () use (&$page, &$y, &$pageNumber, $logoImage, $title, $agreementNumber, $orange, $black): void {
        $pageNumber++;
        $page[] = pdf_rect(0, 0, 612, 792, '1 1 1');
        $page[] = pdf_rect(0, 708, 612, 84, $black);
        $page[] = pdf_rect(0, 704, 612, 4, $orange);
        if ($logoImage !== null) {
            $page[] = pdf_image_command('Logo', 46, 724, 48, 48);
        }
        $page[] = pdf_text(RTBO_COMPANY_NAME, 108, 756, 18, 'F2', '1 1 1');
        $page[] = pdf_text($title, 108, 734, 12, 'F2', $orange);
        $page[] = pdf_text($agreementNumber, 108, 718, 8, 'F1', '0.86 0.88 0.91');
        $page[] = pdf_text('Page ' . $pageNumber, 542, 22, 8, 'F2', '0 0 0');
        $y = 676;
    };

    $newPage = static function () use (&$pages, &$page, $addHeader): void {
        if ($page !== []) {
            $pages[] = implode("\n", $page);
        }
        $page = [];
        $addHeader();
    };

    $ensureSpace = static function (float $height) use (&$y, $newPage): void {
        if ($y - $height < 58) {
            $newPage();
        }
    };

    $section = static function (string $heading) use (&$page, &$y, $ensureSpace, $orange): void {
        $ensureSpace(34);
        $page[] = pdf_text(strtoupper($heading), 48, $y, 11, 'F2', $orange);
        $page[] = pdf_line(48, $y - 8, 564, $y - 8, $orange, .7);
        $y -= 24;
    };

    $paragraph = static function (string $text, int $wrap = 92) use (&$page, &$y, $ensureSpace): void {
        foreach (preg_split('/\r?\n/', trim($text)) ?: [] as $block) {
            $block = trim($block);
            if ($block === '') {
                $y -= 5;
                continue;
            }
            foreach (pdf_wrap($block, $wrap) as $line) {
                $ensureSpace(16);
                $page[] = pdf_text(pdf_value($line), 60, $y, 9, 'F1', '0 0 0');
                $y -= 12;
            }
            $y -= 4;
        }
    };

    $addHeader();
    $page[] = pdf_rect(48, 594, 516, 68, '0.973 0.933 0.945', $orange);
    $page[] = pdf_text($counterpartyLabel, 66, 646, 8, 'F2', '0 0 0');
    $page[] = pdf_text($clientName, 66, 628, 16, 'F2', '0 0 0');
    $page[] = pdf_text($eventLabel . ': ' . $eventName, 66, 612, 10, 'F1', '0 0 0');
    $page[] = pdf_text('Prepared by ' . pdf_value(rtbo_contract_pdf_text($contract, 'rtboRepresentative', 'Montrel Simmons')) . ' | ' . pdf_value(rtbo_format_phone_number(rtbo_contract_pdf_text($contract, 'rtboPhone', '(501) 240-4961'))), 66, 600, 9, 'F1', '0 0 0');
    $y = 562;

    $snapshot = [
        ['Status', rtbo_contract_pdf_text($contract, 'contractStatus', 'Draft')],
        ['Effective Date', rtbo_contract_pdf_text($contract, 'effectiveDate', 'To be completed')],
        ['Expiration Date', rtbo_contract_pdf_text($contract, 'expirationDate', 'To be completed')],
        ['Service Cycle', rtbo_contract_pdf_text($contract, 'serviceCycleLength', 'Seasonal Agreement')],
        ['Estimated Fees', rtbo_contract_pdf_money($total)],
        ['Digital Signature', $signedAt !== '' ? 'Signed ' . $signedAt : 'Pending ' . ($isOfficialAgreement ? 'contractor / official' : 'client') . ' signature'],
    ];
    $section('Agreement Snapshot');
    foreach ($snapshot as [$label, $value]) {
        $ensureSpace(18);
        $page[] = pdf_text($label . ':', 60, $y, 9, 'F2', '0 0 0');
        $page[] = pdf_text(pdf_value($value), 168, $y, 9, 'F1', '0 0 0');
        $y -= 14;
    }
    $y -= 10;

    foreach ($sections as [$heading, $text]) {
        $section($heading);
        $paragraph($text);
    }

    $section('Signature Page');
    $paragraph('IN WITNESS WHEREOF, the ' . ($isOfficialAgreement ? 'Contractor / Official' : 'Client representative') . ' and the Coordinator of Officials have caused this agreement to be reviewed and executed on the date(s) indicated below.');
    $ensureSpace(118);
    $signatureName = rtbo_contract_pdf_text($contract, 'clientSignature') ?: rtbo_contract_pdf_text($contract, 'clientSigner', $isOfficialAgreement ? 'Contractor / Official' : 'Client Representative');
    $page[] = pdf_rect(56, $y - 78, 236, 86, '0.98 0.98 0.98', '0.76 0.76 0.76');
    $page[] = pdf_text($isOfficialAgreement ? 'Contractor / Official' : 'Client / Organization Representative', 68, $y - 10, 10, 'F2', '0 0 0');
    $page[] = pdf_text(pdf_value($signatureName), 68, $y - 34, $signedAt !== '' ? 16 : 10, $signedAt !== '' ? 'F3' : 'F1', '0 0 0');
    $page[] = pdf_line(68, $y - 44, 274, $y - 44, '0 0 0', .6);
    $page[] = pdf_text('Signature', 68, $y - 57, 8, 'F1', '0 0 0');
    $page[] = pdf_text('Date: ' . pdf_value($signedAt !== '' ? $signedAt : '________________'), 68, $y - 70, 8, 'F1', '0 0 0');
    $rtboSignedAt = rtbo_contract_pdf_text($contract, 'rtboSignedAt');
    $rtboSignatureName = rtbo_contract_pdf_text($contract, 'rtboSignature') ?: rtbo_contract_pdf_text($contract, 'rtboSigner', 'Montrel Simmons');
    $page[] = pdf_rect(320, $y - 78, 236, 86, '0.98 0.98 0.98', '0.76 0.76 0.76');
    $page[] = pdf_text('Coordinator of Officials', 332, $y - 10, 10, 'F2', '0 0 0');
    $page[] = pdf_text(pdf_value($rtboSignatureName), 332, $y - 34, 16, 'F3', '0 0 0');
    $page[] = pdf_line(332, $y - 44, 538, $y - 44, '0 0 0', .6);
    $page[] = pdf_text('Signature', 332, $y - 57, 8, 'F1', '0 0 0');
    $page[] = pdf_text('Date: ' . pdf_value($rtboSignedAt !== '' ? $rtboSignedAt : '________________'), 332, $y - 70, 8, 'F1', '0 0 0');
    $pages[] = implode("\n", $page);

    $objects = [
        "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj",
        "3 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj",
        "4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj",
        "5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /ZapfChancery-MediumItalic >>\nendobj",
    ];

    $nextObject = 6;
    $xObjects = [];
    if ($logoImage !== null) {
        $imageObject = $nextObject++;
        $xObjects[] = "/Logo {$imageObject} 0 R";
        $objects[] = "{$imageObject} 0 obj\n<< /Type /XObject /Subtype /Image /Width " . $logoImage['width'] . " /Height " . $logoImage['height'] . " /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length " . strlen($logoImage['data']) . " >>\nstream\n" . $logoImage['data'] . "\nendstream\nendobj";
    }
    $xObjectResources = $xObjects !== [] ? " /XObject << " . implode(' ', $xObjects) . " >>" : '';
    $pageRefs = [];

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

    $path = PDF_DIR . '/' . rtbo_contract_pdf_file_name($contract);
    file_put_contents($path, $pdf, LOCK_EX);

    return $path;
}


function rtbo_w9_pdf_text(array $form, string $key, string $fallback = ''): string
{
    return trim((string) ($form[$key] ?? ($fallback !== '' ? ($form[$fallback] ?? '') : '')));
}

function rtbo_w9_pdf_file_name(array $form): string
{
    $source = rtbo_w9_pdf_text($form, 'formNumber') ?: rtbo_w9_pdf_text($form, 'recordName') ?: 'RTBO-W9';
    $safe = strtolower(preg_replace('/[^A-Za-z0-9]+/', '-', $source) ?: 'rtbo-w9');
    return trim($safe, '-') . '.pdf';
}

function rtbo_w9_pdf_classification_label(array $form): string
{
    $classification = rtbo_w9_pdf_text($form, 'taxClassification');
    if ($classification === 'llc') {
        return 'Limited liability company - ' . (rtbo_w9_pdf_text($form, 'llcTaxClassification') ?: 'classification pending');
    }
    if ($classification === 'other') {
        return rtbo_w9_pdf_text($form, 'otherClassification') ?: 'Other';
    }

    return match ($classification) {
        'individual' => 'Individual/sole proprietor',
        'c_corp' => 'C Corporation',
        's_corp' => 'S Corporation',
        'partnership' => 'Partnership',
        'trust_estate' => 'Trust/estate',
        default => 'Not selected',
    };
}

function rtbo_w9_pdf_draw_box(array &$page, float $x, float $y, bool $checked, string $label): void
{
    $page[] = pdf_rect($x, $y, 10, 10, '1 1 1', '0 0 0');
    if ($checked) {
        $page[] = pdf_text('X', $x + 2.2, $y + 1.8, 8, 'F2', '0 0 0');
    }
    $page[] = pdf_text($label, $x + 15, $y + 2, 8, 'F1', '0 0 0');
}

function rtbo_w9_pdf_field(array &$page, string $line, string $label, string $value, float $x, float $y, float $width = 540, int $valueSize = 10): float
{
    $page[] = pdf_line($x, $y - 3, $x + $width, $y - 3, '0 0 0', 0.8);
    $page[] = pdf_text($line, $x, $y + 12, 8, 'F2', '0 0 0');
    $page[] = pdf_text($label, $x + 16, $y + 12, 7, 'F1', '0 0 0');
    $lineY = $y;
    foreach (array_slice(pdf_wrap($value !== '' ? $value : 'Not provided', 84), 0, 2) as $wrapped) {
        $page[] = pdf_text($wrapped, $x + 16, $lineY, $valueSize, 'F2', '0 0 0');
        $lineY -= 12;
    }
    return min($lineY, $y - 10);
}

function rtbo_w9_pdf_overlay_text(array &$page, string $text, float $x, float $y, int $size = 10, string $font = 'F2'): void
{
    $text = trim($text);
    if ($text === '') {
        return;
    }
    $lineY = $y;
    foreach (array_slice(pdf_wrap($text, 54), 0, 3) as $line) {
        $page[] = pdf_text($line, $x, $lineY, $size, $font, '0 0 0');
        $lineY -= $size + 1;
    }
}

function rtbo_w9_pdf_overlay_mark(array &$page, bool $checked, float $x, float $y): void
{
    if (!$checked) {
        return;
    }
    $page[] = pdf_text('X', $x, $y, 11, 'F2', '0 0 0');
}

function rtbo_w9_pdf_overlay_tin(array &$page, string $tin, string $type): void
{
    $digits = substr(preg_replace('/\D+/', '', $tin) ?: '', 0, 9);
    $positions = $type === 'ssn'
        ? [[420, 405], [435, 405], [452, 405], [476, 405], [492, 405], [520, 405], [535, 405], [551, 405], [567, 405]]
        : [[420, 360], [435, 360], [460, 360], [476, 360], [492, 360], [508, 360], [524, 360], [540, 360], [556, 360]];

    foreach (str_split($digits) as $index => $digit) {
        if (!isset($positions[$index])) {
            break;
        }
        [$x, $y] = $positions[$index];
        $page[] = pdf_text($digit, $x, $y, 12, 'F2', '0 0 0');
    }
}

function build_w9_pdf(array $form): string
{
    ensure_dir(PDF_DIR);

    $templatePath = dirname(__DIR__, 2) . '/frontend/public/assets/forms/fw9-2024-page-1.jpg';
    $template = pdf_jpeg_data($templatePath);
    $name = rtbo_w9_pdf_text($form, 'name');
    $businessName = rtbo_w9_pdf_text($form, 'businessName');
    $address = trim(rtbo_w9_pdf_text($form, 'addressLine1') . ' ' . rtbo_w9_pdf_text($form, 'addressLine2'));
    $cityLine = trim(implode(', ', array_filter([
        rtbo_w9_pdf_text($form, 'city'),
        rtbo_w9_pdf_text($form, 'state'),
        rtbo_w9_pdf_text($form, 'zip'),
    ])));
    $requester = trim(implode("\n", array_filter([
        rtbo_w9_pdf_text($form, 'requesterName'),
        rtbo_w9_pdf_text($form, 'requesterAddress'),
    ])));
    $classification = rtbo_w9_pdf_text($form, 'taxClassification');
    $tin = rtbo_w9_pdf_text($form, 'tin') ?: rtbo_w9_pdf_text($form, 'tinMasked');
    $tinType = rtbo_w9_pdf_text($form, 'tinType') === 'ssn' ? 'ssn' : 'ein';
    $signatureName = rtbo_w9_pdf_text($form, 'signatureName');
    $signatureDate = rtbo_w9_pdf_text($form, 'signatureDate');

    $page = [];
    $page[] = pdf_rect(0, 0, 612, 792, '1 1 1');
    if ($template !== null) {
        $page[] = pdf_image_command('W9Template', 0, 0, 612, 792);
    }

    rtbo_w9_pdf_overlay_text($page, $name, 72, 666, 10, 'F2');
    rtbo_w9_pdf_overlay_text($page, $businessName, 72, 645, 10, 'F2');
    rtbo_w9_pdf_overlay_mark($page, $classification === 'individual', 73, 603);
    rtbo_w9_pdf_overlay_mark($page, $classification === 'c_corp', 183, 603);
    rtbo_w9_pdf_overlay_mark($page, $classification === 's_corp', 254, 603);
    rtbo_w9_pdf_overlay_mark($page, $classification === 'partnership', 325, 603);
    rtbo_w9_pdf_overlay_mark($page, $classification === 'trust_estate', 390, 603);
    rtbo_w9_pdf_overlay_mark($page, $classification === 'llc', 73, 584);
    rtbo_w9_pdf_overlay_mark($page, $classification === 'other', 73, 553);
    rtbo_w9_pdf_overlay_text($page, $classification === 'llc' ? rtbo_w9_pdf_text($form, 'llcTaxClassification') : '', 290, 584, 10, 'F2');
    rtbo_w9_pdf_overlay_text($page, $classification === 'other' ? rtbo_w9_pdf_text($form, 'otherClassification') : '', 162, 553, 9, 'F2');
    rtbo_w9_pdf_overlay_mark($page, !empty($form['foreignPartners']), 441, 521);
    rtbo_w9_pdf_overlay_text($page, rtbo_w9_pdf_text($form, 'exemptPayeeCode'), 543, 584, 10, 'F2');
    rtbo_w9_pdf_overlay_text($page, rtbo_w9_pdf_text($form, 'fatcaCode'), 501, 552, 10, 'F2');
    rtbo_w9_pdf_overlay_text($page, trim($address . "\n" . $cityLine), 30, 503, 10, 'F2');
    rtbo_w9_pdf_overlay_text($page, $requester, 395, 503, 8, 'F1');
    rtbo_w9_pdf_overlay_text($page, rtbo_w9_pdf_text($form, 'accountNumbers'), 30, 455, 10, 'F2');
    rtbo_w9_pdf_overlay_tin($page, $tin, $tinType);
    rtbo_w9_pdf_overlay_text($page, $signatureName, 132, 201, 10, 'F2');
    rtbo_w9_pdf_overlay_text($page, $signatureDate, 393, 201, 10, 'F2');

    $content = implode("\n", $page);
    $objects = [
        "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj",
        "2 0 obj\n<< /Type /Pages /Kids [6 0 R] /Count 1 >>\nendobj",
        "3 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj",
        "4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj",
        "5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /ZapfChancery-MediumItalic >>\nendobj",
    ];

    $xObjectResources = '';
    if ($template !== null) {
        $objects[] = "8 0 obj\n<< /Type /XObject /Subtype /Image /Width " . $template['width'] . " /Height " . $template['height'] . " /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length " . strlen($template['data']) . " >>\nstream\n" . $template['data'] . "\nendstream\nendobj";
        $xObjectResources = ' /XObject << /W9Template 8 0 R >>';
    }

    $objects[] = "6 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R /F2 4 0 R /F3 5 0 R >>{$xObjectResources} >> /Contents 7 0 R >>\nendobj";
    $objects[] = "7 0 obj\n<< /Length " . strlen($content) . " >>\nstream\n{$content}\nendstream\nendobj";

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

    $path = PDF_DIR . '/' . rtbo_w9_pdf_file_name($form);
    file_put_contents($path, $pdf, LOCK_EX);

    return $path;
}

<?php
declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/email.php';

function ensure_newsletter_tables(): void
{
    db()->exec(
        "CREATE TABLE IF NOT EXISTS newsletter_subscribers (
            id INT AUTO_INCREMENT PRIMARY KEY,
            email VARCHAR(190) NOT NULL UNIQUE,
            first_name VARCHAR(100),
            last_name VARCHAR(100),
            status VARCHAR(30) NOT NULL DEFAULT 'active',
            subscribed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            unsubscribed_at DATETIME NULL
        ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
    );

    db()->exec(
        "CREATE TABLE IF NOT EXISTS newsletters (
            id INT AUTO_INCREMENT PRIMARY KEY,
            subject VARCHAR(190) NOT NULL,
            preheader VARCHAR(255),
            body_html MEDIUMTEXT NOT NULL,
            body_text MEDIUMTEXT NOT NULL,
            created_by INT NULL,
            sent_count INT NOT NULL DEFAULT 0,
            failed_count INT NOT NULL DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            sent_at DATETIME NULL
        ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
    );
}

function subscribe_newsletter(string $email, string $firstName = '', string $lastName = ''): void
{
    ensure_newsletter_tables();

    $stmt = db()->prepare(
        "INSERT INTO newsletter_subscribers(email, first_name, last_name, status, subscribed_at, unsubscribed_at)
         VALUES (?, ?, ?, 'active', NOW(), NULL)
         ON DUPLICATE KEY UPDATE
           first_name = COALESCE(NULLIF(VALUES(first_name), ''), first_name),
           last_name = COALESCE(NULLIF(VALUES(last_name), ''), last_name),
           status = 'active',
           unsubscribed_at = NULL"
    );
    $stmt->execute([$email, $firstName, $lastName]);
}

function newsletter_subscriber_count(): int
{
    ensure_newsletter_tables();

    return (int) db()->query("SELECT COUNT(*) FROM newsletter_subscribers WHERE status = 'active'")->fetchColumn();
}

function newsletter_recent_subscribers(int $limit = 10): array
{
    ensure_newsletter_tables();

    $stmt = db()->prepare("SELECT email, first_name, last_name, subscribed_at FROM newsletter_subscribers WHERE status = 'active' ORDER BY subscribed_at DESC LIMIT ?");
    $stmt->bindValue(1, $limit, PDO::PARAM_INT);
    $stmt->execute();

    return $stmt->fetchAll();
}

function newsletter_history(int $limit = 10): array
{
    ensure_newsletter_tables();

    $stmt = db()->prepare("SELECT subject, sent_count, failed_count, created_at, sent_at FROM newsletters ORDER BY created_at DESC LIMIT ?");
    $stmt->bindValue(1, $limit, PDO::PARAM_INT);
    $stmt->execute();

    return $stmt->fetchAll();
}

function build_newsletter_html(string $subject, string $preheader, string $message): string
{
    $paragraphs = preg_split("/\R{2,}/", trim($message)) ?: [];
    $body = '';

    foreach ($paragraphs as $paragraph) {
        $body .= '<p style="margin:0 0 18px;color:#334155;font-size:16px;line-height:1.65;">' . nl2br(e(trim($paragraph))) . '</p>';
    }

    return '<!doctype html><html><body style="margin:0;padding:0;background:#f6f7fb;font-family:Arial,Helvetica,sans-serif;">'
        . '<div style="display:none;max-height:0;overflow:hidden;color:transparent;">' . e($preheader) . '</div>'
        . '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6f7fb;padding:28px 12px;"><tr><td align="center">'
        . '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:680px;background:#ffffff;border:1px solid #fed7aa;border-radius:8px;overflow:hidden;">'
        . '<tr><td style="padding:24px;background:#080a0f;text-align:center;"><img src="' . e(RTBO_BASE_URL) . '/assets/images/logo.png" alt="Raising The Bar Officiating" style="width:132px;height:auto;margin:auto;display:block;"></td></tr>'
        . '<tr><td style="padding:30px;">'
        . '<p style="margin:0 0 8px;color:#c2410c;font-size:12px;font-weight:bold;letter-spacing:.12em;text-transform:uppercase;">Raising The Bar Officiating</p>'
        . '<h1 style="margin:0 0 18px;color:#111827;font-size:30px;line-height:1.1;text-transform:uppercase;">' . e($subject) . '</h1>'
        . $body
        . '<p style="margin:24px 0 0;color:#475569;font-size:14px;line-height:1.6;">We Will Serve, And Will Be Of Service To The Game.</p>'
        . '</td></tr>'
        . '<tr><td style="padding:18px 30px;background:#fff7ed;color:#475569;font-size:13px;line-height:1.5;">You are receiving this because you subscribed to RTBO updates. Questions? Contact <a href="mailto:' . e(RTBO_ADMIN_EMAIL) . '" style="color:#c2410c;">' . e(RTBO_ADMIN_EMAIL) . '</a>.</td></tr>'
        . '</table></td></tr></table></body></html>';
}

function send_newsletter(string $subject, string $preheader, string $message, ?int $createdBy = null): array
{
    ensure_newsletter_tables();

    $subject = trim($subject);
    $preheader = trim($preheader);
    $message = trim($message);

    if ($subject === '' || $message === '') {
        throw new InvalidArgumentException('Newsletter subject and message are required.');
    }

    $html = build_newsletter_html($subject, $preheader, $message);
    $text = $subject . "\n\n" . $message . "\n\n" . RTBO_COMPANY_NAME . "\n" . RTBO_ADMIN_EMAIL;

    $subscribers = db()->query("SELECT email FROM newsletter_subscribers WHERE status = 'active' ORDER BY email")->fetchAll();
    $sent = 0;
    $failed = 0;

    foreach (array_chunk($subscribers, 40) as $batch) {
        $bcc = array_column($batch, 'email');
        if (!$bcc) {
            continue;
        }

        $boundary = 'rtbo_news_' . bin2hex(random_bytes(10));
        $headers = [
            'From: ' . RTBO_COMPANY_NAME . ' <' . RTBO_FROM_EMAIL . '>',
            'Reply-To: ' . RTBO_ADMIN_EMAIL,
            'Bcc: ' . implode(', ', $bcc),
            'MIME-Version: 1.0',
            'Content-Type: multipart/alternative; boundary="' . $boundary . '"',
        ];

        $body = "--{$boundary}\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\n";
        $body .= $text . "\r\n\r\n";
        $body .= "--{$boundary}\r\nContent-Type: text/html; charset=UTF-8\r\n\r\n";
        $body .= $html . "\r\n\r\n--{$boundary}--";

        if (rtbo_send_mail(RTBO_ADMIN_EMAIL, $subject, $body, $headers)) {
            $sent += count($bcc);
        } else {
            $failed += count($bcc);
        }
    }

    $stmt = db()->prepare(
        "INSERT INTO newsletters(subject, preheader, body_html, body_text, created_by, sent_count, failed_count, sent_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, NOW())"
    );
    $stmt->execute([$subject, $preheader, $html, $text, $createdBy, $sent, $failed]);

    return ['sent' => $sent, 'failed' => $failed];
}

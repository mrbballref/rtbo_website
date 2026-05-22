<?php
declare(strict_types=1);

require_once __DIR__ . '/includes/bootstrap.php';
require_once __DIR__ . '/includes/users.php';
require_once __DIR__ . '/includes/newsletter.php';

header('Content-Type: application/json');
require_same_origin_request();

function admin_newsletter_input(): array
{
    $raw = file_get_contents('php://input') ?: '';
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

$databaseUser = current_database_user();
$user = $databaseUser ? public_auth_user($databaseUser) : current_user();
if (!$user || !is_admin_user($user)) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Admin sign-in is required.']);
    exit;
}

$method = strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET'));
$input = admin_newsletter_input();
$action = (string) ($input['action'] ?? ($_GET['action'] ?? 'dashboard'));

try {
    if ($method === 'GET' || $action === 'dashboard') {
        echo json_encode(newsletter_admin_payload(), JSON_UNESCAPED_SLASHES);
        exit;
    }

    if ($method !== 'POST') {
        http_response_code(405);
        echo json_encode(['success' => false, 'message' => 'Unsupported newsletter request method.']);
        exit;
    }

    if ($action === 'add_source') {
        $source = newsletter_save_source((array) ($input['source'] ?? []), $user);
        echo json_encode([
            ...newsletter_admin_payload(),
            'source' => $source,
            'message' => 'Newsletter source saved.',
        ], JSON_UNESCAPED_SLASHES);
        exit;
    }

    if ($action === 'discover_sources') {
        $discovery = newsletter_discover_sources($user);
        echo json_encode([
            ...newsletter_admin_payload(),
            'discovery' => $discovery,
            'message' => $discovery['added'] > 0
                ? "Source discovery added {$discovery['added']} monitored source(s)."
                : 'Source discovery finished. Existing monitored sources are up to date.',
        ], JSON_UNESCAPED_SLASHES);
        exit;
    }

    if ($action === 'update_source_status') {
        $source = newsletter_update_source_status((int) ($input['id'] ?? 0), (string) ($input['status'] ?? 'paused'));
        echo json_encode([
            ...newsletter_admin_payload(),
            'source' => $source,
            'message' => 'Newsletter source updated.',
        ], JSON_UNESCAPED_SLASHES);
        exit;
    }

    if ($action === 'run_scraper') {
        $result = newsletter_run_scraper();
        echo json_encode([
            ...newsletter_admin_payload(),
            'scraper' => $result,
            'message' => $result['collected'] > 0
                ? "Scraper collected {$result['collected']} article record(s) for review."
                : 'Scraper finished. No new article records were collected.',
        ], JSON_UNESCAPED_SLASHES);
        exit;
    }

    if ($action === 'update_article_status') {
        $article = newsletter_update_article_status((int) ($input['id'] ?? 0), (string) ($input['status'] ?? 'review'));
        echo json_encode([
            ...newsletter_admin_payload(),
            'article' => $article,
            'message' => 'Article review status updated.',
        ], JSON_UNESCAPED_SLASHES);
        exit;
    }

    if ($action === 'create_issue') {
        $issue = newsletter_create_issue((array) ($input['issue'] ?? []), $user);
        echo json_encode([
            ...newsletter_admin_payload(),
            'issue' => $issue,
            'message' => 'Weekly newsletter issue created.',
        ], JSON_UNESCAPED_SLASHES);
        exit;
    }

    if ($action === 'send_issue') {
        $result = newsletter_send_issue((int) ($input['id'] ?? 0), $user);
        echo json_encode([
            ...newsletter_admin_payload(),
            'delivery' => $result,
            'message' => "Newsletter sent to {$result['sent']} subscriber(s). {$result['failed']} delivery batch recipient(s) failed.",
        ], JSON_UNESCAPED_SLASHES);
        exit;
    }

    throw new RuntimeException('Unsupported newsletter action.');
} catch (Throwable $error) {
    error_log('RTBO admin newsletter action failed: ' . $error->getMessage());
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => $error->getMessage()]);
}

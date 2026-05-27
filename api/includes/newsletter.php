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

    db()->exec(
        "CREATE TABLE IF NOT EXISTS newsletter_sources (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(190) NOT NULL,
            url TEXT NOT NULL,
            source_type VARCHAR(80) NOT NULL DEFAULT 'sports_news',
            method VARCHAR(40) NOT NULL DEFAULT 'rss',
            status VARCHAR(30) NOT NULL DEFAULT 'active',
            compliance_status VARCHAR(80) NOT NULL DEFAULT 'Pending Review',
            last_scan_at DATETIME NULL,
            last_error TEXT NULL,
            created_by INT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX newsletter_sources_status_idx (status),
            INDEX newsletter_sources_method_idx (method)
        ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
    );

    db()->exec(
        "CREATE TABLE IF NOT EXISTS newsletter_articles (
            id INT AUTO_INCREMENT PRIMARY KEY,
            source_id INT NULL,
            source_name VARCHAR(190) NOT NULL,
            source_url TEXT NULL,
            source_link TEXT NOT NULL,
            title VARCHAR(255) NOT NULL,
            summary TEXT NULL,
            category VARCHAR(120) NOT NULL DEFAULT 'Officiating News',
            status VARCHAR(30) NOT NULL DEFAULT 'review',
            quality_score INT NOT NULL DEFAULT 0,
            published_at DATETIME NULL,
            collected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            approved_at DATETIME NULL,
            UNIQUE KEY newsletter_article_link_unique (source_link(190)),
            INDEX newsletter_articles_status_idx (status),
            INDEX newsletter_articles_collected_idx (collected_at)
        ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
    );

    db()->exec(
        "CREATE TABLE IF NOT EXISTS newsletter_issues (
            id INT AUTO_INCREMENT PRIMARY KEY,
            title VARCHAR(190) NOT NULL,
            subtitle VARCHAR(255) NULL,
            issue_date DATE NOT NULL,
            status VARCHAR(30) NOT NULL DEFAULT 'draft',
            cover_headline VARCHAR(255) NULL,
            intro_text TEXT NULL,
            sections_json MEDIUMTEXT NULL,
            created_by INT NULL,
            sent_count INT NOT NULL DEFAULT 0,
            failed_count INT NOT NULL DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            sent_at DATETIME NULL,
            INDEX newsletter_issues_date_idx (issue_date),
            INDEX newsletter_issues_status_idx (status)
        ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
    );
}

function subscribe_newsletter(string $email, string $firstName = '', string $lastName = ''): void
{
    try {
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
    } catch (Throwable $error) {
        error_log('RTBO newsletter subscriber using file fallback: ' . $error->getMessage());
        newsletter_file_subscribe($email, $firstName, $lastName);
    }
}

function newsletter_subscriber_count(): int
{
    try {
        ensure_newsletter_tables();

        return (int) db()->query("SELECT COUNT(*) FROM newsletter_subscribers WHERE status = 'active'")->fetchColumn();
    } catch (Throwable $error) {
        error_log('RTBO newsletter subscriber count using file fallback: ' . $error->getMessage());
        return count(array_filter(newsletter_file_load()['subscribers'], static fn(array $subscriber): bool => ($subscriber['status'] ?? '') === 'active'));
    }
}

function newsletter_recent_subscribers(int $limit = 10): array
{
    try {
        ensure_newsletter_tables();

        $stmt = db()->prepare("SELECT email, first_name, last_name, subscribed_at FROM newsletter_subscribers WHERE status = 'active' ORDER BY subscribed_at DESC LIMIT ?");
        $stmt->bindValue(1, $limit, PDO::PARAM_INT);
        $stmt->execute();

        return $stmt->fetchAll();
    } catch (Throwable $error) {
        error_log('RTBO newsletter recent subscribers using file fallback: ' . $error->getMessage());
        $subscribers = array_values(array_filter(newsletter_file_load()['subscribers'], static fn(array $subscriber): bool => ($subscriber['status'] ?? '') === 'active'));
        usort($subscribers, static fn(array $a, array $b): int => strcmp((string) ($b['subscribed_at'] ?? ''), (string) ($a['subscribed_at'] ?? '')));
        return array_slice($subscribers, 0, $limit);
    }
}

function newsletter_history(int $limit = 10): array
{
    try {
        ensure_newsletter_tables();

        $stmt = db()->prepare("SELECT subject, sent_count, failed_count, created_at, sent_at FROM newsletters ORDER BY created_at DESC LIMIT ?");
        $stmt->bindValue(1, $limit, PDO::PARAM_INT);
        $stmt->execute();

        return $stmt->fetchAll();
    } catch (Throwable $error) {
        error_log('RTBO newsletter history using file fallback: ' . $error->getMessage());
        $campaigns = newsletter_file_load()['campaigns'];
        usort($campaigns, static fn(array $a, array $b): int => strcmp((string) ($b['created_at'] ?? ''), (string) ($a['created_at'] ?? '')));
        return array_slice($campaigns, 0, $limit);
    }
}

function newsletter_file_path(): string
{
    ensure_dir(STORAGE_DIR);
    return STORAGE_DIR . '/newsletter-center.json';
}

function newsletter_file_empty(): array
{
    return [
        'next_ids' => [
            'sources' => 1,
            'articles' => 1,
            'issues' => 1,
            'campaigns' => 1,
        ],
        'sources' => [],
        'articles' => [],
        'issues' => [],
        'subscribers' => [],
        'campaigns' => [],
    ];
}

function newsletter_file_load(): array
{
    $path = newsletter_file_path();
    if (!is_file($path)) {
        return newsletter_file_empty();
    }

    $data = json_decode((string) file_get_contents($path), true);
    if (!is_array($data)) {
        return newsletter_file_empty();
    }

    $empty = newsletter_file_empty();
    $data['next_ids'] = is_array($data['next_ids'] ?? null) ? array_merge($empty['next_ids'], $data['next_ids']) : $empty['next_ids'];
    foreach (['sources', 'articles', 'issues', 'subscribers', 'campaigns'] as $key) {
        $data[$key] = is_array($data[$key] ?? null) ? $data[$key] : [];
    }

    return $data;
}

function newsletter_file_save(array $data): void
{
    file_put_contents(newsletter_file_path(), json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES), LOCK_EX);
}

function newsletter_source_name_from_url(string $url): string
{
    $host = strtolower((string) parse_url($url, PHP_URL_HOST));
    $host = preg_replace('/^www\./', '', $host) ?: '';
    if ($host === '') {
        return 'Newsletter Source';
    }

    $parts = explode('.', $host);
    $name = $parts[0] ?? $host;
    return ucwords(str_replace(['-', '_'], ' ', $name));
}

function newsletter_file_payload(): array
{
    $data = newsletter_file_load();
    $sources = $data['sources'];
    $articles = $data['articles'];
    $issues = $data['issues'];
    $subscribers = array_values(array_filter($data['subscribers'], static fn(array $subscriber): bool => ($subscriber['status'] ?? '') === 'active'));
    $campaigns = $data['campaigns'];

    usort($sources, static fn(array $a, array $b): int => strcmp((string) ($b['updated_at'] ?? $b['created_at'] ?? ''), (string) ($a['updated_at'] ?? $a['created_at'] ?? '')));
    usort($articles, static fn(array $a, array $b): int => strcmp((string) ($b['collected_at'] ?? ''), (string) ($a['collected_at'] ?? '')));
    usort($issues, static fn(array $a, array $b): int => strcmp((string) ($b['issue_date'] ?? ''), (string) ($a['issue_date'] ?? '')));
    usort($subscribers, static fn(array $a, array $b): int => strcmp((string) ($b['subscribed_at'] ?? ''), (string) ($a['subscribed_at'] ?? '')));
    usort($campaigns, static fn(array $a, array $b): int => strcmp((string) ($b['created_at'] ?? ''), (string) ($a['created_at'] ?? '')));

    return [
        'success' => true,
        'storage' => 'file',
        'sources' => $sources,
        'articles' => array_slice($articles, 0, 80),
        'issues' => array_slice($issues, 0, 12),
        'latest_issue' => $issues[0] ?? null,
        'subscribers' => array_slice($subscribers, 0, 50),
        'campaigns' => array_slice($campaigns, 0, 20),
        'counts' => [
            'sources' => count($sources),
            'active_sources' => count(array_filter($sources, static fn(array $source): bool => ($source['status'] ?? '') === 'active')),
            'articles' => count($articles),
            'review_articles' => count(array_filter($articles, static fn(array $article): bool => ($article['status'] ?? '') === 'review')),
            'approved_articles' => count(array_filter($articles, static fn(array $article): bool => ($article['status'] ?? '') === 'approved')),
            'issues' => count($issues),
            'subscribers' => count($subscribers),
        ],
    ];
}

function newsletter_file_subscribe(string $email, string $firstName = '', string $lastName = ''): void
{
    $email = trim(strtolower($email));
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        throw new InvalidArgumentException('Please enter a valid email address.');
    }

    $data = newsletter_file_load();
    $existingIndex = null;
    foreach ($data['subscribers'] as $index => $subscriber) {
        if (strtolower((string) ($subscriber['email'] ?? '')) === $email) {
            $existingIndex = $index;
            break;
        }
    }

    $record = [
        'email' => $email,
        'first_name' => trim($firstName),
        'last_name' => trim($lastName),
        'status' => 'active',
        'subscribed_at' => date('c'),
        'unsubscribed_at' => null,
    ];

    if ($existingIndex === null) {
        array_unshift($data['subscribers'], $record);
    } else {
        $data['subscribers'][$existingIndex] = array_merge($data['subscribers'][$existingIndex], $record);
    }

    newsletter_file_save($data);
}

function newsletter_file_save_source(array $input, ?array $user = null): array
{
    $url = newsletter_validate_url((string) ($input['url'] ?? ''));
    $name = trim((string) ($input['name'] ?? '')) ?: newsletter_source_name_from_url($url);
    $method = strtolower(trim((string) ($input['method'] ?? 'rss')));
    $method = in_array($method, ['rss', 'html', 'manual'], true) ? $method : 'rss';
    $now = date('c');
    $data = newsletter_file_load();
    $id = (int) $data['next_ids']['sources'];
    $data['next_ids']['sources'] = $id + 1;
    $record = [
        'id' => $id,
        'name' => $name,
        'url' => $url,
        'source_type' => trim((string) ($input['source_type'] ?? 'Officiating News')) ?: 'Officiating News',
        'method' => $method,
        'status' => 'active',
        'compliance_status' => trim((string) ($input['compliance_status'] ?? 'Pending Review')) ?: 'Pending Review',
        'last_scan_at' => null,
        'last_error' => null,
        'created_by' => isset($user['id']) ? (int) $user['id'] : null,
        'created_at' => $now,
        'updated_at' => $now,
    ];
    array_unshift($data['sources'], $record);
    newsletter_file_save($data);

    return $record;
}

function newsletter_file_update_source_status(int $sourceId, string $status): array
{
    $status = strtolower(trim($status));
    if (!in_array($status, ['active', 'paused'], true)) {
        throw new InvalidArgumentException('Source status must be active or paused.');
    }

    $data = newsletter_file_load();
    foreach ($data['sources'] as &$source) {
        if ((int) ($source['id'] ?? 0) === $sourceId) {
            $source['status'] = $status;
            $source['updated_at'] = date('c');
            newsletter_file_save($data);
            return $source;
        }
    }

    throw new RuntimeException('Newsletter source was not found.');
}

function newsletter_default_discovery_sources(): array
{
    return [
        [
            'name' => 'NFHS Basketball',
            'url' => 'https://www.nfhs.org/sports/basketball/',
            'source_type' => 'Rules / Education',
            'method' => 'html',
            'compliance_status' => 'Robots / Terms Review Required',
        ],
        [
            'name' => 'NCAA Men Basketball News',
            'url' => 'https://www.ncaa.com/news/basketball-men/d1',
            'source_type' => 'College Basketball',
            'method' => 'html',
            'compliance_status' => 'Robots / Terms Review Required',
        ],
        [
            'name' => 'NCAA Women Basketball News',
            'url' => 'https://www.ncaa.com/news/basketball-women/d1',
            'source_type' => 'College Basketball',
            'method' => 'html',
            'compliance_status' => 'Robots / Terms Review Required',
        ],
        [
            'name' => 'NBA Official',
            'url' => 'https://official.nba.com/',
            'source_type' => 'Professional Officiating',
            'method' => 'html',
            'compliance_status' => 'Robots / Terms Review Required',
        ],
        [
            'name' => 'WNBA News',
            'url' => 'https://www.wnba.com/news',
            'source_type' => 'Professional Women Basketball',
            'method' => 'html',
            'compliance_status' => 'Robots / Terms Review Required',
        ],
        [
            'name' => 'USA Basketball News',
            'url' => 'https://www.usab.com/news',
            'source_type' => 'Basketball Development',
            'method' => 'html',
            'compliance_status' => 'Robots / Terms Review Required',
        ],
        [
            'name' => 'Referee Magazine Basketball',
            'url' => 'https://www.referee.com/category/sport-specific-articles/basketball/',
            'source_type' => 'Officiating News',
            'method' => 'html',
            'compliance_status' => 'Robots / Terms Review Required',
        ],
    ];
}

function newsletter_absolute_url(string $baseUrl, string $href): string
{
    $href = trim(html_entity_decode($href, ENT_QUOTES | ENT_HTML5, 'UTF-8'));
    if ($href === '' || str_starts_with($href, 'mailto:') || str_starts_with($href, 'tel:') || str_starts_with($href, '#')) {
        return '';
    }
    if (str_starts_with($href, 'http://') || str_starts_with($href, 'https://')) {
        return $href;
    }

    $scheme = (string) (parse_url($baseUrl, PHP_URL_SCHEME) ?: 'https');
    $host = (string) (parse_url($baseUrl, PHP_URL_HOST) ?: '');
    if ($host === '') {
        return '';
    }
    if (str_starts_with($href, '//')) {
        return $scheme . ':' . $href;
    }
    if (str_starts_with($href, '/')) {
        return "{$scheme}://{$host}{$href}";
    }

    $path = (string) (parse_url($baseUrl, PHP_URL_PATH) ?: '/');
    $directory = rtrim(str_replace('\\', '/', dirname($path)), '/');
    return "{$scheme}://{$host}" . ($directory ? "/{$directory}" : '') . "/{$href}";
}

function newsletter_discovery_candidates(): array
{
    $candidates = newsletter_default_discovery_sources();

    foreach (newsletter_default_discovery_sources() as $seed) {
        try {
            $content = newsletter_fetch_url((string) $seed['url']);
            if (preg_match_all('/<link\b[^>]*(?:rel=["\'][^"\']*alternate[^"\']*["\'][^>]*type=["\']application\/(?:rss|atom)\+xml["\']|type=["\']application\/(?:rss|atom)\+xml["\'][^>]*rel=["\'][^"\']*alternate[^"\']*["\'])[^>]*>/i', $content, $linkTags)) {
                foreach ($linkTags[0] as $tag) {
                    if (!preg_match('/href=["\']([^"\']+)["\']/i', $tag, $hrefMatch)) {
                        continue;
                    }
                    $url = newsletter_absolute_url((string) $seed['url'], (string) $hrefMatch[1]);
                    if ($url === '') {
                        continue;
                    }
                    $title = '';
                    if (preg_match('/title=["\']([^"\']+)["\']/i', $tag, $titleMatch)) {
                        $title = newsletter_plain_text((string) $titleMatch[1]);
                    }
                    $candidates[] = [
                        'name' => $title ?: ((string) $seed['name'] . ' Feed'),
                        'url' => $url,
                        'source_type' => (string) $seed['source_type'],
                        'method' => 'rss',
                        'compliance_status' => 'Robots / Terms Review Required',
                    ];
                }
            }

            if (preg_match_all('/<a\b[^>]+href=["\']([^"\']+)["\'][^>]*>(.*?)<\/a>/is', $content, $anchorMatches, PREG_SET_ORDER)) {
                foreach (array_slice($anchorMatches, 0, 120) as $anchor) {
                    $href = (string) ($anchor[1] ?? '');
                    $text = newsletter_plain_text((string) ($anchor[2] ?? ''));
                    $combined = strtolower($href . ' ' . $text);
                    if (!preg_match('/rss|feed|basketball|officiat|official|rules|mechanic|training|news/', $combined)) {
                        continue;
                    }
                    $url = newsletter_absolute_url((string) $seed['url'], $href);
                    if ($url === '') {
                        continue;
                    }
                    $candidates[] = [
                        'name' => $text ? newsletter_truncate($text, 80) : newsletter_source_name_from_url($url),
                        'url' => $url,
                        'source_type' => (string) $seed['source_type'],
                        'method' => preg_match('/rss|feed|xml/', strtolower($url)) ? 'rss' : 'html',
                        'compliance_status' => 'Robots / Terms Review Required',
                    ];
                }
            }
        } catch (Throwable $error) {
            error_log('RTBO newsletter source discovery seed failed: ' . $error->getMessage());
        }
    }

    $deduped = [];
    foreach ($candidates as $candidate) {
        $url = newsletter_validate_url((string) ($candidate['url'] ?? ''));
        if (isset($deduped[$url])) {
            continue;
        }
        $deduped[$url] = [
            'name' => trim((string) ($candidate['name'] ?? '')) ?: newsletter_source_name_from_url($url),
            'url' => $url,
            'source_type' => trim((string) ($candidate['source_type'] ?? 'Officiating News')) ?: 'Officiating News',
            'method' => in_array(($candidate['method'] ?? 'html'), ['rss', 'html', 'manual'], true) ? (string) $candidate['method'] : 'html',
            'compliance_status' => trim((string) ($candidate['compliance_status'] ?? 'Robots / Terms Review Required')) ?: 'Robots / Terms Review Required',
        ];
    }

    return array_slice(array_values($deduped), 0, 40);
}

function newsletter_source_exists(string $url): bool
{
    $stmt = db()->prepare("SELECT COUNT(*) FROM newsletter_sources WHERE url = ?");
    $stmt->execute([$url]);
    return (int) $stmt->fetchColumn() > 0;
}

function newsletter_file_source_exists(array $data, string $url): bool
{
    foreach ($data['sources'] as $source) {
        if ((string) ($source['url'] ?? '') === $url) {
            return true;
        }
    }

    return false;
}

function newsletter_discover_sources(?array $user = null): array
{
    try {
        ensure_newsletter_tables();
        $added = 0;
        $checked = 0;
        foreach (newsletter_discovery_candidates() as $candidate) {
            $checked++;
            if (newsletter_source_exists((string) $candidate['url'])) {
                continue;
            }
            newsletter_save_source($candidate, $user);
            $added++;
        }

        return ['added' => $added, 'checked' => $checked, 'storage' => 'database'];
    } catch (Throwable $error) {
        error_log('RTBO newsletter source discovery using file fallback: ' . $error->getMessage());
        return newsletter_file_discover_sources($user);
    }
}

function newsletter_file_discover_sources(?array $user = null): array
{
    $data = newsletter_file_load();
    $added = 0;
    $checked = 0;
    $now = date('c');

    foreach (newsletter_discovery_candidates() as $candidate) {
        $checked++;
        $url = (string) $candidate['url'];
        if (newsletter_file_source_exists($data, $url)) {
            continue;
        }
        $id = (int) $data['next_ids']['sources'];
        $data['next_ids']['sources'] = $id + 1;
        array_unshift($data['sources'], [
            'id' => $id,
            'name' => (string) $candidate['name'],
            'url' => $url,
            'source_type' => (string) $candidate['source_type'],
            'method' => (string) $candidate['method'],
            'status' => 'active',
            'compliance_status' => (string) $candidate['compliance_status'],
            'last_scan_at' => null,
            'last_error' => null,
            'created_by' => isset($user['id']) ? (int) $user['id'] : null,
            'created_at' => $now,
            'updated_at' => $now,
        ]);
        $added++;
    }

    newsletter_file_save($data);

    return ['added' => $added, 'checked' => $checked, 'storage' => 'file'];
}

function newsletter_truncate(string $value, int $limit = 420): string
{
    $value = trim(preg_replace('/\s+/', ' ', $value) ?: '');
    if ($value === '' || strlen($value) <= $limit) {
        return $value;
    }

    return rtrim(substr($value, 0, $limit - 1)) . '...';
}

function newsletter_plain_text(string $value): string
{
    $value = html_entity_decode(strip_tags($value), ENT_QUOTES | ENT_HTML5, 'UTF-8');
    return trim(preg_replace('/\s+/', ' ', $value) ?: '');
}

function newsletter_validate_url(string $url): string
{
    $url = trim($url);
    if (!filter_var($url, FILTER_VALIDATE_URL) || !in_array(parse_url($url, PHP_URL_SCHEME), ['http', 'https'], true)) {
        throw new InvalidArgumentException('Please enter a valid http or https source URL.');
    }

    return $url;
}

function newsletter_admin_sources(): array
{
    ensure_newsletter_tables();
    return db()->query(
        "SELECT id, name, url, source_type, method, status, compliance_status, last_scan_at, last_error, created_at
         FROM newsletter_sources
         ORDER BY updated_at DESC, id DESC"
    )->fetchAll();
}

function newsletter_admin_articles(int $limit = 80): array
{
    ensure_newsletter_tables();
    $stmt = db()->prepare(
        "SELECT id, source_id, source_name, source_url, source_link, title, summary, category, status, quality_score, published_at, collected_at, approved_at
         FROM newsletter_articles
         ORDER BY collected_at DESC, id DESC
         LIMIT ?"
    );
    $stmt->bindValue(1, $limit, PDO::PARAM_INT);
    $stmt->execute();

    return $stmt->fetchAll();
}

function newsletter_decode_issue(array $issue): array
{
    $sections = json_decode((string) ($issue['sections_json'] ?? '[]'), true);
    unset($issue['sections_json']);
    $issue['sections'] = is_array($sections) ? $sections : [];
    return $issue;
}

function newsletter_admin_issues(int $limit = 12): array
{
    ensure_newsletter_tables();
    $stmt = db()->prepare(
        "SELECT id, title, subtitle, issue_date, status, cover_headline, intro_text, sections_json, sent_count, failed_count, created_at, updated_at, sent_at
         FROM newsletter_issues
         ORDER BY issue_date DESC, id DESC
         LIMIT ?"
    );
    $stmt->bindValue(1, $limit, PDO::PARAM_INT);
    $stmt->execute();

    return array_map('newsletter_decode_issue', $stmt->fetchAll());
}

function newsletter_latest_issue(): ?array
{
    $issues = newsletter_admin_issues(1);
    return $issues[0] ?? null;
}

function newsletter_admin_payload(): array
{
    try {
        ensure_newsletter_tables();
        $sources = newsletter_admin_sources();
        $articles = newsletter_admin_articles();
        $issues = newsletter_admin_issues();
        $subscribers = newsletter_recent_subscribers(50);
        $campaigns = newsletter_history(20);

        return [
            'success' => true,
            'storage' => 'database',
            'sources' => $sources,
            'articles' => $articles,
            'issues' => $issues,
            'latest_issue' => $issues[0] ?? null,
            'subscribers' => $subscribers,
            'campaigns' => $campaigns,
            'counts' => [
                'sources' => count($sources),
                'active_sources' => count(array_filter($sources, static fn(array $source): bool => ($source['status'] ?? '') === 'active')),
                'articles' => count($articles),
                'review_articles' => count(array_filter($articles, static fn(array $article): bool => ($article['status'] ?? '') === 'review')),
                'approved_articles' => count(array_filter($articles, static fn(array $article): bool => ($article['status'] ?? '') === 'approved')),
                'issues' => count($issues),
                'subscribers' => newsletter_subscriber_count(),
            ],
        ];
    } catch (Throwable $error) {
        error_log('RTBO newsletter payload using file fallback: ' . $error->getMessage());
        return newsletter_file_payload();
    }
}

function newsletter_save_source(array $input, ?array $user = null): array
{
    $url = newsletter_validate_url((string) ($input['url'] ?? ''));
    $name = trim((string) ($input['name'] ?? '')) ?: newsletter_source_name_from_url($url);
    $sourceType = trim((string) ($input['source_type'] ?? 'Officiating News')) ?: 'Officiating News';
    $method = strtolower(trim((string) ($input['method'] ?? 'rss')));
    $method = in_array($method, ['rss', 'html', 'manual'], true) ? $method : 'rss';
    $status = strtolower(trim((string) ($input['status'] ?? 'active')));
    $status = in_array($status, ['active', 'paused'], true) ? $status : 'active';
    $compliance = trim((string) ($input['compliance_status'] ?? 'Pending Review')) ?: 'Pending Review';

    try {
        ensure_newsletter_tables();

        $stmt = db()->prepare(
            "INSERT INTO newsletter_sources(name, url, source_type, method, status, compliance_status, created_by)
             VALUES (?, ?, ?, ?, ?, ?, ?)"
        );
        $stmt->execute([$name, $url, $sourceType, $method, $status, $compliance, isset($user['id']) ? (int) $user['id'] : null]);

        $id = (int) db()->lastInsertId();
        $stmt = db()->prepare("SELECT id, name, url, source_type, method, status, compliance_status, last_scan_at, last_error, created_at FROM newsletter_sources WHERE id = ?");
        $stmt->execute([$id]);

        return $stmt->fetch() ?: [];
    } catch (Throwable $error) {
        error_log('RTBO newsletter source using file fallback: ' . $error->getMessage());
        return newsletter_file_save_source([
            ...$input,
            'name' => $name,
            'url' => $url,
            'source_type' => $sourceType,
            'method' => $method,
            'status' => $status,
            'compliance_status' => $compliance,
        ], $user);
    }
}

function newsletter_update_source_status(int $sourceId, string $status): array
{
    $status = strtolower(trim($status));
    if (!in_array($status, ['active', 'paused'], true)) {
        throw new InvalidArgumentException('Source status must be active or paused.');
    }

    try {
        ensure_newsletter_tables();
        $stmt = db()->prepare("UPDATE newsletter_sources SET status = ? WHERE id = ?");
        $stmt->execute([$status, $sourceId]);
        $stmt = db()->prepare("SELECT id, name, url, source_type, method, status, compliance_status, last_scan_at, last_error, created_at FROM newsletter_sources WHERE id = ?");
        $stmt->execute([$sourceId]);
        $source = $stmt->fetch();
        if (!$source) {
            throw new RuntimeException('Newsletter source was not found.');
        }

        return $source;
    } catch (Throwable $error) {
        error_log('RTBO newsletter source status using file fallback: ' . $error->getMessage());
        return newsletter_file_update_source_status($sourceId, $status);
    }
}

function newsletter_fetch_url(string $url): string
{
    $url = newsletter_validate_url($url);
    if (function_exists('curl_init')) {
        $handle = curl_init($url);
        curl_setopt_array($handle, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_CONNECTTIMEOUT => 3,
            CURLOPT_TIMEOUT => 6,
            CURLOPT_USERAGENT => 'RTBO Weekly Whistle Newsletter Bot/1.0',
        ]);
        $body = curl_exec($handle);
        $status = (int) curl_getinfo($handle, CURLINFO_RESPONSE_CODE);
        $error = curl_error($handle);
        curl_close($handle);
        if ($body === false || $status >= 400) {
            throw new RuntimeException($error ?: "Source returned HTTP {$status}.");
        }

        return (string) $body;
    }

    $context = stream_context_create([
        'http' => [
            'timeout' => 6,
            'header' => "User-Agent: RTBO Weekly Whistle Newsletter Bot/1.0\r\n",
        ],
    ]);
    $body = @file_get_contents($url, false, $context);
    if ($body === false) {
        throw new RuntimeException('Source could not be fetched.');
    }

    return (string) $body;
}

function newsletter_extract_meta(string $html, string $property): string
{
    $patterns = [
        '/<meta[^>]+property=["\']' . preg_quote($property, '/') . '["\'][^>]+content=["\']([^"\']+)["\']/i',
        '/<meta[^>]+name=["\']' . preg_quote($property, '/') . '["\'][^>]+content=["\']([^"\']+)["\']/i',
    ];
    foreach ($patterns as $pattern) {
        if (preg_match($pattern, $html, $matches)) {
            return html_entity_decode((string) $matches[1], ENT_QUOTES | ENT_HTML5, 'UTF-8');
        }
    }

    return '';
}

function newsletter_category_for_text(string $text): string
{
    $lower = strtolower($text);
    return str_contains($lower, 'rule') || str_contains($lower, 'mechanic')
        ? 'Rules & Mechanics'
        : (str_contains($lower, 'film') || str_contains($lower, 'video')
            ? 'Film Room'
            : (str_contains($lower, 'assign') || str_contains($lower, 'availability')
                ? 'Assignment Desk'
                : (str_contains($lower, 'camp') || str_contains($lower, 'training')
                    ? 'Training'
                    : 'Officiating News')));
}

function newsletter_quality_score(string $title, string $summary, string $link): int
{
    $score = 60;
    if (strlen($title) >= 35) {
        $score += 10;
    }
    if (strlen($summary) >= 140) {
        $score += 15;
    }
    if (filter_var($link, FILTER_VALIDATE_URL)) {
        $score += 10;
    }
    if (preg_match('/rules?|official|officiat|basketball|training|assign|film|mechanic/i', $title . ' ' . $summary)) {
        $score += 10;
    }

    return min(100, $score);
}

function newsletter_upsert_article(array $source, array $article): bool
{
    $title = newsletter_truncate((string) ($article['title'] ?? ''), 250);
    $link = newsletter_validate_url((string) ($article['link'] ?? ($source['url'] ?? '')));
    $summary = newsletter_truncate(newsletter_plain_text((string) ($article['summary'] ?? '')), 620);
    $category = newsletter_category_for_text($title . ' ' . $summary);
    $publishedAt = trim((string) ($article['published_at'] ?? ''));
    $publishedAt = $publishedAt !== '' && strtotime($publishedAt) ? date('Y-m-d H:i:s', strtotime($publishedAt)) : null;

    if ($title === '') {
        return false;
    }

    $stmt = db()->prepare(
        "INSERT INTO newsletter_articles(source_id, source_name, source_url, source_link, title, summary, category, status, quality_score, published_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'review', ?, ?)
         ON DUPLICATE KEY UPDATE
            title = VALUES(title),
            summary = VALUES(summary),
            category = VALUES(category),
            quality_score = VALUES(quality_score),
            published_at = COALESCE(VALUES(published_at), published_at)"
    );

    $stmt->execute([
        (int) ($source['id'] ?? 0) ?: null,
        (string) ($source['name'] ?? 'Newsletter Source'),
        (string) ($source['url'] ?? ''),
        $link,
        $title,
        $summary,
        $category,
        newsletter_quality_score($title, $summary, $link),
        $publishedAt,
    ]);

    return $stmt->rowCount() > 0;
}

function newsletter_file_upsert_article(array &$data, array $source, array $article): bool
{
    $title = newsletter_truncate((string) ($article['title'] ?? ''), 250);
    if ($title === '') {
        return false;
    }

    $link = newsletter_validate_url((string) ($article['link'] ?? ($source['url'] ?? '')));
    $summary = newsletter_truncate(newsletter_plain_text((string) ($article['summary'] ?? '')), 620);
    $publishedAt = trim((string) ($article['published_at'] ?? ''));
    $publishedAt = $publishedAt !== '' && strtotime($publishedAt) ? date('c', strtotime($publishedAt)) : null;

    foreach ($data['articles'] as &$existing) {
        if ((string) ($existing['source_link'] ?? '') === $link) {
            $existing['title'] = $title;
            $existing['summary'] = $summary;
            $existing['category'] = newsletter_category_for_text($title . ' ' . $summary);
            $existing['quality_score'] = newsletter_quality_score($title, $summary, $link);
            $existing['published_at'] = $publishedAt ?: ($existing['published_at'] ?? null);
            return false;
        }
    }

    $id = (int) $data['next_ids']['articles'];
    $data['next_ids']['articles'] = $id + 1;
    array_unshift($data['articles'], [
        'id' => $id,
        'source_id' => (int) ($source['id'] ?? 0) ?: null,
        'source_name' => (string) ($source['name'] ?? 'Newsletter Source'),
        'source_url' => (string) ($source['url'] ?? ''),
        'source_link' => $link,
        'title' => $title,
        'summary' => $summary,
        'category' => newsletter_category_for_text($title . ' ' . $summary),
        'status' => 'review',
        'quality_score' => newsletter_quality_score($title, $summary, $link),
        'published_at' => $publishedAt,
        'collected_at' => date('c'),
        'approved_at' => null,
    ]);

    return true;
}

function newsletter_parse_rss_items(string $content, array $source): array
{
    $xml = @simplexml_load_string($content, 'SimpleXMLElement', LIBXML_NOCDATA);
    if (!$xml) {
        return [];
    }

    $items = [];
    $nodes = [];
    if (isset($xml->channel->item)) {
        $nodes = iterator_to_array($xml->channel->item);
    } elseif (isset($xml->entry)) {
        $nodes = iterator_to_array($xml->entry);
    }

    foreach (array_slice($nodes, 0, 12) as $node) {
        $link = (string) ($node->link ?? '');
        if ($link === '' && isset($node->link['href'])) {
            $link = (string) $node->link['href'];
        }
        if ($link === '') {
            $link = (string) ($source['url'] ?? '');
        }
        $items[] = [
            'title' => (string) ($node->title ?? ''),
            'link' => $link,
            'summary' => (string) ($node->description ?? $node->summary ?? $node->content ?? ''),
            'published_at' => (string) ($node->pubDate ?? $node->published ?? $node->updated ?? ''),
        ];
    }

    return $items;
}

function newsletter_parse_html_items(string $content, array $source): array
{
    $title = newsletter_extract_meta($content, 'og:title');
    if ($title === '' && preg_match('/<title[^>]*>(.*?)<\/title>/is', $content, $matches)) {
        $title = newsletter_plain_text((string) $matches[1]);
    }
    if ($title === '' && preg_match('/<h1[^>]*>(.*?)<\/h1>/is', $content, $matches)) {
        $title = newsletter_plain_text((string) $matches[1]);
    }

    $summary = newsletter_extract_meta($content, 'description') ?: newsletter_extract_meta($content, 'og:description');
    if ($summary === '' && preg_match('/<p[^>]*>(.*?)<\/p>/is', $content, $matches)) {
        $summary = newsletter_plain_text((string) $matches[1]);
    }

    return $title !== ''
        ? [[
            'title' => $title,
            'link' => (string) ($source['url'] ?? ''),
            'summary' => $summary,
            'published_at' => '',
        ]]
        : [];
}

function newsletter_run_scraper(): array
{
    try {
        ensure_newsletter_tables();
        $stmt = db()->query("SELECT id, name, url, source_type, method, status FROM newsletter_sources WHERE status = 'active' ORDER BY id ASC");
        $sources = $stmt->fetchAll();
        if (!$sources) {
            newsletter_discover_sources();
            $stmt = db()->query("SELECT id, name, url, source_type, method, status FROM newsletter_sources WHERE status = 'active' ORDER BY id ASC");
            $sources = $stmt->fetchAll();
        }
    } catch (Throwable $error) {
        error_log('RTBO newsletter scraper using file fallback: ' . $error->getMessage());
        return newsletter_file_run_scraper();
    }

    $collected = 0;
    $errors = [];

    foreach ($sources as $source) {
        if (($source['method'] ?? '') === 'manual') {
            continue;
        }

        try {
            $content = newsletter_fetch_url((string) $source['url']);
            $items = ($source['method'] ?? 'rss') === 'html'
                ? newsletter_parse_html_items($content, $source)
                : newsletter_parse_rss_items($content, $source);

            foreach ($items as $item) {
                if (newsletter_upsert_article($source, $item)) {
                    $collected++;
                }
            }

            $update = db()->prepare("UPDATE newsletter_sources SET last_scan_at = NOW(), last_error = NULL, compliance_status = 'Robots / Terms Review Required' WHERE id = ?");
            $update->execute([(int) $source['id']]);
        } catch (Throwable $error) {
            $errors[] = "{$source['name']}: {$error->getMessage()}";
            $update = db()->prepare("UPDATE newsletter_sources SET last_scan_at = NOW(), last_error = ? WHERE id = ?");
            $update->execute([$error->getMessage(), (int) $source['id']]);
        }
    }

    return ['collected' => $collected, 'sources_checked' => count($sources), 'errors' => $errors];
}

function newsletter_file_run_scraper(): array
{
    $data = newsletter_file_load();
    $sources = array_values(array_filter($data['sources'], static fn(array $source): bool => ($source['status'] ?? '') === 'active'));
    if (!$sources) {
        newsletter_file_discover_sources();
        $data = newsletter_file_load();
        $sources = array_values(array_filter($data['sources'], static fn(array $source): bool => ($source['status'] ?? '') === 'active'));
    }
    $collected = 0;
    $errors = [];

    foreach ($sources as $sourceIndex => $source) {
        if (($source['method'] ?? '') === 'manual') {
            continue;
        }

        try {
            $content = newsletter_fetch_url((string) $source['url']);
            $items = ($source['method'] ?? 'rss') === 'html'
                ? newsletter_parse_html_items($content, $source)
                : newsletter_parse_rss_items($content, $source);

            foreach ($items as $item) {
                if (newsletter_file_upsert_article($data, $source, $item)) {
                    $collected++;
                }
            }

            foreach ($data['sources'] as &$existingSource) {
                if ((int) ($existingSource['id'] ?? 0) === (int) ($source['id'] ?? 0)) {
                    $existingSource['last_scan_at'] = date('c');
                    $existingSource['last_error'] = null;
                    $existingSource['compliance_status'] = 'Robots / Terms Review Required';
                    $existingSource['updated_at'] = date('c');
                    break;
                }
            }
        } catch (Throwable $error) {
            $errors[] = "{$source['name']}: {$error->getMessage()}";
            foreach ($data['sources'] as &$existingSource) {
                if ((int) ($existingSource['id'] ?? 0) === (int) ($source['id'] ?? 0)) {
                    $existingSource['last_scan_at'] = date('c');
                    $existingSource['last_error'] = $error->getMessage();
                    $existingSource['updated_at'] = date('c');
                    break;
                }
            }
        }
    }

    newsletter_file_save($data);

    return ['collected' => $collected, 'sources_checked' => count($sources), 'errors' => $errors];
}

function newsletter_update_article_status(int $articleId, string $status): array
{
    $status = strtolower(trim($status));
    if (!in_array($status, ['review', 'approved', 'rejected'], true)) {
        throw new InvalidArgumentException('Article status must be review, approved, or rejected.');
    }

    try {
        ensure_newsletter_tables();
        $stmt = db()->prepare("UPDATE newsletter_articles SET status = ?, approved_at = IF(? = 'approved', NOW(), approved_at) WHERE id = ?");
        $stmt->execute([$status, $status, $articleId]);
        $stmt = db()->prepare(
            "SELECT id, source_id, source_name, source_url, source_link, title, summary, category, status, quality_score, published_at, collected_at, approved_at
             FROM newsletter_articles WHERE id = ?"
        );
        $stmt->execute([$articleId]);
        $article = $stmt->fetch();
        if (!$article) {
            throw new RuntimeException('Article was not found.');
        }

        return $article;
    } catch (Throwable $error) {
        error_log('RTBO newsletter article status using file fallback: ' . $error->getMessage());
        return newsletter_file_update_article_status($articleId, $status);
    }
}

function newsletter_file_update_article_status(int $articleId, string $status): array
{
    $data = newsletter_file_load();
    foreach ($data['articles'] as &$article) {
        if ((int) ($article['id'] ?? 0) === $articleId) {
            $article['status'] = $status;
            if ($status === 'approved') {
                $article['approved_at'] = date('c');
            }
            newsletter_file_save($data);
            return $article;
        }
    }

    throw new RuntimeException('Article was not found.');
}

function newsletter_issue_sections_from_articles(array $articles): array
{
    return array_map(static fn(array $article): array => [
        'section' => (string) ($article['category'] ?? 'Officiating News'),
        'headline' => (string) ($article['title'] ?? ''),
        'text' => (string) ($article['summary'] ?? ''),
        'source' => (string) ($article['source_name'] ?? ''),
        'link' => (string) ($article['source_link'] ?? ''),
    ], $articles);
}

function newsletter_create_issue(array $input, ?array $user = null): array
{
    $title = trim((string) ($input['title'] ?? 'Weekly Whistle'));
    $subtitle = trim((string) ($input['subtitle'] ?? 'Basketball officiating news, rules, training, and development.'));
    $issueDate = trim((string) ($input['issue_date'] ?? date('Y-m-d')));
    $coverHeadline = trim((string) ($input['cover_headline'] ?? 'The Weekly Whistle'));
    $introText = trim((string) ($input['intro_text'] ?? 'A clean weekly briefing for officials, observers, assignors, and basketball leaders.'));

    if ($title === '') {
        throw new InvalidArgumentException('Issue title is required.');
    }
    if (!strtotime($issueDate)) {
        throw new InvalidArgumentException('A valid issue date is required.');
    }

    try {
        ensure_newsletter_tables();
        $articleIds = array_values(array_filter(array_map('intval', (array) ($input['article_ids'] ?? []))));
        if ($articleIds) {
            $placeholders = implode(',', array_fill(0, count($articleIds), '?'));
            $stmt = db()->prepare(
                "SELECT id, source_name, source_link, title, summary, category
                 FROM newsletter_articles
                 WHERE status = 'approved' AND id IN ({$placeholders})
                 ORDER BY approved_at DESC, collected_at DESC"
            );
            $stmt->execute($articleIds);
        } else {
            $stmt = db()->prepare(
                "SELECT id, source_name, source_link, title, summary, category
                 FROM newsletter_articles
                 WHERE status = 'approved'
                 ORDER BY approved_at DESC, collected_at DESC
                 LIMIT 8"
            );
            $stmt->execute();
        }

        $articles = $stmt->fetchAll();
        if (!$articles) {
            throw new RuntimeException('Approve at least one collected article before creating a newsletter issue.');
        }

        $sections = newsletter_issue_sections_from_articles($articles);
        $stmt = db()->prepare(
            "INSERT INTO newsletter_issues(title, subtitle, issue_date, status, cover_headline, intro_text, sections_json, created_by)
             VALUES (?, ?, ?, 'ready', ?, ?, ?, ?)"
        );
        $stmt->execute([
            $title,
            $subtitle,
            date('Y-m-d', strtotime($issueDate)),
            $coverHeadline,
            $introText,
            json_encode($sections, JSON_UNESCAPED_SLASHES),
            isset($user['id']) ? (int) $user['id'] : null,
        ]);

        return newsletter_get_issue((int) db()->lastInsertId());
    } catch (Throwable $error) {
        error_log('RTBO newsletter issue using file fallback: ' . $error->getMessage());
        return newsletter_file_create_issue([
            'title' => $title,
            'subtitle' => $subtitle,
            'issue_date' => $issueDate,
            'cover_headline' => $coverHeadline,
            'intro_text' => $introText,
            'article_ids' => (array) ($input['article_ids'] ?? []),
        ], $user);
    }
}

function newsletter_file_create_issue(array $input, ?array $user = null): array
{
    $data = newsletter_file_load();
    $articleIds = array_values(array_filter(array_map('intval', (array) ($input['article_ids'] ?? []))));
    $articles = array_values(array_filter($data['articles'], static function (array $article) use ($articleIds): bool {
        if (($article['status'] ?? '') !== 'approved') {
            return false;
        }
        return !$articleIds || in_array((int) ($article['id'] ?? 0), $articleIds, true);
    }));
    usort($articles, static fn(array $a, array $b): int => strcmp((string) ($b['approved_at'] ?? $b['collected_at'] ?? ''), (string) ($a['approved_at'] ?? $a['collected_at'] ?? '')));
    $articles = array_slice($articles, 0, 8);

    if (!$articles) {
        throw new RuntimeException('Approve at least one collected article before creating a newsletter issue.');
    }

    $id = (int) $data['next_ids']['issues'];
    $data['next_ids']['issues'] = $id + 1;
    $record = [
        'id' => $id,
        'title' => (string) ($input['title'] ?? 'Weekly Whistle'),
        'subtitle' => (string) ($input['subtitle'] ?? ''),
        'issue_date' => date('Y-m-d', strtotime((string) ($input['issue_date'] ?? date('Y-m-d')))),
        'status' => 'ready',
        'cover_headline' => (string) ($input['cover_headline'] ?? ''),
        'intro_text' => (string) ($input['intro_text'] ?? ''),
        'sections' => newsletter_issue_sections_from_articles($articles),
        'created_by' => isset($user['id']) ? (int) $user['id'] : null,
        'sent_count' => 0,
        'failed_count' => 0,
        'created_at' => date('c'),
        'updated_at' => date('c'),
        'sent_at' => null,
    ];
    array_unshift($data['issues'], $record);
    newsletter_file_save($data);

    return $record;
}

function newsletter_get_issue(int $issueId): array
{
    try {
        ensure_newsletter_tables();
        $stmt = db()->prepare(
            "SELECT id, title, subtitle, issue_date, status, cover_headline, intro_text, sections_json, sent_count, failed_count, created_at, updated_at, sent_at
             FROM newsletter_issues
             WHERE id = ?"
        );
        $stmt->execute([$issueId]);
        $issue = $stmt->fetch();
        if (!$issue) {
            throw new RuntimeException('Newsletter issue was not found.');
        }

        return newsletter_decode_issue($issue);
    } catch (Throwable $error) {
        $data = newsletter_file_load();
        foreach ($data['issues'] as $issue) {
            if ((int) ($issue['id'] ?? 0) === $issueId) {
                return $issue;
            }
        }
        throw new RuntimeException('Newsletter issue was not found.');
    }
}

function build_magazine_newsletter_html(array $issue): string
{
    $sections = is_array($issue['sections'] ?? null) ? $issue['sections'] : [];
    $sectionHtml = '';
    foreach ($sections as $section) {
        $sectionHtml .= '<tr><td style="padding:22px 28px;border-bottom:1px solid #fed7aa;">'
            . '<p style="margin:0 0 8px;color:#7f0d16;font-size:12px;font-weight:900;text-transform:uppercase;letter-spacing:.12em;">' . e((string) ($section['section'] ?? 'Officiating News')) . '</p>'
            . '<h2 style="margin:0 0 10px;color:#111827;font-size:24px;line-height:1.14;">' . e((string) ($section['headline'] ?? '')) . '</h2>'
            . '<p style="margin:0 0 12px;color:#1f2937;font-size:15px;line-height:1.65;">' . e((string) ($section['text'] ?? '')) . '</p>'
            . (((string) ($section['link'] ?? '')) !== '' ? '<a href="' . e((string) $section['link']) . '" style="color:#6f0b13;font-weight:900;text-decoration:none;">Read at source</a>' : '')
            . '</td></tr>';
    }

    return '<!doctype html><html><body style="margin:0;padding:0;background:#f5f5f4;font-family:Arial,Helvetica,sans-serif;">'
        . '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f5f5f4;padding:26px 12px;"><tr><td align="center">'
        . '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:760px;background:#ffffff;border:1px solid #fed7aa;border-radius:8px;overflow:hidden;">'
        . '<tr><td style="padding:28px;background:#050505;border-bottom:8px solid #c1121f;">'
        . '<img src="' . e(RTBO_BASE_URL) . '/assets/images/logo.png" alt="Raising The Bar Officiating" style="width:112px;height:auto;display:block;margin:0 0 18px;">'
        . '<p style="margin:0 0 10px;color:#c1121f;font-size:12px;font-weight:900;text-transform:uppercase;letter-spacing:.22em;">Raising The Bar Officiating Magazine</p>'
        . '<h1 style="margin:0;color:#ffffff;font-size:38px;line-height:1.05;">' . e((string) ($issue['title'] ?? 'Weekly Whistle')) . '</h1>'
        . '<p style="margin:12px 0 0;color:#e5e7eb;font-size:16px;line-height:1.5;">' . e((string) ($issue['subtitle'] ?? '')) . '</p>'
        . '</td></tr>'
        . '<tr><td style="padding:28px;background:#fff7ed;">'
        . '<p style="margin:0 0 8px;color:#6f0b13;font-weight:900;text-transform:uppercase;">Cover Story</p>'
        . '<h2 style="margin:0 0 12px;color:#111827;font-size:30px;line-height:1.1;">' . e((string) ($issue['cover_headline'] ?? '')) . '</h2>'
        . '<p style="margin:0;color:#1f2937;font-size:16px;line-height:1.65;">' . e((string) ($issue['intro_text'] ?? '')) . '</p>'
        . '</td></tr>'
        . $sectionHtml
        . '<tr><td style="padding:22px 28px;background:#050505;color:#f8fafc;font-size:14px;line-height:1.6;">We Will Serve, And Will Be Of Service To The Game.<br>Questions? Contact <a href="mailto:' . e(RTBO_ADMIN_EMAIL) . '" style="color:#c1121f;">' . e(RTBO_ADMIN_EMAIL) . '</a>.</td></tr>'
        . '</table></td></tr></table></body></html>';
}

function newsletter_issue_text(array $issue): string
{
    $lines = [
        (string) ($issue['title'] ?? 'Weekly Whistle'),
        (string) ($issue['subtitle'] ?? ''),
        '',
        (string) ($issue['cover_headline'] ?? ''),
        (string) ($issue['intro_text'] ?? ''),
        '',
    ];
    foreach ((array) ($issue['sections'] ?? []) as $section) {
        $lines[] = strtoupper((string) ($section['section'] ?? 'Officiating News'));
        $lines[] = (string) ($section['headline'] ?? '');
        $lines[] = (string) ($section['text'] ?? '');
        $lines[] = (string) ($section['link'] ?? '');
        $lines[] = '';
    }
    $lines[] = 'We Will Serve, And Will Be Of Service To The Game.';

    return trim(implode("\n", $lines));
}

function newsletter_send_issue(int $issueId, ?array $user = null): array
{
    try {
        ensure_newsletter_tables();
        $issue = newsletter_get_issue($issueId);
        $html = build_magazine_newsletter_html($issue);
        $text = newsletter_issue_text($issue);
        $subject = (string) ($issue['title'] ?? 'Weekly Whistle');
        $subscribers = db()->query("SELECT email FROM newsletter_subscribers WHERE status = 'active' ORDER BY email")->fetchAll();
        $sent = 0;
        $failed = 0;

        foreach (array_chunk($subscribers, 40) as $batch) {
            $bcc = array_column($batch, 'email');
            if (!$bcc) {
                continue;
            }

            $boundary = 'rtbo_weekly_' . bin2hex(random_bytes(10));
            $headers = [
                'From: ' . RTBO_COMPANY_NAME . ' <' . RTBO_FROM_EMAIL . '>',
                'Reply-To: ' . RTBO_ADMIN_EMAIL,
                'Bcc: ' . implode(', ', $bcc),
                'MIME-Version: 1.0',
                'Content-Type: multipart/alternative; boundary="' . $boundary . '"',
            ];

            $body = "--{$boundary}\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\n{$text}\r\n\r\n";
            $body .= "--{$boundary}\r\nContent-Type: text/html; charset=UTF-8\r\n\r\n{$html}\r\n\r\n--{$boundary}--";

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
        $stmt->execute([
            $subject,
            (string) ($issue['subtitle'] ?? ''),
            $html,
            $text,
            isset($user['id']) ? (int) $user['id'] : null,
            $sent,
            $failed,
        ]);

        $stmt = db()->prepare("UPDATE newsletter_issues SET status = 'sent', sent_count = ?, failed_count = ?, sent_at = NOW() WHERE id = ?");
        $stmt->execute([$sent, $failed, $issueId]);

        return ['sent' => $sent, 'failed' => $failed, 'issue' => newsletter_get_issue($issueId)];
    } catch (Throwable $error) {
        error_log('RTBO newsletter send issue using file fallback: ' . $error->getMessage());
        return newsletter_file_send_issue($issueId, $user);
    }
}

function newsletter_file_send_issue(int $issueId, ?array $user = null): array
{
    $data = newsletter_file_load();
    $issueIndex = null;
    foreach ($data['issues'] as $index => $issue) {
        if ((int) ($issue['id'] ?? 0) === $issueId) {
            $issueIndex = $index;
            break;
        }
    }
    if ($issueIndex === null) {
        throw new RuntimeException('Newsletter issue was not found.');
    }

    $issue = $data['issues'][$issueIndex];
    $html = build_magazine_newsletter_html($issue);
    $text = newsletter_issue_text($issue);
    $subject = (string) ($issue['title'] ?? 'Weekly Whistle');
    $subscribers = array_values(array_filter($data['subscribers'], static fn(array $subscriber): bool => ($subscriber['status'] ?? '') === 'active'));
    $sent = 0;
    $failed = 0;

    foreach (array_chunk($subscribers, 40) as $batch) {
        $bcc = array_column($batch, 'email');
        if (!$bcc) {
            continue;
        }

        $boundary = 'rtbo_weekly_' . bin2hex(random_bytes(10));
        $headers = [
            'From: ' . RTBO_COMPANY_NAME . ' <' . RTBO_FROM_EMAIL . '>',
            'Reply-To: ' . RTBO_ADMIN_EMAIL,
            'Bcc: ' . implode(', ', $bcc),
            'MIME-Version: 1.0',
            'Content-Type: multipart/alternative; boundary="' . $boundary . '"',
        ];

        $body = "--{$boundary}\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\n{$text}\r\n\r\n";
        $body .= "--{$boundary}\r\nContent-Type: text/html; charset=UTF-8\r\n\r\n{$html}\r\n\r\n--{$boundary}--";

        if (rtbo_send_mail(RTBO_ADMIN_EMAIL, $subject, $body, $headers)) {
            $sent += count($bcc);
        } else {
            $failed += count($bcc);
        }
    }

    $data['issues'][$issueIndex]['status'] = 'sent';
    $data['issues'][$issueIndex]['sent_count'] = $sent;
    $data['issues'][$issueIndex]['failed_count'] = $failed;
    $data['issues'][$issueIndex]['sent_at'] = date('c');
    $campaignId = (int) $data['next_ids']['campaigns'];
    $data['next_ids']['campaigns'] = $campaignId + 1;
    array_unshift($data['campaigns'], [
        'id' => $campaignId,
        'subject' => $subject,
        'preheader' => (string) ($issue['subtitle'] ?? ''),
        'sent_count' => $sent,
        'failed_count' => $failed,
        'created_by' => isset($user['id']) ? (int) $user['id'] : null,
        'created_at' => date('c'),
        'sent_at' => date('c'),
    ]);
    newsletter_file_save($data);

    return ['sent' => $sent, 'failed' => $failed, 'issue' => $data['issues'][$issueIndex]];
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
        . '<p style="margin:0 0 8px;color:#6f0b13;font-size:12px;font-weight:bold;letter-spacing:.12em;text-transform:uppercase;">Raising The Bar Officiating</p>'
        . '<h1 style="margin:0 0 18px;color:#111827;font-size:30px;line-height:1.1;text-transform:uppercase;">' . e($subject) . '</h1>'
        . $body
        . '<p style="margin:24px 0 0;color:#475569;font-size:14px;line-height:1.6;">We Will Serve, And Will Be Of Service To The Game.</p>'
        . '</td></tr>'
        . '<tr><td style="padding:18px 30px;background:#fff7ed;color:#475569;font-size:13px;line-height:1.5;">You are receiving this because you subscribed to RTBO updates. Questions? Contact <a href="mailto:' . e(RTBO_ADMIN_EMAIL) . '" style="color:#6f0b13;">' . e(RTBO_ADMIN_EMAIL) . '</a>.</td></tr>'
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

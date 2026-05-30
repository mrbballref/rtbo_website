<?php
declare(strict_types=1);

require_once __DIR__ . '/feature-store.php';

const RTBO_SITE_CONTENT_STORE_TABLE = 'site_content_store';

function rtbo_site_content_path(): string
{
    ensure_dir(STORAGE_DIR);

    return STORAGE_DIR . '/site-content.json';
}

function rtbo_site_content_empty(): array
{
    return [
        'records' => [],
        'audit' => [],
        'updated_at' => null,
    ];
}

function rtbo_site_content_load(): array
{
    $data = rtbo_feature_store_load(RTBO_SITE_CONTENT_STORE_TABLE);
    if (!is_array($data)) {
        $data = rtbo_site_content_load_file();
        rtbo_site_content_save_data($data);
    }

    $empty = rtbo_site_content_empty();
    $data['records'] = is_array($data['records'] ?? null) ? $data['records'] : $empty['records'];
    $data['audit'] = is_array($data['audit'] ?? null) ? $data['audit'] : $empty['audit'];
    $data['updated_at'] = $data['updated_at'] ?? null;

    return $data;
}

function rtbo_site_content_load_file(): array
{
    $path = rtbo_site_content_path();
    if (!is_file($path)) {
        return rtbo_site_content_empty();
    }

    $data = json_decode((string) file_get_contents($path), true);
    if (!is_array($data)) {
        return rtbo_site_content_empty();
    }

    $empty = rtbo_site_content_empty();
    $data['records'] = is_array($data['records'] ?? null) ? $data['records'] : $empty['records'];
    $data['audit'] = is_array($data['audit'] ?? null) ? $data['audit'] : $empty['audit'];
    $data['updated_at'] = $data['updated_at'] ?? null;

    return $data;
}

function rtbo_site_content_save_data(array $data): void
{
    rtbo_feature_store_save(RTBO_SITE_CONTENT_STORE_TABLE, $data);
}

function rtbo_site_content_text(mixed $value, int $maxLength = 1000): string
{
    $text = trim(strip_tags((string) $value));
    if ($maxLength > 0 && strlen($text) > $maxLength) {
        return substr($text, 0, $maxLength);
    }

    return $text;
}

function rtbo_site_content_slug(mixed $value, string $fallback = 'managed-page'): string
{
    $slug = strtolower(rtbo_site_content_text($value, 90));
    if ($slug === '') {
        $slug = $fallback;
    }

    $slug = preg_replace('/[^a-z0-9]+/', '-', $slug) ?: '';
    $slug = trim($slug, '-');

    return substr($slug !== '' ? $slug : $fallback, 0, 90);
}

function rtbo_site_content_asset(mixed $value): string
{
    $asset = trim((string) $value);
    if (strlen($asset) > 2200000) {
        $asset = substr($asset, 0, 2200000);
    }

    return $asset;
}

function rtbo_site_content_kind(mixed $value): string
{
    $kind = rtbo_site_content_slug($value, 'section');

    return in_array($kind, ['page', 'section', 'feature', 'card', 'image'], true) ? $kind : 'section';
}

function rtbo_site_content_template(mixed $value): string
{
    $template = rtbo_site_content_slug($value, 'section');

    return in_array($template, ['section', 'band', 'feature-grid', 'card-grid', 'media-split', 'image-feature', 'profile-grid'], true) ? $template : 'section';
}

function rtbo_site_content_status(mixed $value): string
{
    $status = rtbo_site_content_slug($value, 'active');

    return in_array($status, ['active', 'draft', 'hidden'], true) ? $status : 'active';
}

function rtbo_site_content_card(array $card, int $index = 0): array
{
    return [
        'id' => rtbo_site_content_slug($card['id'] ?? ($card['title'] ?? 'card-' . $index), 'card-' . $index),
        'title' => rtbo_site_content_text($card['title'] ?? ('Card ' . ($index + 1)), 180),
        'body' => rtbo_site_content_text($card['body'] ?? '', 900),
        'image' => rtbo_site_content_asset($card['image'] ?? ''),
        'image_alt' => rtbo_site_content_text($card['image_alt'] ?? ($card['title'] ?? ''), 180),
        'cta_label' => rtbo_site_content_text($card['cta_label'] ?? '', 80),
        'cta_target' => rtbo_site_content_text($card['cta_target'] ?? '', 500),
    ];
}

function rtbo_site_content_cards(mixed $cards): array
{
    if (!is_array($cards)) {
        return [];
    }

    $normalized = [];
    foreach ($cards as $index => $card) {
        if (!is_array($card)) {
            continue;
        }
        $normalized[] = rtbo_site_content_card($card, (int) $index);
    }

    return array_values(array_filter($normalized, static fn(array $card): bool => ($card['title'] ?? '') !== ''));
}

function rtbo_site_content_record(array $record, int $index = 0): array
{
    $kind = rtbo_site_content_kind($record['kind'] ?? 'section');
    $title = rtbo_site_content_text($record['title'] ?? '', 180);
    if ($title === '') {
        throw new RuntimeException('A title is required for every website content item.');
    }

    $page = rtbo_site_content_slug($record['page'] ?? ($kind === 'page' ? $title : 'home'), 'home');
    $id = rtbo_site_content_slug($record['id'] ?? ($page . '-' . $kind . '-' . $title), $page . '-' . $kind . '-' . $index);

    return [
        'id' => $id,
        'kind' => $kind,
        'page' => $page,
        'nav_label' => rtbo_site_content_text($record['nav_label'] ?? '', 80),
        'template' => rtbo_site_content_template($record['template'] ?? ($kind === 'image' ? 'image-feature' : 'section')),
        'status' => rtbo_site_content_status($record['status'] ?? 'active'),
        'order' => (int) ($record['order'] ?? (($index + 1) * 10)),
        'eyebrow' => rtbo_site_content_text($record['eyebrow'] ?? '', 120),
        'title' => $title,
        'body' => rtbo_site_content_text($record['body'] ?? '', 2000),
        'image' => rtbo_site_content_asset($record['image'] ?? ''),
        'image_alt' => rtbo_site_content_text($record['image_alt'] ?? $title, 180),
        'cta_label' => rtbo_site_content_text($record['cta_label'] ?? '', 80),
        'cta_target' => rtbo_site_content_text($record['cta_target'] ?? '', 500),
        'cards' => rtbo_site_content_cards($record['cards'] ?? []),
        'updated_at' => gmdate('c'),
    ];
}

function rtbo_site_content_records_normalized(array $records): array
{
    $normalized = [];
    $seen = [];

    foreach ($records as $index => $record) {
        if (!is_array($record)) {
            continue;
        }

        $item = rtbo_site_content_record($record, (int) $index);
        if (isset($seen[$item['id']])) {
            continue;
        }

        $seen[$item['id']] = true;
        $normalized[] = $item;
    }

    usort($normalized, static fn(array $a, array $b): int => ((int) ($a['order'] ?? 0)) <=> ((int) ($b['order'] ?? 0)));

    return $normalized;
}

function rtbo_site_content_records(bool $publicOnly = false): array
{
    $records = rtbo_site_content_records_normalized(rtbo_site_content_load()['records']);
    if (!$publicOnly) {
        return $records;
    }

    return array_values(array_filter(
        $records,
        static fn(array $record): bool => ($record['status'] ?? 'active') === 'active'
    ));
}

function rtbo_site_content_audit(?array $user, string $action, array $details = []): array
{
    return [
        'actor_id' => isset($user['id']) ? (int) $user['id'] : null,
        'actor_email' => (string) ($user['email'] ?? ''),
        'action' => $action,
        'details' => $details,
        'created_at' => gmdate('c'),
    ];
}

function rtbo_site_content_replace(array $records, ?array $user = null): array
{
    $savedRecords = rtbo_site_content_records_normalized($records);
    $data = rtbo_site_content_load();
    $data['records'] = $savedRecords;
    $data['updated_at'] = gmdate('c');
    $data['audit'][] = rtbo_site_content_audit($user, 'replace', ['count' => count($savedRecords)]);
    rtbo_site_content_save_data($data);

    return $savedRecords;
}

function rtbo_site_content_save_record(array $record, ?array $user = null): array
{
    $data = rtbo_site_content_load();
    $records = rtbo_site_content_records_normalized($data['records']);
    $saved = rtbo_site_content_record($record, count($records));
    $updated = false;

    foreach ($records as &$existing) {
        if (($existing['id'] ?? '') !== $saved['id']) {
            continue;
        }
        $existing = $saved;
        $updated = true;
        break;
    }
    unset($existing);

    if (!$updated) {
        array_unshift($records, $saved);
    }

    $data['records'] = rtbo_site_content_records_normalized($records);
    $data['updated_at'] = gmdate('c');
    $data['audit'][] = rtbo_site_content_audit($user, $updated ? 'update' : 'create', ['id' => $saved['id']]);
    rtbo_site_content_save_data($data);

    return $saved;
}

function rtbo_site_content_delete_record(string $id, ?array $user = null): array
{
    $id = rtbo_site_content_slug($id, '');
    if ($id === '') {
        throw new RuntimeException('A valid website content ID is required.');
    }

    $data = rtbo_site_content_load();
    $records = rtbo_site_content_records_normalized($data['records']);
    $deleted = null;
    $records = array_values(array_filter($records, static function (array $record) use ($id, &$deleted): bool {
        if (($record['id'] ?? '') === $id) {
            $deleted = $record;
            return false;
        }

        return true;
    }));

    if (!$deleted) {
        throw new RuntimeException('The website content item could not be found.');
    }

    $data['records'] = $records;
    $data['updated_at'] = gmdate('c');
    $data['audit'][] = rtbo_site_content_audit($user, 'delete', ['id' => $id, 'title' => $deleted['title'] ?? '']);
    rtbo_site_content_save_data($data);

    return $deleted;
}

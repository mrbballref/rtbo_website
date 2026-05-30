<?php
declare(strict_types=1);

require_once __DIR__ . '/feature-store.php';

const RTBO_CLIENT_SPOTLIGHT_STORE_TABLE = 'client_spotlight_store';

function rtbo_client_spotlight_path(): string
{
    ensure_dir(STORAGE_DIR);

    return STORAGE_DIR . '/client-spotlight.json';
}

function rtbo_client_spotlight_default_show(): array
{
    return [
        'name' => 'Client Spotlight',
        'shortName' => 'RTBO Spotlight',
        'tagline' => 'Real conversations from the RTBO training schools and events.',
        'brandLine' => 'Raising The Bar Officiating',
        'mission' => 'A production library for coach conversations, player interviews, official development stories, school highlights, and promotional films connected to Raising The Bar Officiating.',
        'logo' => '/assets/images/logo.png',
        'logoCard' => '/assets/images/3d_rtbo_livestream_icon.jpg',
        'logoMark' => '/assets/images/logo.png',
    ];
}

function rtbo_client_spotlight_empty_data(): array
{
    return [
        'show' => rtbo_client_spotlight_default_show(),
        'videos' => [],
        'audit' => [],
        'updated_at' => null,
    ];
}

function rtbo_client_spotlight_text(mixed $value, int $maxLength = 2000): string
{
    $text = trim(strip_tags((string) $value));
    if ($maxLength > 0 && strlen($text) > $maxLength) {
        return substr($text, 0, $maxLength);
    }

    return $text;
}

function rtbo_client_spotlight_slug(mixed $value, string $fallback = 'client-spotlight-video'): string
{
    $slug = strtolower(rtbo_client_spotlight_text($value, 120));
    $slug = preg_replace('/[^a-z0-9]+/', '-', $slug) ?: '';
    $slug = trim($slug, '-');

    return substr($slug !== '' ? $slug : $fallback, 0, 90);
}

function rtbo_client_spotlight_url(mixed $value): string
{
    $url = trim((string) $value);
    if (strlen($url) > 1200) {
        return substr($url, 0, 1200);
    }

    return $url;
}

function rtbo_client_spotlight_status(mixed $value): string
{
    $status = rtbo_client_spotlight_slug($value, 'draft');
    if (in_array($status, ['published', 'active'], true)) {
        return 'published';
    }
    if (in_array($status, ['hidden', 'archived'], true)) {
        return 'hidden';
    }

    return 'draft';
}

function rtbo_client_spotlight_show(array $show): array
{
    $base = rtbo_client_spotlight_default_show();

    return [
        'name' => rtbo_client_spotlight_text($show['name'] ?? $base['name'], 160) ?: $base['name'],
        'shortName' => rtbo_client_spotlight_text($show['shortName'] ?? $base['shortName'], 80) ?: $base['shortName'],
        'tagline' => rtbo_client_spotlight_text($show['tagline'] ?? $base['tagline'], 220) ?: $base['tagline'],
        'brandLine' => rtbo_client_spotlight_text($show['brandLine'] ?? $base['brandLine'], 180),
        'mission' => rtbo_client_spotlight_text($show['mission'] ?? $base['mission'], 900) ?: $base['mission'],
        'logo' => rtbo_client_spotlight_url($show['logo'] ?? $base['logo']) ?: $base['logo'],
        'logoCard' => rtbo_client_spotlight_url($show['logoCard'] ?? $base['logoCard']) ?: $base['logoCard'],
        'logoMark' => rtbo_client_spotlight_url($show['logoMark'] ?? $base['logoMark']) ?: $base['logoMark'],
    ];
}

function rtbo_client_spotlight_video(array $video, int $index = 0): array
{
    $title = rtbo_client_spotlight_text($video['title'] ?? '', 220);
    if ($title === '') {
        throw new RuntimeException('A title is required for each Client Spotlight video.');
    }

    $status = rtbo_client_spotlight_status($video['status'] ?? 'draft');
    $videoUrl = rtbo_client_spotlight_url($video['videoUrl'] ?? ($video['video_url'] ?? ''));
    if ($status === 'published' && $videoUrl === '') {
        throw new RuntimeException('A real video URL is required before publishing a Client Spotlight video.');
    }

    $id = rtbo_client_spotlight_slug($video['id'] ?? ($video['slug'] ?? $title), 'spotlight-video-' . ($index + 1));

    return [
        'id' => $id,
        'slug' => rtbo_client_spotlight_slug($video['slug'] ?? $id, $id),
        'title' => $title,
        'subtitle' => rtbo_client_spotlight_text($video['subtitle'] ?? '', 240),
        'description' => rtbo_client_spotlight_text($video['description'] ?? ($video['summary'] ?? ''), 1600),
        'status' => $status,
        'category' => rtbo_client_spotlight_text($video['category'] ?? 'Training School Conversation', 140),
        'featuredPerson' => rtbo_client_spotlight_text($video['featuredPerson'] ?? ($video['featured_person'] ?? ($video['person'] ?? '')), 180),
        'role' => rtbo_client_spotlight_text($video['role'] ?? '', 160),
        'affiliation' => rtbo_client_spotlight_text($video['affiliation'] ?? ($video['organization'] ?? ''), 180),
        'eventName' => rtbo_client_spotlight_text($video['eventName'] ?? ($video['event_name'] ?? ''), 180),
        'eventDate' => rtbo_client_spotlight_text($video['eventDate'] ?? ($video['event_date'] ?? ''), 80),
        'publishedAt' => rtbo_client_spotlight_text($video['publishedAt'] ?? ($video['published_at'] ?? ($video['date'] ?? '')), 80),
        'runtime' => rtbo_client_spotlight_text($video['runtime'] ?? '', 80),
        'videoUrl' => $videoUrl,
        'posterUrl' => rtbo_client_spotlight_url($video['posterUrl'] ?? ($video['poster_url'] ?? '')),
        'transcript' => rtbo_client_spotlight_text($video['transcript'] ?? '', 5000),
        'updatedAt' => rtbo_client_spotlight_text($video['updatedAt'] ?? ($video['updated_at'] ?? ''), 80),
    ];
}

function rtbo_client_spotlight_videos(array $videos): array
{
    $normalized = [];
    $seen = [];

    foreach ($videos as $index => $video) {
        if (!is_array($video)) {
            continue;
        }
        $item = rtbo_client_spotlight_video($video, (int) $index);
        if (isset($seen[$item['id']])) {
            continue;
        }
        $seen[$item['id']] = true;
        $normalized[] = $item;
    }

    return $normalized;
}

function rtbo_client_spotlight_load(): array
{
    $data = rtbo_feature_store_load(RTBO_CLIENT_SPOTLIGHT_STORE_TABLE);
    if (!is_array($data)) {
        $data = rtbo_client_spotlight_load_file();
        rtbo_client_spotlight_save_data($data);
    }

    $empty = rtbo_client_spotlight_empty_data();
    $data['show'] = rtbo_client_spotlight_show(is_array($data['show'] ?? null) ? $data['show'] : []);
    $data['videos'] = rtbo_client_spotlight_videos(is_array($data['videos'] ?? null) ? $data['videos'] : []);
    $data['audit'] = is_array($data['audit'] ?? null) ? $data['audit'] : $empty['audit'];
    $data['updated_at'] = $data['updated_at'] ?? null;

    return $data;
}

function rtbo_client_spotlight_load_file(): array
{
    $path = rtbo_client_spotlight_path();
    if (!is_file($path)) {
        return rtbo_client_spotlight_empty_data();
    }

    $data = json_decode((string) file_get_contents($path), true);
    if (!is_array($data)) {
        return rtbo_client_spotlight_empty_data();
    }

    $empty = rtbo_client_spotlight_empty_data();
    $data['show'] = rtbo_client_spotlight_show(is_array($data['show'] ?? null) ? $data['show'] : []);
    $data['videos'] = rtbo_client_spotlight_videos(is_array($data['videos'] ?? null) ? $data['videos'] : []);
    $data['audit'] = is_array($data['audit'] ?? null) ? $data['audit'] : $empty['audit'];
    $data['updated_at'] = $data['updated_at'] ?? null;

    return $data;
}

function rtbo_client_spotlight_save_data(array $data): void
{
    rtbo_feature_store_save(RTBO_CLIENT_SPOTLIGHT_STORE_TABLE, $data);
}

function rtbo_client_spotlight_public_videos(array $videos): array
{
    return array_values(array_filter(
        rtbo_client_spotlight_videos($videos),
        static fn(array $video): bool => ($video['status'] ?? '') === 'published' && ($video['videoUrl'] ?? '') !== ''
    ));
}

function rtbo_client_spotlight_audit(?array $user, string $action, array $details = []): array
{
    return [
        'actor_id' => isset($user['id']) ? (int) $user['id'] : null,
        'actor_email' => (string) ($user['email'] ?? ''),
        'action' => $action,
        'details' => $details,
        'created_at' => gmdate('c'),
    ];
}

function rtbo_client_spotlight_save_show(array $show, ?array $user = null): array
{
    $data = rtbo_client_spotlight_load();
    $saved = rtbo_client_spotlight_show($show);
    $data['show'] = $saved;
    $data['updated_at'] = gmdate('c');
    $data['audit'][] = rtbo_client_spotlight_audit($user, 'save_show');
    rtbo_client_spotlight_save_data($data);

    return $saved;
}

function rtbo_client_spotlight_save_video(array $video, ?array $user = null): array
{
    $data = rtbo_client_spotlight_load();
    $videos = rtbo_client_spotlight_videos($data['videos']);
    $saved = rtbo_client_spotlight_video($video, count($videos));
    $saved['updatedAt'] = gmdate('c');
    $updated = false;

    foreach ($videos as &$existing) {
        if (($existing['id'] ?? '') !== $saved['id']) {
            continue;
        }
        $existing = $saved;
        $updated = true;
        break;
    }
    unset($existing);

    if (!$updated) {
        array_unshift($videos, $saved);
    }

    $data['videos'] = rtbo_client_spotlight_videos($videos);
    $data['updated_at'] = gmdate('c');
    $data['audit'][] = rtbo_client_spotlight_audit($user, $updated ? 'update_video' : 'create_video', ['id' => $saved['id']]);
    rtbo_client_spotlight_save_data($data);

    return $saved;
}

function rtbo_client_spotlight_delete_video(string $id, ?array $user = null): array
{
    $id = rtbo_client_spotlight_slug($id, '');
    if ($id === '') {
        throw new RuntimeException('A valid Client Spotlight video ID is required.');
    }

    $data = rtbo_client_spotlight_load();
    $videos = rtbo_client_spotlight_videos($data['videos']);
    $deleted = null;
    $videos = array_values(array_filter($videos, static function (array $video) use ($id, &$deleted): bool {
        if (($video['id'] ?? '') === $id) {
            $deleted = $video;
            return false;
        }

        return true;
    }));

    if (!$deleted) {
        throw new RuntimeException('The Client Spotlight video could not be found.');
    }

    $data['videos'] = $videos;
    $data['updated_at'] = gmdate('c');
    $data['audit'][] = rtbo_client_spotlight_audit($user, 'delete_video', ['id' => $id]);
    rtbo_client_spotlight_save_data($data);

    return $deleted;
}

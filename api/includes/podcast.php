<?php
declare(strict_types=1);

function rtbo_podcast_path(): string
{
    ensure_dir(STORAGE_DIR);

    return STORAGE_DIR . '/jammed-up-podcast.json';
}

function rtbo_podcast_default_show(): array
{
    return [
        'name' => 'The Jammed Up Bar! Podcast',
        'shortName' => 'Jammed Up',
        'tagline' => "We Don't Just Make This Up.",
        'brandLine' => 'A Raising The Bar Officiating sister platform',
        'mission' => 'A dynamic podcast and media platform spotlighting basketball officials who stay calm under pressure, fight out of tough corners, and keep raising the bar.',
        'brandMeaning' => 'Jammed Up means not letting yourself get backed into a corner. You stay calm under pressure, fight your way out, and keep moving forward.',
        'audience' => 'Basketball officials first, with basketball fans growing into an equal audience over time.',
        'releaseSchedule' => 'Saturday and Sunday at 5 PM Central until viewership increases.',
        'logo' => '/assets/podcast/jammed-up-bar-logo-transparent.png',
        'logoCard' => '/assets/podcast/jammed-up-bar-logo-card.webp',
        'logoMark' => '/assets/podcast/jammed-up-bar-logo-mark.png',
        'socialCard' => '/assets/podcast/social-card.png',
    ];
}

function rtbo_podcast_empty_data(): array
{
    return [
        'show' => rtbo_podcast_default_show(),
        'episodes' => [],
        'audit' => [],
        'updated_at' => null,
    ];
}

function rtbo_podcast_text(mixed $value, int $maxLength = 2000): string
{
    $text = trim(strip_tags((string) $value));
    if ($maxLength > 0 && strlen($text) > $maxLength) {
        return substr($text, 0, $maxLength);
    }

    return $text;
}

function rtbo_podcast_slug(mixed $value, string $fallback = 'podcast-episode'): string
{
    $slug = strtolower(rtbo_podcast_text($value, 120));
    $slug = preg_replace('/[^a-z0-9]+/', '-', $slug) ?: '';
    $slug = trim($slug, '-');

    return substr($slug !== '' ? $slug : $fallback, 0, 90);
}

function rtbo_podcast_url(mixed $value): string
{
    $url = trim((string) $value);
    if (strlen($url) > 1200) {
        return substr($url, 0, 1200);
    }

    return $url;
}

function rtbo_podcast_status(mixed $value): string
{
    $status = rtbo_podcast_slug($value, 'draft');
    if (in_array($status, ['published', 'active'], true)) {
        return 'published';
    }
    if (in_array($status, ['hidden', 'archived'], true)) {
        return 'hidden';
    }

    return 'draft';
}

function rtbo_podcast_show(array $show): array
{
    $base = rtbo_podcast_default_show();

    return [
        'name' => rtbo_podcast_text($show['name'] ?? $base['name'], 160) ?: $base['name'],
        'shortName' => rtbo_podcast_text($show['shortName'] ?? $base['shortName'], 80) ?: $base['shortName'],
        'tagline' => rtbo_podcast_text($show['tagline'] ?? $base['tagline'], 180) ?: $base['tagline'],
        'brandLine' => rtbo_podcast_text($show['brandLine'] ?? $base['brandLine'], 180),
        'mission' => rtbo_podcast_text($show['mission'] ?? $base['mission'], 800) ?: $base['mission'],
        'brandMeaning' => rtbo_podcast_text($show['brandMeaning'] ?? $base['brandMeaning'], 800),
        'audience' => rtbo_podcast_text($show['audience'] ?? $base['audience'], 500),
        'releaseSchedule' => rtbo_podcast_text($show['releaseSchedule'] ?? $base['releaseSchedule'], 300),
        'logo' => rtbo_podcast_url($show['logo'] ?? $base['logo']) ?: $base['logo'],
        'logoCard' => rtbo_podcast_url($show['logoCard'] ?? $base['logoCard']) ?: $base['logoCard'],
        'logoMark' => rtbo_podcast_url($show['logoMark'] ?? $base['logoMark']) ?: $base['logoMark'],
        'socialCard' => rtbo_podcast_url($show['socialCard'] ?? $base['socialCard']) ?: $base['socialCard'],
    ];
}

function rtbo_podcast_episode(array $episode, int $index = 0): array
{
    $title = rtbo_podcast_text($episode['title'] ?? '', 220);
    if ($title === '') {
        throw new RuntimeException('A title is required for each podcast video.');
    }

    $status = rtbo_podcast_status($episode['status'] ?? 'draft');
    $videoUrl = rtbo_podcast_url($episode['videoUrl'] ?? ($episode['video_url'] ?? ''));
    if ($status === 'published' && $videoUrl === '') {
        throw new RuntimeException('A real video URL is required before publishing a podcast episode.');
    }

    $id = rtbo_podcast_slug($episode['id'] ?? ($episode['slug'] ?? $title), 'episode-' . ($index + 1));

    return [
        'id' => $id,
        'slug' => rtbo_podcast_slug($episode['slug'] ?? $id, $id),
        'title' => $title,
        'subtitle' => rtbo_podcast_text($episode['subtitle'] ?? '', 240),
        'description' => rtbo_podcast_text($episode['description'] ?? ($episode['summary'] ?? ''), 1600),
        'status' => $status,
        'season' => isset($episode['season']) && $episode['season'] !== '' ? max(0, (int) $episode['season']) : '',
        'episode' => isset($episode['episode']) && $episode['episode'] !== '' ? max(0, (int) $episode['episode']) : '',
        'publishedAt' => rtbo_podcast_text($episode['publishedAt'] ?? ($episode['published_at'] ?? ($episode['date'] ?? '')), 80),
        'runtime' => rtbo_podcast_text($episode['runtime'] ?? '', 80),
        'category' => rtbo_podcast_text($episode['category'] ?? ($episode['level'] ?? ''), 120),
        'guests' => rtbo_podcast_text($episode['guests'] ?? ($episode['guest'] ?? ''), 300),
        'videoUrl' => $videoUrl,
        'posterUrl' => rtbo_podcast_url($episode['posterUrl'] ?? ($episode['poster_url'] ?? '')),
        'transcript' => rtbo_podcast_text($episode['transcript'] ?? '', 4000),
        'updatedAt' => rtbo_podcast_text($episode['updatedAt'] ?? ($episode['updated_at'] ?? ''), 80),
    ];
}

function rtbo_podcast_episodes(array $episodes): array
{
    $normalized = [];
    $seen = [];

    foreach ($episodes as $index => $episode) {
        if (!is_array($episode)) {
            continue;
        }
        $item = rtbo_podcast_episode($episode, (int) $index);
        if (isset($seen[$item['id']])) {
            continue;
        }
        $seen[$item['id']] = true;
        $normalized[] = $item;
    }

    return $normalized;
}

function rtbo_podcast_load(): array
{
    $path = rtbo_podcast_path();
    if (!is_file($path)) {
        return rtbo_podcast_empty_data();
    }

    $data = json_decode((string) file_get_contents($path), true);
    if (!is_array($data)) {
        return rtbo_podcast_empty_data();
    }

    $empty = rtbo_podcast_empty_data();
    $data['show'] = rtbo_podcast_show(is_array($data['show'] ?? null) ? $data['show'] : []);
    $data['episodes'] = rtbo_podcast_episodes(is_array($data['episodes'] ?? null) ? $data['episodes'] : []);
    $data['audit'] = is_array($data['audit'] ?? null) ? $data['audit'] : $empty['audit'];
    $data['updated_at'] = $data['updated_at'] ?? null;

    return $data;
}

function rtbo_podcast_save_data(array $data): void
{
    file_put_contents(
        rtbo_podcast_path(),
        json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES),
        LOCK_EX
    );
}

function rtbo_podcast_public_episodes(array $episodes): array
{
    return array_values(array_filter(
        rtbo_podcast_episodes($episodes),
        static fn(array $episode): bool => ($episode['status'] ?? '') === 'published' && ($episode['videoUrl'] ?? '') !== ''
    ));
}

function rtbo_podcast_audit(?array $user, string $action, array $details = []): array
{
    return [
        'actor_id' => isset($user['id']) ? (int) $user['id'] : null,
        'actor_email' => (string) ($user['email'] ?? ''),
        'action' => $action,
        'details' => $details,
        'created_at' => gmdate('c'),
    ];
}

function rtbo_podcast_save_show(array $show, ?array $user = null): array
{
    $data = rtbo_podcast_load();
    $saved = rtbo_podcast_show($show);
    $data['show'] = $saved;
    $data['updated_at'] = gmdate('c');
    $data['audit'][] = rtbo_podcast_audit($user, 'save_show');
    rtbo_podcast_save_data($data);

    return $saved;
}

function rtbo_podcast_save_episode(array $episode, ?array $user = null): array
{
    $data = rtbo_podcast_load();
    $episodes = rtbo_podcast_episodes($data['episodes']);
    $saved = rtbo_podcast_episode($episode, count($episodes));
    $saved['updatedAt'] = gmdate('c');
    $updated = false;

    foreach ($episodes as &$existing) {
        if (($existing['id'] ?? '') !== $saved['id']) {
            continue;
        }
        $existing = $saved;
        $updated = true;
        break;
    }
    unset($existing);

    if (!$updated) {
        array_unshift($episodes, $saved);
    }

    $data['episodes'] = rtbo_podcast_episodes($episodes);
    $data['updated_at'] = gmdate('c');
    $data['audit'][] = rtbo_podcast_audit($user, $updated ? 'update_episode' : 'create_episode', ['id' => $saved['id']]);
    rtbo_podcast_save_data($data);

    return $saved;
}

function rtbo_podcast_replace_episodes(array $episodes, ?array $user = null): array
{
    $data = rtbo_podcast_load();
    $saved = rtbo_podcast_episodes($episodes);
    $data['episodes'] = $saved;
    $data['updated_at'] = gmdate('c');
    $data['audit'][] = rtbo_podcast_audit($user, 'replace_episodes', ['count' => count($saved)]);
    rtbo_podcast_save_data($data);

    return $saved;
}

function rtbo_podcast_delete_episode(string $id, ?array $user = null): array
{
    $id = rtbo_podcast_slug($id, '');
    if ($id === '') {
        throw new RuntimeException('A valid podcast episode ID is required.');
    }

    $data = rtbo_podcast_load();
    $episodes = rtbo_podcast_episodes($data['episodes']);
    $deleted = null;
    $episodes = array_values(array_filter($episodes, static function (array $episode) use ($id, &$deleted): bool {
        if (($episode['id'] ?? '') === $id) {
            $deleted = $episode;
            return false;
        }

        return true;
    }));

    if (!$deleted) {
        throw new RuntimeException('The podcast episode could not be found.');
    }

    $data['episodes'] = $episodes;
    $data['updated_at'] = gmdate('c');
    $data['audit'][] = rtbo_podcast_audit($user, 'delete_episode', ['id' => $id]);
    rtbo_podcast_save_data($data);

    return $deleted;
}

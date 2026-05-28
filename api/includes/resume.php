<?php
declare(strict_types=1);

function rtbo_resume_path(): string
{
    ensure_dir(STORAGE_DIR);

    return STORAGE_DIR . '/rtbo-resume.json';
}

function rtbo_resume_default(): array
{
    $imageBase = '/assets/images/';

    return [
        'organization' => 'Raising The Bar Officiating',
        'kicker' => 'Basketball Officiating Resume',
        'title' => 'Raising The Bar Officiating',
        'accentTitle' => 'The Bar',
        'subtitle' => 'Event staffing and tournament coverage profile for athletic programs, tournament directors, camps, showcases, elite girls basketball events, and youth or scholastic competition.',
        'summary' => 'Raising The Bar Officiating is a basketball officiating organization supporting tournament directors, athletic programs, camps, showcases, collegiate-hosted events, elite girls basketball, and youth or scholastic competition. RTBO emphasizes dependable coverage, organized pre-event communication, professional crew coordination, availability confirmation, and consistent event-day support.',
        'logoUrl' => '/assets/resume/rtob-logo.png',
        'pdfUrl' => '/assets/resume/RTOB_Digital_Resume.pdf',
        'requestSubject' => 'RTBO Officiating Request',
        'contact' => [
            'primary' => 'Montrel Simmons / Raising The Bar Officiating',
            'phone' => '(501) 240-4961',
            'email' => 'admin@rtbofficiating.com',
            'website' => 'www.rtbofficiating.com',
        ],
        'featuredEvent' => [
            'label' => 'Featured 2026 Event',
            'title' => 'Big Miller / RTBO Official-Sponsored Elite Girls Tournament',
            'date' => 'June 8-9, 2026',
            'location' => 'Little Rock, AR',
            'body' => 'Basketball officiating support and tournament coverage for an elite girls basketball event.',
        ],
        'services' => [
            ['title' => 'Tournament Coverage', 'body' => 'Multi-court weekend events, elite girls tournaments, exposure events, camps, showcases, and seasonal play.'],
            ['title' => 'Officials Assignment Support', 'body' => 'Availability tracking, assignment confirmation, conflict notes, crew needs, and reporting instructions.'],
            ['title' => 'Event Communication', 'body' => 'Timely updates with tournament directors, site leads, table personnel, coaches, and assigned officials.'],
            ['title' => 'Game Management', 'body' => 'Calm court presence, respectful communication, rules knowledge, mechanics, and crew teamwork.'],
            ['title' => 'Development Mindset', 'body' => 'Professional growth, feedback-centered officiating, mentorship, and consistent mechanics standards.'],
            ['title' => 'Partner Reliability', 'body' => 'Organized follow-up, punctuality, appearance expectations, and service-minded support for every event.'],
        ],
        'events' => [
            ['date' => 'June 2017', 'event' => 'UCA', 'location' => 'Conway, AR', 'imageUrl' => $imageBase . 'uca_resume_card2017.png'],
            ['date' => 'June 2018', 'event' => 'UCA', 'location' => 'Conway, AR', 'imageUrl' => $imageBase . 'uca_resume_card2018.png'],
            ['date' => 'June 2018', 'event' => 'UALR', 'location' => 'Little Rock, AR', 'imageUrl' => $imageBase . 'ualr_resume_card12018.png'],
            ['date' => 'July 2018', 'event' => 'UALR', 'location' => 'Little Rock, AR', 'imageUrl' => $imageBase . 'ualr_resume_card2018.png'],
            ['date' => 'June 2019', 'event' => 'UCA', 'location' => 'Conway, AR', 'imageUrl' => $imageBase . 'uca_resume_card2019.png'],
            ['date' => 'June 2019', 'event' => 'UALR', 'location' => 'Little Rock, AR', 'imageUrl' => $imageBase . 'ualr_resume_card12019.png'],
            ['date' => 'July 2019', 'event' => 'UALR', 'location' => 'Little Rock, AR', 'imageUrl' => $imageBase . 'ualr_resume_card2019.png'],
            ['date' => 'June 2021', 'event' => 'UALR', 'location' => 'Little Rock, AR', 'imageUrl' => $imageBase . 'ualr_resume_card12021.png'],
            ['date' => 'June 2021', 'event' => 'Arkansas Baptist College', 'location' => 'Little Rock, AR', 'imageUrl' => $imageBase . 'abc_resume_card.png'],
            ['date' => 'July 2021', 'event' => 'UALR', 'location' => 'Little Rock, AR', 'imageUrl' => $imageBase . 'ualr_resume_card2021.png'],
            ['date' => 'June 2022', 'event' => 'UALR', 'location' => 'Little Rock, AR', 'imageUrl' => $imageBase . 'ualr_resume_card12022.png'],
            ['date' => 'June 2022', 'event' => 'She Got Game League', 'location' => 'Little Rock, AR', 'imageUrl' => $imageBase . 'shegotgame_resume_card2022.png'],
            ['date' => 'July 2022', 'event' => 'UALR', 'location' => 'Little Rock, AR', 'imageUrl' => $imageBase . 'ualr_resume_card2022.png'],
            ['date' => 'June 2023', 'event' => 'Lyon College', 'location' => 'Batesville, AR', 'imageUrl' => $imageBase . 'lyon_college_resume_card.png'],
            ['date' => 'June 2023', 'event' => 'She Got Game League', 'location' => 'Little Rock, AR', 'imageUrl' => $imageBase . 'shegotgame_resume_card2023.png'],
            ['date' => 'July 2023', 'event' => 'UAPB Event Experience', 'location' => 'Pine Bluff, AR', 'imageUrl' => $imageBase . 'uapb__resume_card2023.png'],
            ['date' => 'July 2023', 'event' => 'UALR', 'location' => 'Little Rock, AR', 'imageUrl' => $imageBase . 'ualr_resume_card2023.png'],
            ['date' => 'June 2024', 'event' => 'She Got Game League', 'location' => 'Little Rock, AR', 'imageUrl' => $imageBase . 'shegotgame_resume_card2024.png'],
            ['date' => 'June 2025', 'event' => 'She Got Game League', 'location' => 'Little Rock, AR', 'imageUrl' => $imageBase . 'shegotgame_resume_card2025.png'],
            ['date' => 'July 2025', 'event' => 'UALR', 'location' => 'Little Rock, AR', 'imageUrl' => $imageBase . 'ualr__resume_card2025.png'],
            ['date' => 'March 2026', 'event' => 'Hop Step Sporting Events', 'location' => 'Little Rock, AR', 'imageUrl' => $imageBase . 'hop__resume_card1aaa.png'],
            ['date' => 'April 2026', 'event' => 'Hop Step Sporting Events', 'location' => 'Little Rock, AR', 'imageUrl' => $imageBase . 'hop_step_resume_card1aa.png'],
            ['date' => 'May 2026', 'event' => 'Hop Step Sporting Events', 'location' => 'Little Rock, AR', 'imageUrl' => $imageBase . 'hop_step_resume_card1a.png'],
            ['date' => 'June 1, 2026', 'event' => 'UAPB Men', 'location' => 'Pine Bluff, AR', 'imageUrl' => $imageBase . 'uapb_men_resume_card.png'],
            ['date' => 'June 2026', 'event' => 'She Got Game League', 'location' => 'Little Rock, AR', 'imageUrl' => $imageBase . 'shegotgame_resume_card2026.png'],
            ['date' => 'June 8-9, 2026', 'event' => 'UAPB Women', 'location' => 'Pine Bluff, AR', 'imageUrl' => $imageBase . 'uapb_women_resume_card.png'],
            ['date' => 'June 8-9, 2026', 'event' => 'Big Miller Events', 'location' => 'Little Rock, AR', 'imageUrl' => $imageBase . 'big_miller_events_resume_card.png', 'highlight' => true],
            ['date' => 'June 20, 2026', 'event' => 'Hop Step Sporting Events', 'location' => 'Little Rock, AR', 'imageUrl' => $imageBase . 'hop_step_resume_card1.png'],
            ['date' => 'July 18-19, 2026', 'event' => 'Hop Step Sporting Events', 'location' => 'Little Rock, AR', 'imageUrl' => $imageBase . 'hop_step_resume_card.png'],
            ['date' => 'July 21-22, 2026', 'event' => 'Hop Step Sporting Events', 'location' => 'Little Rock, AR', 'imageUrl' => $imageBase . 'hop_step_resume_card2.png'],
        ],
        'standards' => [
            [
                'title' => 'Professional Standards',
                'items' => [
                    'Prompt communication and reliable confirmations',
                    'Prepared, punctual, and professional officials',
                    'Rules knowledge, mechanics consistency, and crew teamwork',
                    'Respectful coach, table, and site-director communication',
                ],
            ],
            [
                'title' => 'Event-Day Workflow',
                'items' => [
                    'Availability collection and conflict tracking',
                    'Reporting-time and uniform expectation communication',
                    'Coverage support for schedule changes and multi-court flow',
                    'Post-event follow-up and continuous improvement',
                ],
            ],
        ],
        'adminInfo' => [
            ['label' => 'Organization', 'value' => 'Raising The Bar Officiating (RTBO)'],
            ['label' => 'Primary Contact', 'value' => 'Montrel Simmons / Raising The Bar Officiating'],
            ['label' => 'Phone / Text', 'value' => '(501) 240-4961'],
            ['label' => 'Email', 'value' => 'admin@rtbofficiating.com'],
            ['label' => 'Website / Social', 'value' => 'www.rtbofficiating.com'],
            ['label' => 'Event Partners / Hosts', 'value' => 'UCA, UALR, Lyon College, UAPB, Arkansas Baptist College, Big Miller, Hop Step Sporting Events, She Got Game League'],
            ['label' => 'References', 'value' => 'Available upon request.'],
        ],
        'updatedAt' => '',
    ];
}

function rtbo_resume_empty_data(): array
{
    return [
        'resume' => rtbo_resume_default(),
        'audit' => [],
        'updated_at' => null,
    ];
}

function rtbo_resume_text(mixed $value, int $maxLength = 2000): string
{
    $text = trim(strip_tags((string) $value));
    if ($maxLength > 0 && strlen($text) > $maxLength) {
        return substr($text, 0, $maxLength);
    }

    return $text;
}

function rtbo_resume_url(mixed $value): string
{
    $url = trim((string) $value);
    if (strlen($url) > 1000) {
        return substr($url, 0, 1000);
    }

    return $url;
}

function rtbo_resume_text_list(mixed $value): array
{
    if (!is_array($value)) {
        return [];
    }

    $items = [];
    foreach ($value as $item) {
        $text = rtbo_resume_text($item, 500);
        if ($text !== '') {
            $items[] = $text;
        }
    }

    return $items;
}

function rtbo_resume_services(mixed $value): array
{
    if (!is_array($value)) {
        return [];
    }

    $services = [];
    foreach ($value as $index => $item) {
        if (!is_array($item)) {
            continue;
        }
        $title = rtbo_resume_text($item['title'] ?? ('Service ' . ((int) $index + 1)), 160);
        $body = rtbo_resume_text($item['body'] ?? '', 1000);
        if ($title === '' && $body === '') {
            continue;
        }
        $services[] = ['title' => $title, 'body' => $body];
    }

    return $services;
}

function rtbo_resume_events(mixed $value): array
{
    if (!is_array($value)) {
        return [];
    }

    $events = [];
    foreach ($value as $item) {
        if (!is_array($item)) {
            continue;
        }
        $date = rtbo_resume_text($item['date'] ?? '', 80);
        $event = rtbo_resume_text($item['event'] ?? ($item['title'] ?? ''), 200);
        $location = rtbo_resume_text($item['location'] ?? '', 160);
        if ($date === '' && $event === '' && $location === '') {
            continue;
        }
        $events[] = [
            'date' => $date,
            'event' => $event,
            'location' => $location,
            'imageUrl' => str_replace('/assets/images/resume-cards/', '/assets/images/', rtbo_resume_url($item['imageUrl'] ?? ($item['image_url'] ?? ''))),
            'highlight' => (bool) ($item['highlight'] ?? false),
        ];
    }

    return $events;
}

function rtbo_resume_standards(mixed $value): array
{
    if (!is_array($value)) {
        return [];
    }

    $standards = [];
    foreach ($value as $index => $item) {
        if (!is_array($item)) {
            continue;
        }
        $title = rtbo_resume_text($item['title'] ?? ('Standard ' . ((int) $index + 1)), 160);
        $items = rtbo_resume_text_list($item['items'] ?? []);
        if ($title === '' && $items === []) {
            continue;
        }
        $standards[] = ['title' => $title, 'items' => $items];
    }

    return $standards;
}

function rtbo_resume_info_rows(mixed $value): array
{
    if (!is_array($value)) {
        return [];
    }

    $rows = [];
    foreach ($value as $item) {
        if (!is_array($item)) {
            continue;
        }
        $label = rtbo_resume_text($item['label'] ?? '', 120);
        $rowValue = rtbo_resume_text($item['value'] ?? '', 700);
        if ($label === '' && $rowValue === '') {
            continue;
        }
        $rows[] = ['label' => $label, 'value' => $rowValue];
    }

    return $rows;
}

function rtbo_resume_normalize(array $resume): array
{
    $base = rtbo_resume_default();
    $contact = is_array($resume['contact'] ?? null) ? $resume['contact'] : [];
    $featuredEvent = is_array($resume['featuredEvent'] ?? null) ? $resume['featuredEvent'] : [];
    $services = rtbo_resume_services($resume['services'] ?? []);
    $events = rtbo_resume_events($resume['events'] ?? []);
    $standards = rtbo_resume_standards($resume['standards'] ?? []);
    $adminInfo = rtbo_resume_info_rows($resume['adminInfo'] ?? []);

    return [
        'organization' => rtbo_resume_text($resume['organization'] ?? $base['organization'], 180) ?: $base['organization'],
        'kicker' => rtbo_resume_text($resume['kicker'] ?? $base['kicker'], 120) ?: $base['kicker'],
        'title' => rtbo_resume_text($resume['title'] ?? $base['title'], 180) ?: $base['title'],
        'accentTitle' => rtbo_resume_text($resume['accentTitle'] ?? $base['accentTitle'], 80),
        'subtitle' => rtbo_resume_text($resume['subtitle'] ?? $base['subtitle'], 600) ?: $base['subtitle'],
        'summary' => rtbo_resume_text($resume['summary'] ?? $base['summary'], 1600) ?: $base['summary'],
        'logoUrl' => rtbo_resume_url($resume['logoUrl'] ?? $base['logoUrl']) ?: $base['logoUrl'],
        'pdfUrl' => rtbo_resume_url($resume['pdfUrl'] ?? $base['pdfUrl']) ?: $base['pdfUrl'],
        'requestSubject' => rtbo_resume_text($resume['requestSubject'] ?? $base['requestSubject'], 120) ?: $base['requestSubject'],
        'contact' => [
            'primary' => rtbo_resume_text($contact['primary'] ?? $base['contact']['primary'], 180),
            'phone' => rtbo_resume_text($contact['phone'] ?? $base['contact']['phone'], 80),
            'email' => rtbo_resume_text($contact['email'] ?? $base['contact']['email'], 180),
            'website' => rtbo_resume_text($contact['website'] ?? $base['contact']['website'], 180),
        ],
        'featuredEvent' => [
            'label' => rtbo_resume_text($featuredEvent['label'] ?? $base['featuredEvent']['label'], 120),
            'title' => rtbo_resume_text($featuredEvent['title'] ?? $base['featuredEvent']['title'], 220),
            'date' => rtbo_resume_text($featuredEvent['date'] ?? $base['featuredEvent']['date'], 80),
            'location' => rtbo_resume_text($featuredEvent['location'] ?? $base['featuredEvent']['location'], 160),
            'body' => rtbo_resume_text($featuredEvent['body'] ?? $base['featuredEvent']['body'], 700),
        ],
        'services' => $services !== [] ? $services : $base['services'],
        'events' => $events !== [] ? $events : $base['events'],
        'standards' => $standards !== [] ? $standards : $base['standards'],
        'adminInfo' => $adminInfo !== [] ? $adminInfo : $base['adminInfo'],
        'updatedAt' => rtbo_resume_text($resume['updatedAt'] ?? ($resume['updated_at'] ?? ''), 80),
    ];
}

function rtbo_resume_load(): array
{
    $path = rtbo_resume_path();
    if (!is_file($path)) {
        return rtbo_resume_empty_data();
    }

    $data = json_decode((string) file_get_contents($path), true);
    if (!is_array($data)) {
        return rtbo_resume_empty_data();
    }

    $resume = is_array($data['resume'] ?? null) ? $data['resume'] : $data;
    $data['resume'] = rtbo_resume_normalize($resume);
    $data['audit'] = is_array($data['audit'] ?? null) ? $data['audit'] : [];
    $data['updated_at'] = $data['updated_at'] ?? ($data['resume']['updatedAt'] ?: null);

    return $data;
}

function rtbo_resume_save_data(array $data): void
{
    file_put_contents(
        rtbo_resume_path(),
        json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES),
        LOCK_EX
    );
}

function rtbo_resume_audit(?array $user, string $action): array
{
    return [
        'actor_id' => isset($user['id']) ? (int) $user['id'] : null,
        'actor_email' => (string) ($user['email'] ?? ''),
        'action' => $action,
        'created_at' => gmdate('c'),
    ];
}

function rtbo_resume_save(array $resume, ?array $user = null): array
{
    $data = rtbo_resume_load();
    $saved = rtbo_resume_normalize($resume);
    $saved['updatedAt'] = gmdate('c');
    $data['resume'] = $saved;
    $data['updated_at'] = $saved['updatedAt'];
    $data['audit'][] = rtbo_resume_audit($user, 'save');
    rtbo_resume_save_data($data);

    return $saved;
}

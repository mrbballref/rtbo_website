<?php
declare(strict_types=1);

require_once __DIR__ . '/feature-store.php';

const RTBO_REFZONE_COURSES_STORE_TABLE = 'refzone_courses_store';

function rtbo_refzone_courses_path(): string
{
    ensure_dir(STORAGE_DIR);

    return STORAGE_DIR . '/refzone-courses.json';
}

function rtbo_refzone_courses_empty(): array
{
    return [
        'courses' => [],
        'audit' => [],
        'updated_at' => null,
    ];
}

function rtbo_refzone_courses_load(): array
{
    $data = rtbo_feature_store_load(RTBO_REFZONE_COURSES_STORE_TABLE);
    if (!is_array($data)) {
        $data = rtbo_refzone_courses_load_file();
        if (!is_array($data['courses'] ?? null) || $data['courses'] === []) {
            $data['courses'] = rtbo_refzone_starter_courses();
            $data['updated_at'] = gmdate('c');
        }
        rtbo_refzone_courses_save_data($data);
    }

    $empty = rtbo_refzone_courses_empty();
    $data['courses'] = is_array($data['courses'] ?? null) ? $data['courses'] : $empty['courses'];
    $data['audit'] = is_array($data['audit'] ?? null) ? $data['audit'] : $empty['audit'];
    $data['updated_at'] = $data['updated_at'] ?? null;

    return $data;
}

function rtbo_refzone_courses_load_file(): array
{
    $path = rtbo_refzone_courses_path();
    if (!is_file($path)) {
        return rtbo_refzone_courses_empty();
    }

    $data = json_decode((string) file_get_contents($path), true);
    if (!is_array($data)) {
        return rtbo_refzone_courses_empty();
    }

    $empty = rtbo_refzone_courses_empty();
    $data['courses'] = is_array($data['courses'] ?? null) ? $data['courses'] : $empty['courses'];
    $data['audit'] = is_array($data['audit'] ?? null) ? $data['audit'] : $empty['audit'];
    $data['updated_at'] = $data['updated_at'] ?? null;

    return $data;
}

function rtbo_refzone_starter_courses(): array
{
    $path = dirname(__DIR__, 2) . '/frontend/public/refzone-course-materials.json';
    if (!is_file($path)) {
        return [];
    }

    $data = json_decode((string) file_get_contents($path), true);
    if (!is_array($data) || !is_array($data['courses'] ?? null)) {
        return [];
    }

    return rtbo_refzone_courses_normalized($data['courses']);
}

function rtbo_refzone_courses_save_data(array $data): void
{
    rtbo_feature_store_save(RTBO_REFZONE_COURSES_STORE_TABLE, $data);
}

function rtbo_refzone_text(mixed $value, int $maxLength = 1000): string
{
    $text = trim(strip_tags((string) $value));
    if ($maxLength > 0 && strlen($text) > $maxLength) {
        return substr($text, 0, $maxLength);
    }

    return $text;
}

function rtbo_refzone_slug(mixed $value, string $fallback = 'course'): string
{
    $slug = strtolower(rtbo_refzone_text($value, 90));
    $slug = preg_replace('/[^a-z0-9]+/', '-', $slug) ?: '';
    $slug = trim($slug, '-');

    return substr($slug !== '' ? $slug : $fallback, 0, 90);
}

function rtbo_refzone_status(mixed $value): string
{
    $status = rtbo_refzone_slug($value, 'active');

    return in_array($status, ['active', 'draft', 'hidden'], true) ? $status : 'active';
}

function rtbo_refzone_text_list(mixed $items, int $maxItems = 12, int $maxLength = 800): array
{
    if (!is_array($items)) {
        return [];
    }

    $list = [];
    foreach (array_slice($items, 0, $maxItems) as $item) {
        $text = rtbo_refzone_text($item, $maxLength);
        if ($text !== '') {
            $list[] = $text;
        }
    }

    return $list;
}

function rtbo_refzone_assessment(mixed $assessment): array
{
    $assessment = is_array($assessment) ? $assessment : [];

    return [
        'type' => rtbo_refzone_text($assessment['type'] ?? 'Course Assessment', 120),
        'prompt' => rtbo_refzone_text($assessment['prompt'] ?? '', 1400),
        'passingStandard' => rtbo_refzone_text($assessment['passingStandard'] ?? $assessment['passing_standard'] ?? '', 500),
    ];
}

function rtbo_refzone_college_material(mixed $college): array
{
    $college = is_array($college) ? $college : [];

    return [
        'minutes' => max(1, min(480, (int) ($college['minutes'] ?? 90))),
        'objectives' => rtbo_refzone_text_list($college['objectives'] ?? [], 8, 600),
        'readings' => rtbo_refzone_text_list($college['readings'] ?? [], 12, 900),
        'preparation' => rtbo_refzone_text($college['preparation'] ?? '', 900),
        'media' => rtbo_refzone_text($college['media'] ?? '', 900),
        'lectureNotes' => rtbo_refzone_text_list($college['lectureNotes'] ?? $college['lecture_notes'] ?? [], 8, 800),
        'discussion' => rtbo_refzone_text_list($college['discussion'] ?? [], 8, 800),
        'lab' => rtbo_refzone_text($college['lab'] ?? '', 1000),
        'assignment' => rtbo_refzone_text($college['assignment'] ?? '', 1000),
        'assessment' => rtbo_refzone_assessment($college['assessment'] ?? []),
        'rubric' => rtbo_refzone_text_list($college['rubric'] ?? [], 12, 500),
    ];
}

function rtbo_refzone_test_option(mixed $option, int $index = 0): array
{
    $option = is_array($option) ? $option : [];
    $id = strtolower(rtbo_refzone_text($option['id'] ?? chr(97 + $index), 8));

    return [
        'id' => $id !== '' ? $id : chr(97 + $index),
        'text' => rtbo_refzone_text($option['text'] ?? '', 900),
    ];
}

function rtbo_refzone_test_bank(mixed $test): array
{
    $test = is_array($test) ? $test : [];
    $questions = [];
    foreach (array_slice(($test['questions'] ?? []), 0, 25) as $questionIndex => $question) {
        if (!is_array($question)) {
            continue;
        }
        $options = [];
        foreach (array_slice(($question['options'] ?? []), 0, 6) as $optionIndex => $option) {
            $normalizedOption = rtbo_refzone_test_option($option, (int) $optionIndex);
            if ($normalizedOption['text'] !== '') {
                $options[] = $normalizedOption;
            }
        }
        $prompt = rtbo_refzone_text($question['prompt'] ?? '', 1400);
        $correctOptionId = strtolower(rtbo_refzone_text($question['correctOptionId'] ?? $question['correct_option_id'] ?? '', 8));
        if ($prompt === '' || count($options) < 2 || $correctOptionId === '') {
            continue;
        }
        $questions[] = [
            'id' => rtbo_refzone_text($question['id'] ?? ('q' . ($questionIndex + 1)), 120),
            'type' => rtbo_refzone_text($question['type'] ?? 'multiple-choice', 80),
            'prompt' => $prompt,
            'options' => $options,
            'correctOptionId' => $correctOptionId,
            'explanation' => rtbo_refzone_text($question['explanation'] ?? '', 1400),
        ];
    }

    return [
        'id' => rtbo_refzone_text($test['id'] ?? 'course-test', 160),
        'title' => rtbo_refzone_text($test['title'] ?? 'Course Assessment', 240),
        'type' => rtbo_refzone_text($test['type'] ?? 'Course Assessment', 120),
        'passingScore' => 85,
        'timeLimitMinutes' => max(1, min(240, (int) ($test['timeLimitMinutes'] ?? $test['time_limit_minutes'] ?? 45))),
        'instructions' => rtbo_refzone_text($test['instructions'] ?? '', 1200),
        'evidencePrompt' => rtbo_refzone_text($test['evidencePrompt'] ?? $test['evidence_prompt'] ?? '', 1200),
        'answerKeyVisibleInCommandCenter' => true,
        'questions' => $questions,
        'answerKey' => array_map(static function (array $question): array {
            $answer = '';
            foreach ($question['options'] as $option) {
                if ($option['id'] === $question['correctOptionId']) {
                    $answer = $option['text'];
                    break;
                }
            }
            return [
                'questionId' => $question['id'],
                'correctOptionId' => $question['correctOptionId'],
                'answer' => $answer,
                'explanation' => $question['explanation'],
            ];
        }, $questions),
    ];
}

function rtbo_refzone_video_asset(mixed $video, int $index = 0): ?array
{
    if (!is_array($video)) {
        $video = ['url' => $video];
    }

    $url = rtbo_refzone_text(
        $video['url'] ?? $video['href'] ?? $video['src'] ?? $video['path'] ?? $video['video'] ?? $video['videoUrl'] ?? $video['video_url'] ?? '',
        900
    );
    if ($url === '') {
        return null;
    }

    $title = rtbo_refzone_text($video['title'] ?? $video['name'] ?? ('Section Video ' . ($index + 1)), 220);

    return [
        'id' => rtbo_refzone_slug($video['id'] ?? $title, 'section-video-' . $index),
        'title' => $title !== '' ? $title : ('Section Video ' . ($index + 1)),
        'url' => $url,
        'thumbnail' => rtbo_refzone_text($video['thumbnail'] ?? $video['poster'] ?? $video['image'] ?? '', 900),
        'duration' => rtbo_refzone_text($video['duration'] ?? $video['durationLabel'] ?? $video['duration_label'] ?? '', 80),
        'type' => rtbo_refzone_text($video['type'] ?? $video['mime'] ?? 'video/mp4', 120),
    ];
}

function rtbo_refzone_video_assets(mixed $videos, int $maxItems = 24): array
{
    if (!is_array($videos)) {
        return [];
    }

    $items = [];
    foreach (array_slice($videos, 0, $maxItems) as $index => $video) {
        $normalized = rtbo_refzone_video_asset($video, (int) $index);
        if ($normalized !== null) {
            $items[] = $normalized;
        }
    }

    return $items;
}

function rtbo_refzone_section(array $section, int $index = 0): array
{
    $title = rtbo_refzone_text($section['title'] ?? ('Line Item ' . ($index + 1)), 180);

    return [
        'id' => rtbo_refzone_slug($section['id'] ?? $title, 'section-' . $index),
        'title' => $title,
        'summary' => rtbo_refzone_text($section['summary'] ?? '', 5000),
        'materialType' => rtbo_refzone_text($section['materialType'] ?? $section['material_type'] ?? 'instruction-slide', 80),
        'visual' => rtbo_refzone_text($section['visual'] ?? '', 500),
        'screenshot' => rtbo_refzone_text($section['screenshot'] ?? '', 500),
        'presentation' => rtbo_refzone_text($section['presentation'] ?? '', 500),
        'collegeRole' => rtbo_refzone_text($section['collegeRole'] ?? $section['college_role'] ?? '', 500),
        'videos' => rtbo_refzone_video_assets($section['videos'] ?? []),
    ];
}

function rtbo_refzone_day(array $day, int $index = 0): array
{
    $title = rtbo_refzone_text($day['title'] ?? ('Lesson ' . ($index + 1)), 220);
    $sections = [];
    foreach (($day['sections'] ?? []) as $sectionIndex => $section) {
        if (is_array($section)) {
            $sections[] = rtbo_refzone_section($section, (int) $sectionIndex);
        }
    }

    $result = [
        'id' => rtbo_refzone_slug($day['id'] ?? $title, 'day-' . $index),
        'day' => (int) ($day['day'] ?? ($index + 1)),
        'title' => $title,
        'visualType' => rtbo_refzone_text($day['visualType'] ?? $day['visual_type'] ?? 'lecture', 80),
        'visualTitle' => rtbo_refzone_text($day['visualTitle'] ?? $day['visual_title'] ?? '', 180),
        'visual' => rtbo_refzone_text($day['visual'] ?? '', 500),
        'screenshot' => rtbo_refzone_text($day['screenshot'] ?? '', 500),
        'presentation' => rtbo_refzone_text($day['presentation'] ?? '', 500),
        'videoUrl' => rtbo_refzone_text($day['videoUrl'] ?? $day['video_url'] ?? $day['video'] ?? '', 900),
        'videos' => rtbo_refzone_video_assets($day['videos'] ?? []),
        'sections' => $sections,
    ];

    if (is_array($day['college'] ?? null)) {
        $result['college'] = rtbo_refzone_college_material($day['college']);
    }
    if (is_array($day['test'] ?? null)) {
        $result['test'] = rtbo_refzone_test_bank($day['test']);
    }

    return $result;
}

function rtbo_refzone_week(array $week, int $index = 0): array
{
    $title = rtbo_refzone_text($week['title'] ?? ('Module ' . ($index + 1)), 220);
    $days = [];
    foreach (($week['days'] ?? []) as $dayIndex => $day) {
        if (is_array($day)) {
            $days[] = rtbo_refzone_day($day, (int) $dayIndex);
        }
    }

    return [
        'id' => rtbo_refzone_slug($week['id'] ?? $title, 'week-' . $index),
        'month' => (int) ($week['month'] ?? max(1, (int) ceil(($index + 1) / 4))),
        'week' => (int) ($week['week'] ?? ($index + 1)),
        'title' => $title,
        'lecture' => rtbo_refzone_text($week['lecture'] ?? '', 1200),
        'evidence' => rtbo_refzone_text($week['evidence'] ?? '', 1200),
        'presentation' => rtbo_refzone_text($week['presentation'] ?? '', 500),
        'screenshot' => rtbo_refzone_text($week['screenshot'] ?? '', 500),
        'days' => $days,
    ];
}

function rtbo_refzone_course(array $course, int $index = 0): array
{
    $title = rtbo_refzone_text($course['title'] ?? ('RefZone Course ' . ($index + 1)), 220);
    if ($title === '') {
        throw new RuntimeException('A course title is required.');
    }

    $weeks = [];
    foreach (($course['weeks'] ?? []) as $weekIndex => $week) {
        if (is_array($week)) {
            $weeks[] = rtbo_refzone_week($week, (int) $weekIndex);
        }
    }

    return [
        'id' => rtbo_refzone_slug($course['id'] ?? $title, 'course-' . $index),
        'title' => $title,
        'path' => rtbo_refzone_text($course['path'] ?? '', 260),
        'level' => rtbo_refzone_text($course['level'] ?? '', 180),
        'status' => rtbo_refzone_status($course['status'] ?? 'active'),
        'cover' => rtbo_refzone_text($course['cover'] ?? '', 500),
        'overviewThumbnail' => rtbo_refzone_text($course['overviewThumbnail'] ?? $course['overview_thumbnail'] ?? '', 500),
        'overview' => rtbo_refzone_text($course['overview'] ?? '', 1800),
        'identity' => rtbo_refzone_text($course['identity'] ?? '', 1800),
        'description' => rtbo_refzone_text($course['description'] ?? $course['overview'] ?? '', 1800),
        'graduation' => rtbo_refzone_text_list($course['graduation'] ?? [], 12, 600),
        'weeks' => $weeks,
        'updated_at' => gmdate('c'),
    ];
}

function rtbo_refzone_courses_normalized(array $courses): array
{
    $normalized = [];
    $seen = [];
    foreach ($courses as $index => $course) {
        if (!is_array($course)) {
            continue;
        }
        $item = rtbo_refzone_course($course, (int) $index);
        if (isset($seen[$item['id']])) {
            continue;
        }
        $seen[$item['id']] = true;
        $normalized[] = $item;
    }

    return $normalized;
}

function rtbo_refzone_courses(bool $publicOnly = false): array
{
    $courses = rtbo_refzone_courses_normalized(rtbo_refzone_courses_load()['courses']);
    if ($courses === []) {
        $courses = rtbo_refzone_starter_courses();
    }

    if (!$publicOnly) {
        return $courses;
    }

    return array_values(array_filter($courses, static fn(array $course): bool => ($course['status'] ?? 'active') === 'active'));
}

function rtbo_refzone_courses_audit(?array $user, string $action, array $details = []): array
{
    return [
        'actor_id' => isset($user['id']) ? (int) $user['id'] : null,
        'actor_email' => (string) ($user['email'] ?? ''),
        'action' => $action,
        'details' => $details,
        'created_at' => gmdate('c'),
    ];
}

function rtbo_refzone_courses_replace(array $courses, ?array $user = null): array
{
    $savedCourses = rtbo_refzone_courses_normalized($courses);
    $data = rtbo_refzone_courses_load();
    $data['courses'] = $savedCourses;
    $data['updated_at'] = gmdate('c');
    $data['audit'][] = rtbo_refzone_courses_audit($user, 'replace', ['count' => count($savedCourses)]);
    rtbo_refzone_courses_save_data($data);

    return $savedCourses;
}

function rtbo_refzone_courses_delete(string $id, ?array $user = null): array
{
    $id = rtbo_refzone_slug($id, '');
    if ($id === '') {
        throw new RuntimeException('A valid course ID is required.');
    }

    $data = rtbo_refzone_courses_load();
    $deleted = null;
    $courses = array_values(array_filter(rtbo_refzone_courses_normalized($data['courses']), static function (array $course) use ($id, &$deleted): bool {
        if (($course['id'] ?? '') === $id) {
            $deleted = $course;
            return false;
        }

        return true;
    }));

    if (!$deleted) {
        throw new RuntimeException('The course could not be found.');
    }

    $data['courses'] = $courses;
    $data['updated_at'] = gmdate('c');
    $data['audit'][] = rtbo_refzone_courses_audit($user, 'delete', ['id' => $id, 'title' => $deleted['title'] ?? '']);
    rtbo_refzone_courses_save_data($data);

    return $deleted;
}

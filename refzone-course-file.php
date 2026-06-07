<?php
declare(strict_types=1);

$materialsPath = __DIR__ . '/refzone-course-materials.json';

function rtbo_param(string $key, string $default = ''): string {
    return trim((string)($_GET[$key] ?? $default));
}

function rtbo_slug(string $value): string {
    $slug = strtolower(preg_replace('/[^a-z0-9]+/i', '-', $value) ?? '');
    return trim($slug, '-') ?: 'refzone-file';
}

function rtbo_lines(array $items): string {
    $rows = array_values(array_filter(array_map('strval', $items)));
    if (!$rows) return "_No items are listed for this section._\n";
    return implode("\n", array_map(fn($item) => "- " . $item, $rows)) . "\n";
}

function rtbo_find_day(array $materials, string $courseId, string $dayId): array {
    foreach (($materials['courses'] ?? []) as $course) {
        if (($course['id'] ?? '') !== $courseId) continue;
        foreach (($course['weeks'] ?? []) as $week) {
            foreach (($week['days'] ?? []) as $day) {
                if (($day['id'] ?? '') === $dayId) return [$course, $week, $day];
            }
        }
    }
    return [null, null, null];
}

if (!is_file($materialsPath)) {
    http_response_code(500);
    header('Content-Type: text/plain; charset=utf-8');
    echo "RefZone course materials are not available.";
    exit;
}

$materials = json_decode((string)file_get_contents($materialsPath), true);
$courseId = rtbo_param('course');
$dayId = rtbo_param('day');
$type = rtbo_param('type', 'packet');
$index = filter_input(INPUT_GET, 'index', FILTER_VALIDATE_INT);

[$course, $week, $day] = rtbo_find_day($materials ?: [], $courseId, $dayId);

if (!$course || !$week || !$day) {
    http_response_code(404);
    header('Content-Type: text/plain; charset=utf-8');
    echo "The requested RefZone course file was not found.";
    exit;
}

$college = $day['college'] ?? [];
$title = (string)($day['title'] ?? 'RefZone Lesson');
$courseTitle = (string)($course['title'] ?? 'RefZone University');
$filename = rtbo_slug($courseTitle . '-' . $title . '-' . $type) . '.md';

$content = "# {$courseTitle}: {$title}\n\n";
$content .= "Week " . (string)($week['week'] ?? $day['week'] ?? '1') . " / Day " . (string)($day['day'] ?? '1') . "\n\n";

switch ($type) {
    case 'reading':
        $readings = array_values(array_filter($college['readings'] ?? []));
        $content .= "## Required Reading\n\n";
        if ($index !== false && $index !== null && isset($readings[$index])) {
            $content .= "- " . (string)$readings[$index] . "\n";
        } else {
            $content .= rtbo_lines($readings);
        }
        break;
    case 'lecture-notes':
        $content .= "## Professor Lecture Notes\n\n" . rtbo_lines($college['lectureNotes'] ?? []);
        break;
    case 'lab':
        $content .= "## Lab / Visual Activity\n\n" . (string)($college['lab'] ?? '_No lab is listed for this lesson._') . "\n";
        break;
    case 'assignment':
        $content .= "## Daily Assignment\n\n" . (string)($college['assignment'] ?? '_No assignment is listed for this lesson._') . "\n";
        break;
    case 'assessment':
        $assessment = $college['assessment'] ?? [];
        $content .= "## Assessment\n\n";
        $content .= "**Type:** " . (string)($assessment['type'] ?? 'Assessment') . "\n\n";
        $content .= (string)($assessment['prompt'] ?? '_No assessment prompt is listed for this lesson._') . "\n";
        break;
    default:
        $content .= "## Learning Objectives\n\n" . rtbo_lines($college['objectives'] ?? []);
        $content .= "\n## Required Reading\n\n" . rtbo_lines($college['readings'] ?? []);
        $content .= "\n## Professor Lecture Notes\n\n" . rtbo_lines($college['lectureNotes'] ?? []);
        $content .= "\n## Class Discussion\n\n" . rtbo_lines($college['discussion'] ?? []);
        $content .= "\n## Lab / Visual Activity\n\n" . (string)($college['lab'] ?? '_No lab is listed for this lesson._') . "\n";
        $content .= "\n## Daily Assignment\n\n" . (string)($college['assignment'] ?? '_No assignment is listed for this lesson._') . "\n";
        $assessment = $college['assessment'] ?? [];
        $content .= "\n## Assessment\n\n" . (string)($assessment['prompt'] ?? '_No assessment prompt is listed for this lesson._') . "\n";
        $content .= "\n## Rubric\n\n" . rtbo_lines($college['rubric'] ?? []);
        break;
}

header('Content-Type: text/markdown; charset=utf-8');
header('Content-Disposition: attachment; filename="' . $filename . '"');
header('X-Content-Type-Options: nosniff');
echo $content;

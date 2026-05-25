<?php
declare(strict_types=1);

require_once __DIR__ . '/includes/bootstrap.php';
require_once __DIR__ . '/includes/reviews.php';
require_once __DIR__ . '/includes/notifications.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'POST required.']);
    exit;
}
require_same_origin_request();

$experienceLabels = [
    'in_person_school' => 'In-person training school',
    'refzone_university' => 'RefZone University course',
    'both' => 'Both experiences',
];

$fullName = preg_replace('/[\r\n]+/', ' ', clean('full_name'));
$email = strtolower(clean('email'));
$phone = rtbo_format_phone_number((string) ($_POST['phone'] ?? ''));
$experienceType = clean('experience_type');
$schoolOrCourse = preg_replace('/[\r\n]+/', ' ', clean('school_or_course'));
$attendeeRole = preg_replace('/[\r\n]+/', ' ', clean('attendee_role'));
$rating = (int) ($_POST['rating'] ?? 0);
$reviewText = trim((string) ($_POST['review'] ?? ''));
$publicConsent = clean('public_consent') === 'yes';
$contactOk = clean('contact_ok') === 'yes';

if (
    $fullName === ''
    || !filter_var($email, FILTER_VALIDATE_EMAIL)
    || !array_key_exists($experienceType, $experienceLabels)
    || $schoolOrCourse === ''
    || $attendeeRole === ''
    || $rating < 1
    || $rating > 5
    || strlen($reviewText) < 20
    || strlen($reviewText) > 1200
    || !$publicConsent
) {
    http_response_code(422);
    echo json_encode(['success' => false, 'message' => 'Please complete every required review field.']);
    exit;
}

$reviewId = bin2hex(random_bytes(12));
$photoPath = '';
$reviewPhoto = $_FILES['review_photo'] ?? null;

if (is_array($reviewPhoto) && (int) ($reviewPhoto['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_NO_FILE) {
    if ((int) ($reviewPhoto['error'] ?? UPLOAD_ERR_OK) !== UPLOAD_ERR_OK || empty($reviewPhoto['tmp_name']) || !is_uploaded_file((string) $reviewPhoto['tmp_name'])) {
        http_response_code(422);
        echo json_encode(['success' => false, 'message' => 'The review picture could not be uploaded. Please choose a JPG, PNG, or WebP image.']);
        exit;
    }

    if ((int) ($reviewPhoto['size'] ?? 0) > 5 * 1024 * 1024) {
        http_response_code(422);
        echo json_encode(['success' => false, 'message' => 'Review picture must be 5MB or smaller.']);
        exit;
    }

    $mimeType = '';
    if (function_exists('finfo_open')) {
        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        if ($finfo !== false) {
            $detected = finfo_file($finfo, (string) $reviewPhoto['tmp_name']);
            finfo_close($finfo);
            $mimeType = is_string($detected) ? $detected : '';
        }
    }

    if ($mimeType === '') {
        $mimeType = (string) ($reviewPhoto['type'] ?? '');
    }

    $extension = match ($mimeType) {
        'image/jpeg' => 'jpg',
        'image/png' => 'png',
        'image/webp' => 'webp',
        default => '',
    };

    if ($extension === '') {
        http_response_code(422);
        echo json_encode(['success' => false, 'message' => 'Review picture must be a JPG, PNG, or WebP image.']);
        exit;
    }

    ensure_dir(REVIEW_PHOTO_DIR);
    $photoPath = REVIEW_PHOTO_DIR . '/' . $reviewId . '.' . $extension;
    if (!move_uploaded_file((string) $reviewPhoto['tmp_name'], $photoPath)) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Review picture could not be saved. Please try again.']);
        exit;
    }
}

$review = [
    'review_id' => $reviewId,
    'submitted_at' => date('c'),
    'full_name' => $fullName,
    'email' => $email,
    'phone' => $phone,
    'experience_type' => $experienceType,
    'experience_label' => $experienceLabels[$experienceType],
    'school_or_course' => $schoolOrCourse,
    'attendee_role' => $attendeeRole,
    'rating' => $rating,
    'review_text' => $reviewText,
    'photo_path' => $photoPath,
    'public_consent' => $publicConsent,
    'contact_ok' => $contactOk,
    'status' => 'pending',
];

save_attendee_review($review);

try {
    rtbo_notify_admins([
        'type' => 'attendee_review_submitted',
        'title' => 'New attendee review',
        'body' => "{$fullName} submitted a {$rating}-star review for {$schoolOrCourse}.",
        'related_type' => 'attendee_review',
        'metadata' => [
            'review_id' => $review['review_id'],
            'email' => $email,
            'experience_type' => $experienceType,
            'school_or_course' => $schoolOrCourse,
            'rating' => $rating,
            'photo_uploaded' => $photoPath !== '',
        ],
    ]);
} catch (Throwable $notificationError) {
    error_log('RTBO attendee review notification event failed: ' . $notificationError->getMessage());
}

echo json_encode([
    'success' => true,
    'message' => 'Thank you. Your review was submitted for RTBO review before publishing.',
    'review_id' => $review['review_id'],
]);

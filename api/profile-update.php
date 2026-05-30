<?php
declare(strict_types=1);

require_once __DIR__ . '/includes/bootstrap.php';
require_once __DIR__ . '/includes/users.php';
require_once __DIR__ . '/includes/admin-members.php';
require_once __DIR__ . '/includes/notifications.php';
require_once __DIR__ . '/includes/email.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'POST required.']);
    exit;
}
require_same_origin_request();

$user = current_database_user();
$usingFileFallback = false;
if (!$user && current_user()) {
    foreach (admin_member_read_file() as $member) {
        if ((int) ($member['id'] ?? 0) === (int) (current_user()['id'] ?? 0) && ($member['status'] ?? 'active') !== 'deleted') {
            $user = $member;
            $usingFileFallback = true;
            break;
        }
    }
}
if (!$user) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Sign-in is required.']);
    exit;
}

function rtbo_profile_update_member_name(array $user, string $fallbackEmail): string
{
    $name = trim((string) ($user['name'] ?? ''));
    if ($name !== '') {
        return $name;
    }

    $name = trim(implode(' ', array_filter([
        (string) ($user['first_name'] ?? ''),
        (string) ($user['last_name'] ?? ''),
    ])));

    return $name !== '' ? $name : $fallbackEmail;
}

function rtbo_profile_update_notify(array $currentUser, array $previousUser, string $message, string $fallbackEmail): void
{
    $memberId = (int) ($currentUser['id'] ?? $previousUser['id'] ?? 0);
    $memberName = rtbo_profile_update_member_name($currentUser, $fallbackEmail);
    $oldStatus = strtolower((string) ($previousUser['status'] ?? ''));
    $newStatus = strtolower((string) ($currentUser['status'] ?? ''));
    $role = (string) ($currentUser['role'] ?? $previousUser['role'] ?? '');
    $metadata = [
        'member_id' => $memberId,
        'member_role' => $role,
        'previous_status' => $oldStatus,
        'status' => $newStatus,
        'changed_fields' => ['profile'],
    ];

    try {
        rtbo_notify_admins([
            'type' => 'member_profile_updated',
            'title' => 'Member profile updated',
            'body' => "{$memberName} updated their profile.",
            'related_type' => 'member',
            'related_id' => $memberId,
            'metadata' => $metadata,
            'actor' => $currentUser,
        ]);

        if ($role !== 'super_admin' && $oldStatus !== 'active' && $newStatus === 'active') {
            send_super_admin_profile_completed_email($currentUser, $currentUser);
            try {
                ensure_users_table();
                db()->prepare('UPDATE users SET profile_completion_notified_at = NOW(), updated_at = NOW() WHERE id = ? AND profile_completion_notified_at IS NULL')->execute([$memberId]);
            } catch (Throwable $emailMarkerError) {
                error_log('RTBO profile completion marker failed: ' . $emailMarkerError->getMessage());
            }
            rtbo_notify_admins([
                'type' => 'member_activated',
                'title' => 'Member activated',
                'body' => "{$memberName} completed their profile and is now active for assignments.",
                'related_type' => 'member',
                'related_id' => $memberId,
                'metadata' => $metadata,
                'actor' => $currentUser,
            ]);
        }

        if ($memberId > 0) {
            rtbo_notify_users([$memberId], [
                'type' => 'profile_update_saved',
                'title' => 'Profile saved',
                'body' => $message,
                'related_type' => 'member',
                'related_id' => $memberId,
                'metadata' => $metadata,
                'actor' => $currentUser,
            ]);
        }
    } catch (Throwable $notificationError) {
        error_log('RTBO profile update notification failed: ' . $notificationError->getMessage());
    }
}

$firstName = trim((string) ($_POST['first_name'] ?? $user['first_name']));
$lastName = trim((string) ($_POST['last_name'] ?? $user['last_name']));
$email = strtolower(trim((string) ($_POST['email'] ?? $user['email'])));
$phone = rtbo_format_phone_number((string) ($_POST['phone'] ?? ''));
$sex = trim((string) ($_POST['sex'] ?? $user['sex'] ?? $user['gender'] ?? ''));
$race = trim((string) ($_POST['race'] ?? $user['race'] ?? ''));
$addressLine1 = trim((string) ($_POST['address_line1'] ?? ''));
$addressLine2 = trim((string) ($_POST['address_line2'] ?? ''));
$city = trim((string) ($_POST['city'] ?? ''));
$state = trim((string) ($_POST['state'] ?? ''));
$zip = trim((string) ($_POST['zip'] ?? ''));
$conferences = trim((string) ($_POST['conferences'] ?? ''));
$experience = trim((string) ($_POST['experience'] ?? ''));
$profilePhotoPath = (string) ($user['profile_photo'] ?? '');

if ($firstName === '' || $lastName === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(422);
    echo json_encode(['success' => false, 'message' => 'First name, last name, and valid email are required.']);
    exit;
}

try {
    if (!empty($_FILES['profile_photo']['tmp_name']) && is_uploaded_file((string) $_FILES['profile_photo']['tmp_name'])) {
        if ((int) ($_FILES['profile_photo']['size'] ?? 0) > 5 * 1024 * 1024) {
            http_response_code(422);
            echo json_encode(['success' => false, 'message' => 'Profile photo must be 5MB or smaller.']);
            exit;
        }

        $mimeType = '';
        if (function_exists('finfo_open')) {
            $finfo = finfo_open(FILEINFO_MIME_TYPE);
            if ($finfo !== false) {
                $detected = finfo_file($finfo, (string) $_FILES['profile_photo']['tmp_name']);
                finfo_close($finfo);
                $mimeType = is_string($detected) ? $detected : '';
            }
        }
        $mimeType = $mimeType ?: (string) ($_FILES['profile_photo']['type'] ?? '');
        $extension = match ($mimeType) {
            'image/jpeg' => 'jpg',
            'image/png' => 'png',
            'image/webp' => 'webp',
            default => '',
        };

        if ($extension === '') {
            http_response_code(422);
            echo json_encode(['success' => false, 'message' => 'Profile photo must be a JPG, PNG, or WebP image.']);
            exit;
        }

        ensure_dir(PROFILE_PHOTO_DIR);
        $target = PROFILE_PHOTO_DIR . '/admin_' . (int) $user['id'] . '_' . bin2hex(random_bytes(8)) . '.' . $extension;
        if (!move_uploaded_file((string) $_FILES['profile_photo']['tmp_name'], $target)) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Profile photo could not be saved.']);
            exit;
        }
        $profilePhotoPath = $target;
    }

    $requiresProfileActivation = !in_array((string) ($user['role'] ?? ''), ['super_admin'], true);
    if ($requiresProfileActivation) {
        $missing = [];
        foreach ([
            'phone' => $phone,
            'address' => $addressLine1,
            'city' => $city,
            'state' => $state,
            'zip' => $zip,
            'conferences worked' => $conferences,
            'experience' => $experience,
            'profile photo' => $profilePhotoPath,
        ] as $label => $value) {
            if (trim((string) $value) === '') {
                $missing[] = $label;
            }
        }
        if ($missing !== []) {
            http_response_code(422);
            echo json_encode(['success' => false, 'message' => 'Complete your profile before activation. Missing: ' . implode(', ', $missing) . '.']);
            exit;
        }
    }

    if ($usingFileFallback) {
        $members = admin_member_read_file();
        foreach ($members as $index => $member) {
            if ((int) ($member['id'] ?? 0) === (int) $user['id']) {
                $members[$index] = [
                    ...$member,
                    'first_name' => $firstName,
                    'last_name' => $lastName,
                    'email' => $email,
                    'phone' => $phone,
                    'sex' => $sex,
                    'race' => $race,
                    'address_line1' => $addressLine1,
                    'address_line2' => $addressLine2,
                    'city' => $city,
                    'state' => $state,
                    'zip' => $zip,
                    'conferences' => $conferences,
                    'experience' => $experience,
                    'profile_photo' => $profilePhotoPath,
                    'status' => ((string) ($member['role'] ?? '') !== 'super_admin') ? 'active' : (string) ($member['status'] ?? 'active'),
                    'profile_completed_at' => ((string) ($member['role'] ?? '') !== 'super_admin') ? date('c') : (string) ($member['profile_completed_at'] ?? ''),
                ];
                admin_member_write_file($members);
                $_SESSION['user'] = public_auth_user($members[$index]);
                $message = (($_SESSION['user']['role'] ?? '') !== 'super_admin' && ($_SESSION['user']['status'] ?? '') === 'active')
                    ? 'Profile updated. Your account is now active.'
                    : 'Profile updated.';
                rtbo_profile_update_notify($_SESSION['user'], $member, $message, $email);
                echo json_encode(['success' => true, 'message' => $message, 'user' => $_SESSION['user']], JSON_UNESCAPED_SLASHES);
                exit;
            }
        }
        throw new RuntimeException('Profile record not found.');
    }

    ensure_users_table();
    $stmt = db()->prepare(
        "UPDATE users
         SET first_name = ?,
             last_name = ?,
             email = ?,
             phone = ?,
             sex = ?,
             race = ?,
             address_line1 = ?,
             address_line2 = ?,
             city = ?,
             state = ?,
             zip = ?,
             conferences = ?,
             experience = ?,
             profile_photo = ?,
             status = CASE WHEN role <> 'super_admin' THEN 'active' ELSE status END,
             profile_completed_at = CASE WHEN role <> 'super_admin' AND profile_completed_at IS NULL THEN NOW() ELSE profile_completed_at END,
             updated_at = NOW()
         WHERE id = ?"
    );
    $stmt->execute([
        $firstName,
        $lastName,
        $email,
        $phone,
        $sex,
        $race,
        $addressLine1,
        $addressLine2,
        $city,
        $state,
        $zip,
        $conferences,
        $experience,
        $profilePhotoPath,
        (int) $user['id'],
    ]);

    $fresh = current_database_user();
    $_SESSION['user'] = public_auth_user($fresh ?: $user);
    $message = (($_SESSION['user']['role'] ?? '') !== 'super_admin' && ($_SESSION['user']['status'] ?? '') === 'active')
        ? 'Profile updated. Your account is now active.'
        : 'Profile updated.';
    rtbo_profile_update_notify($_SESSION['user'], $user, $message, $email);
    echo json_encode(['success' => true, 'message' => $message, 'user' => $_SESSION['user']], JSON_UNESCAPED_SLASHES);
} catch (Throwable $error) {
    error_log('RTBO profile update failed: ' . $error->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Unable to update profile right now.']);
}

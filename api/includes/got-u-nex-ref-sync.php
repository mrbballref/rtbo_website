<?php
declare(strict_types=1);

function got_u_nex_ref_profile_photo_payload(string $path): ?array
{
    if ($path === '' || !is_file($path) || !is_readable($path)) {
        return null;
    }

    $size = filesize($path);
    if ($size === false || $size > 5 * 1024 * 1024) {
        return null;
    }

    $extension = strtolower(pathinfo($path, PATHINFO_EXTENSION));
    $mimeType = match ($extension) {
        'jpg', 'jpeg' => 'image/jpeg',
        'png' => 'image/png',
        'webp' => 'image/webp',
        default => 'application/octet-stream',
    };

    if (function_exists('finfo_open')) {
        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        if ($finfo !== false) {
            $detected = finfo_file($finfo, $path);
            finfo_close($finfo);
            if (is_string($detected) && strpos($detected, 'image/') === 0) {
                $mimeType = $detected;
            }
        }
    }

    return [
        'filename' => basename($path),
        'mime_type' => $mimeType,
        'data' => base64_encode((string) file_get_contents($path)),
    ];
}

function got_u_nex_ref_registration_payload(array $registration): array
{
    $levels = $registration['levels'] ?? [];
    $sessions = $registration['sessions'] ?? [];
    $conferences = trim((string) ($registration['current_conferences'] ?? ''));

    return [
        'external_source' => 'rtbo_registration',
        'external_registration_id' => (string) ($registration['id'] ?? ''),
        'submitted_at' => (string) ($registration['submitted_at'] ?? date('c')),
        'role' => 'official',
        'name' => trim((string) ($registration['full_name'] ?? '')),
        'first_name' => (string) ($registration['first_name'] ?? ''),
        'last_name' => (string) ($registration['last_name'] ?? ''),
        'email' => strtolower(trim((string) ($registration['email'] ?? ''))),
        'phone' => rtbo_format_phone_number((string) ($registration['phone'] ?? '')),
        'address_line1' => (string) ($registration['address_1'] ?? ''),
        'address_line2' => (string) ($registration['address_2'] ?? ''),
        'city' => (string) ($registration['city'] ?? ''),
        'state' => (string) ($registration['state'] ?? ''),
        'zip' => (string) ($registration['zip'] ?? ''),
        'experience' => (string) ($registration['experience'] ?? ''),
        'gender' => (string) ($registration['gender'] ?? ''),
        'sex' => (string) ($registration['sex'] ?? $registration['gender'] ?? ''),
        'race' => (string) ($registration['race'] ?? ''),
        'level_of_experience' => implode(', ', is_array($levels) ? $levels : []),
        'high_school_conferences' => $conferences,
        'college_conferences' => $conferences,
        'current_conferences' => $conferences,
        'goals' => (string) ($registration['goals'] ?? ''),
        'registration_sessions' => is_array($sessions) ? $sessions : [],
        'payment_provider' => (string) ($registration['payment_provider'] ?? ''),
        'payment_status' => (string) ($registration['payment_status'] ?? 'pending'),
        'pdf_path' => (string) ($registration['pdf_path'] ?? ''),
        'profile_photo' => got_u_nex_ref_profile_photo_payload((string) ($registration['profile_photo_path'] ?? '')),
        'single_login_note' => 'Created from Raising The Bar Officiating Inc. registration. Use the same email for Got U Nex Ref access.',
    ];
}

function got_u_nex_ref_push_payload(array $payload): array
{
    if (GOT_U_NEX_REF_API_URL === '' || GOT_U_NEX_REF_SYNC_TOKEN === '') {
        return [
            'status' => 'queued',
            'message' => 'Got U Nex Ref API URL or sync token is not configured.',
        ];
    }

    $url = GOT_U_NEX_REF_API_URL . '/integrations/rtbo/registration';
    $json = json_encode($payload, JSON_UNESCAPED_SLASHES);

    if ($json === false) {
        return ['status' => 'push_failed', 'message' => 'Unable to encode Got U Nex Ref payload.'];
    }

    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $json,
            CURLOPT_HTTPHEADER => [
                'Content-Type: application/json',
                'Authorization: Bearer ' . GOT_U_NEX_REF_SYNC_TOKEN,
            ],
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 12,
        ]);

        $body = curl_exec($ch);
        $statusCode = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);

        if ($statusCode >= 200 && $statusCode < 300) {
            return ['status' => 'pushed', 'status_code' => $statusCode, 'response' => $body ?: ''];
        }

        return [
            'status' => 'push_failed',
            'status_code' => $statusCode,
            'message' => $error ?: 'Got U Nex Ref sync endpoint rejected the request.',
            'response' => $body ?: '',
        ];
    }

    $context = stream_context_create([
        'http' => [
            'method' => 'POST',
            'header' => "Content-Type: application/json\r\nAuthorization: Bearer " . GOT_U_NEX_REF_SYNC_TOKEN . "\r\n",
            'content' => $json,
            'timeout' => 12,
            'ignore_errors' => true,
        ],
    ]);

    $body = @file_get_contents($url, false, $context);
    $statusLine = $http_response_header[0] ?? '';
    preg_match('/\s(\d{3})\s/', $statusLine, $matches);
    $statusCode = isset($matches[1]) ? (int) $matches[1] : 0;

    if ($statusCode >= 200 && $statusCode < 300) {
        return ['status' => 'pushed', 'status_code' => $statusCode, 'response' => $body ?: ''];
    }

    return [
        'status' => 'push_failed',
        'status_code' => $statusCode,
        'message' => 'Got U Nex Ref sync endpoint could not be reached.',
        'response' => $body ?: '',
    ];
}

function sync_registration_to_got_u_nex_ref(array $registration): array
{
    ensure_dir(GOT_U_NEX_REF_SYNC_DIR);

    $payload = got_u_nex_ref_registration_payload($registration);
    $syncPath = GOT_U_NEX_REF_SYNC_DIR . '/' . $payload['external_registration_id'] . '.json';
    $pushResult = got_u_nex_ref_push_payload($payload);

    $record = [
        'created_at' => date('c'),
        'status' => $pushResult['status'],
        'push_result' => $pushResult,
        'payload' => $payload,
    ];

    file_put_contents($syncPath, json_encode($record, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES), LOCK_EX);

    return [
        'status' => $pushResult['status'],
        'path' => $syncPath,
        'message' => $pushResult['message'] ?? '',
    ];
}

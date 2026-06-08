<?php
declare(strict_types=1);

function rtbo_notification_template_definitions(): array
{
    return [
        'assignment_released' => [
            'label' => 'Assignment released',
            'description' => 'Sent when an assignment is published or released to an official.',
            'default_email_subject' => 'New RTBO assignment released: {{game_summary}}',
            'default_email_body' => "Hello {{recipient_name}},\n\nA new RTBO assignment has been released to your schedule.\n\nGame: {{game_summary}}\nDate: {{game_date}}\nTime: {{game_time}}\nLocation: {{location_name}}\nPosition: {{position}}\n\nPlease review and respond from your RTBO dashboard.",
            'default_sms_body' => 'New RTBO assignment: {{game_summary}}. Review and respond from your dashboard.',
            'default_pdf_heading' => 'RTBO Assignment Released',
            'default_pdf_body' => "Assignment Released\n\nOfficial: {{recipient_name}}\nGame: {{game_summary}}\nDate/Time: {{game_date}} {{game_time}}\nLocation: {{location_name}}\nPosition: {{position}}\nStatus: {{status}}",
        ],
        'assignment_updated' => [
            'label' => 'Assignment updated',
            'description' => 'Sent when a released assignment changes.',
            'default_email_subject' => 'RTBO assignment updated: {{game_summary}}',
            'default_email_body' => "Hello {{recipient_name}},\n\nAn RTBO assignment has been updated.\n\nGame: {{game_summary}}\nChanged: {{changed_fields}}\nReason: {{reason}}\n\nPlease review the updated assignment in your dashboard.",
            'default_sms_body' => 'RTBO assignment updated: {{game_summary}}. {{reason}}',
            'default_pdf_heading' => 'RTBO Assignment Update',
            'default_pdf_body' => "Assignment Update\n\nGame: {{game_summary}}\nChanged Fields: {{changed_fields}}\nReason: {{reason}}\nUpdated By: {{actor_name}}",
        ],
        'assignment_canceled' => [
            'label' => 'Assignment canceled',
            'description' => 'Sent when an assignment or game is cancelled, postponed, rescheduled, or deleted.',
            'default_email_subject' => 'RTBO assignment status changed: {{game_summary}}',
            'default_email_body' => "Hello {{recipient_name}},\n\nAn RTBO assignment status changed.\n\nGame: {{game_summary}}\nStatus: {{status}}\nReason: {{reason}}\n\nPlease check your dashboard before traveling to the game site.",
            'default_sms_body' => 'RTBO assignment status changed: {{game_summary}}. Status: {{status}}. {{reason}}',
            'default_pdf_heading' => 'RTBO Assignment Status Change',
            'default_pdf_body' => "Assignment Status Change\n\nGame: {{game_summary}}\nStatus: {{status}}\nReason: {{reason}}\nDate/Time: {{game_date}} {{game_time}}",
        ],
        'profile_completed' => [
            'label' => 'Profile completed',
            'description' => 'Sent when a member completes required profile information.',
            'default_email_subject' => 'RTBO profile completed for {{recipient_name}}',
            'default_email_body' => "Profile completion has been recorded.\n\nMember: {{recipient_name}}\nRole: {{role}}\nEmail: {{email}}\nCompleted: {{created_at}}",
            'default_sms_body' => 'RTBO profile completed for {{recipient_name}}.',
            'default_pdf_heading' => 'RTBO Profile Completion',
            'default_pdf_body' => "Profile Completed\n\nMember: {{recipient_name}}\nRole: {{role}}\nEmail: {{email}}\nDate: {{created_at}}",
        ],
        'contract_signed' => [
            'label' => 'Contract signed',
            'description' => 'Sent when a contract is signed.',
            'default_email_subject' => 'RTBO contract signed: {{contract_title}}',
            'default_email_body' => "A contract has been signed.\n\nContract: {{contract_title}}\nSigner: {{recipient_name}}\nEvent: {{event_name}}\nSigned: {{created_at}}\n\nReview the signed contract from the dashboard.",
            'default_sms_body' => 'RTBO contract signed: {{contract_title}}.',
            'default_pdf_heading' => 'RTBO Contract Signed',
            'default_pdf_body' => "Contract Signed\n\nContract: {{contract_title}}\nSigner: {{recipient_name}}\nEvent: {{event_name}}\nSigned: {{created_at}}",
        ],
        'w9_submitted' => [
            'label' => 'W-9 submitted',
            'description' => 'Sent when a W-9 tax form is submitted.',
            'default_email_subject' => 'RTBO W-9 submitted by {{recipient_name}}',
            'default_email_body' => "A W-9 has been submitted.\n\nMember: {{recipient_name}}\nEmail: {{email}}\nSubmitted: {{created_at}}\n\nReview the tax center for secure details.",
            'default_sms_body' => 'RTBO W-9 submitted by {{recipient_name}}.',
            'default_pdf_heading' => 'RTBO W-9 Submission',
            'default_pdf_body' => "W-9 Submitted\n\nMember: {{recipient_name}}\nEmail: {{email}}\nSubmitted: {{created_at}}\nSensitive tax fields are not included in this notification template.",
        ],
        'payment_processed' => [
            'label' => 'Payment processed',
            'description' => 'Sent when a payment or invoice transaction is processed.',
            'default_email_subject' => 'RTBO payment processed: {{amount}}',
            'default_email_body' => "A payment has been processed.\n\nRecipient: {{recipient_name}}\nAmount: {{amount}}\nStatus: {{status}}\nReference: {{reference}}\nProcessed: {{created_at}}",
            'default_sms_body' => 'RTBO payment processed: {{amount}}. Status: {{status}}.',
            'default_pdf_heading' => 'RTBO Payment Processed',
            'default_pdf_body' => "Payment Processed\n\nRecipient: {{recipient_name}}\nAmount: {{amount}}\nStatus: {{status}}\nReference: {{reference}}\nDate: {{created_at}}",
        ],
        'review_pending_approval' => [
            'label' => 'Review pending approval',
            'description' => 'Sent when a new review needs admin approval.',
            'default_email_subject' => 'RTBO review pending approval from {{recipient_name}}',
            'default_email_body' => "A public review is pending approval.\n\nReviewer: {{recipient_name}}\nRating: {{rating}}\nCourse/Event: {{event_name}}\nSubmitted: {{created_at}}\n\nReview it from the dashboard before publishing.",
            'default_sms_body' => 'RTBO review pending approval from {{recipient_name}}.',
            'default_pdf_heading' => 'RTBO Review Pending Approval',
            'default_pdf_body' => "Review Pending Approval\n\nReviewer: {{recipient_name}}\nRating: {{rating}}\nCourse/Event: {{event_name}}\nSubmitted: {{created_at}}",
        ],
        'school_event_request_received' => [
            'label' => 'School event request received',
            'description' => 'Sent when a school or event request arrives.',
            'default_email_subject' => 'New RTBO school/event request: {{event_name}}',
            'default_email_body' => "A school/event request has been received.\n\nContact: {{recipient_name}}\nOrganization: {{organization}}\nEvent: {{event_name}}\nDate: {{game_date}}\nPhone: {{phone}}\nEmail: {{email}}\n\nFollow up from the dashboard.",
            'default_sms_body' => 'New RTBO school/event request: {{event_name}} from {{organization}}.',
            'default_pdf_heading' => 'RTBO School/Event Request',
            'default_pdf_body' => "School/Event Request\n\nContact: {{recipient_name}}\nOrganization: {{organization}}\nEvent: {{event_name}}\nDate: {{game_date}}\nPhone: {{phone}}\nEmail: {{email}}",
        ],
        'training_school_registration_confirmed' => [
            'label' => 'Training school registration confirmed',
            'description' => 'Sent when a training school or RefZone registration is confirmed.',
            'default_email_subject' => 'RTBO training registration confirmed',
            'default_email_body' => "Hello {{recipient_name}},\n\nYour RTBO training registration is confirmed.\n\nProgram: {{program_name}}\nSession: {{event_name}}\nStart Date: {{game_date}}\nStatus: {{status}}\n\nUse your dashboard for course access and next steps.",
            'default_sms_body' => 'RTBO training registration confirmed for {{program_name}}.',
            'default_pdf_heading' => 'RTBO Training Registration Confirmation',
            'default_pdf_body' => "Training Registration Confirmed\n\nParticipant: {{recipient_name}}\nProgram: {{program_name}}\nSession: {{event_name}}\nStatus: {{status}}\nConfirmed: {{created_at}}",
        ],
    ];
}

function rtbo_notification_template_aliases(): array
{
    return [
        'game_published_assigned' => 'assignment_released',
        'assigned_game_changed' => 'assignment_updated',
        'assigned_game_team_changed' => 'assignment_updated',
        'game_assignment_cancelled' => 'assignment_canceled',
        'game_assignment_canceled' => 'assignment_canceled',
        'assigned_game_cancelled' => 'assignment_canceled',
        'assigned_game_canceled' => 'assignment_canceled',
        'profile_completed' => 'profile_completed',
        'contract_signed' => 'contract_signed',
        'w9_submitted' => 'w9_submitted',
        'tax_form_submitted' => 'w9_submitted',
        'payment_processed' => 'payment_processed',
        'invoice_paid' => 'payment_processed',
        'review_pending_approval' => 'review_pending_approval',
        'review_submitted' => 'review_pending_approval',
        'school_event_request_received' => 'school_event_request_received',
        'event_interest_received' => 'school_event_request_received',
        'training_school_registration_confirmed' => 'training_school_registration_confirmed',
        'registration_confirmed' => 'training_school_registration_confirmed',
        'refzone_registration_confirmed' => 'training_school_registration_confirmed',
    ];
}

function rtbo_notification_template_storage_path(): string
{
    return STORAGE_DIR . '/notification-templates.json';
}

function rtbo_notification_template_default_record(string $key, array $definition): array
{
    return [
        'key' => $key,
        'label' => (string) ($definition['label'] ?? $key),
        'description' => (string) ($definition['description'] ?? ''),
        'enabled' => true,
        'email_subject' => (string) ($definition['default_email_subject'] ?? ''),
        'email_body' => (string) ($definition['default_email_body'] ?? ''),
        'sms_body' => (string) ($definition['default_sms_body'] ?? ''),
        'pdf_heading' => (string) ($definition['default_pdf_heading'] ?? ''),
        'pdf_body' => (string) ($definition['default_pdf_body'] ?? ''),
        'updated_at' => '',
    ];
}

function rtbo_notification_template_defaults(): array
{
    $records = [];
    foreach (rtbo_notification_template_definitions() as $key => $definition) {
        $records[$key] = rtbo_notification_template_default_record($key, $definition);
    }

    return $records;
}

function rtbo_notification_template_column_exists(string $column): bool
{
    try {
        $stmt = db()->prepare(
            "SELECT COUNT(*)
             FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE()
               AND TABLE_NAME = 'notification_templates'
               AND COLUMN_NAME = ?"
        );
        $stmt->execute([$column]);
        return (int) $stmt->fetchColumn() > 0;
    } catch (Throwable $error) {
        error_log('RTBO notification template column lookup failed: ' . $error->getMessage());
        return false;
    }
}

function rtbo_ensure_notification_template_table(): void
{
    db()->exec(
        "CREATE TABLE IF NOT EXISTS notification_templates (
            id INT AUTO_INCREMENT PRIMARY KEY,
            template_key VARCHAR(100) NOT NULL UNIQUE,
            label VARCHAR(190) NOT NULL,
            description TEXT NULL,
            enabled TINYINT(1) NOT NULL DEFAULT 1,
            email_subject VARCHAR(255) NULL,
            email_body MEDIUMTEXT NULL,
            sms_body TEXT NULL,
            pdf_heading VARCHAR(255) NULL,
            pdf_body MEDIUMTEXT NULL,
            updated_by INT NULL,
            updated_at DATETIME NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_notification_templates_key (template_key),
            INDEX idx_notification_templates_enabled (enabled)
        )"
    );

    foreach ([
        'template_key' => "ALTER TABLE notification_templates ADD COLUMN template_key VARCHAR(100) NOT NULL UNIQUE AFTER id",
        'label' => "ALTER TABLE notification_templates ADD COLUMN label VARCHAR(190) NOT NULL AFTER template_key",
        'description' => "ALTER TABLE notification_templates ADD COLUMN description TEXT NULL AFTER label",
        'enabled' => "ALTER TABLE notification_templates ADD COLUMN enabled TINYINT(1) NOT NULL DEFAULT 1 AFTER description",
        'email_subject' => "ALTER TABLE notification_templates ADD COLUMN email_subject VARCHAR(255) NULL AFTER enabled",
        'email_body' => "ALTER TABLE notification_templates ADD COLUMN email_body MEDIUMTEXT NULL AFTER email_subject",
        'sms_body' => "ALTER TABLE notification_templates ADD COLUMN sms_body TEXT NULL AFTER email_body",
        'pdf_heading' => "ALTER TABLE notification_templates ADD COLUMN pdf_heading VARCHAR(255) NULL AFTER sms_body",
        'pdf_body' => "ALTER TABLE notification_templates ADD COLUMN pdf_body MEDIUMTEXT NULL AFTER pdf_heading",
        'updated_by' => "ALTER TABLE notification_templates ADD COLUMN updated_by INT NULL AFTER pdf_body",
        'updated_at' => "ALTER TABLE notification_templates ADD COLUMN updated_at DATETIME NULL AFTER updated_by",
        'created_at' => "ALTER TABLE notification_templates ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP",
    ] as $column => $sql) {
        if (!rtbo_notification_template_column_exists($column)) {
            db()->exec($sql);
        }
    }
}

function rtbo_notification_templates_db_available(): bool
{
    try {
        rtbo_ensure_notification_template_table();
        return true;
    } catch (Throwable $error) {
        error_log('RTBO notification templates using file fallback: ' . $error->getMessage());
        return false;
    }
}

function rtbo_notification_templates_file_load(): array
{
    $path = rtbo_notification_template_storage_path();
    if (!is_file($path)) {
        return [];
    }

    $decoded = json_decode((string) file_get_contents($path), true);
    return is_array($decoded) ? $decoded : [];
}

function rtbo_notification_templates_file_save(array $records): void
{
    ensure_dir(dirname(rtbo_notification_template_storage_path()));
    file_put_contents(
        rtbo_notification_template_storage_path(),
        json_encode(array_values($records), JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES),
        LOCK_EX
    );
}

function rtbo_notification_template_normalize(array $record): array
{
    $key = (string) ($record['key'] ?? $record['template_key'] ?? '');
    $definition = rtbo_notification_template_definitions()[$key] ?? [];
    $fallback = rtbo_notification_template_default_record($key, $definition);

    return [
        'key' => $key,
        'label' => trim((string) ($record['label'] ?? $fallback['label'] ?? $key)),
        'description' => trim((string) ($record['description'] ?? $fallback['description'] ?? '')),
        'enabled' => (bool) ((int) ($record['enabled'] ?? 1)),
        'email_subject' => (string) ($record['email_subject'] ?? $fallback['email_subject'] ?? ''),
        'email_body' => (string) ($record['email_body'] ?? $fallback['email_body'] ?? ''),
        'sms_body' => (string) ($record['sms_body'] ?? $fallback['sms_body'] ?? ''),
        'pdf_heading' => (string) ($record['pdf_heading'] ?? $fallback['pdf_heading'] ?? ''),
        'pdf_body' => (string) ($record['pdf_body'] ?? $fallback['pdf_body'] ?? ''),
        'updated_at' => (string) ($record['updated_at'] ?? ''),
    ];
}

function rtbo_notification_templates_all(): array
{
    $records = rtbo_notification_template_defaults();

    if (rtbo_notification_templates_db_available()) {
        $stmt = db()->query(
            "SELECT template_key, label, description, enabled, email_subject, email_body, sms_body, pdf_heading, pdf_body, updated_at
             FROM notification_templates"
        );
        foreach ($stmt->fetchAll() as $row) {
            $key = (string) ($row['template_key'] ?? '');
            if (isset($records[$key])) {
                $records[$key] = rtbo_notification_template_normalize($row);
            }
        }
    } else {
        foreach (rtbo_notification_templates_file_load() as $record) {
            if (!is_array($record)) {
                continue;
            }
            $key = (string) ($record['key'] ?? $record['template_key'] ?? '');
            if (isset($records[$key])) {
                $records[$key] = rtbo_notification_template_normalize($record);
            }
        }
    }

    return array_values($records);
}

function rtbo_notification_template_by_key(string $key): ?array
{
    $key = rtbo_notification_template_key_for_type($key);
    foreach (rtbo_notification_templates_all() as $template) {
        if ((string) ($template['key'] ?? '') === $key) {
            return $template;
        }
    }

    return null;
}

function rtbo_notification_template_key_for_type(string $type): string
{
    $type = strtolower(trim($type));
    $aliases = rtbo_notification_template_aliases();
    return $aliases[$type] ?? $type;
}

function rtbo_notification_template_save(array $input, array $user): array
{
    $definitions = rtbo_notification_template_definitions();
    $key = (string) ($input['key'] ?? $input['template_key'] ?? '');
    if (!isset($definitions[$key])) {
        throw new RuntimeException('Choose a valid notification template.');
    }

    $existing = rtbo_notification_template_by_key($key) ?: rtbo_notification_template_default_record($key, $definitions[$key]);
    $record = rtbo_notification_template_normalize([
        ...$existing,
        'key' => $key,
        'label' => $definitions[$key]['label'],
        'description' => $definitions[$key]['description'],
        'enabled' => !empty($input['enabled']),
        'email_subject' => trim((string) ($input['email_subject'] ?? '')),
        'email_body' => trim((string) ($input['email_body'] ?? '')),
        'sms_body' => trim((string) ($input['sms_body'] ?? '')),
        'pdf_heading' => trim((string) ($input['pdf_heading'] ?? '')),
        'pdf_body' => trim((string) ($input['pdf_body'] ?? '')),
        'updated_at' => gmdate('c'),
    ]);

    if ($record['email_subject'] === '' || $record['email_body'] === '' || $record['sms_body'] === '' || $record['pdf_body'] === '') {
        throw new RuntimeException('Email, SMS, and PDF template content are required.');
    }

    if (rtbo_notification_templates_db_available()) {
        $stmt = db()->prepare(
            "INSERT INTO notification_templates
                (template_key, label, description, enabled, email_subject, email_body, sms_body, pdf_heading, pdf_body, updated_by, updated_at)
             VALUES
                (:template_key, :label, :description, :enabled, :email_subject, :email_body, :sms_body, :pdf_heading, :pdf_body, :updated_by, NOW())
             ON DUPLICATE KEY UPDATE
                label = VALUES(label),
                description = VALUES(description),
                enabled = VALUES(enabled),
                email_subject = VALUES(email_subject),
                email_body = VALUES(email_body),
                sms_body = VALUES(sms_body),
                pdf_heading = VALUES(pdf_heading),
                pdf_body = VALUES(pdf_body),
                updated_by = VALUES(updated_by),
                updated_at = NOW()"
        );
        $stmt->execute([
            ':template_key' => $key,
            ':label' => $record['label'],
            ':description' => $record['description'],
            ':enabled' => $record['enabled'] ? 1 : 0,
            ':email_subject' => $record['email_subject'],
            ':email_body' => $record['email_body'],
            ':sms_body' => $record['sms_body'],
            ':pdf_heading' => $record['pdf_heading'],
            ':pdf_body' => $record['pdf_body'],
            ':updated_by' => (int) ($user['id'] ?? 0) ?: null,
        ]);
    } else {
        $records = [];
        $found = false;
        foreach (rtbo_notification_templates_file_load() as $candidate) {
            if (!is_array($candidate)) {
                continue;
            }
            if ((string) ($candidate['key'] ?? '') === $key) {
                $records[] = $record;
                $found = true;
            } else {
                $records[] = $candidate;
            }
        }
        if (!$found) {
            $records[] = $record;
        }
        rtbo_notification_templates_file_save($records);
    }

    return rtbo_notification_template_by_key($key) ?: $record;
}

function rtbo_notification_template_reset(string $key, array $user): array
{
    $definitions = rtbo_notification_template_definitions();
    if (!isset($definitions[$key])) {
        throw new RuntimeException('Choose a valid notification template.');
    }

    $record = rtbo_notification_template_default_record($key, $definitions[$key]);
    $record['updated_at'] = gmdate('c');

    return rtbo_notification_template_save($record, $user);
}

function rtbo_notification_template_placeholders(): array
{
    return [
        'recipient_name',
        'actor_name',
        'game_summary',
        'game_date',
        'game_time',
        'location_name',
        'position',
        'status',
        'reason',
        'changed_fields',
        'role',
        'email',
        'phone',
        'organization',
        'event_name',
        'contract_title',
        'amount',
        'reference',
        'rating',
        'program_name',
        'created_at',
    ];
}

function rtbo_notification_template_context(array $notification): array
{
    $metadata = $notification['metadata'] ?? [];
    if (is_string($metadata)) {
        $decoded = json_decode($metadata, true);
        $metadata = is_array($decoded) ? $decoded : [];
    }
    $record = is_array($metadata['record'] ?? null) ? $metadata['record'] : [];

    $value = static function (array $keys, string $fallback = '') use ($notification, $metadata, $record): string {
        foreach ($keys as $key) {
            foreach ([$metadata, $record, $notification] as $source) {
                if (isset($source[$key]) && trim((string) $source[$key]) !== '') {
                    $raw = $source[$key];
                    if (is_array($raw)) {
                        return implode(', ', array_filter(array_map('strval', $raw)));
                    }
                    return trim((string) $raw);
                }
            }
        }

        return $fallback;
    };

    $recipientName = $value(['recipient_name', 'member_name', 'official_name', 'full_name', 'name'], 'RTBO Member');
    $gameSummary = $value(['game_summary'], '');
    if ($gameSummary === '') {
        $home = $value(['home_team'], '');
        $away = $value(['away_team'], '');
        $gameSummary = trim(($away !== '' ? $away : 'Visiting Team') . ' at ' . ($home !== '' ? $home : 'Home Team'));
    }

    return [
        'recipient_name' => $recipientName,
        'actor_name' => $value(['actor_name'], 'RTBO'),
        'game_summary' => $gameSummary,
        'game_date' => $value(['game_date', 'date'], 'Date pending'),
        'game_time' => $value(['game_time', 'time'], 'Time pending'),
        'location_name' => $value(['location_name', 'venue', 'gym'], 'Location pending'),
        'position' => $value(['position', 'position_name'], 'Position pending'),
        'status' => $value(['status', 'payment_status', 'assignment_status'], 'pending'),
        'reason' => $value(['reason', 'cancellation_reason', 'admin_reason'], ''),
        'changed_fields' => $value(['changed_fields'], 'Details changed'),
        'role' => $value(['role'], ''),
        'email' => $value(['email'], ''),
        'phone' => $value(['phone'], ''),
        'organization' => $value(['organization', 'school', 'school_name'], ''),
        'event_name' => $value(['event_name', 'event', 'sessions', 'school_or_course'], ''),
        'contract_title' => $value(['contract_title', 'contract_name', 'title'], 'RTBO Contract'),
        'amount' => $value(['amount', 'amount_label', 'amount_paid'], ''),
        'reference' => $value(['reference', 'payment_intent', 'invoice_number', 'id'], ''),
        'rating' => $value(['rating'], ''),
        'program_name' => $value(['program_name', 'course', 'membership', 'sessions'], ''),
        'created_at' => $value(['created_at', 'submitted_at'], date('c')),
    ];
}

function rtbo_notification_template_render_string(string $template, array $context): string
{
    return (string) preg_replace_callback('/{{\s*([a-zA-Z0-9_]+)\s*}}/', static function (array $matches) use ($context): string {
        $key = (string) ($matches[1] ?? '');
        return (string) ($context[$key] ?? '');
    }, $template);
}

function rtbo_notification_template_render(array $template, array $notification): array
{
    $context = rtbo_notification_template_context($notification);
    return [
        'template_key' => (string) ($template['key'] ?? ''),
        'email_subject' => rtbo_notification_template_render_string((string) ($template['email_subject'] ?? ''), $context),
        'email_body' => rtbo_notification_template_render_string((string) ($template['email_body'] ?? ''), $context),
        'sms_body' => rtbo_notification_template_render_string((string) ($template['sms_body'] ?? ''), $context),
        'pdf_heading' => rtbo_notification_template_render_string((string) ($template['pdf_heading'] ?? ''), $context),
        'pdf_body' => rtbo_notification_template_render_string((string) ($template['pdf_body'] ?? ''), $context),
        'context' => $context,
    ];
}

function rtbo_notification_apply_template(array $notification): array
{
    $template = rtbo_notification_template_by_key((string) ($notification['type'] ?? ''));
    if (!$template || empty($template['enabled'])) {
        return $notification;
    }

    $rendered = rtbo_notification_template_render($template, $notification);
    $metadata = is_array($notification['metadata'] ?? null) ? $notification['metadata'] : [];
    $metadata['notification_formats'] = [
        'template_key' => $rendered['template_key'],
        'email' => [
            'subject' => $rendered['email_subject'],
            'body' => $rendered['email_body'],
        ],
        'sms' => [
            'body' => $rendered['sms_body'],
        ],
        'pdf' => [
            'heading' => $rendered['pdf_heading'],
            'body' => $rendered['pdf_body'],
        ],
    ];

    return [
        ...$notification,
        'title' => $rendered['email_subject'] !== '' ? $rendered['email_subject'] : ($notification['title'] ?? ''),
        'body' => $rendered['sms_body'] !== '' ? $rendered['sms_body'] : ($notification['body'] ?? ''),
        'metadata' => $metadata,
    ];
}

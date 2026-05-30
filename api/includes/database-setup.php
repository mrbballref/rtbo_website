<?php
declare(strict_types=1);

require_once __DIR__ . '/users.php';
require_once __DIR__ . '/admin-members.php';
require_once __DIR__ . '/admin-dashboard.php';
require_once __DIR__ . '/admin-schools.php';
require_once __DIR__ . '/admin-games.php';
require_once __DIR__ . '/admin-organizations.php';
require_once __DIR__ . '/newsletter.php';
require_once __DIR__ . '/contact.php';
require_once __DIR__ . '/reviews.php';
require_once __DIR__ . '/registration-store.php';
require_once __DIR__ . '/refzone-enrollments.php';
require_once __DIR__ . '/geo.php';
require_once __DIR__ . '/notifications.php';
require_once __DIR__ . '/sms.php';
require_once __DIR__ . '/availability-sharing.php';
require_once __DIR__ . '/password-reset.php';
require_once __DIR__ . '/feature-store.php';
require_once __DIR__ . '/client-spotlight.php';
require_once __DIR__ . '/podcast.php';
require_once __DIR__ . '/shop-inventory.php';
require_once __DIR__ . '/site-content.php';
require_once __DIR__ . '/refzone-courses.php';
require_once __DIR__ . '/resume.php';
require_once __DIR__ . '/schedule-review.php';
require_once __DIR__ . '/session-tracking.php';
require_once __DIR__ . '/store-orders.php';

function rtbo_database_setup_exec(string $sql): void
{
    db()->exec($sql);
}

function rtbo_ensure_endpoint_tables(): array
{
    $tables = [];

    rtbo_database_setup_exec(
        "CREATE TABLE IF NOT EXISTS admin_invoices (
            id INT AUTO_INCREMENT PRIMARY KEY,
            invoice_number VARCHAR(80) NOT NULL,
            invoice_date DATE NULL,
            due_date DATE NULL,
            school_name VARCHAR(190) NULL,
            contact_name VARCHAR(190) NULL,
            email VARCHAR(190) NULL,
            phone VARCHAR(80) NULL,
            billing_address TEXT NULL,
            event_name VARCHAR(190) NULL,
            game_level VARCHAR(120) NULL,
            assigning_fee_type VARCHAR(120) NULL,
            assigning_qty DECIMAL(10,2) NOT NULL DEFAULT 1,
            assigning_rate DECIMAL(10,2) NOT NULL DEFAULT 0,
            assigning_fee DECIMAL(10,2) NOT NULL DEFAULT 0,
            assigning_fee_items TEXT NULL,
            officials_fee_type VARCHAR(120) NULL,
            officials_qty DECIMAL(10,2) NOT NULL DEFAULT 1,
            officials_rate DECIMAL(10,2) NOT NULL DEFAULT 0,
            officials_fee DECIMAL(10,2) NOT NULL DEFAULT 0,
            officials_fee_items TEXT NULL,
            travel_fee_type VARCHAR(120) NULL,
            travel_qty DECIMAL(10,2) NOT NULL DEFAULT 1,
            travel_rate DECIMAL(10,2) NOT NULL DEFAULT 0,
            travel_fee DECIMAL(10,2) NOT NULL DEFAULT 0,
            travel_fee_items TEXT NULL,
            additional_fee_type VARCHAR(120) NULL,
            additional_qty DECIMAL(10,2) NOT NULL DEFAULT 1,
            additional_rate DECIMAL(10,2) NOT NULL DEFAULT 0,
            additional_fee DECIMAL(10,2) NOT NULL DEFAULT 0,
            additional_fee_items TEXT NULL,
            credit_card_requested TINYINT(1) NOT NULL DEFAULT 0,
            notes TEXT NULL,
            status VARCHAR(40) NOT NULL DEFAULT 'draft',
            created_by INT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NULL,
            INDEX idx_admin_invoices_number (invoice_number),
            INDEX idx_admin_invoices_created (created_at)
        )"
    );
    $tables[] = 'admin_invoices';

    rtbo_database_setup_exec(
        "CREATE TABLE IF NOT EXISTS admin_contracts (
            id VARCHAR(120) PRIMARY KEY,
            agreement_number VARCHAR(120) NOT NULL,
            signature_token VARCHAR(120) NOT NULL,
            client_name VARCHAR(190) NULL,
            event_name VARCHAR(190) NULL,
            contact_email VARCHAR(190) NULL,
            contract_status VARCHAR(80) NOT NULL DEFAULT 'Draft',
            payload LONGTEXT NOT NULL,
            saved_at DATETIME NULL,
            updated_at DATETIME NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY uniq_admin_contract_agreement (agreement_number),
            UNIQUE KEY uniq_admin_contract_token (signature_token),
            INDEX idx_admin_contract_status (contract_status),
            INDEX idx_admin_contract_updated (updated_at)
        )"
    );
    $tables[] = 'admin_contracts';

    rtbo_database_setup_exec(
        "CREATE TABLE IF NOT EXISTS admin_tax_forms (
            id INT AUTO_INCREMENT PRIMARY KEY,
            form_number VARCHAR(120) NOT NULL,
            record_name VARCHAR(190) NULL,
            requester_type VARCHAR(120) NULL,
            requester_name VARCHAR(190) NULL,
            requester_email VARCHAR(190) NULL,
            available_for_download TINYINT(1) NOT NULL DEFAULT 1,
            taxpayer_name VARCHAR(190) NULL,
            business_name VARCHAR(190) NULL,
            tax_classification VARCHAR(120) NULL,
            tin_masked VARCHAR(40) NULL,
            status VARCHAR(60) NOT NULL DEFAULT 'ready',
            created_by INT NULL,
            payload LONGTEXT NOT NULL,
            created_at DATETIME NULL,
            updated_at DATETIME NULL,
            UNIQUE KEY uniq_admin_tax_form_number (form_number),
            INDEX idx_admin_tax_forms_requester (requester_email),
            INDEX idx_admin_tax_forms_status (status)
        )"
    );
    $tables[] = 'admin_tax_forms';

    rtbo_database_setup_exec(
        "CREATE TABLE IF NOT EXISTS payment_incoming (
            id INT AUTO_INCREMENT PRIMARY KEY,
            payer_type VARCHAR(80) NOT NULL DEFAULT 'school',
            payer_name VARCHAR(190) NOT NULL,
            contact_name VARCHAR(190) NULL,
            email VARCHAR(190) NULL,
            phone VARCHAR(80) NULL,
            description TEXT NULL,
            amount_cents INT NOT NULL DEFAULT 0,
            due_date DATE NULL,
            payment_method VARCHAR(80) NOT NULL DEFAULT 'stripe_checkout',
            status VARCHAR(40) NOT NULL DEFAULT 'pending',
            stripe_checkout_session_id VARCHAR(190) NULL,
            payment_url TEXT NULL,
            created_by INT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NULL,
            INDEX idx_payment_incoming_status (status),
            INDEX idx_payment_incoming_created (created_at)
        )"
    );
    rtbo_database_setup_exec(
        "CREATE TABLE IF NOT EXISTS official_payment_accounts (
            id INT AUTO_INCREMENT PRIMARY KEY,
            official_id INT NOT NULL,
            official_name VARCHAR(190) NULL,
            official_email VARCHAR(190) NULL,
            direct_deposit_status VARCHAR(60) NOT NULL DEFAULT 'not_configured',
            payout_method VARCHAR(80) NOT NULL DEFAULT 'stripe_connect',
            stripe_account_id VARCHAR(190) NULL,
            bank_last4 VARCHAR(4) NULL,
            routing_last4 VARCHAR(4) NULL,
            notes TEXT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NULL,
            UNIQUE KEY uniq_official_payment_account (official_id),
            INDEX idx_official_payment_status (direct_deposit_status)
        )"
    );
    rtbo_database_setup_exec(
        "CREATE TABLE IF NOT EXISTS official_payouts (
            id INT AUTO_INCREMENT PRIMARY KEY,
            official_id INT NOT NULL,
            official_name VARCHAR(190) NULL,
            amount_cents INT NOT NULL DEFAULT 0,
            service_date DATE NULL,
            event_name VARCHAR(190) NULL,
            description TEXT NULL,
            status VARCHAR(40) NOT NULL DEFAULT 'queued',
            payment_account_id INT NULL,
            stripe_transfer_id VARCHAR(190) NULL,
            paid_at DATETIME NULL,
            created_by INT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NULL,
            INDEX idx_official_payout_status (status),
            INDEX idx_official_payout_created (created_at)
        )"
    );
    $tables[] = 'payment_incoming';
    $tables[] = 'official_payment_accounts';
    $tables[] = 'official_payouts';

    rtbo_database_setup_exec(
        "CREATE TABLE IF NOT EXISTS official_availability (
            id INT AUTO_INCREMENT PRIMARY KEY,
            official_id INT NOT NULL,
            availability_date DATE NOT NULL,
            status VARCHAR(50) NOT NULL DEFAULT 'available',
            reason VARCHAR(100) NULL,
            game_school VARCHAR(190) NULL,
            game_location VARCHAR(190) NULL,
            game_time VARCHAR(20) NULL,
            game_city VARCHAR(120) NULL,
            supervisor VARCHAR(190) NULL,
            notes TEXT NULL,
            contact_required TINYINT(1) NOT NULL DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NULL,
            UNIQUE KEY uq_official_availability_date (official_id, availability_date),
            INDEX idx_official_availability_official (official_id),
            INDEX idx_official_availability_date (availability_date)
        )"
    );
    $tables[] = 'official_availability';

    rtbo_database_setup_exec(
        "CREATE TABLE IF NOT EXISTS game_reports (
            id INT AUTO_INCREMENT PRIMARY KEY,
            game_id INT NULL,
            assignment_id INT NULL,
            official_id INT NOT NULL,
            rule_set VARCHAR(20) NOT NULL DEFAULT 'NFHS',
            table_performance VARCHAR(80) NULL,
            dressing_room_condition VARCHAR(80) NULL,
            game_date DATE NULL,
            game_site VARCHAR(190) NULL,
            game_level VARCHAR(120) NULL,
            home_team VARCHAR(190) NULL,
            visiting_team VARCHAR(190) NULL,
            home_score INT NULL,
            visiting_score INT NULL,
            final_score VARCHAR(40) NULL,
            referee_name VARCHAR(190) NULL,
            umpire1_name VARCHAR(190) NULL,
            umpire2_name VARCHAR(190) NULL,
            crew_chief VARCHAR(190) NULL,
            official2_name VARCHAR(190) NULL,
            official3_name VARCHAR(190) NULL,
            incidents_json MEDIUMTEXT NULL,
            notes TEXT NULL,
            certification TINYINT(1) NOT NULL DEFAULT 0,
            status VARCHAR(40) NOT NULL DEFAULT 'submitted',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NULL,
            INDEX idx_game_reports_official (official_id),
            INDEX idx_game_reports_game (game_id),
            INDEX idx_game_reports_created (created_at)
        )"
    );
    $tables[] = 'game_reports';

    rtbo_database_setup_exec(
        "CREATE TABLE IF NOT EXISTS observer_forms (
            id INT AUTO_INCREMENT PRIMARY KEY,
            observer_id INT NOT NULL,
            observer_name VARCHAR(190) NULL,
            observation_type VARCHAR(80) NOT NULL DEFAULT 'live_game',
            game_date DATE NULL,
            game_level VARCHAR(120) NULL,
            game_site VARCHAR(190) NULL,
            home_team VARCHAR(190) NULL,
            visiting_team VARCHAR(190) NULL,
            crew_chief VARCHAR(190) NULL,
            official2_name VARCHAR(190) NULL,
            official3_name VARCHAR(190) NULL,
            video_url VARCHAR(500) NULL,
            final_score DECIMAL(6,2) NULL,
            crew_ranking VARCHAR(120) NULL,
            scores_json MEDIUMTEXT NULL,
            strengths TEXT NULL,
            concerns TEXT NULL,
            recommendations TEXT NULL,
            follow_up TEXT NULL,
            certification TINYINT(1) NOT NULL DEFAULT 0,
            status VARCHAR(40) NOT NULL DEFAULT 'submitted',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NULL,
            INDEX idx_observer_forms_observer (observer_id),
            INDEX idx_observer_forms_created (created_at)
        )"
    );
    $tables[] = 'observer_forms';

    rtbo_database_setup_exec(
        "CREATE TABLE IF NOT EXISTS evaluations (
            id INT AUTO_INCREMENT PRIMARY KEY,
            game_id INT NULL,
            evaluator_id INT NULL,
            evaluator_name VARCHAR(190) NULL,
            official_id INT NULL,
            official_name VARCHAR(190) NULL,
            official_email VARCHAR(190) NULL,
            game_date DATE NULL,
            location VARCHAR(190) NULL,
            home_team VARCHAR(190) NULL,
            visiting_team VARCHAR(190) NULL,
            level VARCHAR(120) NULL,
            crew_position VARCHAR(80) NULL,
            evaluation_type VARCHAR(40) NOT NULL DEFAULT 'regular_season',
            game_type VARCHAR(80) NULL,
            mechanics_score INT NULL,
            judgment_score INT NULL,
            communication_score INT NULL,
            professionalism_score INT NULL,
            rules_score INT NULL,
            positioning_score INT NULL,
            total_score DECIMAL(6,2) NULL,
            percentage_score DECIMAL(6,2) NULL,
            ranking_label VARCHAR(120) NULL,
            rating_visible TINYINT(1) NOT NULL DEFAULT 1,
            strengths_visible TINYINT(1) NOT NULL DEFAULT 1,
            improvements_visible TINYINT(1) NOT NULL DEFAULT 1,
            recommendation_visible TINYINT(1) NOT NULL DEFAULT 1,
            admin_comments_visible TINYINT(1) NOT NULL DEFAULT 0,
            comments_to_official TEXT NULL,
            comments_to_admin TEXT NULL,
            scores_json MEDIUMTEXT NULL,
            category_scores_json MEDIUMTEXT NULL,
            strengths TEXT NULL,
            improvements TEXT NULL,
            recommendation TEXT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_evaluations_official (official_id),
            INDEX idx_evaluations_evaluator (evaluator_id),
            INDEX idx_evaluations_created (created_at)
        )"
    );
    $tables[] = 'evaluations';

    rtbo_database_setup_exec(
        "CREATE TABLE IF NOT EXISTS refroom_meetings (
            id INT AUTO_INCREMENT PRIMARY KEY,
            meeting_code VARCHAR(40) NOT NULL,
            title VARCHAR(190) NOT NULL,
            meeting_date DATE NULL,
            meeting_time VARCHAR(20) NULL,
            starts_at VARCHAR(80) NULL,
            invite_status VARCHAR(60) NOT NULL DEFAULT 'not_sent',
            invite_recipient_count INT NOT NULL DEFAULT 0,
            payload LONGTEXT NOT NULL,
            created_at DATETIME NULL,
            updated_at DATETIME NULL,
            UNIQUE KEY uniq_refroom_meeting_code (meeting_code),
            INDEX idx_refroom_meeting_date (meeting_date),
            INDEX idx_refroom_meeting_status (invite_status)
        )"
    );
    $tables[] = 'refroom_meetings';

    rtbo_database_setup_exec(
        "CREATE TABLE IF NOT EXISTS stripe_webhook_events (
            id VARCHAR(190) PRIMARY KEY,
            event_type VARCHAR(120) NOT NULL,
            livemode TINYINT(1) NOT NULL DEFAULT 0,
            payload LONGTEXT NOT NULL,
            processed_at DATETIME NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_stripe_webhook_type (event_type),
            INDEX idx_stripe_webhook_created (created_at)
        )"
    );
    $tables[] = 'stripe_webhook_events';

    rtbo_database_setup_exec(
        "CREATE TABLE IF NOT EXISTS paypal_subscription_plans (
            cache_key CHAR(64) PRIMARY KEY,
            plan_id VARCHAR(120) NOT NULL,
            product_id VARCHAR(120) NULL,
            package_id VARCHAR(80) NULL,
            amount_cents INT NOT NULL DEFAULT 0,
            currency VARCHAR(12) NOT NULL DEFAULT 'USD',
            mode VARCHAR(20) NOT NULL DEFAULT 'live',
            payload LONGTEXT NULL,
            created_at DATETIME NULL,
            updated_at DATETIME NULL,
            UNIQUE KEY uniq_paypal_plan_id (plan_id),
            INDEX idx_paypal_plan_package (package_id)
        )"
    );
    $tables[] = 'paypal_subscription_plans';

    foreach ([
        RTBO_CLIENT_SPOTLIGHT_STORE_TABLE,
        RTBO_PODCAST_STORE_TABLE,
        RTBO_SHOP_INVENTORY_STORE_TABLE,
        RTBO_SITE_CONTENT_STORE_TABLE,
        RTBO_REFZONE_COURSES_STORE_TABLE,
        RTBO_RESUME_STORE_TABLE,
    ] as $featureStoreTable) {
        rtbo_feature_store_ensure($featureStoreTable);
        $tables[] = $featureStoreTable;
    }

    rtbo_database_setup_exec(
        "CREATE TABLE IF NOT EXISTS store_orders (
            id VARCHAR(120) PRIMARY KEY,
            customer_email VARCHAR(190) NULL,
            status VARCHAR(60) NOT NULL DEFAULT 'pending',
            total_cents INT NOT NULL DEFAULT 0,
            payload LONGTEXT NOT NULL,
            created_at DATETIME NOT NULL,
            updated_at DATETIME NULL,
            INDEX idx_store_orders_customer (customer_email),
            INDEX idx_store_orders_status (status),
            INDEX idx_store_orders_created (created_at)
        )"
    );
    $tables[] = 'store_orders';

    return $tables;
}

function rtbo_ensure_database_schema(): array
{
    rtbo_create_database_if_missing();
    ensure_users_table();
    ensure_admin_dashboard_tables();
    ensure_schools_teams_table();
    ensure_admin_games_table();
    ensure_organization_classifications_table();
    ensure_newsletter_tables();
    ensure_contact_tables();
    ensure_attendee_review_tables();
    ensure_registration_tables();
    ensure_refzone_enrollment_tables();
    rtbo_ensure_geo_tables();
    rtbo_ensure_game_geo_columns();
    rtbo_ensure_notifications_tables();
    rtbo_ensure_sms_tables();
    rtbo_ensure_login_session_tables();
    rtbo_ensure_schedule_review_table();
    rtbo_store_orders_ensure_table();
    rtbo_ensure_calendar_sharing_table();
    rtbo_password_resets_db_available();

    $tables = array_merge([
        'users',
        'dashboard_records',
        'dashboard_audit_log',
        'schools_teams',
        'games',
        'positions',
        'assignments',
        'tba_requests',
        'organization_classifications',
        'official_classification_links',
        'newsletter_subscribers',
        'newsletters',
        'newsletter_sources',
        'newsletter_articles',
        'newsletter_issues',
        'contact_messages',
        'attendee_reviews',
        'school_registrations',
        'refzone_enrollments',
        'member_geo_locations',
        'assignment_arrival_status',
        'notifications',
        'notification_reads',
        'sms_notifications',
        'user_login_sessions',
        'assignment_schedule_reviews',
        'store_orders',
        'official_calendar_shares',
        'password_resets',
    ], rtbo_ensure_endpoint_tables());

    rtbo_client_spotlight_load();
    rtbo_podcast_load();
    rtbo_shop_inventory_load();
    rtbo_site_content_load();
    rtbo_refzone_courses_load();
    rtbo_resume_load();

    return [
        'database' => DB_NAME,
        'tables' => array_values(array_unique($tables)),
    ];
}

function rtbo_seed_super_admin_account(string $password, ?string $email = null, bool $temporary = true): array
{
    $email = strtolower(trim((string) ($email ?: RTBO_SUPER_ADMIN_EMAIL)));
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        throw new RuntimeException('A valid Super Admin email address is required.');
    }
    if (strlen($password) < 12) {
        throw new RuntimeException('The temporary Super Admin password must be at least 12 characters.');
    }

    ensure_users_table();
    $stmt = db()->prepare(
        "INSERT INTO users(role, first_name, last_name, email, phone, address_line1, city, state, password_hash, password_is_temporary, temporary_password_created_at, password_changed_at, status, updated_at)
         VALUES('super_admin', 'Montrel', 'Simmons', ?, '(501) 240-4961', '815 Technology Dr., Box 241445', 'Little Rock', 'AR', ?, ?, IF(? = 1, NOW(), NULL), IF(? = 1, NULL, NOW()), 'active', NOW())
         ON DUPLICATE KEY UPDATE
            role = 'super_admin',
            first_name = 'Montrel',
            last_name = 'Simmons',
            phone = VALUES(phone),
            address_line1 = VALUES(address_line1),
            city = VALUES(city),
            state = VALUES(state),
            password_hash = VALUES(password_hash),
            password_is_temporary = VALUES(password_is_temporary),
            temporary_password_created_at = VALUES(temporary_password_created_at),
            password_changed_at = VALUES(password_changed_at),
            status = 'active',
            updated_at = NOW()"
    );
    $temporaryFlag = $temporary ? 1 : 0;
    $stmt->execute([
        $email,
        password_hash($password, PASSWORD_DEFAULT),
        $temporaryFlag,
        $temporaryFlag,
        $temporaryFlag,
    ]);

    $lookup = db()->prepare('SELECT * FROM users WHERE LOWER(email) = ? LIMIT 1');
    $lookup->execute([$email]);
    $user = $lookup->fetch();
    if (!$user) {
        throw new RuntimeException('Super Admin account could not be loaded after setup.');
    }

    return public_auth_user($user);
}

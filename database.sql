CREATE DATABASE IF NOT EXISTS rtbo_platform CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE rtbo_platform;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  role VARCHAR(50) NOT NULL DEFAULT 'official',
  member_title VARCHAR(120),
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(190) NOT NULL UNIQUE,
  phone VARCHAR(50),
  sex VARCHAR(40),
  race VARCHAR(120),
  organization VARCHAR(190),
  school_id INT NULL,
  address_line1 VARCHAR(190),
  address_line2 VARCHAR(190),
  city VARCHAR(120),
  state VARCHAR(80),
  zip VARCHAR(30),
  conferences TEXT,
  experience TEXT,
  official_rank INT NULL,
  password_hash VARCHAR(255) NOT NULL,
  profile_photo VARCHAR(255),
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS password_resets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL,
  account_source VARCHAR(20) NOT NULL DEFAULT 'database',
  email VARCHAR(190) NOT NULL,
  token_hash CHAR(64) NOT NULL UNIQUE,
  expires_at DATETIME NOT NULL,
  used_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_password_resets_email (email),
  INDEX idx_password_resets_expires (expires_at),
  INDEX idx_password_resets_used (used_at)
);

CREATE TABLE IF NOT EXISTS schools_teams (
  id INT AUTO_INCREMENT PRIMARY KEY,
  record_type VARCHAR(30) NOT NULL DEFAULT 'school',
  name VARCHAR(190) NOT NULL,
  school_id INT NULL,
  school_name VARCHAR(190),
  athletic_website_url VARCHAR(255),
  logo_url VARCHAR(255),
  logo_source VARCHAR(255),
  logo_scraped_at DATETIME NULL,
  gym_name VARCHAR(190),
  address_line1 VARCHAR(190),
  city VARCHAR(120),
  state VARCHAR(80),
  zip VARCHAR(30),
  courts INT NOT NULL DEFAULT 1,
  court_labels TEXT NULL,
  head_coach_name VARCHAR(190),
  head_coach_email VARCHAR(190),
  head_coach_phone VARCHAR(60),
  status VARCHAR(40) NOT NULL DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS organization_classifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(190) NOT NULL UNIQUE,
  status VARCHAR(40) NOT NULL DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS official_classification_links (
  official_id INT NOT NULL,
  classification_id INT NOT NULL,
  conference VARCHAR(190) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (official_id, classification_id),
  INDEX idx_official_classification_links_classification (classification_id)
);

CREATE TABLE IF NOT EXISTS games (
  id INT AUTO_INCREMENT PRIMARY KEY,
  game_date DATE,
  game_time TIME,
  level VARCHAR(120),
  home_team VARCHAR(190),
  away_team VARCHAR(190),
  location_name VARCHAR(190),
  location_address TEXT,
  location_lat DECIMAL(10,7) NULL,
  location_lng DECIMAL(10,7) NULL,
  fee_per_official DECIMAL(10,2),
  status VARCHAR(50) DEFAULT 'scheduled',
  published TINYINT(1) NOT NULL DEFAULT 0,
  tba_visible TINYINT(1) NOT NULL DEFAULT 0,
  tba_sent_at DATETIME NULL,
  cancellation_reason VARCHAR(120),
  school_event_center_id INT NULL,
  home_team_id INT NULL,
  away_team_id INT NULL,
  court_number INT NULL,
  court_label VARCHAR(190) NULL,
  games_per_night INT NOT NULL DEFAULT 1,
  officials_required INT NOT NULL DEFAULT 3,
  required_position_ids TEXT NULL,
  notes TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS positions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0
);

INSERT INTO positions(name, sort_order)
VALUES ('Referee', 1), ('Umpire 1', 2), ('Umpire 2', 3), ('Alternate', 4)
ON DUPLICATE KEY UPDATE name = VALUES(name);

CREATE TABLE IF NOT EXISTS assignments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  game_id INT NOT NULL,
  official_id INT NOT NULL,
  position_id INT NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  decline_reason TEXT,
  responded_at DATETIME,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_assignments_game (game_id),
  INDEX idx_assignments_official (official_id),
  INDEX idx_assignments_position (position_id)
);

CREATE TABLE IF NOT EXISTS tba_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  game_id INT NOT NULL,
  official_id INT NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  note TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL,
  INDEX idx_tba_requests_game (game_id),
  INDEX idx_tba_requests_official (official_id),
  UNIQUE KEY uq_tba_game_official (game_id, official_id)
);

CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  audience VARCHAR(50) NOT NULL DEFAULT 'user',
  target_user_id INT NULL,
  target_role VARCHAR(80) NULL,
  type VARCHAR(100) NOT NULL,
  title VARCHAR(190) NOT NULL,
  body TEXT NULL,
  related_type VARCHAR(80) NULL,
  related_id INT NULL,
  actor_id INT NULL,
  actor_name VARCHAR(190) NULL,
  metadata JSON NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_notifications_user (target_user_id),
  INDEX idx_notifications_role (target_role),
  INDEX idx_notifications_audience (audience),
  INDEX idx_notifications_created (created_at)
);

CREATE TABLE IF NOT EXISTS notification_reads (
  notification_id INT NOT NULL,
  user_id INT NOT NULL,
  read_at DATETIME NOT NULL,
  PRIMARY KEY (notification_id, user_id),
  INDEX idx_notification_reads_user (user_id)
);

CREATE TABLE IF NOT EXISTS sms_notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  notification_id INT NULL,
  target_user_id INT NULL,
  phone_raw VARCHAR(80) NULL,
  phone_e164 VARCHAR(32) NULL,
  provider VARCHAR(40) NOT NULL DEFAULT 'twilio',
  status VARCHAR(50) NOT NULL,
  message TEXT NOT NULL,
  provider_message_id VARCHAR(120) NULL,
  error TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  sent_at DATETIME NULL,
  INDEX idx_sms_notifications_notification (notification_id),
  INDEX idx_sms_notifications_user (target_user_id),
  INDEX idx_sms_notifications_status (status),
  INDEX idx_sms_notifications_created (created_at)
);

CREATE TABLE IF NOT EXISTS member_geo_locations (
  user_id INT PRIMARY KEY,
  latitude DECIMAL(10,7) NOT NULL,
  longitude DECIMAL(10,7) NOT NULL,
  accuracy_meters DECIMAL(10,2) NULL,
  heading DECIMAL(10,2) NULL,
  speed_mps DECIMAL(10,2) NULL,
  source VARCHAR(50) NOT NULL DEFAULT 'browser',
  consent_enabled TINYINT(1) NOT NULL DEFAULT 1,
  updated_at DATETIME NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_member_geo_locations_updated (updated_at)
);

CREATE TABLE IF NOT EXISTS assignment_arrival_status (
  assignment_id INT PRIMARY KEY,
  game_id INT NOT NULL,
  official_id INT NOT NULL,
  current_distance_miles DECIMAL(8,2) NULL,
  inside_radius TINYINT(1) NOT NULL DEFAULT 0,
  arrival_radius_miles DECIMAL(5,2) NOT NULL DEFAULT 0.25,
  arrival_verified_at DATETIME NULL,
  last_inside_radius_at DATETIME NULL,
  left_site_at DATETIME NULL,
  last_seen_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  INDEX idx_assignment_arrival_game (game_id),
  INDEX idx_assignment_arrival_official (official_id),
  INDEX idx_assignment_arrival_verified (arrival_verified_at)
);

CREATE TABLE IF NOT EXISTS availability (
  id INT AUTO_INCREMENT PRIMARY KEY,
  official_id INT,
  available_date DATE,
  status VARCHAR(50),
  notes TEXT
);

CREATE TABLE IF NOT EXISTS evaluations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  game_id INT,
  game_date DATE NULL,
  location VARCHAR(190),
  home_team VARCHAR(190),
  visiting_team VARCHAR(190),
  level VARCHAR(120),
  crew_position VARCHAR(80),
  evaluator_id INT,
  evaluator_name VARCHAR(190),
  official_id INT,
  official_name VARCHAR(190),
  official_email VARCHAR(190),
  mechanics_score INT,
  judgment_score INT,
  communication_score INT,
  professionalism_score INT,
  rules_score INT,
  positioning_score INT,
  total_score DECIMAL(6,2),
  percentage_score DECIMAL(6,2),
  ranking_label VARCHAR(120),
  rating_visible TINYINT(1),
  admin_comments_visible TINYINT(1) NOT NULL DEFAULT 0,
  comments_to_official TEXT,
  comments_to_admin TEXT,
  scores_json MEDIUMTEXT,
  category_scores_json MEDIUMTEXT,
  strengths TEXT,
  improvements TEXT,
  recommendation TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(190) NOT NULL UNIQUE,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  status VARCHAR(30) NOT NULL DEFAULT 'active',
  subscribed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  unsubscribed_at DATETIME NULL
);

CREATE TABLE IF NOT EXISTS newsletters (
  id INT AUTO_INCREMENT PRIMARY KEY,
  subject VARCHAR(190) NOT NULL,
  preheader VARCHAR(255),
  body_html MEDIUMTEXT NOT NULL,
  body_text MEDIUMTEXT NOT NULL,
  created_by INT NULL,
  sent_count INT NOT NULL DEFAULT 0,
  failed_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  sent_at DATETIME NULL
);

CREATE TABLE IF NOT EXISTS newsletter_sources (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(190) NOT NULL,
  url TEXT NOT NULL,
  source_type VARCHAR(80) NOT NULL DEFAULT 'sports_news',
  method VARCHAR(40) NOT NULL DEFAULT 'rss',
  status VARCHAR(30) NOT NULL DEFAULT 'active',
  compliance_status VARCHAR(80) NOT NULL DEFAULT 'Pending Review',
  last_scan_at DATETIME NULL,
  last_error TEXT NULL,
  created_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX newsletter_sources_status_idx (status),
  INDEX newsletter_sources_method_idx (method)
);

CREATE TABLE IF NOT EXISTS newsletter_articles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  source_id INT NULL,
  source_name VARCHAR(190) NOT NULL,
  source_url TEXT NULL,
  source_link TEXT NOT NULL,
  title VARCHAR(255) NOT NULL,
  summary TEXT NULL,
  category VARCHAR(120) NOT NULL DEFAULT 'Officiating News',
  status VARCHAR(30) NOT NULL DEFAULT 'review',
  quality_score INT NOT NULL DEFAULT 0,
  published_at DATETIME NULL,
  collected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  approved_at DATETIME NULL,
  UNIQUE KEY newsletter_article_link_unique (source_link(190)),
  INDEX newsletter_articles_status_idx (status),
  INDEX newsletter_articles_collected_idx (collected_at)
);

CREATE TABLE IF NOT EXISTS newsletter_issues (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(190) NOT NULL,
  subtitle VARCHAR(255) NULL,
  issue_date DATE NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'draft',
  cover_headline VARCHAR(255) NULL,
  intro_text TEXT NULL,
  sections_json MEDIUMTEXT NULL,
  created_by INT NULL,
  sent_count INT NOT NULL DEFAULT 0,
  failed_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  sent_at DATETIME NULL,
  INDEX newsletter_issues_date_idx (issue_date),
  INDEX newsletter_issues_status_idx (status)
);

CREATE TABLE IF NOT EXISTS contact_messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  full_name VARCHAR(200) NOT NULL,
  email VARCHAR(190) NOT NULL,
  phone VARCHAR(60) NOT NULL,
  message TEXT NOT NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'new',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS attendee_reviews (
  review_id VARCHAR(64) PRIMARY KEY,
  full_name VARCHAR(200) NOT NULL,
  email VARCHAR(190) NOT NULL,
  phone VARCHAR(60) NULL,
  experience_type VARCHAR(80) NOT NULL,
  school_or_course VARCHAR(190) NOT NULL,
  attendee_role VARCHAR(80) NOT NULL,
  rating TINYINT NOT NULL,
  review_text TEXT NOT NULL,
  photo_path VARCHAR(500) NULL,
  public_consent TINYINT(1) NOT NULL DEFAULT 0,
  contact_ok TINYINT(1) NOT NULL DEFAULT 0,
  status VARCHAR(40) NOT NULL DEFAULT 'pending',
  payload LONGTEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_attendee_reviews_status (status),
  INDEX idx_attendee_reviews_created (created_at),
  INDEX idx_attendee_reviews_experience (experience_type)
);

CREATE TABLE IF NOT EXISTS school_registrations (
  id VARCHAR(64) PRIMARY KEY,
  user_id INT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  full_name VARCHAR(200),
  email VARCHAR(190),
  phone VARCHAR(60),
  address_1 VARCHAR(190),
  address_2 VARCHAR(190),
  city VARCHAR(120),
  state VARCHAR(80),
  zip VARCHAR(30),
  experience VARCHAR(120),
  gender VARCHAR(80),
  sex VARCHAR(40),
  race VARCHAR(120),
  levels TEXT,
  current_conferences TEXT,
  referred VARCHAR(20),
  referral_name VARCHAR(190),
  goals TEXT,
  sessions TEXT,
  amount_cents INT DEFAULT 0,
  payment_provider VARCHAR(40),
  payment_status VARCHAR(40),
  paid_at DATETIME NULL,
  payment_confirmation_sent_at DATETIME NULL,
  waiver_agreement VARCHAR(40),
  printed_signature VARCHAR(190),
  signature TEXT,
  profile_photo_path VARCHAR(500),
  pdf_path VARCHAR(500),
  got_u_nex_ref_sync_status VARCHAR(40),
  payload JSON,
  submitted_at DATETIME,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS dashboard_records (
  id INT AUTO_INCREMENT PRIMARY KEY,
  section_key VARCHAR(80) NOT NULL,
  field0 TEXT NULL,
  field1 TEXT NULL,
  field2 TEXT NULL,
  field3 TEXT NULL,
  field4 TEXT NULL,
  created_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX dashboard_records_section_idx (section_key)
);

CREATE TABLE IF NOT EXISTS dashboard_audit_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  actor_id INT NULL,
  actor_email VARCHAR(190) NULL,
  action VARCHAR(80) NOT NULL,
  section_key VARCHAR(80) NOT NULL,
  record_id INT NULL,
  details JSON NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX dashboard_audit_section_idx (section_key),
  INDEX dashboard_audit_actor_idx (actor_id)
);

-- Create the Super Admin account through /api/setup-super-admin.php after deployment.
-- Do not ship a permanent default password in production.

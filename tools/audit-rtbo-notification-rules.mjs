import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const toolsDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(toolsDir, '..');
const failures = [];

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

function assertFile(relativePath) {
  if (!fs.existsSync(path.join(repoRoot, relativePath))) {
    failures.push(`Missing required notification/readiness file: ${relativePath}`);
  }
}

function assertContains(relativePath, patterns) {
  const source = read(relativePath);
  patterns.forEach(([label, pattern]) => {
    const passed = pattern instanceof RegExp ? pattern.test(source) : source.includes(pattern);
    if (!passed) {
      failures.push(`${relativePath} is missing ${label}.`);
    }
  });
}

function walkFiles(rootDir) {
  const entries = fs.readdirSync(rootDir, { withFileTypes: true });
  return entries.flatMap(entry => {
    const fullPath = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      return walkFiles(fullPath);
    }
    return [fullPath];
  });
}

function assertNoRawMailOutsideEmailHelper() {
  const apiDir = path.join(repoRoot, 'api');
  const emailHelper = path.join(repoRoot, 'api/includes/email.php');
  walkFiles(apiDir)
    .filter(filePath => filePath.endsWith('.php') && filePath !== emailHelper)
    .forEach(filePath => {
      const source = fs.readFileSync(filePath, 'utf8');
      if (/\bmail\s*\(/.test(source)) {
        failures.push(`${path.relative(repoRoot, filePath)} uses raw mail(). All email must go through api/includes/email.php so professional PDFs are attached.`);
      }
    });
}

[
  'database.sql',
  'api/includes/email.php',
  'api/includes/notifications.php',
  'api/includes/sms.php',
  'api/includes/pdf.php',
  'api/includes/database-setup.php',
  'api/includes/session-tracking.php',
  'api/includes/schedule-review.php',
  'api/includes/store-orders.php',
  'api/auth-register.php',
  'api/auth-login.php',
  'api/auth-logout.php',
  'api/admin-members.php',
  'api/profile-update.php',
  'api/registration-submit.php',
  'api/refzone-enrollment-submit.php',
  'api/official-assignment-response.php',
  'api/official-profile.php',
  'api/admin-contracts.php',
  'api/admin-tax-forms.php',
  'api/evaluations.php',
  'api/observer-form.php',
  'api/review-submit.php',
  'api/includes/reviews.php',
  'api/subscribe.php',
  'api/stripe-webhook.php',
  'frontend/public/payment-success.php'
].forEach(assertFile);

assertContains('api/includes/email.php', [
  ['site-wide professional PDF notice attachment rule', 'rtbo_mail_prepare_professional_notice'],
  ['PDF notice builder usage for plain emails', 'build_email_notice_pdf'],
  ['new account registration confirmation email', 'send_account_registration_confirmation_email'],
  ['Super Admin new user registration email', 'send_super_admin_user_registered_email'],
  ['Super Admin member-added email', 'send_super_admin_member_added_email'],
  ['Super Admin profile-completed email', 'send_super_admin_profile_completed_email'],
  ['RefZone enrollment confirmation email', 'send_refzone_enrollment_confirmation_email'],
  ['Super Admin RefZone enrollment email', 'send_super_admin_refzone_enrollment_email'],
  ['shop purchase email with receipt PDF parameter', /function\s+send_super_admin_store_purchase_email\s*\(\s*array\s+\$order,\s*string\s+\$pdfPath/],
  ['PDF mail transport helper', 'rtbo_mail_with_pdf']
]);

assertContains('api/includes/pdf.php', [
  ['generic professional email notice PDF', 'function build_email_notice_pdf'],
  ['store order receipt PDF', 'function build_store_order_receipt_pdf'],
  ['registration PDF builder', 'function build_registration_pdf'],
  ['invoice PDF builder', 'function build_invoice_pdf'],
  ['contract PDF builder', 'function build_contract_pdf'],
  ['W-9 PDF builder', 'function build_w9_pdf']
]);

assertContains('api/auth-register.php', [
  ['inactive registration status until profile completion', /status['"]?\s*=>\s*['"]inactive['"]/],
  ['user registration confirmation email', 'send_account_registration_confirmation_email'],
  ['Super Admin registration email', 'send_super_admin_user_registered_email'],
  ['admin registration notification', 'user_registered'],
  ['profile completion required user notification', 'profile_completion_required']
]);

assertContains('api/includes/admin-members.php', [
  ['temporary password invitation email', 'send_member_invitation_email'],
  ['temporary password flag', 'password_is_temporary'],
  ['registration confirmation timestamp', 'registration_confirmation_sent_at']
]);

assertContains('api/admin-members.php', [
  ['Super Admin member-added email', 'send_super_admin_member_added_email'],
  ['member-created notification', 'member_created']
]);

assertContains('api/profile-update.php', [
  ['profile completed timestamp', 'profile_completed_at'],
  ['Super Admin profile completed email', 'send_super_admin_profile_completed_email'],
  ['member activated notification', 'member_activated']
]);

assertContains('api/registration-submit.php', [
  ['professional registration PDF', 'build_registration_pdf'],
  ['school registration notification email with PDF', 'send_school_registration_notification'],
  ['Super Admin profile completed email', 'send_super_admin_profile_completed_email'],
  ['school registration submitted notification', 'school_registration_submitted']
]);

assertContains('api/refzone-enrollment-submit.php', [
  ['RefZone confirmation email', 'send_refzone_enrollment_confirmation_email'],
  ['Super Admin RefZone email', 'send_super_admin_refzone_enrollment_email'],
  ['RefZone enrollment notification', 'refzone_enrollment_started'],
  ['RefZone user notification', 'refzone_enrollment_received']
]);

assertContains('api/official-assignment-response.php', [
  ['assignment accepted notification', 'assignment_accepted'],
  ['assignment declined notification', 'assignment_declined'],
  ['admin assignment notification', 'rtbo_notify_admins']
]);

assertContains('api/includes/schedule-review.php', [
  ['accepted schedule review table', 'assignment_schedule_reviews'],
  ['accepted schedule review notification', 'accepted_schedule_reviewed']
]);

assertContains('api/official-profile.php', [
  ['accepted schedule review recorder', 'rtbo_record_accepted_schedule_review']
]);

assertContains('api/admin-contracts.php', [
  ['signed contract PDF email', 'send_signed_contract_email'],
  ['contract signed returned notification', 'contract_signed_returned'],
  ['professional PDF metadata', 'professional_pdf_attached']
]);

assertContains('api/admin-tax-forms.php', [
  ['W-9 PDF generation', 'build_w9_pdf'],
  ['W-9 email with PDF', 'rtbo_mail_with_pdf'],
  ['W-9 signed returned notification', 'w9_signed_returned'],
  ['professional PDF metadata', 'professional_pdf_attached']
]);

assertContains('api/evaluations.php', [
  ['evaluator form completed notification', 'evaluation_form_submitted']
]);

assertContains('api/observer-form.php', [
  ['observer form completed notification', 'observer_form_submitted']
]);

assertContains('api/review-submit.php', [
  ['reviews submitted as pending moderation', /['"]status['"]\s*=>\s*['"]pending['"]/],
  ['attendee review submitted notification', 'attendee_review_submitted']
]);

assertContains('api/includes/reviews.php', [
  ['public reviews restricted to approved/published', 'approved_attendee_reviews'],
  ['approved review status filter', /status\s+IN\s+\('approved',\s*'published'\)/]
]);

assertContains('api/subscribe.php', [
  ['newsletter signup email', 'send_newsletter_signup_notification'],
  ['newsletter signup notification', 'newsletter_signup']
]);

assertContains('api/auth-login.php', [
  ['login session tracking', 'rtbo_login_session_start']
]);

assertContains('api/auth-logout.php', [
  ['logout session tracking', 'rtbo_login_session_finish']
]);

assertContains('api/includes/session-tracking.php', [
  ['login table', 'user_login_sessions'],
  ['login notification', 'user_logged_in'],
  ['logout notification', 'user_logged_out'],
  ['session duration tracking', 'duration_seconds']
]);

assertContains('api/includes/notifications.php', [
  ['SMS dispatch from notifications', 'rtbo_sms_dispatch_notification']
]);

assertContains('api/includes/sms.php', [
  ['SMS notification table', 'sms_notifications'],
  ['Twilio SMS sender', 'rtbo_sms_send_twilio']
]);

assertContains('api/includes/store-orders.php', [
  ['store purchase completed notification', 'store_purchase_completed'],
  ['store purchase receipt PDF', 'build_store_order_receipt_pdf'],
  ['shop purchase email with PDF receipt', 'send_super_admin_store_purchase_email($order, $pdfPath)'],
  ['professional PDF metadata', 'professional_pdf_attached']
]);

assertContains('api/stripe-webhook.php', [
  ['Stripe store purchase completion handling', "($metadata['type'] ?? '') === 'store'"],
  ['store purchase notifier', 'rtbo_store_order_notify_purchase_completed'],
  ['RefZone paid notification', 'refzone_enrollment_paid']
]);

assertContains('frontend/public/payment-success.php', [
  ['store payment success verification', "$type === 'store'"],
  ['store purchase notifier after return', 'rtbo_store_order_notify_purchase_completed'],
  ['RefZone paid return notification', 'refzone_enrollment_paid']
]);

assertContains('api/includes/database-setup.php', [
  ['login session schema creation', 'rtbo_ensure_login_session_tables'],
  ['schedule review schema creation', 'rtbo_ensure_schedule_review_table'],
  ['store order schema creation', 'rtbo_store_orders_ensure_table']
]);

assertContains('database.sql', [
  ['temporary password columns', 'password_is_temporary'],
  ['registration confirmation columns', 'registration_confirmation_sent_at'],
  ['profile completion columns', 'profile_completed_at'],
  ['login session table', 'user_login_sessions'],
  ['schedule review table', 'assignment_schedule_reviews'],
  ['store orders table', 'store_orders']
]);

assertNoRawMailOutsideEmailHelper();

console.log('RTBO notification and email rules audit');

if (failures.length) {
  console.error('\nFailures:');
  failures.forEach(failure => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('Notification, SMS, moderation, and professional PDF email rules audit passed.');

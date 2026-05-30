import nodemailer from 'nodemailer';
import { optionalEnv } from '@/lib/env';

type SendEmailInput = {
  to: string[];
  subject: string;
  html: string;
  text: string;
};

function parseBoolean(value: string | undefined) {
  return value === 'true' || value === '1' || value === 'yes';
}

export function configuredAdminEmails() {
  return (optionalEnv('ADMIN_NOTIFICATION_EMAILS') ?? '')
    .split(',')
    .map((email) => email.trim())
    .filter(Boolean);
}

export async function sendEmail(input: SendEmailInput) {
  const host = optionalEnv('SMTP_HOST');
  const user = optionalEnv('SMTP_USER');
  const password = optionalEnv('SMTP_PASSWORD');
  const from = optionalEnv('SMTP_FROM');
  const port = Number(optionalEnv('SMTP_PORT') ?? 587);
  const secure = parseBoolean(optionalEnv('SMTP_SECURE'));

  if (!host || !from || input.to.length === 0) {
    return { skipped: true, reason: 'SMTP_HOST, SMTP_FROM, or recipients are not configured.' };
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: user && password ? { user, pass: password } : undefined
  });

  await transporter.sendMail({
    from,
    to: input.to.join(','),
    subject: input.subject,
    html: input.html,
    text: input.text
  });

  return { skipped: false };
}

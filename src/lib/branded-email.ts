import { Resend } from 'resend';
import nodemailer from 'nodemailer';

/**
 * Transport only.
 *
 * The layout used to live here too, which made the module server-only (resend,
 * nodemailer) and forced the dashboard composer to keep a second, hand-written
 * copy of the same email — the two drifted, and the "real preview" pane was
 * rendering the stale one. The template now lives in `email-template.ts` (pure,
 * importable from the browser) and is re-exported here so the API routes keep
 * importing from a single place.
 */
export { buildBrandedEmailHtml } from './email-template';
export type { BrandedEmailOptions } from './email-template';

export async function sendEmail({
  to,
  subject,
  html,
  replyTo = 'info@tiadesigns.it',
}: {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}): Promise<boolean> {
  const from = process.env.EMAIL_FROM || 'Tia Designs <info@tiadesigns.it>';
  const resendApiKey = process.env.RESEND_API_KEY;

  if (resendApiKey) {
    try {
      const resend = new Resend(resendApiKey);
      const { error } = await resend.emails.send({
        from,
        to,
        replyTo,
        subject,
        html,
      });
      if (!error) return true;
      console.error('Resend error:', error);
    } catch (e) {
      console.error('Resend exception:', e);
    }
  }

  // SMTP Fallback
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;
  if (user && pass) {
    try {
      const port = Number(process.env.EMAIL_PORT || 465);
      const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST || 'smtp.gmail.com',
        port,
        secure: port === 465,
        auth: { user, pass },
      });
      await transporter.sendMail({
        from,
        to,
        replyTo,
        subject,
        html,
      });
      return true;
    } catch (smtpErr) {
      console.error('SMTP error:', smtpErr);
    }
  }

  return false;
}

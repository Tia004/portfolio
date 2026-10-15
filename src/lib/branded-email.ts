import { prepareEmailHtml, emailPlainText } from './email-delivery';
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
import fs from 'fs';
import { isArubaConfigured, appendArubaSentEmail } from './aruba-mail';

export type { BrandedEmailOptions } from './email-template';

export async function sendEmail({
  to,
  subject,
  html,
  replyTo = 'info@tiadesigns.it',
  attachments = [],
}: {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
  attachments?: Array<{
    filename: string;
    content?: any;
    path?: string;
    contentType?: string;
    cid?: string;
  }>;
}): Promise<boolean> {
  const from = process.env.EMAIL_FROM || 'Tia Designs <info@tiadesigns.it>';
  const resendApiKey = process.env.RESEND_API_KEY;

  const mailAttachments = [...attachments];
  html = prepareEmailHtml(html);
  const text = emailPlainText(html);

  if (resendApiKey) {
    try {
      const resend = new Resend(resendApiKey);
      const resendAttachments = mailAttachments.map((a) => ({
        filename: a.filename,
        content: a.content || (a.path ? fs.readFileSync(a.path) : undefined),
        contentType: a.contentType,
        contentId: a.cid,
      }));
      const { error } = await resend.emails.send({
        from,
        to,
        replyTo,
        subject,
        html,
        text,
        attachments: resendAttachments.length > 0 ? resendAttachments : undefined,
      });
      if (!error) {
        if (isArubaConfigured()) {
          appendArubaSentEmail({
            from,
            to,
            replyTo,
            subject,
            html,
            text,
            attachments: mailAttachments.length > 0 ? mailAttachments : undefined,
          }).catch((err) => console.warn('[Branded Email] appendArubaSentEmail error:', err));
        }
        return true;
      }
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
        text,
        attachments: mailAttachments.length > 0 ? mailAttachments : undefined,
      });
      if (isArubaConfigured()) {
        appendArubaSentEmail({
          from,
          to,
          replyTo,
          subject,
          html,
          text,
          attachments: mailAttachments.length > 0 ? mailAttachments : undefined,
        }).catch((err) => console.warn('[Branded Email] appendArubaSentEmail error:', err));
      }
      return true;
    } catch (smtpErr) {
      console.error('SMTP error:', smtpErr);
    }
  }

  return false;
}

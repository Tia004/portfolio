import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import nodemailer from 'nodemailer';
import { prisma, getDatabaseErrorMessage } from '@/lib/prisma';
import { getSession } from '@/lib/session';

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character] ?? character);
}

function markdownToHtml(text: string): string {
  const escaped = escapeHtml(text);
  const paragraphs = escaped.split(/\n{2,}/);

  const htmlBlocks = paragraphs.map((para) => {
    const trimmed = para.trim();
    if (!trimmed) return '';

    const lines = trimmed.split('\n');
    const isList = lines.every((line) => /^\s*[-*]\s+/.test(line) || line.trim() === '');

    if (isList) {
      const items = lines
        .filter((line) => line.trim() !== '')
        .map((line) => line.replace(/^\s*[-*]\s+/, '').trim())
        .map((item) => `<li style="margin-bottom: 6px;">${item}</li>`)
        .join('');
      return `<ul style="margin: 12px 0; padding-left: 24px; color: #d1d5db; line-height: 1.6;">${items}</ul>`;
    }

    const withBreaks = lines.join('<br />');
    const formatted = withBreaks
      .replace(/\*\*(.+?)\*\*/g, '<strong style="color: #5eead4;">$1</strong>')
      .replace(/\*(.+?)\*/g, '<em style="color: #a7f3d0;">$1</em>');

    return `<p style="margin: 0 0 14px 0; line-height: 1.7; color: #e5e7eb; font-size: 15px;">${formatted}</p>`;
  });

  return htmlBlocks.filter(Boolean).join('');
}

export function buildBrandedEmailHtml({
  recipientName,
  title,
  bodyMarkdown,
  ctaText,
  ctaUrl,
  badgeText = 'Tia Designs',
}: {
  recipientName?: string;
  title?: string;
  bodyMarkdown: string;
  ctaText?: string;
  ctaUrl?: string;
  badgeText?: string;
}): string {
  const contentHtml = markdownToHtml(bodyMarkdown);
  const safeName = recipientName ? escapeHtml(recipientName) : '';
  const safeTitle = title ? escapeHtml(title) : '';

  return `
    <!DOCTYPE html>
    <html lang="it">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>${safeTitle || 'Tia Designs'}</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #040d0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f3f4f6;">
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #040d0a; padding: 30px 15px;">
        <tr>
          <td align="center">
            <!-- Container Card -->
            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 620px; background: #071713; border: 1px solid rgba(45, 212, 191, 0.35); border-radius: 20px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.8);">
              
              <!-- Top Glow Bar -->
              <tr>
                <td height="4" style="background: linear-gradient(90deg, #14b8a6, #2dd4bf, #5eead4, #14b8a6);"></td>
              </tr>

              <!-- Header -->
              <tr>
                <td style="padding: 28px 32px 20px 32px; border-bottom: 1px solid rgba(255,255,255,0.06); background: rgba(0,0,0,0.35);">
                  <table width="100%" border="0" cellspacing="0" cellpadding="0">
                    <tr>
                      <td>
                        <div style="display: inline-block; font-size: 22px; font-weight: 800; letter-spacing: -0.5px; color: #ffffff;">
                          Tia <span style="color: #2dd4bf;">Designs</span>
                        </div>
                        <div style="color: #9ca3af; font-size: 12px; margin-top: 2px; letter-spacing: 0.5px;">
                          Designer • Sviluppatore App & Software • Videomaker
                        </div>
                      </td>
                      <td align="right" valign="top">
                        <span style="display: inline-block; background: rgba(45, 212, 191, 0.12); border: 1px solid rgba(45, 212, 191, 0.4); color: #5eead4; border-radius: 999px; padding: 4px 12px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">
                          ${escapeHtml(badgeText)}
                        </span>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Body Content -->
              <tr>
                <td style="padding: 32px 32px 24px 32px;">
                  ${safeTitle ? `<h1 style="color: #ffffff; font-size: 22px; font-weight: 700; margin: 0 0 18px 0; line-height: 1.3;">${safeTitle}</h1>` : ''}
                  ${safeName ? `<p style="color: #5eead4; font-size: 15px; font-weight: 600; margin: 0 0 16px 0;">Ciao ${safeName},</p>` : ''}
                  
                  <div style="background: rgba(0, 0, 0, 0.4); border: 1px solid rgba(255,255,255,0.05); border-left: 3px solid #2dd4bf; border-radius: 12px; padding: 20px 24px; margin-bottom: 24px;">
                    ${contentHtml}
                  </div>

                  ${ctaText && ctaUrl ? `
                    <div style="text-align: center; margin: 28px 0 16px 0;">
                      <a href="${escapeHtml(ctaUrl)}" style="display: inline-block; background: #2dd4bf; color: #040d0a; font-weight: 700; font-size: 14px; text-decoration: none; padding: 14px 32px; border-radius: 12px; box-shadow: 0 4px 16px rgba(45,212,191,0.35); letter-spacing: 0.3px;">
                        ${escapeHtml(ctaText)} &rarr;
                      </a>
                    </div>
                  ` : ''}
                </td>
              </tr>

              <!-- Signature -->
              <tr>
                <td style="padding: 0 32px 28px 32px;">
                  <div style="border-top: 1px solid rgba(255,255,255,0.08); padding-top: 20px;">
                    <p style="margin: 0; color: #ffffff; font-size: 14px; font-weight: 700;">Tia Chinaglia</p>
                    <p style="margin: 2px 0 0 0; color: #2dd4bf; font-size: 12px;">Fondatore & Lead Creative Developer • Tia Designs</p>
                    <p style="margin: 6px 0 0 0; color: #9ca3af; font-size: 12px;">
                      Email: <a href="mailto:info@tiadesigns.it" style="color: #5eead4; text-decoration: none;">info@tiadesigns.it</a> • 
                      Web: <a href="https://tiadesigns.it" style="color: #5eead4; text-decoration: none;">tiadesigns.it</a>
                    </p>
                  </div>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="background: rgba(0,0,0,0.5); padding: 18px 32px; border-top: 1px solid rgba(255,255,255,0.06); text-align: center;">
                  <p style="margin: 0; color: #6b7280; font-size: 11px; line-height: 1.5;">
                    Ricevi questa comunicazione ufficiale da Tia Designs • Mantova, Italia<br />
                    Questa email è confidenziale e protetta secondo gli standard di sicurezza e privacy.
                  </p>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

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

// POST /api/master/emails/send - Protected
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.username !== 'master') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      to,
      recipientName,
      subject,
      title,
      bodyMarkdown,
      ctaText,
      ctaUrl,
      badgeText,
      contactMessageId,
    } = body;

    if (!to || !subject || !bodyMarkdown) {
      return NextResponse.json({ error: 'Destinatario, oggetto e contenuto del messaggio sono obbligatori' }, { status: 400 });
    }

    const brandedHtml = buildBrandedEmailHtml({
      recipientName,
      title,
      bodyMarkdown,
      ctaText,
      ctaUrl,
      badgeText,
    });

    const sent = await sendEmail({
      to,
      subject,
      html: brandedHtml,
    });

    if (!sent) {
      return NextResponse.json({ error: 'Impossibile recapitare l\'email. Verifica le credenziali SMTP / Resend in .env.' }, { status: 502 });
    }

    // If connected to a contact message, update its status and note
    if (contactMessageId) {
      try {
        const msg = await prisma.contactMessage.findUnique({ where: { id: contactMessageId } });
        if (msg) {
          const timestamp = new Date().toLocaleString('it-IT');
          const replyNote = `[Risposto via Dashboard il ${timestamp}]: ${subject}`;
          const updatedNotes = msg.notes ? `${msg.notes}\n${replyNote}` : replyNote;
          await prisma.contactMessage.update({
            where: { id: contactMessageId },
            data: {
              status: 'contacted',
              notes: updatedNotes,
            },
          });
        }
      } catch (err) {
        console.error('Failed to update contactMessage status:', err);
      }
    }

    return NextResponse.json({ success: true, message: 'Email inviata con successo nello stile branded!' });
  } catch (error: any) {
    console.error('Error sending master email:', error);
    return NextResponse.json({ error: getDatabaseErrorMessage(error) }, { status: 500 });
  }
}

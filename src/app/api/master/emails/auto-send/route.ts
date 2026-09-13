import { NextRequest, NextResponse } from 'next/server';
import { prisma, getDatabaseErrorMessage } from '@/lib/prisma';
import { getSession } from '@/lib/session';
import { buildBrandedEmailHtml, sendEmail } from '@/lib/branded-email';
import { sendArubaEmail, isArubaConfigured } from '@/lib/aruba-mail';

/**
 * Clean direct/personal email template (high deliverability for outreach).
 */
function buildDirectEmailHtml(bodyMarkdown: string, name?: string): string {
  // Convert newlines into paragraphs or line breaks
  const paragraphs = bodyMarkdown
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  const formattedParagraphs = paragraphs
    .map((p) => {
      // Basic bold and italic rendering
      const rendered = p
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/\n/g, '<br />');
      return `<p style="margin: 0 0 16px 0; line-height: 1.6; color: #222222; font-size: 15px;">${rendered}</p>`;
    })
    .join('');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Tia Designs</title>
</head>
<body style="margin: 0; padding: 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #ffffff; color: #222222;">
  <div style="max-width: 600px; margin: 0 auto;">
    ${formattedParagraphs}
    <div style="margin-top: 28px; padding-top: 16px; border-top: 1px solid #eeeeee; font-size: 13px; color: #666666;">
      <p style="margin: 0; font-weight: 600; color: #111111;">Mattia Chinaglia</p>
      <p style="margin: 2px 0 0 0;">Designer & Full-Stack Developer — <a href="https://tiadesigns.it" style="color: #0d9488; text-decoration: none;">tiadesigns.it</a></p>
      <p style="margin: 2px 0 0 0;">Email: <a href="mailto:info@tiadesigns.it" style="color: #0d9488; text-decoration: none;">info@tiadesigns.it</a></p>
    </div>
  </div>
</body>
</html>`;
}

// POST /api/master/emails/auto-send - Protected
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.username !== 'master') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      to,
      name,
      subject,
      body: emailBody,
      style = 'branded', // 'branded' | 'direct'
      badgeText = 'Proposta Dedicata',
      ctaText,
      ctaUrl,
      preferredChannel = 'auto', // 'auto' | 'aruba' | 'resend'
    } = body;

    if (!to || !subject || !emailBody) {
      return NextResponse.json(
        { error: 'Destinatario (to), oggetto (subject) e corpo del messaggio sono obbligatori' },
        { status: 400 }
      );
    }

    // Build the corresponding HTML
    let html = '';
    if (style === 'direct') {
      html = buildDirectEmailHtml(emailBody, name);
    } else {
      html = buildBrandedEmailHtml({
        recipientName: name || undefined,
        title: subject,
        bodyMarkdown: emailBody,
        badgeText,
        ctaText: ctaText || undefined,
        ctaUrl: ctaUrl || undefined,
      });
    }

    let sent = false;
    let channelUsed = '';

    // Channel selection
    if ((preferredChannel === 'aruba' || preferredChannel === 'auto') && isArubaConfigured()) {
      try {
        await sendArubaEmail({
          to,
          subject,
          html,
        });
        sent = true;
        channelUsed = 'Aruba SMTP (info@tiadesigns.it)';
      } catch (arubaErr) {
        console.warn(`[AutoSend] Invio via Aruba non riuscito per ${to}, provo fallback Resend/SMTP:`, arubaErr);
      }
    }

    if (!sent) {
      sent = await sendEmail({
        to,
        subject,
        html,
      });
      if (sent) channelUsed = 'Resend / SMTP Fallback';
    }

    if (!sent) {
      return NextResponse.json(
        {
          error: 'Impossibile recapitare l\'email. Verifica le credenziali Aruba Mail o Resend/SMTP in .env.',
          to,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      to,
      channel: channelUsed,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error in auto-send email route:', error);
    return NextResponse.json({ error: getDatabaseErrorMessage(error) }, { status: 500 });
  }
}

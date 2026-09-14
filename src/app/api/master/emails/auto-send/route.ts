import { NextRequest, NextResponse } from 'next/server';
import { prisma, getDatabaseErrorMessage } from '@/lib/prisma';
import { getSession } from '@/lib/session';
import { buildBrandedEmailHtml } from '@/lib/branded-email';
import { sendArubaEmail, isArubaConfigured } from '@/lib/aruba-mail';
import { isEmailAlreadySent, recordSentEmail } from '@/lib/email-dedup';

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
      greeting,
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

    // Anti-duplication check (unless exempt e.g. info@tiadesigns.it, tiachinaglia@gmail.com, latitiante@gmail.com)
    if (await isEmailAlreadySent(to)) {
      return NextResponse.json(
        {
          error: `Email già inviata in precedenza a ${to}. Invio bloccato per prevenire invii doppi e salvaguardare la reputazione anti-spam.`,
          to,
          alreadySent: true,
        },
        { status: 409 }
      );
    }

    // Build the corresponding HTML
    let html = '';
    if (style === 'direct') {
      html = buildDirectEmailHtml(emailBody, name);
    } else {
      html = buildBrandedEmailHtml({
        recipientName: name || undefined,
        greeting: greeting || undefined,
        title: subject,
        bodyMarkdown: emailBody,
        badgeText,
        ctaText: ctaText || undefined,
        ctaUrl: ctaUrl || undefined,
      });
    }

    // EXCLUSIVE Aruba SMTP channel for mass auto-send outreach.
    // Protects Resend free tier limits from being exhausted by mass campaigns.
    if (!isArubaConfigured()) {
      return NextResponse.json(
        {
          error:
            'Credenziali Aruba Mail non configurate (EMAIL_USER / EMAIL_PASS o ARUBA_EMAIL_PASSWORD in .env / Vercel). L\'invio massivo è vincolato al 100% su Aruba SMTP per non consumare la quota di Resend.',
          to,
        },
        { status: 500 }
      );
    }

    try {
      await sendArubaEmail({
        to,
        subject,
        html,
      });
    } catch (arubaErr: any) {
      console.error(`[AutoSend] Errore invio via Aruba SMTP per ${to}:`, arubaErr);
      return NextResponse.json(
        {
          error: `Errore Aruba SMTP: ${arubaErr.message || 'Impossibile recapitare l\'email tramite smtps.aruba.it'}`,
          to,
        },
        { status: 502 }
      );
    }

    const channelUsed = 'Aruba SMTP (info@tiadesigns.it) + IMAP Sent';

    // Record in sent registry
    await recordSentEmail({
      email: to,
      name,
      subject,
      source: 'auto_sender',
    });

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

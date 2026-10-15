import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { buildBrandedEmailHtml } from '@/lib/branded-email';
import { sendArubaEmail, isArubaConfigured } from '@/lib/aruba-mail';
import { isDuplicationExempt, recordSentEmail } from '@/lib/email-dedup';
import { deliverOutreach } from '@/lib/outreach-dispatch';
import { getOutreachStore } from '@/lib/outreach-server';
import { escapeEmailHtml } from '@/lib/email-markdown';

export const maxDuration = 120;

/**
 * Direct/personal template. Inbox placement is measured independently.
 */
function buildDirectEmailHtml(bodyMarkdown: string): string {
  // Convert newlines into paragraphs or line breaks
  const paragraphs = bodyMarkdown
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  const formattedParagraphs = paragraphs
    .map((p) => {
      // Basic bold and italic rendering
      const rendered = escapeEmailHtml(p)
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
      requestId,
      name,
      greeting,
      subject,
      body: emailBody,
      style = 'branded', // 'branded' | 'direct'
      badgeText = 'Proposta Dedicata',
      ctaText,
      ctaUrl,
    } = body;

    if (typeof to !== 'string' || to.length > 254 || !/^[^\s<>@,;]+@[^\s<>@,;]+\.[^\s<>@,;]+$/.test(to.trim()) ||
        typeof subject !== 'string' || !subject.trim() || subject.length > 200 || /[\r\n]/.test(subject) ||
        typeof emailBody !== 'string' || !emailBody.trim() || emailBody.length > 100000 ||
        typeof requestId !== 'string' || !/^[a-f0-9-]{36}$/i.test(requestId) || !['branded','direct'].includes(style) ||
        [name,greeting,badgeText,ctaText,ctaUrl].some(v => v != null && (typeof v !== 'string' || v.length > 2000))) {
      return NextResponse.json({ error: 'Destinatario singolo, oggetto, contenuto o identificativo invio non validi.' }, { status: 400 });
    }
    const email = to.trim().toLowerCase();

    // Build the corresponding HTML
    let html = '';
    if (style === 'direct') {
      html = buildDirectEmailHtml(emailBody);
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

    const result = await deliverOutreach(getOutreachStore(), { email, requestId, exempt: isDuplicationExempt(email) }, () => sendArubaEmail({ to: email, subject, html }));
    if (!result.ok) {
      return NextResponse.json({ success: false, error: result.error, uncertain: result.uncertain === true, retryAfter: 'retryAfter' in result ? result.retryAfter : undefined }, {
        status: result.status,
        headers: 'retryAfter' in result && result.retryAfter ? { 'Retry-After': String(result.retryAfter) } : undefined,
      });
    }
    // Durable admission already records acceptance, even if this legacy index fails.
    await recordSentEmail({ email, name, subject, source: 'auto_sender' });
    return NextResponse.json({ success: true, to: email, messageId: result.messageId, channel: 'Aruba SMTP', sentCopySaved: result.sentCopySaved, deliveryStatus: 'smtp_accepted', inboxPlacement: 'not_verified', timestamp: new Date().toISOString() });
  } catch {
    console.error('[AutoSend] Invio sospeso: storico o servizio non disponibile');
    return NextResponse.json({ error: 'Invio sospeso: verifica storico e disponibilità del servizio prima di ripetere.', uncertain: true }, { status: 503 });
  }
}

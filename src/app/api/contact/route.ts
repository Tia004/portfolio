import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { isValidContactEmail, isValidContactMessage, isValidContactName } from '@/lib/input-validation';
import { isInappropriateChatMessage, isInappropriateContactValue } from '@/lib/chat-moderation';
import {
  getClientIp,
  isSameOriginRequest,
  rateLimitResponse,
  takeChatRateLimit,
  validateChatSession,
  verifyTurnstile,
} from '@/lib/chat-security';

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character] ?? character);
}

/** Convert lightweight markdown to HTML for email rendering.
 *  Produces valid, well-structured HTML — paragraphs in <p>, lists in <ul>. */
function markdownToHtml(text: string): string {
  const escaped = escapeHtml(text);

  // Split into paragraphs by double newlines
  const paragraphs = escaped.split(/\n{2,}/);

  const htmlBlocks = paragraphs.map((para) => {
    const trimmed = para.trim();
    if (!trimmed) return '';

    // Check if this paragraph is a bullet list (all lines start with - or *)
    const lines = trimmed.split('\n');
    const isList = lines.every((line) => /^\s*[-*]\s+/.test(line) || line.trim() === '');

    if (isList) {
      const items = lines
        .filter((line) => line.trim() !== '')
        .map((line) => line.replace(/^\s*[-*]\s+/, '').trim())
        .map((item) => `<li>${item}</li>`)
        .join('');
      return `<ul>${items}</ul>`;
    }

    // Regular paragraph: process inline markup, join lines with <br />
    const withBreaks = lines.join('<br />');
    const formatted = withBreaks
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')  // **bold**
      .replace(/\*(.+?)\*/g, '<em>$1</em>');                // *italic*

    return `<p>${formatted}</p>`;
  });

  return htmlBlocks.filter(Boolean).join('');
}

export async function POST(req: NextRequest) {
  try {
    if (!isSameOriginRequest(req)) {
      return NextResponse.json({ error: 'Origine non autorizzata' }, { status: 403 });
    }
    const contentLength = Number(req.headers.get('content-length') || 0);
    if (contentLength > 256_000) {
      return NextResponse.json({ error: 'Payload troppo grande' }, { status: 413 });
    }

    const body = await req.json() as {
      name?: unknown;
      email?: unknown;
      message?: unknown;
      service?: unknown;
      source?: unknown;
      sessionId?: unknown;
      captchaToken?: unknown;
    };
    const ip = getClientIp(req);
    // Contact form is public — allow requests with or without a chat session
    const sessionId = validateChatSession(req, body.sessionId) ?? `contact-${ip}-${Date.now()}`;
    const limit = await takeChatRateLimit(ip, sessionId, 'contact');
    if (!limit.ok) return rateLimitResponse(limit.retryAfter);
    if (!await verifyTurnstile(body.captchaToken, ip)) {
      return NextResponse.json({ error: 'Verifica anti-bot non riuscita' }, { status: 403 });
    }

    const { name, email, message, service, source } = body;

    if (typeof name !== 'string' || !isValidContactName(name)) {
      return NextResponse.json({ error: 'Inserisci un nome valido, senza numeri o caratteri speciali.' }, { status: 400 });
    }
    if (typeof email !== 'string' || !isValidContactEmail(email)) {
      return NextResponse.json({ error: 'Inserisci un indirizzo email valido.' }, { status: 400 });
    }
    if (typeof message !== 'string' || !isValidContactMessage(message) || isInappropriateChatMessage(message) || isInappropriateContactValue(message)) {
      return NextResponse.json({ error: 'Scrivi una richiesta appropriata con qualche dettaglio sul progetto.' }, { status: 400 });
    }

    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      console.error('RESEND_API_KEY non configurato');
      return NextResponse.json({ error: 'Configurazione email incompleta. Contatta direttamente info@tiadesigns.it' }, { status: 500 });
    }

    const resend = new Resend(resendApiKey);

    // Recipient: where Tia receives the contact emails
    const recipientEmail = process.env.EMAIL_TO || 'info@tiadesigns.it';

    // Sender: onboarding@resend.dev works immediately without domain verification.
    // Once tiadesigns.it is verified in Resend, change to info@tiadesigns.it.
    const senderEmail = process.env.EMAIL_FROM || 'onboarding@resend.dev';

    const safeName = escapeHtml(name);
    const safeEmail = escapeHtml(email);
    const safeMessage = markdownToHtml(message);
    const safeService = typeof service === 'string' ? escapeHtml(service.slice(0, 120)) : '';

    const mailOptions = {
      from: `Portfolio Tia Designs <${senderEmail}>`,
      to: recipientEmail,
      replyTo: email,
      subject: `${source === 'ai-quote' ? 'Nuovo preventivo AI' : 'Nuovo messaggio'} da ${name} - Portfolio`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #0a0a0a; color: #fff; border-radius: 12px; border: 1px solid #1e293b;">
          <h2 style="color: #2dd4bf; margin-bottom: 20px;">Nuovo messaggio dal Portfolio</h2>
          <div style="background: #111; padding: 16px; border-radius: 8px; margin-bottom: 16px;">
            <p style="margin: 4px 0;"><strong>Nome:</strong> ${safeName}</p>
            <p style="margin: 4px 0;"><strong>Email:</strong> ${safeEmail}</p>
            ${safeService ? `<p style="margin: 4px 0;"><strong>Servizio richiesto:</strong> ${safeService}</p>` : ''}
          </div>
          <div style="background: #111; padding: 16px; border-radius: 8px;">
            <p style="margin: 4px 0;"><strong>Messaggio:</strong></p>
            <div style="margin: 8px 0; line-height: 1.6;">${safeMessage}</div>
          </div>
          <p style="color: #666; font-size: 12px; margin-top: 20px;">Ricevuto dal portfolio di Tia Designs</p>
        </div>
      `,
    };

    await resend.emails.send(mailOptions);

    return NextResponse.json({ success: true, message: 'Email inviata con successo' });
  } catch (error) {
    console.error('Error sending email:', error);
    return NextResponse.json({ error: 'Errore invio email' }, { status: 500 });
  }
}

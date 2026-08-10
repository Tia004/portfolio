import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import nodemailer from 'nodemailer';
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

/**
 * SMTP fallback (Gmail app password via EMAIL_USER/EMAIL_PASS): Resend's
 * sandbox sender (onboarding@resend.dev) only delivers to the account owner's
 * verified address until the domain is verified, so relying on Resend alone
 * made "the email never arrives" the norm. SMTP sends to ANY recipient
 * (e.g. info@tiadesigns.it) reliably. Note: Gmail SMTP rewrites the From
 * header to the authenticated account (EMAIL_USER) unless the chosen address
 * is added as a verified "Send mail as" alias in Gmail — see the warning in
 * the POST handler.
 */
async function sendViaSmtp(opts: { to: string; bcc?: string; replyTo?: string; subject: string; html: string; from: string }): Promise<boolean> {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;
  if (!user || !pass) return false;
  try {
    const port = Number(process.env.EMAIL_PORT || 465);
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port,
      secure: port === 465,
      auth: { user, pass },
    });
    await transporter.sendMail({
      from: opts.from,
      to: opts.to,
      bcc: opts.bcc,
      replyTo: opts.replyTo,
      subject: opts.subject,
      html: opts.html,
    });
    return true;
  } catch (error) {
    console.error('SMTP fallback fallito:', error instanceof Error ? error.message : error);
    return false;
  }
}

/** Normalize an EMAIL_FROM value: "Name <a@b.c>" or just "a@b.c". */
function normalizeFrom(value: string | undefined): { name: string; address: string } {
  if (!value) return { name: 'Tia Designs', address: 'info@tiadesigns.it' };
  const match = value.match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
  if (match) return { name: match[1].trim() || 'Tia Designs', address: match[2].trim() };
  return { name: 'Tia Designs', address: value.trim() };
}

/** Build the "chips" row (chosen options) for the email body from details. */
function buildChipsHtml(details: Record<string, string | number> | undefined): string {
  if (!details) return '';
  const order: [string, string][] = [
    ['service', 'Servizio'],
    ['type', 'Tipo'],
    ['budget', 'Budget'],
    ['pages', 'Pagine'],
    ['delivery', 'Consegna'],
  ];
  const chips: string[] = [];
  for (const [key, label] of order) {
    const value = details[key];
    if (value === undefined || value === null || value === '') continue;
    let text = String(value);
    if (key === 'budget') {
      const n = Number(text);
      if (Number.isFinite(n) && n > 0) text = `€${n.toLocaleString('it-IT')}`;
    }
    chips.push(`<span style="display:inline-block;background:#0f2725;border:1px solid rgba(45,212,191,0.45);color:#5eead4;border-radius:999px;padding:6px 14px;font-size:13px;font-weight:600;margin:0 8px 8px 0;">${escapeHtml(label)}: ${escapeHtml(text)}</span>`);
  }
  if (chips.length === 0) return '';
  return `<div style="margin:0 0 16px 0;">${chips.join('')}</div>`;
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
      details?: unknown;
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
      console.error('RESEND_API_KEY non configurato — uso fallback SMTP');
    }

    const resend = resendApiKey ? new Resend(resendApiKey) : null;

    // Recipient: where Tia receives the contact emails
    const recipientEmail = process.env.EMAIL_TO || 'info@tiadesigns.it';

    // Sender: the brand address by default. With Resend this requires the
    // tiadesigns.it domain to be verified; with the Gmail SMTP fallback the
    // address must be added as a verified "Send mail as" alias in Gmail
    // (otherwise Gmail rewrites the From header back to EMAIL_USER).
    const sender = normalizeFrom(process.env.EMAIL_FROM);
    const senderEmail = sender.address;
    if (senderEmail === 'onboarding@resend.dev') {
      console.warn('[contact] EMAIL_FROM non impostato: uso onboarding@resend.dev (sandbox).',
        'Le email raggiungono SOLO l\'indirizzo registrato su Resend finché il dominio',
        'tiadesigns.it non è verificato. Verifica il dominio in Resend e imposta',
        'EMAIL_FROM="Tia Designs <info@tiadesigns.it>".');
    }
    if (process.env.NODE_ENV === 'production' && process.env.EMAIL_USER && senderEmail !== process.env.EMAIL_USER
      && senderEmail !== 'info@tiadesigns.it' && senderEmail !== 'onboarding@resend.dev') {
      console.warn('[contact] Attenzione: Gmail SMTP riscrive il From sull\'account autenticato.',
        'Per inviare come', senderEmail, 'aggiungilo come alias "Send mail as" nelle impostazioni Gmail',
        '(Settings → Accounts → Send mail as → add', senderEmail, 'e verifica il codice).');
    }

    // Structured details (service, type, budget, pages, delivery) chosen in the
    // chatbot — rendered as "chips" in the email. Values are re-validated below.
    const rawDetails = (typeof body.details === 'object' && body.details !== null && !Array.isArray(body.details))
      ? body.details as Record<string, unknown>
      : {};
    const details: Record<string, string | number> = {};
    const allowedKeys = ['service', 'type', 'budget', 'pages', 'delivery'] as const;
    for (const key of allowedKeys) {
      const value = rawDetails[key];
      if (typeof value === 'string') {
        const safe = value.replace(/[<>"']/g, '').slice(0, 120).trim();
        if (safe) details[key] = safe;
      } else if (typeof value === 'number' && Number.isFinite(value)) {
        details[key] = Math.round(value);
      }
    }

    const safeName = escapeHtml(name);
    const safeEmail = escapeHtml(email);
    const safeMessage = markdownToHtml(message);
    const safeService = typeof service === 'string' ? escapeHtml(service.slice(0, 120)) : '';
    const chipsHtml = buildChipsHtml(details);

    const mailOptions = {
      from: `${sender.name} <${senderEmail}>`,
      to: recipientEmail,
      replyTo: email,
      subject: `${source === 'ai-quote' ? 'Nuovo preventivo AI' : 'Nuovo messaggio'} da ${name} - Portfolio`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #0a0a0a; color: #fff; border-radius: 12px; border: 1px solid #1e293b;">
          <h2 style="color: #2dd4bf; margin-bottom: 20px;">${source === 'ai-quote' ? 'Nuovo preventivo AI' : 'Nuovo messaggio'} dal Portfolio</h2>
          <div style="background: #111; padding: 16px; border-radius: 8px; margin-bottom: 16px;">
            <p style="margin: 4px 0;"><strong>Nome:</strong> ${safeName}</p>
            <p style="margin: 4px 0;"><strong>Email:</strong> ${safeEmail}</p>
            ${safeService ? `<p style="margin: 4px 0;"><strong>Servizio richiesto:</strong> ${safeService}</p>` : ''}
          </div>
          ${chipsHtml}
          <div style="background: #111; padding: 16px; border-radius: 8px;">
            <p style="margin: 4px 0;"><strong>Messaggio:</strong></p>
            <div style="margin: 8px 0; line-height: 1.6;">${safeMessage}</div>
          </div>
          <p style="color: #666; font-size: 12px; margin-top: 20px;">Ricevuto dal portfolio di Tia Designs</p>
        </div>
      `,
    };

    let delivered = false;
    if (resend) {
      const { error: sendError } = await resend.emails.send(mailOptions);
      if (sendError) {
        // Surface Resend's rejection (invalid key, unverified domain, sandbox
        // recipient restriction) instead of answering "success" silently.
        console.error('Resend invio email fallito:', JSON.stringify(sendError).slice(0, 500));
      } else {
        delivered = true;
      }
    }
    if (!delivered) {
      delivered = await sendViaSmtp({
        to: recipientEmail,
        replyTo: email,
        subject: mailOptions.subject,
        html: mailOptions.html,
        from: mailOptions.from,
      });
      if (!delivered) {
        return NextResponse.json({ error: 'Invio email non riuscito. Riprova o scrivi direttamente a info@tiadesigns.it' }, { status: 502 });
      }
    }

    // ── Send a copy to the client when it's an AI quote ──
    if (source === 'ai-quote') {
      const clientHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; background: #0a0a0a; color: #e5e7eb; border-radius: 12px; border: 1px solid #1e293b;">
          <h1 style="color: #2dd4bf; margin-bottom: 8px; font-size: 24px;">Tia Designs</h1>
          <p style="color: #9ca3af; font-size: 14px; margin-bottom: 24px;">Design • Sviluppo Web • Video</p>
          <div style="background: #111; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 3px solid #2dd4bf;">
            <p style="margin: 0 0 12px 0; font-size: 16px;">Ciao <strong>${safeName}</strong>,</p>
            <p style="margin: 0; line-height: 1.7; font-size: 14px;">
              Grazie per avermi contattato! Ho ricevuto la tua richiesta e sto già preparando un <strong>preventivo personalizzato</strong> per il tuo progetto.
            </p>
          </div>
          <div style="background: #111; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <p style="margin: 0 0 10px 0; font-size: 13px; color: #9ca3af; text-transform: uppercase; letter-spacing: 1px;">Riepilogo della tua richiesta</p>
            ${chipsHtml}
            <div style="line-height: 1.7; font-size: 14px;">${safeMessage}</div>
          </div>
          <p style="color: #9ca3af; font-size: 13px; line-height: 1.6; margin-bottom: 20px;">
            Riceverai il preventivo dettagliato <strong>entro 24 ore</strong> all'indirizzo <strong>${safeEmail}</strong>. Se hai domande urgenti, puoi rispondere direttamente a questa email.
          </p>
          <div style="border-top: 1px solid #1e293b; padding-top: 16px;">
            <p style="color: #6b7280; font-size: 12px; margin: 0;">
              Tia Chinaglia • <a href="https://tiadesigns.it" style="color: #2dd4bf;">tiadesigns.it</a> • <a href="mailto:info@tiadesigns.it" style="color: #2dd4bf;">info@tiadesigns.it</a>
            </p>
          </div>
        </div>
      `;

      // The recap goes to the client AND to Tia (BCC): Tia must always see
      // exactly what the client received, at info@tiadesigns.it.
      const clientCopyTo = email;
      const clientCopyBcc = recipientEmail;
      let clientCopyOk = false;
      if (resend) {
        const { error: clientCopyError } = await resend.emails.send({
          from: `${sender.name} <${senderEmail}>`,
          to: clientCopyTo,
          bcc: clientCopyBcc,
          subject: `Abbiamo ricevuto la tua richiesta, ${name}! 🎨`,
          html: clientHtml,
        });
        if (clientCopyError) {
          console.error('Copia cliente Resend non inviata:', JSON.stringify(clientCopyError).slice(0, 300));
        } else {
          clientCopyOk = true;
        }
      }
      if (!clientCopyOk) {
        await sendViaSmtp({
          to: clientCopyTo,
          bcc: clientCopyBcc,
          from: `${sender.name} <${senderEmail}>`,
          subject: `Abbiamo ricevuto la tua richiesta, ${name}! 🎨`,
          html: clientHtml,
        });
      }
    }

    return NextResponse.json({ success: true, message: 'Email inviata con successo' });
  } catch (error) {
    console.error('Error sending email:', error);
    return NextResponse.json({ error: 'Errore invio email' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { addMessage, getRecentMessages, getTiaMessagesSince } from '@/lib/chatStore';
import { isInappropriateChatMessage } from '@/lib/chat-moderation';
import { getAvailability } from '@/lib/availability';
import {
  getClientIp,
  isSameOriginRequest,
  rateLimitResponse,
  sanitizeChatText,
  takeChatRateLimit,
  validateChatSession,
  verifyTurnstile,
} from '@/lib/chat-security';

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

/** Get a rough location string from an IP address using ip-api.com (free, no key). */
async function getLocation(ip: string): Promise<string> {
  if (!ip || ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
    return 'localhost';
  }
  try {
    const res = await fetch(`http://ip-api.com/json/${encodeURIComponent(ip)}?fields=city,regionName,country,isp,query`, {
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return 'sconosciuta';
    const data = await res.json();
    const parts: string[] = [];
    if (data.city) parts.push(data.city);
    if (data.regionName) parts.push(data.regionName);
    if (data.country) parts.push(data.country);
    return parts.join(', ') || 'sconosciuta';
  } catch {
    return 'sconosciuta';
  }
}

export async function GET(req: NextRequest) {
  try {
    if (!isSameOriginRequest(req)) {
      return NextResponse.json({ error: 'Origine non autorizzata' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const requestedSessionId = searchParams.get('sessionId');
    const sessionId = validateChatSession(req, requestedSessionId);
    if (!sessionId) {
      return NextResponse.json({ error: 'Sessione non valida' }, { status: 401 });
    }

    const sinceValue = Number(searchParams.get('since') || '0');
    const since = Number.isFinite(sinceValue) ? Math.max(0, sinceValue) : 0;

    const messages = await getTiaMessagesSince(sessionId, since);
    return NextResponse.json({ messages }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!isSameOriginRequest(req)) {
      return NextResponse.json({ error: 'Origine non autorizzata' }, { status: 403 });
    }

    const body = await req.json() as { text?: unknown; sessionId?: unknown; captchaToken?: unknown };
    const sessionId = validateChatSession(req, body.sessionId);
    if (!sessionId) {
      return NextResponse.json({ error: 'Sessione chat non valida' }, { status: 401 });
    }

    const ip = getClientIp(req);
    const limit = await takeChatRateLimit(ip, sessionId, 'telegram');
    if (!limit.ok) return rateLimitResponse(limit.retryAfter);

    if (!await verifyTurnstile(body.captchaToken, ip)) {
      return NextResponse.json({ error: 'Verifica anti-bot non riuscita' }, { status: 403 });
    }

    const text = sanitizeChatText(body.text);
    if (!text) {
      return NextResponse.json({ error: 'Messaggio vuoto' }, { status: 400 });
    }
    if (isInappropriateChatMessage(text)) {
      return NextResponse.json({ error: 'Messaggio non consentito' }, { status: 422 });
    }

    await addMessage(sessionId, {
      text,
      sender: 'client',
      timestamp: Date.now(),
    });

    const availability = await getAvailability();
    if (!availability.isOnline) {
      return NextResponse.json(
        { ok: true, available: false },
        { headers: { 'Cache-Control': 'no-store' } },
      );
    }

    if (TELEGRAM_TOKEN && TELEGRAM_CHAT_ID) {
      const location = await getLocation(ip);

      // ── Fetch conversation context (last 3 messages) for Telegram preview ──
      const history = await getRecentMessages(sessionId, 3);
      const historyText = history.length > 0
        ? history.map((m) => `${m.sender === 'client' ? '👤' : '💬'} ${m.text.slice(0, 120)}`).join('\n')
        : '';
      const contextBlock = historyText ? `\n\n📜 Storico:\n${historyText}` : '';

      // Main message with force_reply for easy responding
      await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text: `💬 Nuovo messaggio dalla chat\n📍 ${location}\n🆔 ${sessionId}\n📝 ${text}${contextBlock}\n\n↩️ Usa "Rispondi" per scrivere a questo utente`,
          reply_markup: {
            force_reply: true,
            input_field_placeholder: 'Scrivi la risposta per questo utente…',
            selective: true,
          },
        }),
        signal: AbortSignal.timeout(8_000),
      });

      // Follow-up message with inline "Close" button
      await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text: `🔒 Al termine, clicca qui sotto per chiudere la conversazione con 🆔 ${sessionId}`,
          reply_markup: {
            inline_keyboard: [
              [{ text: '📜 Mostra tutto', callback_data: `show_history:${sessionId}` }],
              [{ text: '🔒 Chiudi conversazione', callback_data: `close_session:${sessionId}` }],
            ],
          },
        }),
        signal: AbortSignal.timeout(8_000),
      });
    }

    return NextResponse.json({ ok: true, available: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 });
  }
}

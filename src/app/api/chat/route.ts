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

const locationCache = new Map<string, string>();

/** Get a rough location string from an IP address with fast in-memory caching and a short timeout. */
async function getLocation(ip: string): Promise<string> {
  if (!ip || ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
    return 'localhost';
  }
  if (locationCache.has(ip)) {
    return locationCache.get(ip)!;
  }
  try {
    const res = await fetch(`http://ip-api.com/json/${encodeURIComponent(ip)}?fields=city,regionName,country`, {
      signal: AbortSignal.timeout(600),
    });
    if (!res.ok) return 'sconosciuta';
    const data = await res.json();
    const parts: string[] = [];
    if (data.city) parts.push(data.city);
    if (data.regionName) parts.push(data.regionName);
    if (data.country) parts.push(data.country);
    const loc = parts.join(', ') || 'sconosciuta';
    if (locationCache.size > 500) {
      const firstKey = locationCache.keys().next().value;
      if (firstKey) locationCache.delete(firstKey);
    }
    locationCache.set(ip, loc);
    return loc;
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

    // Parallelize message storage, availability check, location lookup, and history retrieval
    const [, availability, location, history] = await Promise.all([
      addMessage(sessionId, {
        text,
        sender: 'client',
        timestamp: Date.now(),
      }),
      getAvailability(),
      getLocation(ip),
      getRecentMessages(sessionId, 3),
    ]);

    if (!availability.isOnline) {
      return NextResponse.json(
        { ok: true, available: false },
        { headers: { 'Cache-Control': 'no-store' } },
      );
    }

    if (TELEGRAM_TOKEN && TELEGRAM_CHAT_ID) {
      const historyText = history.length > 0
        ? history.map((m) => `${m.sender === 'client' ? '👤' : '💬'} ${m.text.slice(0, 120)}`).join('\n')
        : '';
      const contextBlock = historyText ? `\n\n📜 Storico:\n${historyText}` : '';

      // Main message with force_reply for easy responding
      const mainTgMsg = fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
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
        signal: AbortSignal.timeout(4_000),
      });

      // Follow-up message with inline buttons (sent in parallel)
      const followUpTgMsg = fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
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
        signal: AbortSignal.timeout(4_000),
      });

      // Wait in parallel with safe error suppression
      await Promise.allSettled([mainTgMsg, followUpTgMsg]);
    }

    return NextResponse.json({ ok: true, available: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 });
  }
}

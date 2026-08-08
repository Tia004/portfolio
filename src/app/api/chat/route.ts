import { NextRequest, NextResponse } from 'next/server';
import { addMessage } from '@/lib/chatStore';
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
      await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text: `💬 Nuovo messaggio dalla chat\n📍 ${location}\n🆔 ${sessionId}\n📝 ${text}`,
        }),
        signal: AbortSignal.timeout(8_000),
      });
    }

    return NextResponse.json({ ok: true, available: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 });
  }
}

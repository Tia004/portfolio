import { NextRequest, NextResponse } from 'next/server';
import { addMessage } from '@/lib/chatStore';

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

/** Get a rough location string from an IP address using ip-api.com (free, no key). */
async function getLocation(ip: string): Promise<string> {
  if (!ip || ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
    return 'localhost';
  }
  try {
    const res = await fetch(`http://ip-api.com/json/${ip}?fields=city,regionName,country,isp,query`, {
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
    const { text, sessionId } = await req.json();

    if (!text || !text.trim()) {
      return NextResponse.json({ error: 'Messaggio vuoto' }, { status: 400 });
    }

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId richiesto' }, { status: 400 });
    }

    // Get client IP
    const forwarded = req.headers.get('x-forwarded-for');
    const ip = forwarded
      ? forwarded.split(',')[0].trim()
      : req.headers.get('x-real-ip') || '127.0.0.1';

    // Store the client message
    await addMessage(sessionId, {
      text: text.trim(),
      sender: 'client',
      timestamp: Date.now(),
    });

    // Forward to Telegram with location info
    if (TELEGRAM_TOKEN && TELEGRAM_CHAT_ID) {
      const location = await getLocation(ip);
      await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text:
            `💬 Nuovo messaggio dalla chat\n` +
            `📍 ${location}\n` +
            `🆔 ${sessionId}\n` +
            `📝 ${text.trim()}`,
        }),
      });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { logEvent } from '@/lib/analytics';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId, event, text } = body;

    if (!sessionId || !event) {
      return NextResponse.json({ error: 'sessionId and event are required' }, { status: 400 });
    }

    const validEvents = ['chat_open', 'chat_close', 'message_sent', 'ai_response'];
    if (!validEvents.includes(event)) {
      return NextResponse.json({ error: `Invalid event: ${event}` }, { status: 400 });
    }

    const wordCount = text ? text.trim().split(/\s+/).filter(Boolean).length : 0;

    logEvent({
      sessionId,
      event,
      text: text || undefined,
      wordCount,
      timestamp: Date.now(),
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { addMessage } from '@/lib/chatStore';

/**
 * Telegram Bot webhook.
 *
 * Receives updates when Tia replies to a message on Telegram.
 * The reply MUST be an inline reply to the original bot message.
 * The bot message contains the sessionId (🆔 abc123) — we extract it
 * from the replied-to message text.
 *
 * Setup (run once, after deploy):
 *   curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://yourdomain.com/api/chat/webhook"
 *
 * To check current webhook:
 *   curl "https://api.telegram.org/bot<TOKEN>/getWebhookInfo"
 */
export async function POST(req: NextRequest) {
  try {
    const update = await req.json();

    // We only care about messages that are replies to bot messages
    const msg = update?.message;
    if (!msg || !msg.text || !msg.reply_to_message?.text) {
      return NextResponse.json({ ok: true }); // Ignore non-replies
    }

    // Extract sessionId from the replied-to message
    const repliedText: string = msg.reply_to_message.text;
    const sessionMatch = repliedText.match(/🆔\s*(\S+)/);
    if (!sessionMatch) {
      return NextResponse.json({ ok: true }); // No session ID found
    }

    const sessionId = sessionMatch[1].trim();
    const replyText = msg.text.trim();

    // Store the reply as a Tia message in the session
    await addMessage(sessionId, {
      text: replyText,
      sender: 'tia',
      timestamp: Date.now(),
    });

    console.log(`[chat/webhook] Reply stored for session ${sessionId}: "${replyText}"`);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[chat/webhook] Error:', err);
    return NextResponse.json({ ok: true }); // Always return 200 for Telegram
  }
}

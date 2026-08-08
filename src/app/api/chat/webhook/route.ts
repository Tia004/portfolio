import { timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { addMessage, closeSession } from '@/lib/chatStore';
import { isInappropriateChatMessage } from '@/lib/chat-moderation';
import { sanitizeChatText } from '@/lib/chat-security';
import { getAvailability, setAvailability } from '@/lib/availability';

function isValidWebhookSecret(req: NextRequest): boolean {
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!expected) return process.env.NODE_ENV !== 'production';
  const received = req.headers.get('x-telegram-bot-api-secret-token') || '';
  const left = Buffer.from(received);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

/**
 * Telegram Bot webhook.
 *
 * Receives updates when Tia replies to a message on Telegram.
 * The reply MUST be an inline reply to the original bot message.
 * The bot message contains the sessionId (🆔 abc123) — we extract it
 * from the replied-to message text.
 *
 * Setup (run once, after deploy):
 *   curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://yourdomain.com/api/chat/webhook&secret_token=<TELEGRAM_WEBHOOK_SECRET>"
 *
 * To check current webhook:
 *   curl "https://api.telegram.org/bot<TOKEN>/getWebhookInfo"
 */
export async function POST(req: NextRequest) {
  try {
    if (!isValidWebhookSecret(req)) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }
    const contentLength = Number(req.headers.get('content-length') || 0);
    if (contentLength > 128_000) {
      return NextResponse.json({ ok: false }, { status: 413 });
    }
    const update = await req.json();

    // ── Handle inline keyboard callback ("Chiudi conversazione") ──
    const callback = update?.callback_query;
    if (callback && typeof callback.data === 'string') {
      const match = callback.data.match(/^close_session:(.+)$/);
      if (match) {
        const sessionId = match[1];
        if (/^[0-9a-f-]{36}$/i.test(sessionId)) {
          const success = await closeSession(sessionId);
          const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
          if (telegramToken) {
            // Answer the callback query so the button stops spinning
            await fetch(`https://api.telegram.org/bot${telegramToken}/answerCallbackQuery`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                callback_query_id: callback.id,
                text: success ? '✅ Conversazione chiusa' : '⚠️ Errore — riprova',
                show_alert: false,
              }),
              signal: AbortSignal.timeout(5_000),
            });

            // Edit the inline keyboard message to show closure
            if (callback.message?.chat?.id && callback.message?.message_id) {
              await fetch(`https://api.telegram.org/bot${telegramToken}/editMessageText`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  chat_id: callback.message.chat.id,
                  message_id: callback.message.message_id,
                  text: `✅ Conversazione chiusa — 🆔 ${sessionId}`,
                }),
                signal: AbortSignal.timeout(5_000),
              });
            }
          }
          console.log(`[chat/webhook] Session closed: ${sessionId}`);
        }
      }
      return NextResponse.json({ ok: true });
    }

    const msg = update?.message;
    if (!msg || typeof msg.text !== 'string') {
      return NextResponse.json({ ok: true });
    }

    // Availability commands are accepted only from the configured Telegram
    // chat. A private chat is already bound to one account; group chats must
    // additionally configure TELEGRAM_ADMIN_USER_ID so any other member is
    // unable to toggle the public status.
    const configuredChatId = process.env.TELEGRAM_CHAT_ID;
    const configuredAdminUserId = process.env.TELEGRAM_ADMIN_USER_ID;
    const senderChatId = String(msg.chat?.id ?? '');
    const senderUserId = String(msg.from?.id ?? '');
    const chatType = String(msg.chat?.type ?? '');
    const command = msg.text.trim().split(/\s+/, 1)[0].toLowerCase().split('@', 1)[0];
    const availabilityCommand = command === '/online' || command === '/offline' || command === '/status';
    if (availabilityCommand) {
      const authorizedChat = Boolean(configuredChatId && senderChatId === configuredChatId);
      const adminRequired = chatType !== 'private';
      const authorizedUser = adminRequired
        ? Boolean(configuredAdminUserId && senderUserId === configuredAdminUserId)
        : (!configuredAdminUserId || senderUserId === configuredAdminUserId);
      if (!authorizedChat || !authorizedUser) {
        return NextResponse.json({ ok: true });
      }

      const availability = command === '/status'
        ? await getAvailability()
        : await setAvailability(command === '/online');
      const statusText = availability.isOnline
        ? '🟢 Disponibilità attiva: i nuovi messaggi verranno inoltrati.'
        : '🔴 Non disponibile: i nuovi messaggi resteranno salvati ma non verranno inoltrati.';
      const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
      if (telegramToken) {
        await fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: configuredChatId, text: statusText }),
          signal: AbortSignal.timeout(8_000),
        });
      }
      return NextResponse.json({ ok: true });
    }

    // ── /reply <sessionId> <message> — fallback when force_reply doesn't work ──
    const replyMatch = msg.text.match(/^\/reply\s+([0-9a-f-]{36})\s+(.+)$/is);
    if (replyMatch) {
      const sessionId = replyMatch[1];
      const replyText = sanitizeChatText(replyMatch[2], 8_000);
      if (replyText && !isInappropriateChatMessage(replyText)) {
        await addMessage(sessionId, {
          text: replyText,
          sender: 'tia',
          timestamp: Date.now(),
        });
        console.log(`[chat/webhook] Reply via /reply command for session ${sessionId}: "${replyText}"`);

        const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
        if (telegramToken) {
          await fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: senderChatId,
              text: `✅ Risposta inviata a 🆔 ${sessionId}`,
              reply_to_message_id: msg.message_id,
            }),
            signal: AbortSignal.timeout(5_000),
          });
        }
      }
      return NextResponse.json({ ok: true });
    }

    // We only care about messages that are replies to bot messages
    if (!msg.reply_to_message?.text) {
      return NextResponse.json({ ok: true });
    }

    // Extract sessionId from the replied-to message
    const repliedText: string = msg.reply_to_message.text;
    const sessionMatch = repliedText.match(/🆔\s*(\S+)/);
    if (!sessionMatch) {
      return NextResponse.json({ ok: true }); // No session ID found
    }

    const sessionId = sessionMatch[1].trim();
    if (!/^[0-9a-f-]{36}$/i.test(sessionId)) {
      return NextResponse.json({ ok: true });
    }
    const replyText = sanitizeChatText(msg.text, 8_000);
    if (!replyText || isInappropriateChatMessage(replyText)) {
      return NextResponse.json({ ok: true });
    }

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

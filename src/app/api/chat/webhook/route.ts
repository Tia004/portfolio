import { timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { addMessage, closeSession, getRecentMessages, getSystemDiagnostics } from '@/lib/chatStore';
import { isInappropriateChatMessage } from '@/lib/chat-moderation';
import { runTurnstileDiagnostics, sanitizeChatText } from '@/lib/chat-security';
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
      // ── "📜 Mostra tutto" — send full conversation history as a separate message ──
      const historyMatch = callback.data.match(/^show_history:(.+)$/);
      if (historyMatch) {
        const sessionId = historyMatch[1];
        if (/^[0-9a-f-]{36}$/i.test(sessionId)) {
          const msgs = await getRecentMessages(sessionId, 50);
          const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
          if (telegramToken) {
            const chatId = callback.message?.chat?.id;

            // Answer the callback
            await fetch(`https://api.telegram.org/bot${telegramToken}/answerCallbackQuery`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                callback_query_id: callback.id,
                text: msgs.length > 0 ? `📜 ${msgs.length} messaggi caricati` : '📭 Nessun messaggio',
                show_alert: false,
              }),
              signal: AbortSignal.timeout(5_000),
            });

            // Send full history
            const historyText = msgs.length > 0
              ? msgs.map((m, i) => {
                  const prefix = m.sender === 'client' ? '👤 Cliente' : '💬 Tia';
                  const time = new Date(m.timestamp).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
                  return `${i + 1}. [${time}] ${prefix}: ${m.text}`;
                }).join('\n\n')
              : '📭 Nessun messaggio in questa conversazione.';

            if (chatId) {
              await fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  chat_id: chatId,
                  text: `📜 Storico completo — 🆔 ${sessionId}\n\n${historyText}`,
                }),
                signal: AbortSignal.timeout(8_000),
              });
            }
          }
          console.log(`[chat/webhook] History sent for session ${sessionId}: ${msgs.length} messages`);
        }
        return NextResponse.json({ ok: true });
      }

      // ── "🔒 Chiudi conversazione" ──
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

      const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
      let statusText: string;

      if (command === '/status') {
        // Full diagnostic report: Turso tables + last persisted message,
        // Redis state and double-write alignment — no more blind diagnosis.
        const availability = await getAvailability();
        const diag = await getSystemDiagnostics();

        const t = (v: string) => v.slice(0, 140);
        const fmtTime = (ts: number) => new Date(ts).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
        const senderLabel = (s: string) => (s === 'tia' ? '💬 Tia' : '👤 Cliente');

        const tableLine = diag.tables.length > 0 ? diag.tables.join(', ') : '—';
        const lastTursoLine = diag.lastTursoMessage
          ? `• [${fmtTime(diag.lastTursoMessage.timestamp)}] ${senderLabel(diag.lastTursoMessage.sender)}: ${t(diag.lastTursoMessage.text)}`
          : '• (nessun messaggio persistito)';
        const redisLine = diag.latestSessionId
          ? `• Sessione più recente: 🆔 ${diag.latestSessionId.slice(0, 8)}…\n• Messaggi in Redis: ${diag.redisCountLatestSession ?? 'n/d'}\n• ${diag.lastRedisMessage ? `Ultimo: [${fmtTime(diag.lastRedisMessage.timestamp)}] ${senderLabel(diag.lastRedisMessage.sender)}: ${t(diag.lastRedisMessage.text)}` : 'Ultimo: —'}`
          : '• (nessuna sessione)';

        // Turnstile health: secret + siteverify API contract + 24h fail counter.
        const turnstile = await runTurnstileDiagnostics();
        const turnstileLabel = !turnstile.secretConfigured
          ? '❌ TURNSTILE_SECRET mancante — chat fail-closed (403)!'
          : turnstile.siteverifyOk
            ? `✅ OK (siteverify ${turnstile.siteverifyLatencyMs}ms)`
            : `❌ siteverify: ${turnstile.siteverifyError ?? 'errore sconosciuto'}`;
        const fails24h = turnstile.fails24h < 0 ? 'n/d' : String(turnstile.fails24h);
        const failsWarn = turnstile.fails24h > 20
          ? ' ⚠️ picco anomalo — widget/API Turnstile probabilmente rotti!'
          : '';

        // Mirror double-write: both stores must hold the same latest message.
        // A missing/stale Redis copy while Turso is fine is a real warning now
        // (Redis is a live mirror, not a standby fallback).
        const mirrorAligned = diag.tursoOk && diag.redisOk
          && diag.lastTursoMessage !== null
          && diag.lastRedisMessage !== null
          && Math.abs(diag.lastTursoMessage.timestamp - diag.lastRedisMessage.timestamp) < 60_000;
        const doubleWriteLabel = !diag.tursoOk && !diag.redisOk
          ? '❌ ENTRAMBI GIÙ — messaggi solo in memoria locale'
          : !diag.tursoOk
            ? '⚠️ solo Redis attivo (Turso non raggiungibile)'
            : !diag.redisOk
              ? '⚠️ solo Turso (Redis non raggiungibile)'
              : mirrorAligned
                ? '✅ speculare allineata (Turso + Redis)'
                : '⚠️ Turso ok ma mirror Redis non allineato';

        statusText = [
          '📊 DIAGNOSTICA SISTEMA — tiadesigns.it',
          '',
          `🗄️ Turso DB: ${diag.tursoOk ? '✅ OK' : '❌ NON RAGGIUNGIBILE'}`,
          `• Tabelle (${diag.tables.length}): ${tableLine}`,
          '• Ultimo messaggio salvato:',
          lastTursoLine,
          '',
          `🟠 Redis: ${diag.redisOk ? '✅ OK' : '❌ NON RAGGIUNGIBILE'}`, redisLine,
          '',
          `🔁 Doppia scrittura: ${doubleWriteLabel}`,
          '',
          `🛡️ Turnstile: ${turnstileLabel}`,
          `• Fail verifiche (24h): ${fails24h}${failsWarn}`,
          '',
          `🟢 Disponibilità: ${availability.isOnline ? 'ATTIVA' : 'NON attiva'}`,
        ].join('\n');
      } else {
        const availability = await setAvailability(command === '/online');
        statusText = availability.isOnline
          ? '🟢 Disponibilità attiva: i nuovi messaggi verranno inoltrati.'
          : '🔴 Non disponibile: i nuovi messaggi resteranno salvati ma non verranno inoltrati.';
      }

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

    // Store the reply as a Tia message in the session.
    // If all backends (DB, Redis, memory) fail, return 500 so Telegram
    // will retry the update instead of silently dropping the message.
    try {
      await addMessage(sessionId, {
        text: replyText,
        sender: 'tia',
        timestamp: Date.now(),
      });
      console.log(`[chat/webhook] Reply stored for session ${sessionId}: "${replyText}"`);
    } catch (err) {
      console.error('[chat/webhook] addMessage failed — all backends exhausted:', err);
      return NextResponse.json({ ok: false, error: 'storage-unavailable' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[chat/webhook] Error:', err);
    // Non-critical errors (parse failures, missing session, etc.) are OK.
    // Storage errors are already handled above with a 500 for Telegram retry.
    return NextResponse.json({ ok: true });
  }
}

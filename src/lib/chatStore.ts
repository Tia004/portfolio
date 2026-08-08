/**
 * Hybrid chat message store.
 *
 * Primary backend: Prisma / Turso (persistente su cloud).
 * Fallback: in-memory Map (quando il DB è offline — locale senza Turso,
 * token scaduto, cold start, ecc.).
 *
 * Il fallback è trasparente: i chiamanti non devono sapere quale backend
 * è in uso. I messaggi in-memory si perdono al restart del server.
 */

import { prisma } from '@/lib/prisma';

export interface ChatMessage {
  id: number;
  text: string;
  sender: 'client' | 'tia';
  timestamp: number;
}

// ── In-memory fallback (mirror dell'originale chatStore) ──
const memoryStore = new Map<string, ChatMessage[]>();
let memoryNextId = 1;
let dbAvailable: boolean | null = null; // null = non testato, true/false = dopo primo tentativo
let dbRetryAt = 0; // timestamp Unix ms per riprovare il DB

// ── Telegram admin alert for prolonged DB outages ──────────────
let dbDownSince = 0;   // timestamp Unix ms of first failure (0 = healthy)
let alertSent = false;  // prevent duplicate alerts

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

async function sendTelegramAlert(text: string): Promise<void> {
  if (!TELEGRAM_TOKEN || !TELEGRAM_CHAT_ID) return;
  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text,
        parse_mode: 'HTML',
      }),
      signal: AbortSignal.timeout(5_000),
    });
  } catch {
    // Telegram unreachable — nothing we can do
  }
}

function markDbDown(): void {
  dbAvailable = false;
  const now = Date.now();
  if (!dbDownSince) dbDownSince = now;
  dbRetryAt = now + 30_000;
  if (!alertSent && now - dbDownSince > 60_000) {
    alertSent = true;
    const downSec = Math.round((now - dbDownSince) / 1000);
    void sendTelegramAlert(
      `🔴 <b>Turso DB offline</b> da ${downSec}s\n` +
      `Il portfolio sta operando in modalità degradata (chat in-memory, disponibilità da cache).`
    );
  }
}

function markDbUp(): void {
  const wasDown = dbDownSince > 0;
  dbAvailable = true;
  dbDownSince = 0;
  alertSent = false;
  if (wasDown) {
    void sendTelegramAlert('🟢 <b>Turso DB di nuovo online</b>\nTutti i servizi del portfolio sono tornati operativi.');
  }
}

/** Se il DB è marcato come non disponibile da più di 30s, lo riprova. */
function shouldRetryDb(): boolean {
  return dbAvailable === false && Date.now() > dbRetryAt;
}

export async function addMessage(sessionId: string, msg: Omit<ChatMessage, 'id'>) {
  // Tentativo DB (se disponibile o se è ora di riprovare)
  if (dbAvailable !== false || shouldRetryDb()) {
    try {
      await prisma.chatMessage.create({
        data: {
          sessionId,
          text: msg.text,
          sender: msg.sender,
          timestamp: BigInt(msg.timestamp),
        },
      });
      markDbUp();
      return; // ✅ Salvato su DB
    } catch (err) {
      markDbDown();
      console.warn('[chatStore] DB non raggiungibile, passo a fallback in-memory:',
        err instanceof Error ? err.message : err);
    }
  }

  // Fallback in-memory
  const entry: ChatMessage = {
    id: memoryNextId++,
    text: msg.text,
    sender: msg.sender,
    timestamp: msg.timestamp,
  };
  if (!memoryStore.has(sessionId)) {
    memoryStore.set(sessionId, []);
  }
  memoryStore.get(sessionId)!.push(entry);
}

/** Returns Tia's messages for this session posted after `since` (Unix ms). */
export async function getTiaMessagesSince(sessionId: string, since: number): Promise<ChatMessage[]> {
  // Tentativo DB (se disponibile o se è ora di riprovare)
  if (dbAvailable !== false || shouldRetryDb()) {
    try {
      const rows = await prisma.chatMessage.findMany({
        where: {
          sessionId,
          sender: 'tia',
          timestamp: { gt: BigInt(since) },
        },
        orderBy: { timestamp: 'asc' },
      });
      markDbUp();
      return rows.map((r) => ({
        id: r.id,
        text: r.text,
        sender: 'tia' as const,
        timestamp: Number(r.timestamp),
      }));
    } catch (err) {
      markDbDown();
      console.warn('[chatStore] DB non raggiungibile in getTiaMessagesSince, uso fallback in-memory:',
        err instanceof Error ? err.message : err);
    }
  }

  // Fallback in-memory
  const msgs = memoryStore.get(sessionId) || [];
  return msgs.filter((m) => m.sender === 'tia' && m.timestamp > since);
}

/**
 * Close a conversation — adds a system-level message that Tia has closed
 * the chat. The frontend detects this message and shows a "conversazione
 * chiusa" state to the user.
 */
export async function closeSession(sessionId: string): Promise<boolean> {
  const closedText = '🔒 Conversazione chiusa da Tia. Grazie per averci contattato! Se hai bisogno di altro, apri una nuova chat.';

  if (dbAvailable !== false || shouldRetryDb()) {
    try {
      await prisma.chatMessage.create({
        data: {
          sessionId,
          text: closedText,
          sender: 'tia',
          timestamp: BigInt(Date.now()),
        },
      });
      markDbUp();
      return true;
    } catch (err) {
      markDbDown();
      console.warn('[chatStore] DB non raggiungibile in closeSession, uso fallback in-memory:',
        err instanceof Error ? err.message : err);
    }
  }

  // Fallback in-memory
  const entry: ChatMessage = {
    id: memoryNextId++,
    text: closedText,
    sender: 'tia',
    timestamp: Date.now(),
  };
  if (!memoryStore.has(sessionId)) {
    memoryStore.set(sessionId, []);
  }
  memoryStore.get(sessionId)!.push(entry);
  return true;
}

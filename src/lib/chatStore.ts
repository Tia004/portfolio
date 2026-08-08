/**
 * Hybrid chat message store.
 *
 * Primary backend:   Prisma / Turso (cloud-persistent).
 * Secondary backend: Upstash Redis (shared across Vercel serverless instances).
 * Fallback:          In-memory Map (last resort, per-instance, lost on restart).
 *
 * When Turso is unreachable, messages are stored in Redis so the webhook
 * (Telegram → save msg) and SSE stream (poll for new msgs) — which may run
 * on different Vercel serverless instances — can share the same data.
 */

import { prisma } from '@/lib/prisma';

export interface ChatMessage {
  id: number;
  text: string;
  sender: 'client' | 'tia';
  timestamp: number;
}

// ── Redis/Upstash (shared across serverless instances) ──────────
const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL?.replace(/\/$/, '');
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const REDIS_MSG_TTL = 1800; // 30 min — same as session cookie default

// ── In-memory fallback (per-instance, last resort) ──────────────
const memoryStore = new Map<string, ChatMessage[]>();
let memoryNextId = 1;
let dbAvailable: boolean | null = null;
let dbRetryAt = 0;
let dbDownSince = 0;
let alertSent = false;

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

// ── Redis helpers ───────────────────────────────────────────────

async function redisFetch(path: string, init?: RequestInit): Promise<Response | null> {
  if (!REDIS_URL || !REDIS_TOKEN) return null;
  try {
    const res = await fetch(`${REDIS_URL}${path}`, {
      ...init,
      headers: {
        ...init?.headers,
        Authorization: `Bearer ${REDIS_TOKEN}`,
      },
      signal: AbortSignal.timeout(2000),
    });
    return res;
  } catch {
    return null;
  }
}

/**
 * Load the full message array for a session from Redis.
 * Returns null when Redis is unreachable (so callers fall through to memory),
 * or [] when Redis is working but the session has no messages yet.
 */
async function redisLoadMsgs(sessionId: string): Promise<ChatMessage[] | null> {
  const res = await redisFetch(`/get/chat:msgs:${encodeURIComponent(sessionId)}`);
  if (!res?.ok) return null; // Redis not available
  const data = await res.json() as { result?: string };
  if (!data.result) return []; // Redis working, session empty
  try {
    const parsed = JSON.parse(data.result);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/** Save the full message array for a session to Redis. */
async function redisSaveMsgs(sessionId: string, msgs: ChatMessage[]): Promise<void> {
  const json = JSON.stringify(msgs);
  await redisFetch(
    `/set/chat:msgs:${encodeURIComponent(sessionId)}/${encodeURIComponent(json)}?EX=${REDIS_MSG_TTL}`,
  );
}

// ── Telegram alerts ─────────────────────────────────────────────

async function sendTelegramAlert(text: string): Promise<void> {
  if (!TELEGRAM_TOKEN || !TELEGRAM_CHAT_ID) return;
  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text, parse_mode: 'HTML' }),
      signal: AbortSignal.timeout(5000),
    });
  } catch { /* unreachable */ }
}

function markDbDown(): void {
  dbAvailable = false;
  const now = Date.now();
  if (!dbDownSince) dbDownSince = now;
  dbRetryAt = now + 5_000; // quick retry — 5s instead of 30s minimizes message loss window
  if (!alertSent && now - dbDownSince > 60_000) {
    alertSent = true;
    const downSec = Math.round((now - dbDownSince) / 1000);
    void sendTelegramAlert(
      `🔴 <b>Turso DB offline</b> da ${downSec}s\nIl portfolio sta operando in modalità degradata (chat via Redis, disponibilità da cache).`,
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

function shouldRetryDb(): boolean {
  return dbAvailable === false && Date.now() > dbRetryAt;
}

// ── Public API ──────────────────────────────────────────────────

// ── Public API ──────────────────────────────────────────────────

/** Retry wrapper: attempts an async operation up to `maxRetries` times
 *  with exponential backoff (500ms → 1s → 2s).  Used so a single
 *  transient Turso hiccup does not lose a message. */
async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < maxRetries) {
        await new Promise(r => setTimeout(r, 500 * Math.pow(2, attempt)));
      }
    }
  }
  throw lastError;
}

export async function addMessage(sessionId: string, msg: Omit<ChatMessage, 'id'>) {
  // 1. Try Turso DB (with retries for transient hiccups)
  if (dbAvailable !== false || shouldRetryDb()) {
    try {
      await withRetry(() => prisma.chatMessage.create({
        data: {
          sessionId,
          text: msg.text,
          sender: msg.sender,
          timestamp: BigInt(msg.timestamp),
        },
      }));
      markDbUp();
      return;
    } catch (err) {
      markDbDown();
      console.warn('[chatStore] DB unreachable after retries, trying Redis:', (err as Error).message);
    }
  }

  // 2. Try Redis (shared across Vercel serverless instances)
  // NOTE: read-modify-write has a theoretical race if two instances write
  // concurrently to the same session. In practice, messages within a single
  // chat session are sequential — the client waits for the AI response before
  // sending another message, and Telegram webhooks are serial per-chat.
  const redisMsgs = await redisLoadMsgs(sessionId);
  if (redisMsgs !== null) {
    // Redis is reachable — null would mean it's down
    const newMsg: ChatMessage = {
      id: redisMsgs.length > 0 ? Math.max(...redisMsgs.map(m => m.id)) + 1 : 1,
      text: msg.text,
      sender: msg.sender,
      timestamp: msg.timestamp,
    };
    redisMsgs.push(newMsg);
    // Save to Redis and mirror in local memory (best-effort on save failure)
    await redisSaveMsgs(sessionId, redisMsgs);
    memoryStore.set(sessionId, [...redisMsgs]);
    return;
  }

  // 3. Last resort: in-memory (per-instance, not shared)
  const entry: ChatMessage = {
    id: memoryNextId++,
    text: msg.text,
    sender: msg.sender,
    timestamp: msg.timestamp,
  };
  if (!memoryStore.has(sessionId)) memoryStore.set(sessionId, []);
  memoryStore.get(sessionId)!.push(entry);
}

export async function getTiaMessagesSince(sessionId: string, since: number): Promise<ChatMessage[]> {
  // 1. Try Turso DB (with retries for transient hiccups)
  if (dbAvailable !== false || shouldRetryDb()) {
    try {
      const rows = await withRetry(() => prisma.chatMessage.findMany({
        where: { sessionId, sender: 'tia', timestamp: { gt: BigInt(since) } },
        orderBy: { timestamp: 'asc' },
      }));
      markDbUp();
      return rows.map(r => ({ id: r.id, text: r.text, sender: 'tia' as const, timestamp: Number(r.timestamp) }));
    } catch (err) {
      markDbDown();
      console.warn('[chatStore] DB unreachable in getTiaMessagesSince, trying Redis:', (err as Error).message);
    }
  }

  // 2. Try Redis (null = unreachable, fall through to memory)
  const redisMsgs = await redisLoadMsgs(sessionId);
  if (redisMsgs !== null) {
    return redisMsgs.filter(m => m.sender === 'tia' && m.timestamp > since);
  }

  // 3. Fallback to local memory
  const msgs = memoryStore.get(sessionId) || [];
  return msgs.filter(m => m.sender === 'tia' && m.timestamp > since);
}

export async function closeSession(sessionId: string): Promise<boolean> {
  const closedText = '🔒 Conversazione chiusa da Tia. Grazie per averci contattato! Se hai bisogno di altro, apri una nuova chat.';

  if (dbAvailable !== false || shouldRetryDb()) {
    try {
      await prisma.chatMessage.create({
        data: { sessionId, text: closedText, sender: 'tia', timestamp: BigInt(Date.now()) },
      });
      markDbUp();
      return true;
    } catch (err) {
      markDbDown();
      console.warn('[chatStore] DB unreachable in closeSession:', (err as Error).message);
    }
  }

  // Redis + memory fallback
  const newMsg: ChatMessage = { id: memoryNextId++, text: closedText, sender: 'tia', timestamp: Date.now() };

  const redisMsgs = await redisLoadMsgs(sessionId);
  if (redisMsgs !== null) {
    redisMsgs.push(newMsg);
    await redisSaveMsgs(sessionId, redisMsgs);
    memoryStore.set(sessionId, [...redisMsgs]);
    return true;
  }

  if (!memoryStore.has(sessionId)) memoryStore.set(sessionId, []);
  memoryStore.get(sessionId)!.push(newMsg);
  return true;
}

export async function getRecentMessages(sessionId: string, limit = 3): Promise<ChatMessage[]> {
  if (dbAvailable !== false || shouldRetryDb()) {
    try {
      const rows = await prisma.chatMessage.findMany({
        where: { sessionId },
        orderBy: { timestamp: 'desc' },
        take: limit,
      });
      markDbUp();
      return rows.reverse().map(r => ({ id: r.id, text: r.text, sender: r.sender as 'client' | 'tia', timestamp: Number(r.timestamp) }));
    } catch (err) {
      markDbDown();
      console.warn('[chatStore] DB unreachable in getRecentMessages:', (err as Error).message);
    }
  }

  // Redis fallback (null = unreachable, fall through to memory)
  const redisMsgs = await redisLoadMsgs(sessionId);
  if (redisMsgs !== null) {
    return redisMsgs.slice(-limit);
  }

  // Memory fallback
  const msgs = memoryStore.get(sessionId) || [];
  return msgs.slice(-limit);
}

// ── Diagnostics (Telegram /status) ─────────────────────────────

export type SystemDiagnostics = {
  tursoOk: boolean;
  tables: string[];
  lastTursoMessage: ChatMessage | null;
  redisOk: boolean;
  latestSessionId: string | null;
  redisCountLatestSession: number | null;
  lastRedisMessage: ChatMessage | null;
};

/**
 * Snapshot of the chat storage health for the Telegram /status report:
 * - Turso tables present + last persisted message
 * - Redis reachability + message count for the most recent session
 * Together these reveal double-write alignment (no more blind diagnostics).
 */
export async function getSystemDiagnostics(): Promise<SystemDiagnostics> {
  let tursoOk = false;
  let tables: string[] = [];
  let lastTursoMessage: ChatMessage | null = null;

  try {
    const tableRows = await prisma.$queryRaw<{ name: string }[]>`SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name`;
    // sqlite_sequence is an internal table — keep only app tables.
    tables = tableRows.map(r => r.name).filter(n => !n.startsWith('sqlite_'));
    const last = await prisma.chatMessage.findFirst({ orderBy: { timestamp: 'desc' } });
    if (last) {
      lastTursoMessage = { id: last.id, text: last.text, sender: last.sender as 'client' | 'tia', timestamp: Number(last.timestamp) };
    }
    tursoOk = true;
    // Deliberately NOT calling markDbUp()/markDbDown(): a diagnostic must be
    // read-only. markDbUp() could suppress a real "DB offline" alert and
    // markDbDown() would degrade the write path for a benign read hiccup.
  } catch (err) {
    console.warn('[chatStore] Diagnostics: Turso read failed:', (err as Error).message);
  }

  // Most recent session (Turso is authoritative; memory store as fallback)
  let latestSessionId: string | null = null;
  try {
    const sessRes = await prisma.$queryRaw<{ sessionId: string }[]>`SELECT sessionId FROM ChatMessage ORDER BY timestamp DESC LIMIT 1`;
    latestSessionId = sessRes[0]?.sessionId ?? null;
  } catch { /* non-critical — will fall back below */ }
  if (!latestSessionId) {
    let bestTs = -1;
    for (const [sid, msgs] of memoryStore.entries()) {
      const lastTs = msgs.length ? msgs[msgs.length - 1].timestamp : -1;
      if (lastTs > bestTs) {
        bestTs = lastTs;
        latestSessionId = sid;
      }
    }
  }

  // Redis reachability + alignment for the most recent session
  let redisOk = false;
  let redisCountLatestSession: number | null = null;
  let lastRedisMessage: ChatMessage | null = null;

  if (latestSessionId) {
    try {
      const redisMsgs = await redisLoadMsgs(latestSessionId);
      if (redisMsgs !== null) {
        redisOk = true;
        redisCountLatestSession = redisMsgs.length;
        lastRedisMessage = redisMsgs.length ? redisMsgs[redisMsgs.length - 1] : null;
      } else {
        const ping = await redisFetch('/ping');
        redisOk = ping?.ok === true;
        if (redisOk) redisCountLatestSession = 0;
      }
    } catch {
      const ping = await redisFetch('/ping');
      redisOk = ping?.ok === true;
    }
  } else {
    const ping = await redisFetch('/ping');
    redisOk = ping?.ok === true;
  }

  return { tursoOk, tables, lastTursoMessage, redisOk, latestSessionId, redisCountLatestSession, lastRedisMessage };
}

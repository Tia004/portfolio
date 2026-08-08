// ═══════════════════════════════════════════════════════════════════════════
//  npm run test:chat — full chat pipeline verification
//
//  Verifies, in one shot, the complete chat path with the REAL source modules
//  (not re-implementations):
//
//    1. Session   → createChatSessionToken / readChatSessionToken round-trip
//    2. Chat      → addMessage(client) — the exact store call /api/chat makes
//    3. Turso     → prisma.chatMessage holds the message with the shared id
//    4. Redis     → Upstash mirror holds the SAME id (mirror double-write)
//    5. Webhook   → Tia-reply path (what the webhook does when Tia answers):
//                   addMessage(sender:'tia') lands in BOTH stores + the SSE
//                   read path (getTiaMessagesSince) sees it
//    6. Webhook   → OPTIONAL real HTTP e2e against a deployed webhook URL
//                   (CHAT_WEBHOOK_URL + TELEGRAM_WEBHOOK_SECRET required)
//
//  Note: the session stage exercises the token layer (create/read round-trip),
//  not the /api/chat/session route handler itself — next/server can't be
//  imported in plain Node. The route handler is thin over these functions.
//
//  Required env: TURSO_DATABASE_URL, TURSO_AUTH_TOKEN,
//                UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN
//  Optional env: CHAT_WEBHOOK_URL (e.g. https://tiadesigns.it/api/chat/webhook),
//                TELEGRAM_WEBHOOK_SECRET
//
//  Usage: node --import ./scripts/alias-hooks.mjs scripts/test-chat.mjs
//  ═══════════════════════════════════════════════════════════════════════════
// Load the PROJECT's .env explicitly (not the cwd's) BEFORE importing the
// store modules. ESM static imports are hoisted above the module body, and
// src/lib/env.ts resolves .env via process.cwd(), so we must use DYNAMIC
// imports below — otherwise the store modules would capture empty env vars
// when node is invoked from a directory other than the project root.
import { config as loadEnv } from 'dotenv';
loadEnv({ path: new URL('../.env', import.meta.url).pathname });

import { randomUUID } from 'crypto';

const { prisma } = await import('../src/lib/prisma.ts');
const { createChatSessionToken, readChatSessionToken } = await import('../src/lib/chat-security.ts');
const { addMessage, getTiaMessagesSince } = await import('../src/lib/chatStore.ts');

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL?.replace(/\/$/, '');
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const WEBHOOK_URL = process.env.CHAT_WEBHOOK_URL;
const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET;

// ── Small assertion/result helpers ───────────────────────────────────────
const results = [];
function ok(name, detail = '') {
  results.push({ name, pass: true, detail });
  console.log(`  ✅ ${name}${detail ? ` — ${detail}` : ''}`);
}
function fail(name, detail = '') {
  results.push({ name, pass: false, detail });
  console.log(`  ❌ ${name}${detail ? ` — ${detail}` : ''}`);
}
function skip(name, detail = '') {
  results.push({ name, pass: 'skipped', detail });
  console.log(`  ⏭️  ${name}${detail ? ` — ${detail}` : ''}`);
}

// ── Redis helpers (mirror store access) ──────────────────────────────────
async function redisFetch(path) {
  const res = await fetch(`${REDIS_URL}${path}`, {
    headers: { Authorization: `Bearer ${REDIS_TOKEN}` },
    signal: AbortSignal.timeout(5000),
  });
  return res.json();
}
async function redisGetMsgs(sessionId) {
  const data = await redisFetch(`/get/chat:msgs:${encodeURIComponent(sessionId)}`);
  return data.result ? JSON.parse(data.result) : [];
}
async function redisDelKey(sessionId) {
  await redisFetch(`/del/chat:msgs:${encodeURIComponent(sessionId)}`);
}

// ── Prerequisite check ───────────────────────────────────────────────────
const missing = [];
if (!process.env.TURSO_DATABASE_URL || !process.env.TURSO_AUTH_TOKEN) missing.push('TURSO_DATABASE_URL/TURSO_AUTH_TOKEN');
if (!REDIS_URL || !REDIS_TOKEN) missing.push('UPSTASH_REDIS_REST_URL/UPSTASH_REDIS_REST_TOKEN');
if (missing.length > 0) {
  console.error(`\n❌ Missing required env vars: ${missing.join(', ')}\n`);
  process.exit(1);
}

const SESSION_ID = randomUUID();
const CLIENT_TEXT = `🧪 test:chat client message ${Date.now()}`;
const TIA_REPLY = `🧪 test:chat Tia reply ${Date.now()}`;
console.log(`🔎 Full chat pipeline test\n   Session: ${SESSION_ID}\n`);

try {
  // ── 1. Session ─────────────────────────────────────────────────────────
  console.log('▶ Stage 1/6 — Session token round-trip');
  const token = createChatSessionToken(SESSION_ID);
  const payload = readChatSessionToken(token);
  if (payload?.sid === SESSION_ID) ok('Session token create/read round-trip', `sid matches, exp ${payload.exp}`);
  else fail('Session token round-trip', 'sid mismatch or invalid token');

  // ── 2. Chat (client message via the real store) ───────────────────────
  console.log('\n▶ Stage 2/6 — Chat write (client) via addMessage');
  await addMessage(SESSION_ID, { text: CLIENT_TEXT, sender: 'client', timestamp: Date.now() });
  ok('addMessage(client) executed', 'written to Turso + Redis mirror');

  // ── 3. Turso persistence ──────────────────────────────────────────────
  console.log('\n▶ Stage 3/6 — Turso persistence');
  const tursoRows = await prisma.chatMessage.findMany({
    where: { sessionId: SESSION_ID },
    orderBy: { id: 'asc' },
  });
  const clientInTurso = tursoRows.find((r) => r.sender === 'client' && r.text === CLIENT_TEXT);
  if (clientInTurso) ok('Client message persisted in Turso', `id=${clientInTurso.id}`);
  else fail('Client message persisted in Turso', 'row not found');

  // ── 4. Redis mirror alignment ─────────────────────────────────────────
  console.log('\n▶ Stage 4/6 — Redis mirror alignment');
  const redisMsgs = await redisGetMsgs(SESSION_ID);
  const redisClient = redisMsgs.find((m) => m.sender === 'client' && m.text === CLIENT_TEXT);
  if (redisClient) {
    const aligned = clientInTurso ? redisClient.id === clientInTurso.id : true;
    if (aligned) ok('Redis mirror holds client message with SAME id', `id=${redisClient.id}`);
    else fail('Redis mirror id alignment', `Redis id ${redisClient.id} ≠ Turso id ${clientInTurso.id}`);
  } else {
    fail('Redis mirror holds client message', 'not found in Redis');
  }

  // ── 5. Webhook storage path (Tia reply) ──────────────────────────────
  console.log('\n▶ Stage 5/6 — Webhook storage path (Tia reply)');
  await addMessage(SESSION_ID, { text: TIA_REPLY, sender: 'tia', timestamp: Date.now() });
  const tursoAfter = await prisma.chatMessage.findMany({
    where: { sessionId: SESSION_ID, sender: 'tia' },
    orderBy: { id: 'asc' },
  });
  const tiaInTurso = tursoAfter.find((r) => r.text === TIA_REPLY);
  const redisAfter = await redisGetMsgs(SESSION_ID);
  const tiaInRedis = redisAfter.find((m) => m.sender === 'tia' && m.text === TIA_REPLY);
  const tiaAligned = tiaInTurso && tiaInRedis ? tiaInTurso.id === tiaInRedis.id : false;
  if (tiaInTurso && tiaInRedis && tiaAligned) {
    ok('Tia reply in Turso + Redis with same id', `id=${tiaInTurso.id}`);
  } else {
    fail('Tia reply in Turso + Redis', `turso=${!!tiaInTurso} redis=${!!tiaInRedis} aligned=${tiaAligned}`);
  }

  // SSE read path: the site polls getTiaMessagesSince
  const sinceMsgs = await getTiaMessagesSince(SESSION_ID, Date.now() - 60_000);
  if (sinceMsgs.some((m) => m.text === TIA_REPLY)) {
    ok('SSE read path (getTiaMessagesSince) sees the Tia reply');
  } else {
    fail('SSE read path (getTiaMessagesSince) sees the Tia reply');
  }

  // ── 6. Webhook real HTTP e2e (optional) ───────────────────────────────
  console.log('\n▶ Stage 6/6 — Webhook HTTP e2e (optional)');
  if (WEBHOOK_URL && WEBHOOK_SECRET) {
    try {
      const update = {
        update_id: Math.floor(Math.random() * 1_000_000),
        message: {
          message_id: 42,
          from: { id: 999, is_bot: false, first_name: 'test:chat' },
          chat: { id: 888, type: 'private' },
          date: Math.floor(Date.now() / 1000),
          reply_to_message: {
            message_id: 41,
            text: `💬 Nuovo messaggio dalla chat\n📍 localhost\n🆔 ${SESSION_ID}\n📝 test e2e`,
          },
          text: '🧪 Risposta e2e dal webhook',
        },
      };
      const res = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-telegram-bot-api-secret-token': WEBHOOK_SECRET,
        },
        body: JSON.stringify(update),
        signal: AbortSignal.timeout(10_000),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.ok === true) {
        // The webhook route awaits addMessage() before responding, so the e2e
        // reply is guaranteed persisted by the time the HTTP response returns.
        ok('Webhook HTTP accepted the update', `${WEBHOOK_URL}`);
        const redisE2e = await redisGetMsgs(SESSION_ID);
        const e2eRedis = redisE2e.find((m) => m.text.includes('Risposta e2e'));
        const e2eTurso = await prisma.chatMessage.findFirst({
          where: { sessionId: SESSION_ID, text: { contains: 'Risposta e2e' } },
        });
        if (e2eRedis && e2eTurso && e2eRedis.id === e2eTurso.id) {
          ok('E2e reply persisted in BOTH stores with same id', `id=${e2eRedis.id}`);
        } else {
          fail('E2e reply persisted in both stores', `redis=${!!e2eRedis} turso=${!!e2eTurso} aligned=${e2eRedis && e2eTurso ? e2eRedis.id === e2eTurso.id : false}`);
        }
      } else {
        fail('Webhook HTTP accepted the update', `HTTP ${res.status}: ${JSON.stringify(body).slice(0, 120)}`);
      }
    } catch (err) {
      fail('Webhook HTTP e2e', err.message);
    }
  } else {
    skip('Webhook HTTP e2e', 'set CHAT_WEBHOOK_URL + TELEGRAM_WEBHOOK_SECRET to enable');
  }
} catch (err) {
  console.error('\n💥 Unexpected failure:', err);
  results.push({ name: 'unexpected error', pass: false, detail: err.message });
} finally {
  // ── Cleanup: remove the test session from Turso + Redis ──────────────
  try {
    await prisma.chatMessage.deleteMany({ where: { sessionId: SESSION_ID } });
  } catch { /* best-effort */ }
  try {
    await redisDelKey(SESSION_ID);
  } catch { /* best-effort */ }
  await prisma.$disconnect().catch(() => {});
  console.log('\n🧹 Test session cleaned up (Turso + Redis)');
}

// ── Summary ──────────────────────────────────────────────────────────────
const failed = results.filter((r) => r.pass === false);
const skipped = results.filter((r) => r.pass === 'skipped');
console.log(`\n${'═'.repeat(52)}`);
console.log(`  RESULT: ${failed.length === 0 ? '✅ ALL STAGES PASSED' : `❌ ${failed.length} STAGE(S) FAILED`}`);
if (skipped.length) console.log(`  ⏭️  Skipped: ${skipped.map((s) => s.name).join(', ')}`);
console.log(`${'═'.repeat(52)}\n`);
process.exit(failed.length === 0 ? 0 : 1);

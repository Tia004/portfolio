// Validates the mirror double-write behavior against production Turso + Redis.
// Replicates the exact logic of the NEW addMessage(): a shared id comes from
// Redis INCR (chat:id:global, seeded above Turso's max on first use), and BOTH
// stores write the same message with the SAME id. Also simulates a Turso outage
// to prove the id counter keeps advancing without collision.
// Usage: node scripts/verify-mirror.mjs
import 'dotenv/config';
import { prisma } from '../src/lib/prisma.ts';

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL?.replace(/\/$/, '');
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

const SESSION = '00000000-0000-4000-8000-00000000m1rr0r'; // clearly a test session

async function redisFetch(path, init) {
  const res = await fetch(`${REDIS_URL}${path}`, {
    ...init,
    headers: { ...(init?.headers || {}), Authorization: `Bearer ${REDIS_TOKEN}` },
    signal: AbortSignal.timeout(5000),
  });
  const data = await res.json();
  return data;
}

async function redisGet(sessionId) {
  const data = await redisFetch(`/get/chat:msgs:${encodeURIComponent(sessionId)}`);
  return data.result ? JSON.parse(data.result) : [];
}

async function redisSet(sessionId, msgs) {
  const json = JSON.stringify(msgs);
  await redisFetch(`/set/chat:msgs:${encodeURIComponent(sessionId)}/${encodeURIComponent(json)}?EX=86400`);
}

/** Same as nextSharedId() in chatStore: seed above Turso max, then INCR. */
async function nextSharedId() {
  const existing = await redisFetch('/get/chat:id:global');
  if (!existing.result) {
    let tursoMax = 0;
    try {
      const agg = await prisma.chatMessage.aggregate({ _max: { id: true } });
      tursoMax = Number(agg._max.id ?? 0);
    } catch { /* keep 0 */ }
    await redisFetch(`/setnx/chat:id:global/${tursoMax}`);
  }
  const incr = await redisFetch('/incr/chat:id:global');
  return typeof incr.result === 'number' ? incr.result : null;
}

async function main() {
  console.log('🔎 Validating mirror double-write (shared INCR id) against production…\n');

  // Cleanup any leftover test data first
  try {
    await prisma.chatMessage.deleteMany({ where: { sessionId: SESSION } });
  } catch { /* table exists after migration */ }
  await redisSet(SESSION, []);
  console.log('🧹 Cleaned any previous test data\n');

  // 1. Write message #1 — shared id from Redis INCR, written to BOTH stores
  const sharedId1 = await nextSharedId();
  const t1 = Date.now();
  const created1 = await prisma.chatMessage.create({
    data: { id: sharedId1, sessionId: SESSION, text: '🧪 mirror test #1', sender: 'client', timestamp: BigInt(t1) },
  });
  console.log(`✅ Turso wrote #1 with id=${created1.id} (shared=${sharedId1})`);
  if (created1.id !== sharedId1) throw new Error(`Id mismatch: Turso gave ${created1.id}, shared was ${sharedId1}`);

  let redisMsgs = await redisGet(SESSION);
  redisMsgs.push({ id: sharedId1, text: '🧪 mirror test #1', sender: 'client', timestamp: t1 });
  await redisSet(SESSION, redisMsgs);
  console.log(`✅ Redis mirrored #1 with id=${sharedId1}`);

  // 2. Write message #2 — same flow, id must keep advancing
  const sharedId2 = await nextSharedId();
  const t2 = Date.now();
  const created2 = await prisma.chatMessage.create({
    data: { id: sharedId2, sessionId: SESSION, text: '🧪 mirror test #2', sender: 'tia', timestamp: BigInt(t2) },
  });
  console.log(`✅ Turso wrote #2 with id=${created2.id} (shared=${sharedId2})`);
  if (created2.id !== sharedId2) throw new Error(`Id mismatch: Turso gave ${created2.id}, shared was ${sharedId2}`);
  if (sharedId2 <= sharedId1) throw new Error(`Shared id did not advance: ${sharedId1} → ${sharedId2}`);

  redisMsgs = await redisGet(SESSION);
  redisMsgs.push({ id: sharedId2, text: '🧪 mirror test #2', sender: 'tia', timestamp: t2 });
  await redisSet(SESSION, redisMsgs);
  console.log(`✅ Redis mirrored #2 with id=${sharedId2}`);

  // 3. Verify alignment — same ids, same texts, same senders on both stores
  const tursoRows = await prisma.chatMessage.findMany({ where: { sessionId: SESSION }, orderBy: { id: 'asc' } });
  const redisRows = await redisGet(SESSION);

  console.log('\n📊 Alignment check:');
  console.log(`   Turso: ${tursoRows.map(r => `${r.id}:${r.sender}:${r.text}`).join(' | ')}`);
  console.log(`   Redis: ${redisRows.map(r => `${r.id}:${r.sender}:${r.text}`).join(' | ')}`);

  const aligned = tursoRows.length === redisRows.length &&
    tursoRows.every((r, i) => r.id === redisRows[i].id && r.sender === redisRows[i].sender && r.text === redisRows[i].text);
  console.log(`\n${aligned ? '✅ MIRROR ALIGNED — same ids, same texts, same senders on both stores' : '❌ MIRROR MISALIGNED'}`);

  // 4. Simulate a Turso outage: only Redis path (id must still be unique)
  const sharedId3 = await nextSharedId();
  const t3 = Date.now();
  redisMsgs = await redisGet(SESSION);
  redisMsgs.push({ id: sharedId3, text: '🧪 mirror test #3 (Turso down)', sender: 'client', timestamp: t3 });
  await redisSet(SESSION, redisMsgs);
  const existingIds = new Set(tursoRows.map(r => r.id).concat([sharedId1, sharedId2]));
  console.log(`\n🟠 Simulated Turso-down write → Redis id=${sharedId3} (no collision: ${!existingIds.has(sharedId3) ? 'unique ✅' : 'COLLISION ❌'})`);

  // Cleanup
  await prisma.chatMessage.deleteMany({ where: { sessionId: SESSION } });
  await redisSet(SESSION, []);
  console.log('\n🧹 Cleaned up test data');

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('❌ FAILED:', err.message);
  process.exit(1);
});

// Validates the exact queries used by the Telegram /status diagnostic.
// Mirrors getSystemDiagnostics() from src/lib/chatStore.ts.
// Usage: node scripts/test-diagnostics.mjs
import 'dotenv/config';
import { prisma } from '../src/lib/prisma.ts';

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL?.replace(/\/$/, '');
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

// 1. Turso tables
try {
  const tableRows = await prisma.$queryRaw`SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name`;
  const tables = tableRows.map(r => r.name);
  console.log('✅ Turso tables (' + tables.length + '):', tables.join(', '));
} catch (err) {
  console.log('❌ Turso tables FAILED:', err.message);
}

// 2. Last persisted chat message
try {
  const last = await prisma.chatMessage.findFirst({ orderBy: { timestamp: 'desc' } });
  console.log('✅ Last Turso message:', last ? '[' + last.sender + '] ' + String(last.text).slice(0, 80) : '(none)');
} catch (err) {
  console.log('❌ Last message FAILED:', err.message);
}

// 3. Latest session
let latestSessionId = null;
try {
  const sessRes = await prisma.$queryRaw`SELECT sessionId FROM ChatMessage ORDER BY timestamp DESC LIMIT 1`;
  latestSessionId = sessRes[0]?.sessionId ?? null;
  console.log('✅ Latest session:', latestSessionId ? `${latestSessionId.slice(0, 8)}…` : '(none)');
} catch (err) {
  console.log('❌ Latest session FAILED:', err.message);
}

// 4. Redis ping + messages for latest session
if (REDIS_URL && REDIS_TOKEN) {
  try {
    const ping = await fetch(`${REDIS_URL}/ping`, {
      headers: { Authorization: `Bearer ${REDIS_TOKEN}` },
      signal: AbortSignal.timeout(5000),
    });
    const pingBody = await ping.text();
    console.log('✅ Redis ping:', pingBody.slice(0, 60));
    if (latestSessionId) {
      const res = await fetch(`${REDIS_URL}/get/chat:msgs:${encodeURIComponent(latestSessionId)}`, {
        headers: { Authorization: `Bearer ${REDIS_TOKEN}` },
        signal: AbortSignal.timeout(5000),
      });
      const data = await res.json();
      if (data.result) {
        const msgs = JSON.parse(data.result);
        const lastMsg = msgs[msgs.length - 1];
        console.log('✅ Redis msgs for latest session: ' + msgs.length);
        console.log('   Last Redis:', lastMsg ? '[' + lastMsg.sender + '] ' + String(lastMsg.text).slice(0, 80) : '(none)');
      } else {
        console.log('ℹ️ Redis: no key for latest session (0 msgs in Redis)');
      }
    }
  } catch (err) {
    console.log('❌ Redis check FAILED:', err.message);
  }
} else {
  console.log('ℹ️ UPSTASH_REDIS_REST_URL/TOKEN not in local env — Redis check skipped (Vercel only)');
}

await prisma.$disconnect();

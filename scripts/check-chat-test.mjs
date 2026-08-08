// Diagnostic: check if a Telegram reply arrived for a test session.
// Usage: SESSION=<id> node scripts/check-chat-test.mjs
import 'dotenv/config';
import { createClient } from '@libsql/client';

const sessionId = process.env.SESSION || process.argv[2] || 'dee5707e-2925-4f85-b2d3-01db5990653f';
console.log(`🔎 Checking session: ${sessionId}\n`);

// ── 1. Turso DB ──
console.log('── Turso DB ──');
try {
  const db = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });
  const res = await db.execute({
    sql: 'SELECT id, sender, text, timestamp FROM ChatMessage WHERE sessionId = ? ORDER BY timestamp ASC',
    args: [sessionId],
  });
  const rows = res.rows;
  console.log(`Rows found: ${rows.length}`);
  for (const r of rows) {
    const time = new Date(Number(r.timestamp)).toLocaleString('it-IT');
    console.log(`  [${time}] ${r.sender === 'tia' ? '💬 TIA' : '👤 CLIENT'}: ${String(r.text).slice(0, 120)}`);
  }
} catch (err) {
  console.log('DB ERROR:', err.message);
}

// ── 2. Redis ──
console.log('\n── Redis (Upstash) ──');
try {
  const url = process.env.UPSTASH_REDIS_REST_URL?.replace(/\/$/, '');
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    console.log('UPSTASH_REDIS_REST_URL/TOKEN not in local env — checking provided fallback…');
  } else {
    const res = await fetch(`${url}/get/chat:msgs:${encodeURIComponent(sessionId)}`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(5000),
    });
    const data = await res.json();
    if (data.result) {
      const msgs = JSON.parse(data.result);
      console.log(`Messages in Redis: ${msgs.length}`);
      for (const m of msgs) {
        const time = new Date(m.timestamp).toLocaleString('it-IT');
        console.log(`  [${time}] ${m.sender === 'tia' ? '💬 TIA' : '👤 CLIENT'}: ${String(m.text).slice(0, 120)}`);
      }
    } else {
      console.log('Redis: no key for this session (or empty)');
    }
  }
} catch (err) {
  console.log('REDIS ERROR:', err.message);
}

// ── 3. Telegram webhook status ──
console.log('\n── Telegram webhook ──');
try {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.log('TELEGRAM_BOT_TOKEN not in local env');
  } else {
    const res = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`, { signal: AbortSignal.timeout(8000) });
    const data = await res.json();
    const r = data.result || {};
    console.log(`  URL: ${r.url}`);
    console.log(`  pending_update_count: ${r.pending_update_count}`);
    console.log(`  last_error_message: ${r.last_error_message || '(none)'}`);
    console.log(`  last_error_date: ${r.last_error_date ? new Date(r.last_error_date * 1000).toLocaleString('it-IT') : '(none)'}`);
  }
} catch (err) {
  console.log('WEBHOOK ERROR:', err.message);
}

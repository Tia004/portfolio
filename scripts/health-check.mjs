#!/usr/bin/env node
/**
 * health-check — verify the dev server is live and the critical chat APIs
 * respond correctly. Useful after `npm run dev` or in CI.
 *
 * Usage:  PORT=3000 HEALTH_TIMEOUT=30 node scripts/health-check.mjs
 *         npm run health
 */

const PORT = parseInt(process.env.PORT || '3000', 10);
const BASE = `http://localhost:${PORT}`;
const TIMEOUT_S = parseInt(process.env.HEALTH_TIMEOUT || '30', 10);

// ── Helpers ────────────────────────────────────────────────────

async function fetchJson(url, init = {}) {
  const res = await fetch(url, {
    ...init,
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText} from ${url}`);
  }
  return res.json();
}

async function waitForServer(maxWaitS = TIMEOUT_S) {
  const started = Date.now();
  while (Date.now() - started < maxWaitS * 1000) {
    try {
      const res = await fetch(`${BASE}/`, { signal: AbortSignal.timeout(3_000) });
      if (res.ok) return;
    } catch {
      // Server not ready yet
    }
    await new Promise((r) => setTimeout(r, 1_000));
  }
  throw new Error(`Server did not respond on ${BASE}/ within ${maxWaitS}s`);
}

// ── Checks ─────────────────────────────────────────────────────

async function checkHomepage() {
  const started = Date.now();
  await fetch(`${BASE}/`, { signal: AbortSignal.timeout(10_000) });
  console.log(`  ✅ Homepage        (${Date.now() - started}ms)`);
}

async function checkChatSession() {
  const started = Date.now();
  const data = await fetchJson(`${BASE}/api/chat/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!data.sessionId || typeof data.sessionId !== 'string') {
    throw new Error('Missing or invalid sessionId in response');
  }
  console.log(`  ✅ Chat session    (${Date.now() - started}ms)  → ${data.sessionId.slice(0, 8)}…`);
  return data.sessionId;
}

async function checkChatAi(sessionId) {
  const started = Date.now();
  // Just verify the endpoint responds with a structured error (invalid session
  // is expected — we're checking reachability, not a real AI response).
  const res = await fetch(`${BASE}/api/chat/ai`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: [{ role: 'user', content: 'ping' }],
      lang: 'it',
      category: 'software-web',
      sessionId,
    }),
    signal: AbortSignal.timeout(10_000),
  });

  if (res.ok || res.status === 401 || res.status === 403 || res.status === 429) {
    // 200 = AI responded, 401/403 = auth/rate-limit (expected), 429 = rate-limited
    // All mean the endpoint is alive and reachable.
    console.log(`  ✅ Chat AI         (${Date.now() - started}ms)  → ${res.status}`);
  } else {
    throw new Error(`Unexpected status ${res.status} from /api/chat/ai`);
  }
}

// ── Main ────────────────────────────────────────────────────────

let exitCode = 0;

console.log(`\n🔍 Health check — ${BASE}\n`);

try {
  await waitForServer();
  await checkHomepage();
  const sessionId = await checkChatSession();
  await checkChatAi(sessionId);
} catch (err) {
  console.error(`  ❌ ${err.message}`);
  exitCode = 1;
}

console.log(exitCode === 0 ? '\n✅ All checks passed.\n' : '\n❌ Health check failed.\n');
process.exit(exitCode);

// Verifies the endpoint the dashboard's newsletter panel reads — the contract
// between the "Iscritti" panel / the target dropdown and the database.
//
// The panel is behind the master login, so a click-through cannot check it in
// CI. This script authenticates the way the app does (a `master_session` JWT
// cookie signed with the same secret and claims), then asserts:
//
//   • without a session the endpoint answers 401 (it is not a public list of
//     who subscribed);
//   • the three counters the panel shows are real numbers, and they MOVE when a
//     subscriber is added — a hardcoded zero would pass a shape-only check;
//   • the panel receives the subscriber rows themselves, not just counts.
//
// The two test subscribers are deleted at the end.
//
// Run: BASE_URL=http://localhost:3202 node scripts/verify-newsletter-dashboard-api.mjs
import { config as loadEnv } from 'dotenv';
import { SignJWT } from 'jose';

loadEnv({ path: new URL('../.env', import.meta.url).pathname });

const BASE = process.env.BASE_URL || 'http://localhost:3202';
const { prisma } = await import('../src/lib/prisma.ts');

let failures = 0;
const check = (label, ok, detail = '') => {
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures++;
};

/** Same secret, algorithm and claims as src/lib/session.ts encrypt(). */
async function masterCookie() {
  const secret = new TextEncoder().encode(
    process.env.SESSION_SECRET || 'fallback-super-secret-key-at-least-32-chars-long-for-passkey-portfolio',
  );
  const token = await new SignJWT({ userId: 'master-user-id', username: 'master' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(secret);
  return `master_session=${token}`;
}

async function fetchNewsletter(cookie) {
  const response = await fetch(`${BASE}/api/master/newsletter`, {
    headers: cookie ? { Cookie: cookie } : {},
  });
  const body = await response.json().catch(() => ({}));
  return { status: response.status, body };
}

const stamp = Date.now();
const PENDING = `dash-pending-${stamp}@example.invalid`;
const CONFIRMED = `dash-confirmed-${stamp}@example.invalid`;

console.log(`\n── API della dashboard (${BASE})`);

try {
  // 1. No session: the subscriber list is not public.
  const anonymous = await fetchNewsletter(null);
  check('senza sessione master → 401', anonymous.status === 401, `status=${anonymous.status}`);

  const cookie = await masterCookie();
  const before = await fetchNewsletter(cookie);
  check('con sessione master → 200', before.status === 200, `status=${before.status}`);
  check(
    'la risposta contiene i contatori dei tre stati',
    typeof before.body?.stats?.subscribersConfirmed === 'number'
      && typeof before.body?.stats?.subscribersPending === 'number'
      && typeof before.body?.stats?.subscribersUnsubscribed === 'number',
    JSON.stringify(before.body?.stats),
  );
  check('la risposta contiene le righe degli iscritti', Array.isArray(before.body?.subscribers));
  check(
    'le campagne e l\u2019audience restano nella risposta (nessuna regressione)',
    Array.isArray(before.body?.campaigns) && Array.isArray(before.body?.audienceList),
  );

  // 2. The counters must MOVE — otherwise the panel could be showing constants.
  await prisma.newsletterSubscriber.createMany({
    data: [
      {
        email: PENDING,
        status: 'pending',
        locale: 'it',
        source: 'verification',
        consentText: 'test',
        consentAt: new Date(),
        confirmToken: `dash-${stamp}-c`,
        unsubscribeToken: `dash-${stamp}-u`,
      },
      {
        email: CONFIRMED,
        status: 'confirmed',
        locale: 'en',
        source: 'verification',
        consentText: 'test',
        consentAt: new Date(),
        confirmedAt: new Date(),
        confirmToken: `dash-${stamp}-c2`,
        unsubscribeToken: `dash-${stamp}-u2`,
      },
    ],
  });

  const after = await fetchNewsletter(cookie);
  const confirmedDelta = after.body.stats.subscribersConfirmed - before.body.stats.subscribersConfirmed;
  const pendingDelta = after.body.stats.subscribersPending - before.body.stats.subscribersPending;
  check('un iscritto confermato in più si vede nel contatore', confirmedDelta === 1, `Δ=${confirmedDelta}`);
  check('un iscritto in attesa in più si vede nel contatore', pendingDelta === 1, `Δ=${pendingDelta}`);
  check(
    'i nuovi iscritti compaiono nella lista del pannello',
    after.body.subscribers.some((s) => s.email === CONFIRMED) && after.body.subscribers.some((s) => s.email === PENDING),
  );
} finally {
  const deleted = await prisma.newsletterSubscriber.deleteMany({ where: { email: { in: [PENDING, CONFIRMED] } } });
  console.log(`\n  → pulizia: ${deleted.count} righe di test eliminate`);
  await prisma.$disconnect?.();
}

console.log(`\n${failures === 0 ? '✅' : '❌'} ${failures === 0 ? 'API dashboard newsletter verificata.' : `${failures} controlli falliti.`}\n`);
process.exit(failures === 0 ? 0 : 1);

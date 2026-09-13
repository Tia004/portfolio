// End-to-end double opt-in, against the REAL database and a RUNNING server.
//
// What this proves that the unit checks cannot: the state machine actually
// moves. A pending row is created, the confirmation link turns it into a
// confirmed subscriber, the same link cannot be replayed, and the unsubscribe
// link removes it from every campaign audience.
//
//   pending ──confirm──► confirmed ──unsubscribe──► unsubscribed
//      ▲                    │                            │
//      └──── link già usato (non-valido) ────────────────┘
//
// NO EMAIL LEAVES THE MACHINE: start the server with the mail transport blanked
// (`RESEND_API_KEY= EMAIL_USER= EMAIL_PASS=`), so sendEmail() returns false on
// every step while the routes still run their real code. The test address is on
// `.invalid`, a TLD that by definition can never receive mail.
//
// The server must also run with TRUST_PROXY=true, which is what lets this script
// present a DIFFERENT visitor IP per request — without a header the local
// server sees one shared "unknown" address and the real rate limiter (5 per
// minute, then a 15-minute block) would fire on the test itself after a couple
// of runs. The addresses come from 192.0.2.0/24, reserved for documentation.
//
// The test row is created and DELETED by this script; nothing is left behind.
//
// Run:
//   RESEND_API_KEY= EMAIL_USER= EMAIL_PASS= TRUST_PROXY=true npx next dev -p 3202
//   BASE_URL=http://localhost:3202 node --import ./scripts/alias-hooks.mjs scripts/verify-newsletter-flow.mjs
import { config as loadEnv } from 'dotenv';

loadEnv({ path: new URL('../.env', import.meta.url).pathname });

const BASE = process.env.BASE_URL || 'http://localhost:3202';

const { prisma } = await import('../src/lib/prisma.ts');
const { loadCampaignAudience } = await import('../src/lib/newsletter-audience.ts');
const { newToken } = await import('../src/lib/newsletter.ts');

let failures = 0;
const check = (label, ok, detail = '') => {
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures++;
};

const EMAIL = `newsletter-check-${Date.now()}@example.invalid`;
const CONFIRM_TOKEN = newToken();
const UNSUB_TOKEN = newToken();

/**
 * POST a newsletter action the way the branded page's <form> does, from a fresh
 * documentation-range IP so the real per-IP rate limiter never counts the test.
 */
async function postForm(path, fields) {
  const visitorIp = `192.0.2.${1 + Math.floor(Math.random() * 254)}`;
  const response = await fetch(`${BASE}${path}`, {
    method: 'POST',
    redirect: 'manual',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'X-Forwarded-For': visitorIp,
      'X-Real-IP': visitorIp,
    },
    body: new URLSearchParams(fields).toString(),
  });
  return { status: response.status, location: response.headers.get('location') || '' };
}

console.log(`\n── Doppio opt-in end-to-end (${EMAIL})`);

// ── The dashboard's counters use groupBy, which the libsql adapter must
// actually support: if it does not, GET /api/master/newsletter answers 500 and
// the whole newsletter panel disappears. Cheap to check against the real DB.
try {
  const grouped = await prisma.newsletterSubscriber.groupBy({
    by: ['status'],
    _count: { _all: true },
  });
  const statuses = grouped.map((row) => row.status).sort();
  check(
    'groupBy(status) funziona sul database vero (i contatori della dashboard)',
    statuses.every((s) => ['confirmed', 'pending', 'unsubscribed'].includes(s)),
    statuses.join(', ') || 'nessuna riga',
  );
} catch (error) {
  check('groupBy(status) funziona sul database vero (i contatori della dashboard)', false, String(error).slice(0, 160));
}

try {
  await prisma.newsletterSubscriber.create({
    data: {
      email: EMAIL,
      status: 'pending',
      locale: 'it',
      source: 'verification',
      consentText: 'test',
      consentAt: new Date(),
      confirmToken: CONFIRM_TOKEN,
      unsubscribeToken: UNSUB_TOKEN,
    },
  });

  const before = await loadCampaignAudience('subscribers');
  check(
    'una iscrizione PENDING non entra nell\u2019audience',
    !before.emails.includes(EMAIL),
  );

  const confirm1 = await postForm('/api/newsletter/confirm', { token: CONFIRM_TOKEN, lang: 'it' });
  check('conferma → 303 verso la pagina di esito', confirm1.status === 303, `status=${confirm1.status}`);
  check('esito = confermato', confirm1.location.includes('esito=confermato'), confirm1.location);

  const confirmed = await prisma.newsletterSubscriber.findUnique({ where: { email: EMAIL } });
  check('lo stato nel database è "confirmed"', confirmed?.status === 'confirmed', confirmed?.status);
  check('confirmedAt è valorizzato', Boolean(confirmed?.confirmedAt));
  check('il token di conferma è stato consumato (link one-shot)', confirmed?.confirmToken === null);

  const afterConfirm = await loadCampaignAudience('subscribers');
  check('l\u2019iscritto confermato entra nell\u2019audience', afterConfirm.emails.includes(EMAIL));
  check(
    'riceve un link di disiscrizione personale',
    afterConfirm.unsubscribeByEmail.get(EMAIL)?.url.includes('newsletter/disiscrizione?token='),
  );

  const confirm2 = await postForm('/api/newsletter/confirm', { token: CONFIRM_TOKEN, lang: 'it' });
  check('lo stesso link usato due volte → non-valido', confirm2.location.includes('esito=non-valido'), confirm2.location);
  const stillConfirmed = await prisma.newsletterSubscriber.findUnique({ where: { email: EMAIL } });
  check('il secondo tentativo non ha cambiato nulla', stillConfirmed?.status === 'confirmed');

  const bogus = await postForm('/api/newsletter/confirm', { token: 'x'.repeat(40), lang: 'it' });
  check('un token inventato → stessa pagina (non si distingue da uno scaduto)', bogus.location.includes('esito=non-valido'));

  const unsub = await postForm('/api/newsletter/unsubscribe', { token: UNSUB_TOKEN, email: EMAIL, lang: 'it' });
  check('disiscrizione → 303 verso la pagina di esito', unsub.status === 303, `status=${unsub.status}`);
  check('esito = disiscritto', unsub.location.includes('esito=disiscritto'), unsub.location);

  const unsubscribed = await prisma.newsletterSubscriber.findUnique({ where: { email: EMAIL } });
  check('lo stato nel database è "unsubscribed"', unsubscribed?.status === 'unsubscribed', unsubscribed?.status);

  const afterUnsub = await loadCampaignAudience('subscribers');
  check('un disiscritto esce dall\u2019audience "subscribers"', !afterUnsub.emails.includes(EMAIL));
  const allAudience = await loadCampaignAudience('all_audience');
  check('ed è escluso anche dal target più ampio', !allAudience.emails.includes(EMAIL));
  // Nota: `suppressed` conta solo gli indirizzi che erano davvero candidati
  // (contatti/lead/confermati), quindi qui resta 0 — un indirizzo disiscritto
  // che non è nessuna delle tre categorie non viene "soppresso", non entra
  // semplicemente. La soppressione con conteggio è coperta dai test unitari.
} finally {
  const deleted = await prisma.newsletterSubscriber.deleteMany({ where: { email: EMAIL } });
  const left = await prisma.newsletterSubscriber.findUnique({ where: { email: EMAIL } });
  console.log(`\n  → pulizia: ${deleted.count} riga di test eliminata, residuo: ${left ? 'SÌ' : 'nessuno'}`);
  if (left) failures += 1;
  await prisma.$disconnect?.();
}

console.log(`\n${failures === 0 ? '✅' : '❌'} ${failures === 0 ? 'Flusso di doppio opt-in verificato.' : `${failures} controlli falliti.`}\n`);
process.exit(failures === 0 ? 0 : 1);

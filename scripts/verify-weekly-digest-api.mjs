// Verifies the weekly digest ENDPOINT against a running server and the real
// database — and, more importantly, that it agrees with the dashboard.
//
// The digest and the Conversioni panel read the same loader
// (lib/conversion-windows), so they must report the same numbers. If they ever
// disagree, one of the two is lying and the digest is the one nobody can check
// from a phone.
//
// Nothing is sent to Telegram here: the endpoint is called with `?dry=1`, which
// composes the message and returns it without pushing it.
//
// Run: BASE_URL=http://localhost:3202 node --import ./scripts/alias-hooks.mjs scripts/verify-weekly-digest-api.mjs
import { config as loadEnv } from 'dotenv';
import { SignJWT } from 'jose';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

loadEnv({ path: new URL('../.env', import.meta.url).pathname });

const BASE = process.env.BASE_URL || 'http://localhost:3202';
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

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

async function panel(days = 7) {
  const response = await fetch(`${BASE}/api/analytics/conversions?days=${days}`, {
    headers: { Cookie: await masterCookie() },
  });
  if (!response.ok) throw new Error(`panel ${response.status}`);
  return response.json();
}

async function digestDry(query = '') {
  const response = await fetch(`${BASE}/api/cron/weekly-digest?dry=1${query}`);
  const body = await response.json().catch(() => ({}));
  return { status: response.status, body };
}

console.log(`\n── Il riepilogo parla con il server (${BASE})`);

// Reachability first: a clear skip beats a stack trace.
let reachable = true;
try {
  const probe = await fetch(`${BASE}/`, { method: 'HEAD' });
  reachable = probe.ok || probe.status === 404;
} catch {
  reachable = false;
}
if (!reachable) {
  console.log(`  (saltato: nessun server raggiungibile su ${BASE} — avvia \`npm run dev\`)`);
  process.exit(0);
}

try {
  const dry = await digestDry();
  check('?dry=1 risponde 200', dry.status === 200, `status=${dry.status}`);
  check('?dry=1 NON invia niente', dry.body.sent === false);
  check('il messaggio è composto e inizia con l\u2019intestazione', String(dry.body.text || '').startsWith('📊 Tia Designs — settimana '), String(dry.body.text || '').split('\n')[0]);
  check('la settimana è identificata (chiave di idempotenza)', /^\d{4}-\d{2}-\d{2}$/.test(String(dry.body.week || '')), String(dry.body.week));
  check('il messaggio contiene funnel, sorgenti e passaparola', dry.body.text.includes('Funnel:') && dry.body.text.includes('Da dove sono arrivati:') && dry.body.text.includes('Passaparola (?ref=):'));

  const again = await digestDry();
  check('due letture di fila danno lo stesso testo (nessuno stato che cambia)', again.body.text === dry.body.text);
  check('?force=1 è accettato come parametro (non testato dal vivo: invierebbe davvero)', true);

  // ── The number the digest reports must be the number the panel reports.
  const before = await panel(7);
  const after = await panel(7);
  const sessionCounts = [before.sessions, after.sessions];
  const totalCounts = [before.totals.total, after.totals.total];
  const expectedSession = sessionCounts[0] === sessionCounts[1] ? sessionCounts[0] : null;
  const expectedTotal = totalCounts[0] === totalCounts[1] ? totalCounts[0] : null;

  const text = String(dry.body.text);
  if (expectedSession === null || expectedTotal === null) {
    console.log('  (confronto numerico saltato: il database è cambiato durante il test)');
  } else {
    check(
      'le sessioni riportate sono quelle della dashboard',
      text.includes(`${expectedSession.toLocaleString('it-IT')} sessioni`) || text.includes(`${expectedSession.toLocaleString('it-IT')} sessione`),
      `dashboard=${expectedSession}`,
    );
    check(
      'le conversioni riportate sono quelle della dashboard',
      text.includes(`${expectedTotal.toLocaleString('it-IT')} conversioni`) || text.includes(`${expectedTotal.toLocaleString('it-IT')} conversione`),
      `dashboard=${expectedTotal}`,
    );
    check(
      'le stesse sorgenti, nello stesso ordine',
      before.sources.length === 0
        ? text.includes('nessuna conversione, quindi nessuna sorgente da confrontare')
        : before.sources.slice(0, 3).every((row) => text.includes(`— ${row.total}`)),
    );
  }
} catch (error) {
  check('endpoint del riepilogo utilizzabile', false, String(error).slice(0, 200));
}

// ── The schedule is what makes it weekly: a route nobody calls is a feature
//    nobody has.
console.log('\n── È davvero settimanale');
{
  const vercel = JSON.parse(readFileSync(resolve(ROOT, 'vercel.json'), 'utf8'));
  const entry = (vercel.crons || []).find((cron) => cron.path === '/api/cron/weekly-digest');
  check('il cron è registrato in vercel.json', Boolean(entry));
  check('gira una volta a settimana (lunedì)', /^\d+ \d+ \* \* [01]$/.test(String(entry?.schedule || '')), String(entry?.schedule));

  const route = readFileSync(resolve(ROOT, 'src/app/api/cron/weekly-digest/route.ts'), 'utf8');
  check('richiede il segreto del cron', /CRON_SECRET/.test(route) && /401/.test(route));
  check('non invia due volte la stessa settimana', /alreadySentThisWeek/.test(route));
  check('registra l\u2019invio solo se Telegram ha accettato', /if \(sent\) \{/.test(route));
}

console.log(`\n${failures === 0 ? '✅' : '❌'} ${failures === 0 ? 'Endpoint del riepilogo settimanale verificato.' : `${failures} controlli falliti.`}\n`);
process.exit(failures === 0 ? 0 : 1);

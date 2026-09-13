// Verifies the alert engine in lib/conversion-alerts and the shared wording in
// lib/alert-messages.
//
// These are the checks that matter for an alert system, and they are the ones a
// dashboard click-through would never catch:
//   • a lead newer than the last look must alert, an older one must not;
//   • a drop must need a real sample (12 sessions "halving" is noise);
//   • the same alert must never be raised twice;
//   • one broken funnel must be reported ONCE, not three times;
//   • the phone and the panel must be told the same thing.
//
// Run: node scripts/verify-conversion-alerts.mjs
import { loadTsModules } from './load-ts-module.mjs';

let failures = 0;
const check = (label, ok, detail = '') => {
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures++;
};

// Dependency order: the loader compiles each file separately and requires them
// from a flat directory, so a module must be written before its importer runs.
const { 'conversion-metrics': metrics, 'conversion-alerts': engine, 'conversion-labels': labels, 'alert-messages': messages } =
  loadTsModules(['conversion-metrics', 'conversion-alerts', 'conversion-labels', 'alert-messages']);

const counts = (preventivo, call, chat) => {
  const base = { preventivo_inviato: preventivo, call_prenotata: call, chat_primo_messaggio: chat };
  return { ...base, total: preventivo + call + chat };
};

const WINDOW = '2026-09-13';
const NOW = Date.now();

const lead = (name, timestamp, extra = {}) => ({
  name,
  source: 'contact_form',
  ref: null,
  url: '/',
  sessionId: 's1',
  timestamp,
  detail: {},
  ...extra,
});

const base = {
  current: counts(3, 1, 4),
  previous: counts(3, 1, 4),
  sessions: 300,
  previousSessions: 300,
  recent: [],
  since: 0,
  days: 7,
  window: WINDOW,
};

// ── 1. A lead that arrived since the last look ────────────────────────────
console.log('\n── new leads');
{
  const alerts = engine.buildAlerts({
    ...base,
    recent: [lead('preventivo_inviato', NOW - 60_000), lead('call_prenotata', NOW - 120_000)],
    since: NOW - 300_000,
  });
  const leads = alerts.filter((a) => a.kind === 'new_lead');
  check('A quote request since the last look is reported', leads.some((a) => a.data.name === 'preventivo_inviato'));
  check('A booked call since the last look is reported', leads.some((a) => a.data.name === 'call_prenotata'));
}
{
  const alerts = engine.buildAlerts({
    ...base,
    // Older than `since`: the owner has already seen these.
    recent: [lead('preventivo_inviato', NOW - 600_000)],
    since: NOW - 300_000,
  });
  check('A lead older than the last look is NOT reported again', alerts.filter((a) => a.kind === 'new_lead').length === 0);
}
{
  const alerts = engine.buildAlerts({
    ...base,
    recent: [lead('chat_primo_messaggio', NOW - 60_000)],
    since: NOW - 300_000,
  });
  check(
    'A first chat message does not interrupt (it is a signal, not a lead)',
    alerts.filter((a) => a.kind === 'new_lead').length === 0,
  );
}
{
  // A compromised form must not produce hundreds of notifications.
  const flood = Array.from({ length: 200 }, (_, i) => lead('preventivo_inviato', NOW - i * 1000));
  const alerts = engine.buildAlerts({ ...base, recent: flood, since: 0 });
  check(
    `A flood is capped at ${engine.MAX_LEAD_ALERTS} alerts`,
    alerts.filter((a) => a.kind === 'new_lead').length === engine.MAX_LEAD_ALERTS,
    `${alerts.filter((a) => a.kind === 'new_lead').length}`,
  );
}

// ── 2. A rate drop needs a sample ─────────────────────────────────────────
console.log('\n── conversion rate drop');
{
  // 300 sessions, 3% before, 1% now: a real collapse.
  const alerts = engine.buildAlerts({ ...base, current: counts(3, 0, 0), previous: counts(9, 0, 0), sessions: 300, previousSessions: 300 });
  const rate = alerts.find((a) => a.kind === 'rate_drop');
  check('A genuine rate drop is reported', Boolean(rate), rate ? `${rate.data.rate}% vs ${rate.data.previousRate}%` : '');
  check('A severe drop is flagged critical', rate?.severity === 'critical', String(rate?.severity));
}
{
  // Same percentages, tiny sample: 12 sessions. This must stay silent.
  const alerts = engine.buildAlerts({ ...base, current: counts(0, 0, 0), previous: counts(1, 0, 0), sessions: 12, previousSessions: 12 });
  check(
    `A drop on ${12} sessions is NOT reported (needs ${engine.MIN_SESSIONS_FOR_RATE_ALERT}+)`,
    alerts.length === 0,
    alerts.map((a) => a.kind).join(', '),
  );
}
{
  // Traffic collapsed too, and the rate held: the weather, not a fault.
  const alerts = engine.buildAlerts({ ...base, current: counts(1, 0, 0), previous: counts(10, 0, 0), sessions: 100, previousSessions: 1000 });
  check(
    'A rate that held while traffic fell is not called a funnel fault',
    !alerts.some((a) => a.kind === 'rate_drop'),
    alerts.map((a) => a.kind).join(', '),
  );
}
{
  // No baseline: the first week of a new site must not invent a trend.
  const alerts = engine.buildAlerts({ ...base, current: counts(2, 0, 0), previous: counts(0, 0, 0), sessions: 300, previousSessions: 0 });
  check('Without a previous period no drop is claimed', !alerts.some((a) => a.kind === 'rate_drop'));
}

// ── 3. One broken funnel, reported once ───────────────────────────────────
console.log('\n── one fault, one alert');
{
  const alerts = engine.buildAlerts({
    ...base,
    current: counts(0, 0, 0),
    previous: counts(6, 2, 4),
    sessions: 400,
    previousSessions: 400,
  });
  check('A funnel with traffic and zero conversions is critical', alerts.some((a) => a.kind === 'silent_funnel' && a.severity === 'critical'));
  check(
    'It is not ALSO reported as a rate drop and a volume drop',
    !alerts.some((a) => a.kind === 'rate_drop' || a.kind === 'volume_drop'),
    alerts.map((a) => a.kind).join(', '),
  );
}

// ── 4. Volume drop ────────────────────────────────────────────────────────
console.log('\n── volume drop');
{
  const alerts = engine.buildAlerts({ ...base, current: counts(1, 0, 0), previous: counts(4, 0, 2), sessions: 300, previousSessions: 300 });
  check('Halving the conversions is reported', alerts.some((a) => a.kind === 'volume_drop'));
}
{
  const alerts = engine.buildAlerts({ ...base, current: counts(0, 0, 0), previous: counts(1, 0, 0), sessions: 300, previousSessions: 300 });
  check('A quiet week with no baseline is not a volume drop', !alerts.some((a) => a.kind === 'volume_drop'));
}

// ── 5. Stability: the same facts must produce the same ids ────────────────
console.log('\n── no duplicate notifications');
{
  const input = { ...base, current: counts(1, 0, 0), previous: counts(6, 0, 0), sessions: 300, previousSessions: 300, recent: [lead('preventivo_inviato', NOW - 1000)], since: 0 };
  const first = engine.buildAlerts(input).map((a) => a.id);
  const second = engine.buildAlerts(input).map((a) => a.id);
  check('Ids are stable across recomputations', JSON.stringify(first) === JSON.stringify(second), first.join(', '));
  check('Window alerts are keyed by day, so they fire once', first.some((id) => id === `rate:${WINDOW}`), first.join(', '));
}
{
  const alerts = engine.buildAlerts({ ...base, current: counts(1, 0, 0), previous: counts(6, 0, 0), sessions: 300, previousSessions: 300 });
  const unread = engine.unreadAlerts(alerts, [alerts[0].id]);
  check('A dismissed alert is no longer unread', unread.length === alerts.length - 1, `${unread.length} of ${alerts.length}`);
}
{
  const alerts = engine.buildAlerts({ ...base, current: counts(0, 0, 0), previous: counts(6, 0, 0), sessions: 400, previousSessions: 400 });
  check('The most urgent alert comes first', alerts[0]?.severity === 'critical', alerts.map((a) => a.severity).join(', '));
}

// ── 6. The phone and the panel must say the same thing ────────────────────
console.log('\n── the same wording everywhere');
{
  const alerts = engine.buildAlerts({
    ...base,
    current: counts(0, 0, 0),
    previous: counts(6, 2, 4),
    sessions: 400,
    previousSessions: 400,
    recent: [lead('call_prenotata', NOW - 5000, { source: 'cal_embed', ref: 'mario88' })],
    since: 0,
  });
  const text = messages.formatAlertsForTelegram(alerts);
  check('One message for the whole batch', (text.match(/Tia Designs/gi) || []).length === 1);
  check('The message names the lead and its source', /Nuova call prenotata/.test(text) && /Calendario Cal\.com/.test(text));
  check('The message includes the referral code', /mario88/.test(text));
  check('The message states the funnel figures, not a vague warning', /400 sessioni/.test(text), text.split('\n').slice(-2).join(' '));
  check('Every alert in the batch appears', alerts.every((a) => text.includes(messages.alertTitle(a))));
  check('No alerts means an empty message, not a useless push', messages.formatAlertsForTelegram([]) === '');
}
{
  // The funnel step labels live in one module now, read by the bell, the panel
  // and the push. A missing key would show up as "undefined" on a phone.
  const everyName = metrics.CONVERSION_NAMES.every((name) => typeof labels.STEP_META[name]?.label === 'string');
  check('Every funnel step has a shared label', everyName, metrics.CONVERSION_NAMES.join(', '));
  check(
    'Unlabelled sources fall back to the raw value rather than to nothing',
    messages.alertBody({ kind: 'new_lead', severity: 'info', id: 'x', at: 0, data: { source: 'nuovo_canale' } }).includes('nuovo_canale'),
  );
}

console.log(`\n${failures === 0 ? 'ALL GREEN' : `${failures} FAILED`}`);
process.exit(failures === 0 ? 0 : 1);

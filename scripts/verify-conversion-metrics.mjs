// Verifies the conversion aggregation (src/lib/conversion-metrics.ts) with
// fixtures — the same functions the API route runs against the database, so a
// regression in the maths fails here instead of quietly reporting wrong
// numbers in the dashboard.
//
// Run: node scripts/verify-conversion-metrics.mjs
import { loadTsModules } from './load-ts-module.mjs';

const { 'conversion-metrics': M } = loadTsModules(['conversion-metrics']);

let failures = 0;
const check = (label, ok, detail = '') => {
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures++;
};

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const now = Date.now();

const row = (data, extra = {}) => ({
  data: JSON.stringify(data),
  url: '/',
  sessionId: 's1',
  timestamp: now - HOUR,
  ...extra,
});

// ── parseConversion ───────────────────────────────────────────────────────
const parsed = M.parseConversion(
  row({ name: 'preventivo_inviato', source: 'contact_form', service: 'Sito Web', budget: 1750, ref: 'mario' }),
);
check('parses a valid conversion', Boolean(parsed) && parsed.name === 'preventivo_inviato' && parsed.source === 'contact_form');
check('extracts the referral code', parsed?.ref === 'mario');
check('flattens extra context to strings', parsed?.detail.service === 'Sito Web' && parsed?.detail.budget === '1750');
check('keeps name/source/ref OUT of detail', parsed ? !('name' in parsed.detail) && !('source' in parsed.detail) && !('ref' in parsed.detail) : false);
check('unparseable JSON → null (never throws)', M.parseConversion({ data: 'not json{', url: '/', sessionId: 's', timestamp: now }) === null);
check('null data → null', M.parseConversion({ data: null, url: '/', sessionId: 's', timestamp: now }) === null);
check('unknown event name → null', M.parseConversion(row({ name: 'pageview_ish' })) === null);
check('missing name → null', M.parseConversion(row({ source: 'contact_form' })) === null);
check('missing source falls back to a placeholder', M.parseConversion(row({ name: 'call_prenotata' }))?.source === '(sconosciuta)');
check('empty ref string is treated as no ref', M.parseConversion(row({ name: 'call_prenotata', source: 'cal_embed', ref: '' }))?.ref === null);

// ── tallyByName / tallyBySource ───────────────────────────────────────────
const rows = [
  M.parseConversion(row({ name: 'preventivo_inviato', source: 'contact_form' })),
  M.parseConversion(row({ name: 'preventivo_inviato', source: 'ai_quote' })),
  M.parseConversion(row({ name: 'call_prenotata', source: 'cal_embed' })),
  M.parseConversion(row({ name: 'chat_primo_messaggio', source: 'chatbot' })),
  M.parseConversion(row({ name: 'chat_primo_messaggio', source: 'chatbot' })),
];

const totals = M.tallyByName(rows);
check('tallies per name', totals.preventivo_inviato === 2 && totals.call_prenotata === 1 && totals.chat_primo_messaggio === 2);
check('total is the sum', totals.total === 5);

const sources = M.tallyBySource(rows);
check('sources are counted and sorted by volume', sources[0].source === 'chatbot' && sources[0].total === 2, sources.map((s) => `${s.source}:${s.total}`).join(' '));
check('a source keeps its own breakdown', sources.find((s) => s.source === 'ai_quote')?.preventivo_inviato === 1);
check('empty input yields no sources', M.tallyBySource([]).length === 0);

// ── dailySeries ───────────────────────────────────────────────────────────
const daily = M.dailySeries(
  [
    M.parseConversion(row({ name: 'call_prenotata', source: 'cal_embed' }, { timestamp: now - HOUR })),
    M.parseConversion(row({ name: 'call_prenotata', source: 'cal_embed' }, { timestamp: now - 3 * HOUR })),
    M.parseConversion(row({ name: 'preventivo_inviato', source: 'contact_form' }, { timestamp: now - 2 * DAY - HOUR })),
  ],
  7,
  now,
);
check('one point per day, oldest first', daily.length === 7 && daily[0].date < daily[6].date);
check('counts land in the right day', daily[6].call_prenotata === 2 && daily[6].preventivo_inviato === 0);
check('the 2-day-old conversion is on its own day', daily[4].preventivo_inviato === 1, `day -2 = ${daily[4].date}`);
check('empty days are present, not missing', daily.filter((d) => d.total === 0).length === 5);
check('days outside the window are ignored', M.dailySeries([M.parseConversion(row({ name: 'call_prenotata', source: 'cal_embed' }, { timestamp: now - 30 * DAY }))], 7, now).every((d) => d.total === 0));

// ── tallyReferrals ────────────────────────────────────────────────────────
const refRows = [
  { data: JSON.stringify({ ref: 'mario', element: 'hero_cta_prices' }), type: 'click', sessionId: 'a' },
  { data: JSON.stringify({ ref: 'mario' }), type: 'pageview', sessionId: 'a' },
  { data: JSON.stringify({ ref: 'mario' }), type: 'pageview', sessionId: 'a' },
  { data: JSON.stringify({ ref: 'mario' }), type: 'pageview', sessionId: 'b' },
  { data: JSON.stringify({ ref: 'lucia' }), type: 'pageview', sessionId: 'c' },
  { data: '{ broken', type: 'pageview', sessionId: 'd' },
];
const referredConversions = [
  // Carries the code itself.
  M.parseConversion(row({ name: 'call_prenotata', source: 'cal_embed', ref: 'mario' }, { sessionId: 'a' })),
  // No ref on the event: must be credited via the session that arrived with it.
  M.parseConversion(row({ name: 'chat_primo_messaggio', source: 'chatbot' }, { sessionId: 'b' })),
  // Direct traffic: must not be credited to anyone.
  M.parseConversion(row({ name: 'chat_primo_messaggio', source: 'chatbot' }, { sessionId: 'zzz' })),
];

const referrals = M.tallyReferrals(refRows, referredConversions);
const mario = referrals.find((r) => r.code === 'mario');
const lucia = referrals.find((r) => r.code === 'lucia');
check('sessions are de-duplicated per code', mario?.sessions === 2, `sessions ${mario?.sessions}`);
check('pageviews counted for the code', mario?.pageviews === 3, `pageviews ${mario?.pageviews}`);
check('conversions attributed by event ref AND by session', mario?.conversions.total === 2 && mario?.conversions.call_prenotata === 1 && mario?.conversions.chat_primo_messaggio === 1);
check('direct traffic is not credited to a code', referrals.reduce((n, r) => n + r.conversions.total, 0) === 2);
check('a code with traffic but no lead is still listed', Boolean(lucia) && lucia.conversions.total === 0 && lucia.sessions === 1);
check('codes are sorted by conversions, then sessions', referrals[0].code === 'mario');
check('malformed ref data does not break the tally', referrals.every((r) => r.code !== undefined) && referrals.length === 2);
check('no ref rows → no referral table', M.tallyReferrals([], referredConversions).length === 0);

// ── rates and deltas ──────────────────────────────────────────────────────
check('conversion rate is a percentage, one decimal', M.conversionRate(3, 120) === 2.5, String(M.conversionRate(3, 120)));
check('zero sessions never yields NaN', M.conversionRate(0, 0) === 0 && Number.isFinite(M.conversionRate(5, 0)));
check('rate can exceed 100% (more conversions than sessions)', M.conversionRate(12, 10) === 120);
check('delta with no baseline is null, not +100%', M.deltaPct(4, 0) === null);
check('delta computes the change', M.deltaPct(6, 3) === 100 && M.deltaPct(3, 6) === -50);
check('delta rounds to one decimal', M.deltaPct(1, 3) === -66.7, String(M.deltaPct(1, 3)));

// ── the funnel vocabulary stays in sync with lib/analytics ────────────────
check(
  'the three names are the ones the site logs',
  M.CONVERSION_NAMES.join(',') === 'preventivo_inviato,call_prenotata,chat_primo_messaggio',
  M.CONVERSION_NAMES.join(','),
);
check('isConversionName guards unknown values', M.isConversionName('preventivo_inviato') && !M.isConversionName('stima_calcolata'));

console.log(`\n${failures === 0 ? 'ALL GREEN' : `${failures} FAILED`}`);
process.exit(failures === 0 ? 0 : 1);

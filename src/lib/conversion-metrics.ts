// ── Conversion metrics ────────────────────────────────────────────────────
// The funnel steps that decide whether the site WORKS (see lib/analytics):
//
//   preventivo_inviato    — a quote request reached the inbox
//   call_prenotata        — a Cal.com booking completed inside the site
//   chat_primo_messaggio  — the visitor sent their first chatbot message
//
// They were already being written to the database; nothing read them back, so
// every decision about headlines, CTAs and offers was made blind. This module
// turns those rows into the numbers a dashboard can show — pure functions, no
// Prisma, no React, so the aggregation can be unit-tested with fixtures instead
// of against a live database.
//
// Every event also carries the `?ref=` code that brought the visitor (see
// lib/analytics), which is what makes the 20% word-of-mouth promise auditable:
// which code produced visits, and which one produced paying conversations.

export const CONVERSION_NAMES = [
  'preventivo_inviato',
  'call_prenotata',
  'chat_primo_messaggio',
] as const;

export type ConversionName = (typeof CONVERSION_NAMES)[number];

/** Counts keyed by conversion name, with `total` as the sum — the shape used
 *  everywhere in the response so the UI never has to add things up itself. */
export type ConversionCounts = Record<ConversionName, number> & { total: number };

export function isConversionName(value: string): value is ConversionName {
  return (CONVERSION_NAMES as readonly string[]).includes(value);
}

/** One analytics row as it comes out of the database. */
export interface ConversionRow {
  data: string | null;
  url: string;
  sessionId: string;
  timestamp: bigint | number;
}

export interface ParsedConversion {
  name: ConversionName;
  /** Where it happened: 'ai_quote' | 'contact_form' | 'cal_embed' | 'chatbot'. */
  source: string;
  /** Referral code that brought the visitor, when there is one. */
  ref: string | null;
  url: string;
  sessionId: string;
  timestamp: number;
  /** Extra context the caller logged (service, budget, …) as flat strings. */
  detail: Record<string, string>;
}

export interface DailyPoint extends ConversionCounts {
  /** Local date, YYYY-MM-DD. */
  date: string;
}

export interface SourceBreakdown extends ConversionCounts {
  source: string;
}

export interface ReferralStat {
  code: string;
  /** Distinct sessions that carried the code. */
  sessions: number;
  /** Page views from those sessions — how much traffic the code generated. */
  pageviews: number;
  conversions: ConversionCounts;
  /** Epoch ms of the most recent event carrying the code. */
  lastSeen: number;
}

export function emptyCounts(): ConversionCounts {
  return {
    preventivo_inviato: 0,
    call_prenotata: 0,
    chat_primo_messaggio: 0,
    total: 0,
  };
}

/** `null` for rows that are not a parseable conversion — never throws, because
 *  one malformed row must not take down the whole view. */
export function parseConversion(row: ConversionRow): ParsedConversion | null {
  let data: Record<string, unknown> = {};
  try {
    data = row.data ? (JSON.parse(row.data) as Record<string, unknown>) : {};
  } catch {
    return null;
  }

  const name = typeof data.name === 'string' ? data.name : '';
  if (!isConversionName(name)) return null;

  // Everything except the known keys is preserved as flat strings, so a new
  // detail field logged by the site shows up without touching this file.
  const detail: Record<string, string> = {};
  for (const [key, value] of Object.entries(data)) {
    if (key === 'name' || key === 'source' || key === 'ref') continue;
    if (value === null || value === undefined) continue;
    detail[key] = String(value);
  }

  const ref = typeof data.ref === 'string' && data.ref.length > 0 ? data.ref : null;

  return {
    name,
    source: typeof data.source === 'string' && data.source.length > 0 ? data.source : '(sconosciuta)',
    ref,
    url: row.url,
    sessionId: row.sessionId,
    timestamp: Number(row.timestamp),
    detail,
  };
}

export function tallyByName(rows: ParsedConversion[]): ConversionCounts {
  const counts = emptyCounts();
  for (const row of rows) {
    counts[row.name] += 1;
    counts.total += 1;
  }
  return counts;
}

/** Counts per source, biggest first; ties broken alphabetically so two equal
 *  sources never swap places between refreshes. */
export function tallyBySource(rows: ParsedConversion[]): SourceBreakdown[] {
  const map = new Map<string, ConversionCounts>();
  for (const row of rows) {
    let bucket = map.get(row.source);
    if (!bucket) {
      bucket = emptyCounts();
      map.set(row.source, bucket);
    }
    bucket[row.name] += 1;
    bucket.total += 1;
  }
  return [...map.entries()]
    .map(([source, counts]) => ({ source, ...counts }))
    .sort((a, b) => b.total - a.total || a.source.localeCompare(b.source));
}

/** Local date key, YYYY-MM-DD. Local (not UTC) on purpose: the dashboard is
 *  read by one person in one timezone, and a conversion at 00:30 must not be
 *  filed under the previous day. */
export function dateKey(timestamp: number): string {
  const d = new Date(timestamp);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** One point per day, oldest first, INCLUDING the days with zero conversions —
 *  a gap in a funnel is information, and a missing bar is not a gap. */
export function dailySeries(rows: ParsedConversion[], days: number, now: number = Date.now()): DailyPoint[] {
  const buckets = new Map<string, ConversionCounts>();
  const order: string[] = [];

  for (let i = days - 1; i >= 0; i--) {
    const key = dateKey(now - i * 24 * 60 * 60 * 1000);
    // A DST shift can map two offsets onto the same local day; the bucket is
    // created once and the axis keeps one bar per day.
    if (buckets.has(key)) continue;
    buckets.set(key, emptyCounts());
    order.push(key);
  }

  for (const row of rows) {
    const bucket = buckets.get(dateKey(row.timestamp));
    if (!bucket) continue;
    bucket[row.name] += 1;
    bucket.total += 1;
  }

  return order.map((date) => ({ date, ...buckets.get(date)! }));
}

/** Rows fetched with `data contains "ref"` — enough to attribute traffic. */
export interface RefRow {
  data: string | null;
  type: string;
  sessionId: string;
  timestamp?: bigint | number;
}

/**
 * Referral attribution per code.
 *
 * Conversions are attributed in two ways, deliberately: a conversion row can
 * carry the code itself (lib/analytics stamps it on every event), and when it
 * does not, the code is taken from the session — a visitor who arrived with a
 * ref and converted later in the same visit must still be credited to whoever
 * sent them. Both paths land on the same code, so nothing is double-counted.
 */
export function tallyReferrals(refRows: RefRow[], conversions: ParsedConversion[]): ReferralStat[] {
  const byCode = new Map<string, { sessions: Set<string>; pageviews: number; lastSeen: number }>();
  const sessionToCode = new Map<string, string>();

  for (const row of refRows) {
    let parsed: Record<string, unknown>;
    try {
      parsed = row.data ? (JSON.parse(row.data) as Record<string, unknown>) : {};
    } catch {
      continue;
    }
    const code = typeof parsed.ref === 'string' ? parsed.ref : '';
    if (!code) continue;

    let entry = byCode.get(code);
    if (!entry) {
      entry = { sessions: new Set(), pageviews: 0, lastSeen: 0 };
      byCode.set(code, entry);
    }
    entry.sessions.add(row.sessionId);
    if (!sessionToCode.has(row.sessionId)) sessionToCode.set(row.sessionId, code);
    if (row.type === 'pageview') entry.pageviews += 1;
    const ts = row.timestamp === undefined ? 0 : Number(row.timestamp);
    if (ts > entry.lastSeen) entry.lastSeen = ts;
  }

  const conversionsByCode = new Map<string, ConversionCounts>();
  for (const conversion of conversions) {
    const code = conversion.ref ?? sessionToCode.get(conversion.sessionId);
    if (!code || !byCode.has(code)) continue;
    let counts = conversionsByCode.get(code);
    if (!counts) {
      counts = emptyCounts();
      conversionsByCode.set(code, counts);
    }
    counts[conversion.name] += 1;
    counts.total += 1;
  }

  return [...byCode.entries()]
    .map(([code, entry]) => ({
      code,
      sessions: entry.sessions.size,
      pageviews: entry.pageviews,
      conversions: conversionsByCode.get(code) ?? emptyCounts(),
      lastSeen: entry.lastSeen,
    }))
    .sort((a, b) => b.conversions.total - a.conversions.total || b.sessions - a.sessions || a.code.localeCompare(b.code));
}

/** Conversions per 100 sessions, one decimal — 0 when there is no traffic yet
 *  (and never NaN, which would print as "NaN%" all over the panel). */
export function conversionRate(conversions: number, sessions: number): number {
  if (!sessions || sessions <= 0) return 0;
  return Math.round((conversions / sessions) * 1000) / 10;
}

/**
 * Percentage change against the previous period, or `null` when there is no
 * baseline. `null` is not a failure: showing "—" for a first week is honest,
 * while showing "+100%" against zero invents a trend out of nothing.
 */
export function deltaPct(current: number, previous: number): number | null {
  if (!previous || previous <= 0) return null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

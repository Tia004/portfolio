// ── Conversion data loader ────────────────────────────────────────────────
// One place that reads the funnel out of the database, shared by the dashboard
// API and the cron that pushes alerts to Telegram.
//
// They used to look at the same tables through two copies of the same queries,
// which is the kind of duplication that stays correct right up until somebody
// fixes a filter in one of them. The admin-path filter in particular MUST apply
// to both: without it the owner's own browsing counts as leads, and a cron would
// happily alert about the owner clicking through their own site.

import { prisma } from './prisma';
import {
  parseConversion,
  tallyByName,
  tallyBySource,
  tallyReferrals,
  type ConversionCounts,
  type ConversionRow,
  type ParsedConversion,
  type RefRow,
  type SourceBreakdown,
  type ReferralStat,
} from './conversion-metrics';

export const DAY_MS = 24 * 60 * 60 * 1000;

/** The owner's own pages are not leads. */
const nonAdminFilter = {
  AND: [
    { NOT: { url: { contains: '/loginmaster' } } },
    { NOT: { url: { contains: '/api/' } } },
    { NOT: { url: { contains: '/master/' } } },
  ],
};

export interface ConversionWindows {
  days: number;
  /** Conversions in the current window. */
  current: ParsedConversion[];
  /** Conversions in the equally long window immediately before it. */
  previous: ParsedConversion[];
  totals: ConversionCounts;
  previousTotals: ConversionCounts;
  sessions: number;
  previousSessions: number;
  /** Feed for the `?ref=` attribution table. */
  refRows: RefRow[];
  sources: SourceBreakdown[];
  referrals: ReferralStat[];
  now: number;
}

/**
 * Everything both readers need, in one round trip.
 *
 * `take: 5000` per window is a deliberate ceiling: the report is an overview,
 * and an unbounded query on a table that grows forever is a slow-motion outage.
 */
export async function loadConversionWindows(days: number): Promise<ConversionWindows> {
  const now = Date.now();
  const cutoff = BigInt(now - days * DAY_MS);
  const previousCutoff = BigInt(now - 2 * days * DAY_MS);

  const [rows, previousRows, refRows, sessionGroups, previousSessionGroups] = await Promise.all([
    prisma.analyticsEvent.findMany({
      where: { ...nonAdminFilter, type: 'conversion', timestamp: { gte: cutoff } },
      select: { data: true, url: true, sessionId: true, timestamp: true },
      orderBy: { timestamp: 'desc' },
      take: 5000,
    }),
    prisma.analyticsEvent.findMany({
      where: { ...nonAdminFilter, type: 'conversion', timestamp: { gte: previousCutoff, lt: cutoff } },
      select: { data: true, url: true, sessionId: true, timestamp: true },
      take: 5000,
    }),
    // Every event that carries a referral code, whatever its type: visits come
    // from pageviews, conversions come from the same code.
    prisma.analyticsEvent.findMany({
      where: { ...nonAdminFilter, timestamp: { gte: cutoff }, data: { contains: '"ref"' } },
      select: { data: true, type: true, sessionId: true, timestamp: true },
      take: 20000,
    }),
    // Unique sessions in the window — the denominator of the conversion rate.
    prisma.analyticsEvent.groupBy({
      by: ['sessionId'],
      where: { ...nonAdminFilter, timestamp: { gte: cutoff } },
      _count: true,
    }),
    // ...and the same for the previous window: a rate can only be compared
    // against another rate, so the baseline needs its own denominator.
    prisma.analyticsEvent.groupBy({
      by: ['sessionId'],
      where: { ...nonAdminFilter, timestamp: { gte: previousCutoff, lt: cutoff } },
      _count: true,
    }),
  ]);

  const current = (rows as ConversionRow[])
    .map(parseConversion)
    .filter((c): c is ParsedConversion => c !== null);
  const previous = (previousRows as ConversionRow[])
    .map(parseConversion)
    .filter((c): c is ParsedConversion => c !== null);

  return {
    days,
    current,
    previous,
    totals: tallyByName(current),
    previousTotals: tallyByName(previous),
    sessions: sessionGroups.length,
    previousSessions: previousSessionGroups.length,
    refRows: refRows as RefRow[],
    sources: tallyBySource(current),
    referrals: tallyReferrals(refRows as RefRow[], current),
    now,
  };
}

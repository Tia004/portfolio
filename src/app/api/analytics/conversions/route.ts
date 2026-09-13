import { NextRequest, NextResponse } from 'next/server';
import { decrypt } from '@/lib/session';
import { buildAlerts } from '@/lib/conversion-alerts';
import { loadConversionWindows, DAY_MS } from '@/lib/conversion-windows';
import { CONVERSION_NAMES, dailySeries, dateKey } from '@/lib/conversion-metrics';

// ── Conversion report ─────────────────────────────────────────────────────
// Reads back the funnel events the public site has been logging all along
// (preventivo_inviato / call_prenotata / chat_primo_messaggio), grouped by
// period, by source and by referral code, next to the same numbers for the
// previous period so the trend is a comparison and not a single figure.
//
// Auth: identical to /api/analytics/stats — an authenticated master session is
// required, and the same admin-path filter is applied so the owner's own
// browsing never counts as a lead.
//
// The queries themselves live in lib/conversion-windows, shared with the cron
// that pushes alerts to Telegram.

export async function GET(req: NextRequest) {
  const token = req.cookies.get('master_session')?.value;
  const session = token ? await decrypt(token) : null;
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rawDays = req.nextUrl.searchParams.get('days');
  const days = [1, 7, 30, 90].includes(Number(rawDays)) ? Number(rawDays) : 7;
  // Alerts are about what happened since the owner last looked. 0 means "never
  // looked", which reports only what is inside the window being queried — not
  // everything since the beginning of time.
  const rawSince = req.nextUrl.searchParams.get('since');
  const since = Number(rawSince) > 0 ? Number(rawSince) : 0;

  try {
    const data = await loadConversionWindows(days);

    return NextResponse.json({
      days,
      range: { from: new Date(data.now - days * DAY_MS).toISOString(), to: new Date(data.now).toISOString() },
      sessions: data.sessions,
      totals: data.totals,
      previous: data.previousTotals,
      daily: dailySeries(data.current, days, data.now),
      sources: data.sources,
      referrals: data.referrals,
      recent: data.current.slice(0, 25).map((c) => ({
        name: c.name,
        source: c.source,
        url: c.url,
        ref: c.ref,
        detail: c.detail,
        timestamp: c.timestamp,
      })),
      // The funnel's own vocabulary, sent along so the view never hardcodes a
      // list that could drift from lib/analytics.
      names: CONVERSION_NAMES,
      // Alerts are computed here rather than in the browser: the same engine
      // also feeds the Telegram cron, and two implementations of "is this a
      // drop?" would eventually disagree about exactly the cases that matter.
      alerts: buildAlerts({
        current: data.totals,
        previous: data.previousTotals,
        sessions: data.sessions,
        previousSessions: data.previousSessions,
        recent: data.current,
        since,
        days,
        window: dateKey(data.now),
      }),
    });
  } catch (error) {
    console.error('[analytics] conversions report failed:', error);
    return NextResponse.json({ error: 'Report unavailable' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';
import { loadConversionWindows } from '@/lib/conversion-windows';
import { dateKey } from '@/lib/conversion-metrics';
import { buildWeeklyDigest } from '@/lib/weekly-digest';

// ── Weekly digest push ────────────────────────────────────────────────────
// Every Monday: how the week went. Funnel numbers, the sources behind them and
// the referral codes that turned into leads, in one Telegram message.
//
// It reads the SAME loader as the dashboard and the alerts cron
// (lib/conversion-windows), so the owner's own browsing is filtered out here
// exactly as it is everywhere else, and the digest can never report a number the
// dashboard disagrees with.
//
// Sending is idempotent per week: the run is recorded in SystemLog and a second
// call for the same week stays quiet, because Vercel retries a failed cron
// invocation. `?force=1` re-sends on purpose (useful right after a deploy),
// and `?dry=1` returns the message WITHOUT sending it — the only way to check
// the wording against real data without pinging anyone's phone.

// One week. The loader fetches this window AND the equally long window before
// it, which is exactly the baseline the "settimana prima" line needs.
const DIGEST_DAYS = 7;
const PUSH_SOURCE = 'weekly-digest';

/** Returns true when Telegram accepted the message. */
async function sendToTelegram(text: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return false;
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
      signal: AbortSignal.timeout(10_000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** The week a digest belongs to — the date of its last day. Two cron retries on
 *  the same Monday share it, so the second one is a no-op. */
async function alreadySentThisWeek(weekKey: string): Promise<boolean> {
  try {
    const last = await prisma.systemLog.findFirst({
      where: { level: 'info', source: PUSH_SOURCE, message: 'pushed' },
      orderBy: { timestamp: 'desc' },
      select: { metadata: true },
    });
    if (!last?.metadata) return false;
    const parsed = JSON.parse(last.metadata) as { week?: string };
    return parsed.week === weekKey;
  } catch {
    // An unreadable log means "not sent": missing one week is worse than
    // sending it twice.
    return false;
  }
}

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get('authorization');
  const xCronSecret = req.headers.get('x-cron-secret');
  const querySecret = req.nextUrl.searchParams.get('secret') || req.nextUrl.searchParams.get('key');
  const isSecretAuthorized =
    Boolean(cronSecret) &&
    (authHeader === `Bearer ${cronSecret}` || xCronSecret === cronSecret || querySecret === cronSecret);
  const session = await getSession();
  const isMasterSession = Boolean(session && session.username === 'master');
  const isDev = process.env.NODE_ENV !== 'production';

  if (!isSecretAuthorized && !isMasterSession && !isDev) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const dry = searchParams.get('dry') === '1';
  const force = searchParams.get('force') === '1';

  try {
    const data = await loadConversionWindows(DIGEST_DAYS);
    const digest = buildWeeklyDigest({
      days: DIGEST_DAYS,
      now: data.now,
      totals: data.totals,
      previousTotals: data.previousTotals,
      sessions: data.sessions,
      previousSessions: data.previousSessions,
      sources: data.sources,
      referrals: data.referrals,
    });

    const weekKey = dateKey(data.now);

    if (dry) {
      return NextResponse.json({ ok: true, sent: false, dry: true, week: weekKey, headline: digest.headline, text: digest.text });
    }

    if (!force && await alreadySentThisWeek(weekKey)) {
      return NextResponse.json({ ok: true, sent: false, reason: 'già inviato questa settimana', week: weekKey, headline: digest.headline });
    }

    const sent = await sendToTelegram(digest.text);

    // Recorded only when Telegram accepted it, so a failed send is retried
    // instead of being marked delivered — same rule as the alerts push.
    if (sent) {
      await prisma.systemLog.create({
        data: {
          level: 'info',
          source: PUSH_SOURCE,
          message: 'pushed',
          metadata: JSON.stringify({
            week: weekKey,
            at: data.now,
            conversions: data.totals.total,
            sessions: data.sessions,
            leadCodes: digest.leadCodes.map((code) => code.code),
            length: digest.text.length,
          }),
        },
      });
    } else {
      console.error('[weekly-digest] invio Telegram non riuscito');
    }

    return NextResponse.json({
      ok: true,
      sent,
      week: weekKey,
      headline: digest.headline,
      leadCodes: digest.leadCodes.map((code) => code.code),
      coldCodes: digest.coldCodes.map((code) => code.code),
    });
  } catch (error) {
    console.error('[weekly-digest] cron failed:', error);
    return NextResponse.json({ error: 'Weekly digest cron failed' }, { status: 500 });
  }
}

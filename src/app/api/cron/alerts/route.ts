import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';
import { loadConversionWindows } from '@/lib/conversion-windows';
import { buildAlerts, type ConversionAlert } from '@/lib/conversion-alerts';
import { dateKey } from '@/lib/conversion-metrics';
import { formatAlertsForTelegram } from '@/lib/alert-messages';

// ── Alerts push ───────────────────────────────────────────────────────────
// The dashboard bell only works if the dashboard is open, which is the opposite
// of what an alert is for: a funnel that broke on Tuesday is noticed on Friday,
// and the whole point of warning somebody is that they were doing something
// else. This route runs on a schedule and pushes the same alerts to Telegram.
//
// It reads the SAME engine (lib/conversion-alerts) and the SAME wording
// (lib/alert-messages) as the bell, so the phone and the panel can never
// disagree about what happened.
//
// Deliberately separate from /api/cron/newsletter: a newsletter that fails must
// not take the alerts down with it, and vice versa.

/** Where the previous push is remembered. `SystemLog` already exists and is
 *  indexed on (level, timestamp), so no migration on a live database is needed
 *  to store one timestamp. */
const PUSH_SOURCE = 'alerts';

interface PushState {
  at: number;
  ids: string[];
}

async function readLastPush(): Promise<PushState> {
  try {
    // `level` is part of the (level, timestamp) composite index, so filtering on
    // it lets the database walk the index backwards instead of scanning a log
    // table that only ever grows.
    const last = await prisma.systemLog.findFirst({
      where: { level: 'info', source: PUSH_SOURCE, message: 'pushed' },
      orderBy: { timestamp: 'desc' },
    });
    if (!last) return { at: 0, ids: [] };
    const parsed = last.metadata ? (JSON.parse(last.metadata) as Partial<PushState>) : {};
    return {
      at: typeof parsed.at === 'number' ? parsed.at : last.timestamp.getTime(),
      ids: Array.isArray(parsed.ids) ? parsed.ids.filter((id): id is string => typeof id === 'string') : [],
    };
  } catch {
    // A missing log is not an error: it means "never pushed", and reporting the
    // current window once is the correct behaviour for a first run.
    return { at: 0, ids: [] };
  }
}

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

export async function GET(req: NextRequest) {
  // Same gate as the newsletter cron: a shared secret for the scheduler, or an
  // authenticated master session when triggered by hand.
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get('authorization');
  const xCronSecret = req.headers.get('x-cron-secret');
  const isSecretAuthorized =
    Boolean(cronSecret) && (authHeader === `Bearer ${cronSecret}` || xCronSecret === cronSecret);
  const session = await getSession();
  const isMasterSession = Boolean(session && session.username === 'master');
  const isDev = process.env.NODE_ENV !== 'production';

  if (!isSecretAuthorized && !isMasterSession && !isDev) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
  }

  try {
    const state = await readLastPush();
    const data = await loadConversionWindows(7);

    const alerts = buildAlerts({
      current: data.totals,
      previous: data.previousTotals,
      sessions: data.sessions,
      previousSessions: data.previousSessions,
      recent: data.current,
      // Leads are "new" relative to the previous push, not relative to a browser.
      since: state.at,
      days: 7,
      window: dateKey(data.now),
    });

    // Window alerts keep the same id all day, so the log is what stops the same
    // "funnel fermo" being pushed every fifteen minutes.
    const pushed = new Set(state.ids);
    const fresh: ConversionAlert[] = alerts.filter((alert) => !pushed.has(alert.id));

    if (fresh.length === 0) {
      return NextResponse.json({ ok: true, sent: false, alerts: alerts.length, reason: 'nothing new' });
    }

    const sent = await sendToTelegram(formatAlertsForTelegram(fresh));

    // Only recorded when it actually went out: a failed send must be retried on
    // the next run, not silently marked as delivered.
    if (sent) {
      await prisma.systemLog.create({
        data: {
          level: 'info',
          source: PUSH_SOURCE,
          message: 'pushed',
          metadata: JSON.stringify({ at: data.now, ids: [...pushed, ...fresh.map((a) => a.id)].slice(-200) }),
        },
      });
    } else {
      console.error('[alerts] invio Telegram non riuscito');
    }

    return NextResponse.json({
      ok: true,
      sent,
      pushed: fresh.map((alert) => alert.id),
    });
  } catch (error) {
    console.error('[alerts] cron failed:', error);
    return NextResponse.json({ error: 'Alerts cron failed' }, { status: 500 });
  }
}

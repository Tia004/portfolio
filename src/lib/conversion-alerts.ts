// ── Conversion alerts ─────────────────────────────────────────────────────
// The Conversions panel answers "how is the funnel doing?" — but only when
// somebody opens it. A funnel that collapses on a Tuesday and is noticed on a
// Friday has cost three days of leads, so the numbers need to speak up on their
// own.
//
// Two things are worth interrupting a person for:
//
//   1. a lead ARRIVED — a quote request or a booked call is somebody who wants
//      to talk now, and answering on the day is worth more than answering in
//      three days;
//   2. the funnel BROKE — the conversion RATE fell off versus the previous
//      period. Rate, not count: fewer conversions because fewer visitors is the
//      weather, fewer conversions out of the same traffic is a fault in the
//      site.
//
// Everything here is pure: no Prisma, no React, no clock. The dashboard and the
// cron that pushes to Telegram both call this, so a warning that reaches the
// bell and one that reaches the phone can never disagree — the same lesson as
// the two review tables, applied before the mistake instead of after.

import {
  conversionRate,
  deltaPct,
  type ConversionCounts,
  type ConversionName,
  type ParsedConversion,
} from './conversion-metrics';

/**
 * The steps that mean somebody wants to talk: a quote request or a booked call.
 * A first chat message is a signal worth counting, but interrupting the owner
 * for every chat line would train them to ignore the bell — which is the one
 * outcome an alert system cannot survive.
 */
export const IMPORTANT_CONVERSIONS: ConversionName[] = ['preventivo_inviato', 'call_prenotata'];

/**
 * Thresholds, deliberately conservative.
 *
 * The rate alert needs a real denominator: with 12 sessions, "the rate halved"
 * means one conversion instead of two, which is noise and not a fault. An alert
 * that cries wolf gets muted, so it only fires when the sample can carry it.
 */
export const MIN_SESSIONS_FOR_RATE_ALERT = 30;
export const RATE_DROP_PCT = 30;
export const CRITICAL_RATE_DROP_PCT = 60;
export const VOLUME_DROP_PCT = 50;
export const MIN_PREVIOUS_CONVERSIONS_FOR_VOLUME_ALERT = 3;

/** A lead flood (a compromised form, a bot) must not produce 400 alerts. */
export const MAX_LEAD_ALERTS = 20;

export type AlertKind = 'new_lead' | 'rate_drop' | 'volume_drop' | 'silent_funnel';
export type AlertSeverity = 'info' | 'warning' | 'critical';

export interface ConversionAlert {
  /** Stable across recomputations, so the same fact never notifies twice. */
  id: string;
  kind: AlertKind;
  severity: AlertSeverity;
  /** When the alert is about: the conversion itself, or the window it describes. */
  at: number;
  /**
   * The numbers, not a sentence. The dashboard is Italian today, but a message
   * composed here could never be reused or translated — and it would freeze the
   * wording in a logic module.
   */
  data: {
    name?: ConversionName;
    source?: string;
    ref?: string | null;
    count?: number;
    previousCount?: number;
    rate?: number;
    previousRate?: number;
    /** Percentage change vs the previous period; null when there is no baseline. */
    changePct?: number | null;
    sessions?: number;
    previousSessions?: number;
    days?: number;
  };
}

export interface AlertInput {
  /** Conversions in the current window. */
  current: ConversionCounts;
  /** Conversions in the equally long window immediately before it. */
  previous: ConversionCounts;
  sessions: number;
  previousSessions: number;
  /** Recent conversions, newest first — the raw material for "a lead arrived". */
  recent: ParsedConversion[];
  /**
   * Epoch ms the owner last acknowledged. `0` means "never", which must NOT
   * mean "alert me about everything since the beginning of time": the recent
   * list is a window, so an empty `since` naturally reports only what is in it.
   */
  since: number;
  days: number;
  /** Local date key of the window (YYYY-MM-DD) — makes window alerts steady. */
  window: string;
}

const SEVERITY_ORDER: Record<AlertSeverity, number> = { critical: 0, warning: 1, info: 2 };

/**
 * Everything worth telling the owner right now, most urgent first.
 *
 * Rule order matters: a funnel with zero conversions also has a 100% rate drop
 * and a total volume drop, and reporting all three would be three ways of
 * saying one thing. The most specific explanation wins and the others stay
 * silent.
 */
export function buildAlerts(input: AlertInput): ConversionAlert[] {
  const {
    current,
    previous,
    sessions,
    previousSessions,
    recent,
    since,
    days,
    window,
  } = input;

  const alerts: ConversionAlert[] = [];

  // ── 1. Leads that arrived since the last look ──────────────────────────
  const newLeads = recent
    .filter((row) => IMPORTANT_CONVERSIONS.includes(row.name) && row.timestamp > since)
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, MAX_LEAD_ALERTS);

  for (const lead of newLeads) {
    alerts.push({
      id: `lead:${lead.name}:${lead.timestamp}`,
      kind: 'new_lead',
      severity: 'info',
      at: lead.timestamp,
      data: { name: lead.name, source: lead.source, ref: lead.ref },
    });
  }

  // ── 2. The funnel produced nothing at all, with traffic ────────────────
  const hasTraffic = sessions >= MIN_SESSIONS_FOR_RATE_ALERT;
  const silent = hasTraffic && current.total === 0;

  if (silent) {
    alerts.push({
      id: `silent:${window}`,
      kind: 'silent_funnel',
      severity: 'critical',
      at: Date.now(),
      data: {
        count: 0,
        previousCount: previous.total,
        sessions,
        previousSessions,
        days,
        changePct: deltaPct(current.total, previous.total),
      },
    });
  }

  const rate = conversionRate(current.total, sessions);
  const previousRate = conversionRate(previous.total, previousSessions);
  const rateChange = deltaPct(rate, previousRate);

  // ── 3. The rate fell off, on comparable traffic ────────────────────────
  // Skipped when the funnel is silent: that is the same fact, already reported
  // in its most useful form.
  if (!silent && hasTraffic && previousRate > 0 && rateChange !== null && rateChange <= -RATE_DROP_PCT) {
    alerts.push({
      id: `rate:${window}`,
      kind: 'rate_drop',
      severity: rateChange <= -CRITICAL_RATE_DROP_PCT ? 'critical' : 'warning',
      at: Date.now(),
      data: {
        rate,
        previousRate,
        changePct: rateChange,
        count: current.total,
        previousCount: previous.total,
        sessions,
        previousSessions,
        days,
      },
    });
  }

  // ── 4. Fewer conversions overall ───────────────────────────────────────
  // Also skipped when silent, and only reported with a baseline of at least a
  // few conversions: "3 became 1" is a quiet week, not a fault.
  const volumeChange = deltaPct(current.total, previous.total);
  if (
    !silent &&
    previous.total >= MIN_PREVIOUS_CONVERSIONS_FOR_VOLUME_ALERT &&
    volumeChange !== null &&
    volumeChange <= -VOLUME_DROP_PCT
  ) {
    alerts.push({
      id: `volume:${window}`,
      kind: 'volume_drop',
      severity: 'warning',
      at: Date.now(),
      data: {
        count: current.total,
        previousCount: previous.total,
        changePct: volumeChange,
        sessions,
        previousSessions,
        days,
      },
    });
  }

  return alerts.sort(
    (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] || b.at - a.at,
  );
}

/** Alerts the owner has not acknowledged yet — the number on the bell. */
export function unreadAlerts(alerts: ConversionAlert[], acknowledgedIds: string[]): ConversionAlert[] {
  const seen = new Set(acknowledgedIds);
  return alerts.filter((alert) => !seen.has(alert.id));
}

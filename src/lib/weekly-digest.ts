// ── Weekly digest ─────────────────────────────────────────────────────────
// The numbers of the funnel, the sources that produced them and the referral
// codes that actually turned into leads — composed into ONE Telegram message,
// once a week.
//
// Why a separate message and not another alert: the bell and the push alerts
// answer "is something broken RIGHT NOW", and they are deliberately noisy-free
// because an alert that cries wolf gets muted. Nobody's week is broken, so a
// digest is the opposite job — a standing appointment that says how the week
// went, whether or not anything deserved an alert. It also closes the loop on
// the 20% word-of-mouth promise: without it, the referral codes are a promise
// nobody ever checks.
//
// Pure on purpose (no Prisma, no React, no fetch): the route loads the numbers,
// this module turns them into words, and `scripts/verify-weekly-digest.mjs`
// exercises it with fixtures.

import {
  conversionRate,
  type ConversionCounts,
  type ReferralStat,
  type SourceBreakdown,
} from './conversion-metrics';
import { STEP_META, SOURCE_LABELS } from './conversion-labels';

/** Telegram rejects messages over 4096 characters; staying under it means one
 *  message instead of a truncated one. */
const MAX_MESSAGE_CHARS = 3_800;
/** How many rows a list shows before it summarises the rest. */
const MAX_ROWS = 5;

export interface WeeklyDigestInput {
  days: number;
  /** End of the window, epoch ms. */
  now: number;
  totals: ConversionCounts;
  previousTotals: ConversionCounts;
  sessions: number;
  previousSessions: number;
  sources: SourceBreakdown[];
  referrals: ReferralStat[];
}

export interface WeeklyDigest {
  /** The message, ready to send. Never empty. */
  text: string;
  /** Codes that produced at least one lead, best first. */
  leadCodes: ReferralStat[];
  /** Codes that brought traffic but no lead — the ones worth a nudge. */
  coldCodes: ReferralStat[];
  /** One-line summary, so a caller can log/report without parsing the body. */
  headline: string;
}

const n = (value: number) => value.toLocaleString('it-IT');

function plural(count: number, one: string, many: string): string {
  return count === 1 ? one : many;
}

/** '+3' / '-1' / '=' / 'prima settimana' — the comparison belongs next to the
 *  number it refers to, not in a separate column that needs explaining. */
function deltaLabel(current: number, previous: number): string {
  if (previous <= 0) return current > 0 ? 'prima settimana' : '';
  const diff = current - previous;
  if (diff === 0) return '=';
  return diff > 0 ? `+${diff}` : `${diff}`;
}

function withDelta(current: number, previous: number): string {
  const delta = deltaLabel(current, previous);
  return delta ? ` (${delta})` : '';
}

function dayMonth(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
}

/** '6–13 set' — the window the numbers cover, so the message is unambiguous
 *  about WHAT it is reporting. */
export function windowRange(now: number, days: number): string {
  return `${dayMonth(now - days * 24 * 60 * 60 * 1000)}–${dayMonth(now)}`;
}

/** Converts the funnel counts into rows, in the order the funnel happens. */
function funnelRows(input: WeeklyDigestInput): string[] {
  const steps: { key: keyof typeof STEP_META; label: string }[] = [
    { key: 'preventivo_inviato', label: STEP_META.preventivo_inviato.label },
    { key: 'call_prenotata', label: STEP_META.call_prenotata.label },
    { key: 'chat_primo_messaggio', label: STEP_META.chat_primo_messaggio.label },
  ];
  return steps.map(
    (step) => `• ${step.label}: ${n(input.totals[step.key])}${withDelta(input.totals[step.key], input.previousTotals[step.key])}`,
  );
}

function sourceLabel(source: string): string {
  return SOURCE_LABELS[source] ?? source;
}

function sourcesSection(sources: SourceBreakdown[]): string[] {
  if (sources.length === 0) {
    return ['Da dove sono arrivati:', '  nessuna conversione, quindi nessuna sorgente da confrontare.'];
  }
  const rows = sources
    .slice(0, MAX_ROWS)
    .map((row, index) => `  ${index + 1}. ${sourceLabel(row.source)} — ${n(row.total)}`);
  const hidden = sources.length - MAX_ROWS;
  if (hidden > 0) rows.push(`  …e altre ${hidden} ${plural(hidden, 'sorgente', 'sorgenti')}`);
  return ['Da dove sono arrivati:', ...rows];
}

function referralSection(referrals: ReferralStat[], leadCodes: ReferralStat[], coldCodes: ReferralStat[]): string[] {
  if (referrals.length === 0) {
    return [
      'Passaparola (?ref=):',
      '  nessun codice usato questa settimana — la promo del 20% non sta girando.',
    ];
  }

  const lines: string[] = ['Passaparola (?ref=):'];
  if (leadCodes.length === 0) {
    lines.push('  nessun codice ha ancora portato un lead.');
  } else {
    for (const code of leadCodes.slice(0, MAX_ROWS)) {
      const rate = conversionRate(code.conversions.total, code.sessions);
      lines.push(
        `  ✅ ${code.code} — ${n(code.conversions.total)} ${plural(code.conversions.total, 'lead', 'lead')} da ${n(code.sessions)} ${plural(code.sessions, 'sessione', 'sessioni')} (${n(rate)}%)`,
      );
    }
  }

  if (coldCodes.length > 0) {
    const shown = coldCodes.slice(0, MAX_ROWS);
    for (const code of shown) {
      lines.push(
        `  ⚠️ ${code.code} — ${n(code.sessions)} ${plural(code.sessions, 'sessione', 'sessioni')}, ancora nessun lead`,
      );
    }
    const hiddenCold = coldCodes.length - shown.length;
    if (hiddenCold > 0) lines.push(`  …e altri ${hiddenCold} codici senza lead`);
  }

  return lines;
}

function buildText(input: WeeklyDigestInput, leadCodes: ReferralStat[], coldCodes: ReferralStat[]): string {
  const { totals, previousTotals } = input;
  const rate = conversionRate(totals.total, input.sessions);
  const previousRate = conversionRate(previousTotals.total, input.previousSessions);

  const lines: string[] = [
    `📊 Tia Designs — settimana ${windowRange(input.now, input.days)}`,
    '',
    // Sessions carry their own delta: "more traffic, fewer leads" and "less
    // traffic, same rate" are opposite problems that a single number hides.
    `${n(totals.total)} ${plural(totals.total, 'conversione', 'conversioni')} su ${n(input.sessions)} ${plural(input.sessions, 'sessione', 'sessioni')}${withDelta(input.sessions, input.previousSessions)}`,
    // The rate is compared against the previous RATE, and the previous absolute
    // numbers sit next to it: a percentage alone hides whether the funnel moved
    // or the traffic did.
    `${n(rate)}% di conversione${input.previousSessions > 0
      ? ` (settimana prima: ${n(previousRate)}% — ${n(previousTotals.total)} conversioni su ${n(input.previousSessions)} sessioni)`
      : ''}`,
  ];

  lines.push('', 'Funnel:');
  lines.push(...funnelRows(input));
  lines.push('', ...sourcesSection(input.sources));
  lines.push('', ...referralSection(input.referrals, leadCodes, coldCodes));

  if (totals.total === 0) {
    lines.push('', 'Nessun lead questa settimana: guarda le sessioni qui sopra e la sorgente di traffico.');
  }

  lines.push('', 'Dettaglio: dashboard → Conversioni.');

  // A hard cap: one message, never a truncated second one.
  return lines.join('\n').slice(0, MAX_MESSAGE_CHARS);
}

/**
 * Composes the weekly message.
 *
 * The split between `leadCodes` and `coldCodes` is the actionable part: a code
 * that brought sessions and no lead is a person who shared the site and whose
 * audience did not bite, which is worth a message; a code with neither does not
 * exist yet.
 */
export function buildWeeklyDigest(input: WeeklyDigestInput): WeeklyDigest {
  const leadCodes = input.referrals.filter((ref) => ref.conversions.total > 0);
  const coldCodes = input.referrals.filter((ref) => ref.conversions.total === 0);

  const text = buildText(input, leadCodes, coldCodes);
  const rate = conversionRate(input.totals.total, input.sessions);
  const headline = `${n(input.totals.total)} ${plural(input.totals.total, 'conversione', 'conversioni')} · ${n(rate)}% · ${leadCodes.length} ${plural(leadCodes.length, 'codice con lead', 'codici con lead')}`;

  return { text, leadCodes, coldCodes, headline };
}

// ── Alert wording ─────────────────────────────────────────────────────────
// The words for an alert, in one place, because the same alert is read in two
// very different places: the bell in the dashboard and a Telegram message on a
// phone. Those two must say the same thing — a push that says "funnel fermo"
// while the panel shows a rate drop would make both untrustworthy, and keeping
// the wording here is the only way to guarantee they cannot drift.
//
// No 'use client': the Telegram cron is a server route and imports this too.

import { STEP_META, SOURCE_LABELS } from './conversion-labels';
import type { ConversionAlert } from './conversion-alerts';

const SEVERITY_LABEL: Record<ConversionAlert['severity'], string> = {
  critical: 'urgente',
  warning: 'attenzione',
  info: 'nuovo',
};

const SEVERITY_ICON: Record<ConversionAlert['severity'], string> = {
  critical: '🔴',
  warning: '🟡',
  info: '🔵',
};

/** The funnel step names are nouns ("Preventivi inviati"); an alert needs a
 *  sentence, so leads get their own phrasing. */
const LEAD_TITLES: Record<string, string> = {
  preventivo_inviato: 'Nuovo preventivo richiesto',
  call_prenotata: 'Nuova call prenotata',
};

export function severityLabel(alert: ConversionAlert): string {
  return SEVERITY_LABEL[alert.severity];
}

export function alertTitle(alert: ConversionAlert): string {
  switch (alert.kind) {
    case 'new_lead':
      return LEAD_TITLES[alert.data.name ?? ''] ?? 'Nuovo lead';
    case 'rate_drop':
      return 'Tasso di conversione in calo';
    case 'volume_drop':
      return 'Meno conversioni del periodo precedente';
    case 'silent_funnel':
      return 'Funnel fermo';
    default:
      return 'Avviso';
  }
}

export function alertBody(alert: ConversionAlert): string {
  const d = alert.data;
  switch (alert.kind) {
    case 'new_lead': {
      const step = d.name && d.name in STEP_META ? STEP_META[d.name].label : d.name;
      const source = d.source ? (SOURCE_LABELS[d.source] ?? d.source) : null;
      return [step, source, d.ref ? `ref ${d.ref}` : null].filter(Boolean).join(' · ');
    }
    case 'rate_drop':
      return `${d.rate}% di conversione contro ${d.previousRate}% prima (${d.changePct}%) su ${d.sessions} sessioni.`;
    case 'volume_drop':
      return `${d.count} conversioni contro ${d.previousCount} negli stessi ${d.days} giorni.`;
    case 'silent_funnel':
      return `${d.sessions} sessioni e nessuna conversione negli ultimi ${d.days} giorni.`;
    default:
      return '';
  }
}

/**
 * One Telegram message for a batch of alerts.
 *
 * Batched on purpose: a push per alert would mean four notifications for one bad
 * week, and a person who mutes the bot has lost the warning entirely.
 */
export function formatAlertsForTelegram(alerts: ConversionAlert[]): string {
  if (alerts.length === 0) return '';
  const header =
    alerts.length === 1 ? '🔔 Tia Designs — 1 avviso' : `🔔 Tia Designs — ${alerts.length} avvisi`;
  const lines = alerts.map(
    (alert) => `${SEVERITY_ICON[alert.severity]} ${alertTitle(alert)}\n${alertBody(alert)}`,
  );
  return [header, '', ...lines].join('\n\n');
}

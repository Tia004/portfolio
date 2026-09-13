// ── Funnel labels and source names ────────────────────────────────────────
// Presentation strings for the three funnel steps, in one place.
//
// This used to live inside ConversionsView (a 'use client' component). It moved
// here because the alerts now have TWO readers that must word things identically
// — the dashboard bell in the browser and the Telegram push from a server cron —
// and a server route cannot sensibly import a client component. Two copies of a
// label list is exactly how the site ended up with two disconnected review
// tables; this is the same mistake, prevented before it happens.
//
// No 'use client' here on purpose: it is imported from both sides.

import type { ConversionName } from './conversion-metrics';

/** One visual identity per funnel step: the same colour always means the same
 *  step, in the cards, the chart legend, the tables and the alerts. */
export const STEP_META: Record<ConversionName, { label: string; short: string; color: string; hint: string }> = {
  preventivo_inviato: {
    label: 'Preventivi inviati',
    short: 'Preventivo',
    color: '#2dd4bf',
    hint: 'Form contatti o preventivo dalla chat AI',
  },
  call_prenotata: {
    label: 'Call prenotate',
    short: 'Call',
    color: '#60a5fa',
    hint: 'Prenotazione completata nel calendario del sito',
  },
  chat_primo_messaggio: {
    label: 'Chat avviate',
    short: 'Chat',
    color: '#c084fc',
    hint: 'Primo messaggio scritto nel chatbot',
  },
};

/** Human names for the traffic sources the site logs. */
export const SOURCE_LABELS: Record<string, string> = {
  ai_quote: 'Preventivo dalla chat AI',
  contact_form: 'Form contatti',
  cal_embed: 'Calendario Cal.com',
  chatbot: 'Chatbot',
  inline_form: 'Form inline',
};

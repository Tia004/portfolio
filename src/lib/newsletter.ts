import crypto from 'crypto';
import type { Lang } from '@/lib/translations';
import { SITE_URL } from '@/lib/seo';

// ── Newsletter subscribers: the rules, in one place ───────────────────────
// Pure on purpose (no database, no fetch, no React): the routes, the dashboard
// and the cron all ask THIS module what to do, and the verification script
// exercises it directly in Node. The double opt-in lives here:
//
//   signup → status "pending" + confirmation email
//          → visitor opens the link and presses the button
//          → status "confirmed" (and only then campaigns can reach them)
//          → any campaign carries an opt-out that lands on "unsubscribed"
//
// The subscriber table doubles as the SUPPRESSION list: an address that opted
// out is never emailed again, even when it also sits in the contact messages
// or in the chat leads.

export type SubscriberStatus = 'pending' | 'confirmed' | 'unsubscribed';

/** A pending signup that asks again inside this window gets no second email. */
export const CONFIRM_RESEND_WINDOW_MS = 10 * 60 * 1000;

/** Longest accepted email. Generous, but bounded. */
const MAX_EMAIL_LENGTH = 254;

/**
 * Lowercase, trimmed, and nothing else: an email address is validated as a
 * whole rather than "normalized" into something the visitor did not type.
 */
export function normalizeEmail(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  return raw.trim().toLowerCase().slice(0, MAX_EMAIL_LENGTH);
}

/** A URL-safe capability token. 32 bytes of randomness, no sequence. */
export function newToken(): string {
  return crypto.randomBytes(32).toString('base64url');
}

/**
 * One-way hash of the visitor's IP, for abuse forensics only.
 *
 * The raw address is never stored: the newsletter has no use for it, and a
 * hash that cannot be reversed (salted) is what the consent record actually
 * needs — proof that the signup came from somewhere real, not a profile of
 * who subscribed.
 */
export function hashIp(ip: string, salt = process.env.NEWSLETTER_IP_SALT || 'tia-designs-newsletter'): string {
  if (!ip) return '';
  return crypto.createHash('sha256').update(`${salt}:${ip}`).digest('hex').slice(0, 32);
}

/** Absolute URL for a newsletter page in the given language. */
export function newsletterUrl(lang: Lang, page: 'confirm' | 'unsubscribe', token?: string): string {
  const prefix = lang === 'it' ? '' : `/${lang}`;
  const path = page === 'confirm' ? '/newsletter/conferma' : '/newsletter/disiscrizione';
  return `${SITE_URL}${prefix}${path}${token ? `?token=${encodeURIComponent(token)}` : ''}`;
}

export interface SubscriberRow {
  status: string;
  lastEmailAt?: Date | string | null;
}

export type SignupDecision =
  /** No usable record (new address, or one that opted out earlier): create it. */
  | { action: 'create' }
  /** Already pending and the confirmation was never used: send it again. */
  | { action: 'resend' }
  /** Already pending and emailed moments ago: stay quiet. */
  | { action: 'throttled' }
  /** Already confirmed: nothing to do, and no email worth sending. */
  | { action: 'already_confirmed' };

/**
 * What a signup should do, given the record that already exists (if any).
 *
 * Re-subscribing after an opt-out is treated as a new signup — that is the
 * only way back in, and it goes through the confirmation email again, so the
 * consent is fresh rather than inherited from an old record.
 */
export function decideSignup(existing: SubscriberRow | null, now: number = Date.now()): SignupDecision {
  if (!existing) return { action: 'create' };
  if (existing.status === 'confirmed') return { action: 'already_confirmed' };
  if (existing.status !== 'pending') return { action: 'create' };
  const last = existing.lastEmailAt ? new Date(existing.lastEmailAt).getTime() : 0;
  if (last && now - last < CONFIRM_RESEND_WINDOW_MS) return { action: 'throttled' };
  return { action: 'resend' };
}

// ── Audience resolution ───────────────────────────────────────────────────
// Campaign recipients used to be resolved once in the dashboard API and again
// in the cron, with two different rule sets — the same drift risk as any
// duplicated query. Both now call this, so a campaign cannot reach a different
// audience depending on who pressed send.

export type AudienceTarget = 'subscribers' | 'all_contacts' | 'all_leads' | 'all_audience' | 'custom';

export interface AudienceInput {
  target: AudienceTarget;
  /** Every subscriber row — the confirmed ones are the audience, the opted-out ones the blocklist. */
  subscribers: Array<{ email: string; status: string }>;
  contactEmails: Array<string | null | undefined>;
  leadEmails: Array<string | null | undefined>;
  customEmails?: string;
}

export interface AudienceResult {
  emails: string[];
  /** How many addresses were dropped because they opted out. */
  suppressed: number;
}

function isEmail(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const email = normalizeEmail(value);
  return email.includes('@') && email.includes('.') && email.length <= MAX_EMAIL_LENGTH && !email.includes(' ');
}

export function resolveAudience(input: AudienceInput): AudienceResult {
  const confirmed = new Set<string>();
  const optedOut = new Set<string>();
  for (const subscriber of input.subscribers) {
    const email = normalizeEmail(subscriber.email);
    if (!isEmail(email)) continue;
    if (subscriber.status === 'confirmed') confirmed.add(email);
    else if (subscriber.status === 'unsubscribed') optedOut.add(email);
  }

  const picked = new Set<string>();
  const target = input.target;

  if (target === 'custom') {
    for (const raw of String(input.customEmails || '').split(/[\n,;]+/)) {
      const email = normalizeEmail(raw);
      if (isEmail(email)) picked.add(email);
    }
  }

  if (target === 'subscribers' || target === 'all_audience') {
    for (const email of confirmed) picked.add(email);
  }

  if (target === 'all_contacts' || target === 'all_audience') {
    for (const raw of input.contactEmails) {
      const email = normalizeEmail(raw);
      if (isEmail(email)) picked.add(email);
    }
  }

  if (target === 'all_leads' || target === 'all_audience') {
    for (const raw of input.leadEmails) {
      const email = normalizeEmail(raw);
      if (isEmail(email)) picked.add(email);
    }
  }

  // Opt-outs win over every target except an explicit hand-typed list: someone
  // pasting an address into "custom" is overriding the filter on purpose and
  // can see the suppression count in the dashboard.
  let suppressed = 0;
  for (const email of picked) {
    if (optedOut.has(email)) suppressed += 1;
  }
  const emails = target === 'custom'
    ? Array.from(picked)
    : Array.from(picked).filter((email) => !optedOut.has(email));

  return { emails, suppressed };
}

// ── Email copy ────────────────────────────────────────────────────────────
// Content only: the routes hand this to the branded template, which keeps the
// wording testable without a mail transport anywhere near it.

export interface EmailContent {
  subject: string;
  bodyMarkdown: string;
  ctaText: string;
  ctaUrl: string;
  badgeText: string;
  preheaderText: string;
}

const COPY: Record<Lang, {
  confirmSubject: string;
  confirmPreheader: string;
  confirmBadge: string;
  confirmCta: string;
  confirmIntro: (name?: string) => string;
  confirmHint: string;
  welcomeSubject: string;
  welcomePreheader: string;
  welcomeCta: string;
  welcomeIntro: string;
  welcomeHint: string;
}> = {
  it: {
    confirmSubject: 'Conferma la tua iscrizione alla newsletter',
    confirmPreheader: 'Un clic e sei dentro: conferma la tua iscrizione.',
    confirmBadge: 'Newsletter',
    confirmCta: 'Confermo l\u2019iscrizione',
    confirmIntro: (name) => (name ? `Ciao ${name},` : 'Ciao,'),
    confirmHint: 'Se non sei stato tu a iscriverti, ignora questa email: senza la tua conferma non riceverai nulla.',
    welcomeSubject: 'Iscrizione confermata \u2014 benvenuto nella newsletter',
    welcomePreheader: 'Sei dentro. Ti scrivo solo quando ho qualcosa che vale il tuo tempo.',
    welcomeCta: 'Guarda i miei lavori',
    welcomeIntro: 'La tua iscrizione \u00e8 confermata.',
    welcomeHint: 'Puoi disiscriverti in qualsiasi momento dal link in fondo a ogni email.',
  },
  en: {
    confirmSubject: 'Confirm your newsletter subscription',
    confirmPreheader: 'One click and you are in: confirm your subscription.',
    confirmBadge: 'Newsletter',
    confirmCta: 'Confirm my subscription',
    confirmIntro: (name) => (name ? `Hi ${name},` : 'Hi,'),
    confirmHint: 'If it was not you, just ignore this email: without your confirmation you will receive nothing.',
    welcomeSubject: 'Subscription confirmed \u2014 welcome to the newsletter',
    welcomePreheader: 'You are in. I only write when I have something worth your time.',
    welcomeCta: 'See my work',
    welcomeIntro: 'Your subscription is confirmed.',
    welcomeHint: 'You can unsubscribe at any time from the link at the bottom of every email.',
  },
  es: {
    confirmSubject: 'Confirma tu suscripci\u00f3n al bolet\u00edn',
    confirmPreheader: 'Un clic y est\u00e1s dentro: confirma tu suscripci\u00f3n.',
    confirmBadge: 'Bolet\u00edn',
    confirmCta: 'Confirmo mi suscripci\u00f3n',
    confirmIntro: (name) => (name ? `Hola ${name},` : 'Hola,'),
    confirmHint: 'Si no has sido t\u00fa, ignora este correo: sin tu confirmaci\u00f3n no recibir\u00e1s nada.',
    welcomeSubject: 'Suscripci\u00f3n confirmada \u2014 bienvenido al bolet\u00edn',
    welcomePreheader: 'Est\u00e1s dentro. Solo escribo cuando tengo algo que merece tu tiempo.',
    welcomeCta: 'Mira mis trabajos',
    welcomeIntro: 'Tu suscripci\u00f3n est\u00e1 confirmada.',
    welcomeHint: 'Puedes darte de baja en cualquier momento desde el enlace al final de cada correo.',
  },
};

export function confirmationEmailContent(lang: Lang, confirmUrl: string, name?: string): EmailContent {
  const copy = COPY[lang] ?? COPY.it;
  return {
    subject: copy.confirmSubject,
    preheaderText: copy.confirmPreheader,
    badgeText: copy.confirmBadge,
    ctaText: copy.confirmCta,
    ctaUrl: confirmUrl,
    bodyMarkdown: [
      copy.confirmIntro(name),
      '',
      lang === 'en'
        ? 'Someone (hopefully you) asked to receive the Tia Designs newsletter at this address.'
        : lang === 'es'
          ? 'Alguien (espero que t\u00fa) ha pedido recibir el bolet\u00edn de Tia Designs con esta direcci\u00f3n.'
          : 'Qualcuno (spero tu) ha chiesto di ricevere la newsletter di Tia Designs con questo indirizzo.',
      '',
      copy.confirmHint,
    ].join('\n'),
  };
}

export function welcomeEmailContent(lang: Lang, siteUrl: string = SITE_URL): EmailContent {
  const copy = COPY[lang] ?? COPY.it;
  return {
    subject: copy.welcomeSubject,
    preheaderText: copy.welcomePreheader,
    badgeText: copy.confirmBadge,
    ctaText: copy.welcomeCta,
    ctaUrl: `${siteUrl}${lang === 'it' ? '' : `/${lang}`}/#progetti`,
    bodyMarkdown: [
      copy.welcomeIntro,
      '',
      copy.welcomeHint,
    ].join('\n'),
  };
}

/**
 * The sentence shown next to the consent checkbox — and stored verbatim with
 * the subscriber as the proof of what they actually accepted.
 */
export const CONSENT_TEXT: Record<Lang, string> = {
  it: 'Acconsento a ricevere la newsletter di Tia Designs e ho letto la Privacy Policy. Posso disiscrivermi in qualsiasi momento.',
  en: 'I agree to receive the Tia Designs newsletter and I have read the Privacy Policy. I can unsubscribe at any time.',
  es: 'Acepto recibir el bolet\u00edn de Tia Designs y he le\u00eddo la Pol\u00edtica de Privacidad. Puedo darme de baja en cualquier momento.',
};

/** Consent wording served to the browser, so the form and the stored copy match. */
export function consentTextFor(lang: Lang): string {
  return CONSENT_TEXT[lang] ?? CONSENT_TEXT.it;
}

// ── Opt-out footer ────────────────────────────────────────────────────────
// Every campaign carries a one-click unsubscribe link. The wording lives here,
// next to the rest of the newsletter copy, so the sentence in the email and the
// page the link opens cannot drift apart.

const UNSUBSCRIBE_FOOTER: Record<Lang, { note: string; link: string }> = {
  it: { note: 'Non vuoi più ricevere la newsletter?', link: 'Disiscriviti con un clic' },
  en: { note: 'Do you no longer want the newsletter?', link: 'Unsubscribe with one click' },
  es: { note: '\u00bfNo quieres recibir m\u00e1s el bolet\u00edn?', link: 'Date de baja con un solo clic' },
};

export function unsubscribeFooterCopy(lang: Lang): { note: string; link: string } {
  return UNSUBSCRIBE_FOOTER[lang] ?? UNSUBSCRIBE_FOOTER.it;
}

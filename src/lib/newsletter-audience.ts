import { prisma } from '@/lib/prisma';
import {
  newsletterUrl,
  normalizeEmail,
  resolveAudience,
  type AudienceTarget,
} from '@/lib/newsletter';
import type { Lang } from '@/lib/translations';

// ── One place that decides who a campaign reaches ─────────────────────────
// The dashboard send (POST /api/master/newsletter) and the scheduled cron both
// used to resolve the audience with their own copy of the same rules, and the
// copies had already drifted (dedupe in one, not the other). Both now call
// this. The rules themselves live in newsletter.ts; this module only loads the
// rows and attaches the per-recipient unsubscribe link.

export interface ResolvedCampaignAudience {
  emails: string[];
  /** Addresses dropped because they opted out of the newsletter. */
  suppressed: number;
  /**
   * email → one-click unsubscribe link (in the language that subscriber signed
   * up in), for the addresses that are newsletter subscribers. Contacts and
   * chat leads have no token of their own: they get the reply-to footer instead
   * of a link they never consented to use.
   */
  unsubscribeByEmail: Map<string, { url: string; lang: Lang }>;
}

const KNOWN_TARGETS: AudienceTarget[] = ['subscribers', 'all_contacts', 'all_leads', 'all_audience', 'custom'];

/** A stored `recipients` value: a known target, or a hand-typed address list. */
export function parseAudienceTarget(stored: string | null | undefined): { target: AudienceTarget; customEmails: string } {
  const value = (stored || '').trim();
  if (KNOWN_TARGETS.includes(value as AudienceTarget)) {
    return { target: value as AudienceTarget, customEmails: '' };
  }
  // Anything else in the column is the custom list itself (the column doubles
  // as the target keyword and as the pasted addresses).
  return { target: 'custom', customEmails: value };
}

export async function loadCampaignAudience(
  storedTarget: string | null | undefined,
  customEmailsInput?: string,
): Promise<ResolvedCampaignAudience> {
  const parsed = parseAudienceTarget(storedTarget);
  const customEmails = parsed.target === 'custom' ? (customEmailsInput ?? parsed.customEmails) : '';

  const [subscribers, contacts, leads] = await Promise.all([
    prisma.newsletterSubscriber.findMany({
      select: { email: true, status: true, unsubscribeToken: true, locale: true },
    }),
    prisma.contactMessage.findMany({ select: { email: true } }),
    prisma.chatSessionLead.findMany({ where: { clientEmail: { not: null } }, select: { clientEmail: true } }),
  ]);

  const { emails, suppressed } = resolveAudience({
    target: parsed.target,
    subscribers: subscribers.map((s) => ({ email: s.email, status: s.status })),
    contactEmails: contacts.map((c) => c.email),
    leadEmails: leads.map((l) => l.clientEmail),
    customEmails,
  });

  const allowed = new Set(emails.map((email) => normalizeEmail(email)));
  const unsubscribeByEmail = new Map<string, { url: string; lang: Lang }>();
  for (const subscriber of subscribers) {
    const email = normalizeEmail(subscriber.email);
    if (subscriber.status !== 'confirmed' || !allowed.has(email) || !subscriber.unsubscribeToken) continue;
    const lang: Lang = subscriber.locale === 'en' || subscriber.locale === 'es' ? subscriber.locale : 'it';
    unsubscribeByEmail.set(email, { url: newsletterUrl(lang, 'unsubscribe', subscriber.unsubscribeToken), lang });
  }

  return { emails, suppressed, unsubscribeByEmail };
}

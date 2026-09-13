import { prisma } from './prisma';

/**
 * Sanitize client name or company into a URL-friendly referral code slug.
 * e.g. "Auto Soccorso Modena" -> "autosoccorso-modena"
 * "Chiara Bianchi" -> "chiara-bianchi"
 */
export function slugifyReferralCode(text: string): string {
  const clean = text
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove accents
    .replace(/[^a-z0-9]+/g, '-')     // replace non-alphanumeric with hyphen
    .replace(/^-+|-+$/g, '')         // trim leading/trailing hyphens
    .slice(0, 24);

  return clean || 'cliente';
}

/**
 * Generate a guaranteed unique referral code for a client or company.
 */
export async function ensureUniqueReferralCode(baseText: string, excludeId?: string): Promise<string> {
  const base = slugifyReferralCode(baseText);
  let candidate = base;
  let counter = 1;

  while (true) {
    const existing = await prisma.clientReferral.findUnique({
      where: { code: candidate },
      select: { id: true },
    });

    if (!existing || (excludeId && existing.id === excludeId)) {
      return candidate;
    }

    counter += 1;
    candidate = `${base}-${counter}`;
  }
}

/**
 * Record a visit / click on a referral link.
 */
export async function recordReferralHit(code: string): Promise<boolean> {
  if (!code) return false;
  const clean = code.trim().toLowerCase();
  try {
    const referral = await prisma.clientReferral.findUnique({
      where: { code: clean },
      select: { id: true, status: true },
    });

    if (referral && referral.status === 'active') {
      await prisma.clientReferral.update({
        where: { id: referral.id },
        data: { visitsCount: { increment: 1 } },
      });
      return true;
    }
  } catch (err) {
    console.error('[client-referrals] Error recording hit:', err);
  }
  return false;
}

/**
 * Attribute a lead (from contact form or AI quote) to a client's referral code.
 * Increments leadsCount, creates ReferralLeadLog, and returns the referral info.
 */
export async function attributeReferralLead(
  code: string,
  lead: {
    name: string;
    email: string;
    service?: string;
    source?: string;
    notes?: string;
  }
) {
  if (!code) return null;
  const clean = code.trim().toLowerCase();

  try {
    const referral = await prisma.clientReferral.findUnique({
      where: { code: clean },
    });

    if (!referral) return null;

    // Increment lead counter
    const updated = await prisma.clientReferral.update({
      where: { id: referral.id },
      data: {
        leadsCount: { increment: 1 },
      },
    });

    // Create detailed attribution log
    await prisma.referralLeadLog.create({
      data: {
        referralId: referral.id,
        referralCode: clean,
        leadName: lead.name,
        leadEmail: lead.email,
        service: lead.service || null,
        source: lead.source || 'contact',
        notes: lead.notes || null,
      },
    });

    return updated;
  } catch (err) {
    console.error('[client-referrals] Error attributing lead:', err);
    return null;
  }
}

/**
 * Attribute a conversion / closed quote to a referral code.
 * Calculates 20% reward/discount automatically.
 */
export async function attributeReferralConversion(
  code: string,
  dealValue: number,
  leadName: string,
  leadEmail?: string
) {
  if (!code || dealValue <= 0) return null;
  const clean = code.trim().toLowerCase();

  try {
    const referral = await prisma.clientReferral.findUnique({
      where: { code: clean },
    });

    if (!referral) return null;

    const reward = Math.round(dealValue * (referral.discountPercent / 100) * 100) / 100;

    const updated = await prisma.clientReferral.update({
      where: { id: referral.id },
      data: {
        conversionsCount: { increment: 1 },
        totalRewardAttributed: { increment: reward },
      },
    });

    await prisma.referralLeadLog.create({
      data: {
        referralId: referral.id,
        referralCode: clean,
        leadName,
        leadEmail: leadEmail || 'cliente@preventivo',
        source: 'quote_accepted',
        dealValue,
        attributedReward: reward,
        notes: `Preventivo accettato valore €${dealValue}. Ricompensa 20%: €${reward}`,
      },
    });

    return { reward, referral: updated };
  } catch (err) {
    console.error('[client-referrals] Error attributing conversion:', err);
    return null;
  }
}

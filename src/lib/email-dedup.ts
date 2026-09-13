import { prisma } from '@/lib/prisma';

/**
 * Emails that are strictly exempt from duplication checks (e.g. site owner / testing accounts).
 * These addresses can be tested or contacted multiple times and will never be filtered out or blocked.
 */
export const EXEMPT_EMAILS = new Set([
  'info@tiadesigns.it',
  'tiachinaglia@gmail.com',
  'latitiante@gmail.com',
]);

/**
 * Checks if an email address is exempt from deduplication.
 */
export function isDuplicationExempt(email?: string | null): boolean {
  if (!email) return false;
  const clean = email.toLowerCase().trim();
  return EXEMPT_EMAILS.has(clean);
}

/**
 * Records an email send into the database registry.
 */
export async function recordSentEmail({
  email,
  name,
  company,
  subject,
  source = 'auto_sender',
}: {
  email: string;
  name?: string | null;
  company?: string | null;
  subject?: string | null;
  source?: string;
}): Promise<void> {
  const cleanEmail = email.toLowerCase().trim();
  if (!cleanEmail) return;

  try {
    await prisma.sentEmailLog.create({
      data: {
        email: cleanEmail,
        name: name ? name.trim() : null,
        company: company ? company.trim() : null,
        subject: subject ? subject.trim() : null,
        source,
      },
    });
  } catch (err) {
    console.warn('[SentEmailLog] Error recording sent email:', err);
  }
}

/**
 * Checks whether an email address has already received an email from the platform.
 * Always returns false for exempt addresses (info@tiadesigns.it, tiachinaglia@gmail.com, latitiante@gmail.com).
 */
export async function isEmailAlreadySent(email: string): Promise<boolean> {
  const cleanEmail = email.toLowerCase().trim();
  if (!cleanEmail || isDuplicationExempt(cleanEmail)) {
    return false;
  }

  try {
    const existing = await prisma.sentEmailLog.findFirst({
      where: { email: cleanEmail },
      select: { id: true },
    });
    return Boolean(existing);
  } catch (err) {
    console.warn('[SentEmailLog] Error checking sent status:', err);
    return false;
  }
}

/**
 * Retrieves all unique sent email addresses (lowercase).
 */
export async function getSentEmailSet(): Promise<Set<string>> {
  try {
    const records = await prisma.sentEmailLog.findMany({
      select: { email: true },
    });
    const set = new Set<string>();
    for (const r of records) {
      const clean = r.email.toLowerCase().trim();
      // Only include non-exempt addresses in the blocked set
      if (!isDuplicationExempt(clean)) {
        set.add(clean);
      }
    }
    return set;
  } catch (err) {
    console.warn('[SentEmailLog] Error fetching sent email set:', err);
    return new Set<string>();
  }
}

import { NextRequest } from 'next/server';
import { getClientIp, rateLimitResponse, takeChatRateLimit } from '@/lib/chat-security';
import { actionRedirect, newsletterPagePath, readNewsletterAction } from '@/lib/newsletter-http';
import { getDatabaseErrorMessage, prisma } from '@/lib/prisma';
import { hashIp, newToken, normalizeEmail } from '@/lib/newsletter';
import { isValidContactEmail } from '@/lib/input-validation';

/**
 * Opt-out, reached from the link in every campaign (with a token) or from the
 * public page by typing an address (no token).
 *
 * The subscriber table is also the suppression list, so an address that opts
 * out here is excluded from every future audience — including the ones built
 * from contact messages and chat leads, which have no record of their own.
 * Without that, "unsubscribe" would only silence the newsletter and the same
 * person would keep receiving campaigns under a different label.
 *
 * POST only: an unsubscribe triggered by a GET would fire when an email client
 * or a link scanner prefetches the URL, unsubscribing people who never clicked.
 */
export async function POST(req: NextRequest) {
  const { token, email, lang } = await readNewsletterAction(req);

  try {
    const limit = await takeChatRateLimit(getClientIp(req), `unsub:${hashIp(token || email)}`, 'newsletter');
    if (!limit.ok) return rateLimitResponse(limit.retryAfter);

    const now = new Date();

    if (token && token.length >= 20 && token.length <= 200) {
      const subscriber = await prisma.newsletterSubscriber.findUnique({
        where: { unsubscribeToken: token },
        select: { id: true, status: true },
      });
      if (!subscriber) return actionRedirect(req, newsletterPagePath(lang, 'unsubscribe'), 'non-valido');

      // Idempotent: a second click on the same link is not an error.
      if (subscriber.status !== 'unsubscribed') {
        await prisma.newsletterSubscriber.update({
          where: { id: subscriber.id },
          data: { status: 'unsubscribed', unsubscribedAt: now, confirmToken: null },
        });
      }
      return actionRedirect(req, newsletterPagePath(lang, 'unsubscribe'), 'disiscritto');
    }

    // No token: the visitor typed the address. The address itself is the proof
    // of control only in the weak sense (anyone could type someone else's), so
    // this path is limited to creating a SUPPRESSION record — it can never
    // subscribe anybody, only stop emails.
    const clean = normalizeEmail(email);
    if (!clean || !isValidContactEmail(clean)) {
      return actionRedirect(req, newsletterPagePath(lang, 'unsubscribe'), 'non-valido');
    }

    const existing = await prisma.newsletterSubscriber.findUnique({
      where: { email: clean },
      select: { id: true, status: true },
    });

    if (existing) {
      if (existing.status !== 'unsubscribed') {
        await prisma.newsletterSubscriber.update({
          where: { id: existing.id },
          data: { status: 'unsubscribed', unsubscribedAt: now, confirmToken: null },
        });
      }
    } else {
      await prisma.newsletterSubscriber.create({
        data: {
          email: clean,
          status: 'unsubscribed',
          locale: lang,
          source: 'optout',
          consentText: null,
          consentAt: null,
          confirmToken: null,
          unsubscribeToken: newToken(),
          unsubscribedAt: now,
          ipHash: hashIp(getClientIp(req)) || null,
        },
      });
    }

    return actionRedirect(req, newsletterPagePath(lang, 'unsubscribe'), 'disiscritto');
  } catch (error) {
    console.error('[newsletter] unsubscribe failed:', error, getDatabaseErrorMessage(error));
    return actionRedirect(req, newsletterPagePath(lang, 'unsubscribe'), 'errore');
  }
}

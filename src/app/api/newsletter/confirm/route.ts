import { NextRequest } from 'next/server';
import { getClientIp, rateLimitResponse, takeChatRateLimit } from '@/lib/chat-security';
import { actionRedirect, newsletterPagePath, readNewsletterAction } from '@/lib/newsletter-http';
import { getDatabaseErrorMessage, prisma } from '@/lib/prisma';
import { buildBrandedEmailHtml, sendEmail } from '@/lib/branded-email';
import { newsletterUrl, unsubscribeFooterCopy, welcomeEmailContent } from '@/lib/newsletter';

/**
 * Double opt-in, step 2: the visitor pressed the button on the confirmation
 * page, which posts here with the token from their email.
 *
 * The confirmation is a POST and not a GET on purpose: mail clients, security
 * scanners and chat previews all prefetch links, and a GET that subscribes
 * would let a bot confirm an address its owner never confirmed — exactly what
 * double opt-in exists to prevent.
 */
export async function POST(req: NextRequest) {
  const { token, lang } = await readNewsletterAction(req);

  try {
    if (!token || token.length < 20 || token.length > 200) {
      return actionRedirect(req, newsletterPagePath(lang, 'confirm'), 'non-valido');
    }

    const limit = await takeChatRateLimit(getClientIp(req), `confirm:${token.slice(0, 12)}`, 'newsletter');
    if (!limit.ok) return rateLimitResponse(limit.retryAfter);

    const subscriber = await prisma.newsletterSubscriber.findUnique({
      where: { confirmToken: token },
      select: { id: true, email: true, name: true, status: true, locale: true, unsubscribeToken: true },
    });

    // No row owns this token: either it was already used (it is cleared on
    // confirmation) or it never existed. Same page, so a stale link cannot be
    // told apart from a forged one.
    if (!subscriber) {
      return actionRedirect(req, newsletterPagePath(lang, 'confirm'), 'non-valido');
    }

    if (subscriber.status === 'confirmed') {
      return actionRedirect(req, newsletterPagePath(lang, 'confirm'), 'gia-confermato');
    }

    const confirmedLang = (subscriber.locale === 'en' || subscriber.locale === 'es' ? subscriber.locale : 'it') as 'it' | 'en' | 'es';

    await prisma.newsletterSubscriber.update({
      where: { id: subscriber.id },
      data: {
        status: 'confirmed',
        confirmedAt: new Date(),
        // Cleared so the link in the email is a one-shot: a forwarded message
        // cannot be replayed to re-subscribe someone later.
        confirmToken: null,
        unsubscribedAt: null,
      },
    });

    // Welcome email is a nicety, not part of the opt-in: if it fails the
    // subscription stays confirmed and the visitor still sees the success page.
    const content = welcomeEmailContent(confirmedLang);
    const footer = unsubscribeFooterCopy(confirmedLang);
    void sendEmail({
      to: subscriber.email,
      subject: content.subject,
      html: buildBrandedEmailHtml({
        title: content.subject,
        bodyMarkdown: content.bodyMarkdown,
        ctaText: content.ctaText,
        ctaUrl: content.ctaUrl,
        badgeText: content.badgeText,
        preheaderText: content.preheaderText,
        // The welcome message is the FIRST newsletter email, so it already
        // carries the opt-out — a subscriber must never have to wait for a
        // campaign to find the way out.
        ...(subscriber.unsubscribeToken
          ? {
              unsubscribeUrl: newsletterUrl(confirmedLang, 'unsubscribe', subscriber.unsubscribeToken),
              unsubscribeNote: footer.note,
              unsubscribeLinkText: footer.link,
            }
          : {}),
      }),
    }).catch((error) => console.error('[newsletter] welcome email failed:', error));

    return actionRedirect(req, newsletterPagePath(lang, 'confirm'), 'confermato');
  } catch (error) {
    console.error('[newsletter] confirm failed:', error, getDatabaseErrorMessage(error));
    return actionRedirect(req, newsletterPagePath(lang, 'confirm'), 'errore');
  }
}

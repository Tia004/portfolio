import { NextRequest, NextResponse } from 'next/server';
import { prisma, getDatabaseErrorMessage } from '@/lib/prisma';
import { buildBrandedEmailHtml, sendEmail } from '@/lib/branded-email';
import { isValidContactEmail } from '@/lib/input-validation';
import { isInappropriateContactValue } from '@/lib/chat-moderation';
import {
  getClientIp,
  isSameOriginRequest,
  rateLimitResponse,
  takeChatRateLimit,
  verifyTurnstile,
} from '@/lib/chat-security';
import {
  confirmationEmailContent,
  consentTextFor,
  decideSignup,
  hashIp,
  newToken,
  newsletterUrl,
  normalizeEmail,
} from '@/lib/newsletter';
import type { Lang } from '@/lib/translations';

/**
 * Public newsletter signup — step 1 of the double opt-in.
 *
 * Nothing here subscribes anybody: it records a PENDING subscriber and emails
 * a confirmation link. Only the confirmation endpoint can move a row to
 * "confirmed", which is what makes the consent real (and what a spam signup
 * cannot fake, since the address owner has to press the button).
 *
 * The response never depends on whether the address was already known: the
 * visitor always gets the same instruction, so this endpoint cannot be used to
 * test whether a given address is on the list.
 */
export async function POST(req: NextRequest) {
  try {
    if (!isSameOriginRequest(req)) {
      return NextResponse.json({ error: 'Origine non autorizzata' }, { status: 403 });
    }
    const contentLength = Number(req.headers.get('content-length') || 0);
    if (contentLength > 8_192) {
      return NextResponse.json({ error: 'Payload troppo grande' }, { status: 413 });
    }

    const body = await req.json().catch(() => ({})) as {
      email?: unknown;
      name?: unknown;
      consent?: unknown;
      lang?: unknown;
      source?: unknown;
      captchaToken?: unknown;
    };

    const ip = getClientIp(req);
    const email = normalizeEmail(body.email);

    // Rate limit per IP and per address: the IP key stops one machine from
    // hammering the form, the address key stops a single inbox from being
    // signed up repeatedly from a botnet.
    const limit = await takeChatRateLimit(ip, `sub:${hashIp(email)}`, 'newsletter');
    if (!limit.ok) return rateLimitResponse(limit.retryAfter);

    if (!await verifyTurnstile(body.captchaToken, ip)) {
      return NextResponse.json({ error: 'Verifica anti-bot non riuscita' }, { status: 403 });
    }

    if (body.consent !== true && body.consent !== 'true' && body.consent !== 'on') {
      return NextResponse.json({ error: 'consent_required', code: 'consent' }, { status: 400 });
    }
    if (!isValidContactEmail(email) || isInappropriateContactValue(email)) {
      return NextResponse.json({ error: 'invalid_email', code: 'email' }, { status: 400 });
    }

    const lang: Lang = body.lang === 'en' || body.lang === 'es' ? body.lang : 'it';
    const nameRaw = typeof body.name === 'string' ? body.name.trim().slice(0, 80) : '';
    const name = nameRaw && !isInappropriateContactValue(nameRaw) ? nameRaw : '';
    const source = typeof body.source === 'string' && /^[a-z0-9_-]{1,32}$/i.test(body.source) ? body.source : 'website';

    const existing = await prisma.newsletterSubscriber.findUnique({
      where: { email },
      select: { id: true, status: true, lastEmailAt: true },
    });
    const decision = decideSignup(existing);

    if (decision.action === 'already_confirmed' || decision.action === 'throttled') {
      // Same answer as a fresh signup: no email is sent, and the visitor is
      // told to check their inbox (they will find the earlier message).
      return NextResponse.json({ ok: true, status: 'check_email' });
    }

    const confirmToken = newToken();
    const now = new Date();

    if (decision.action === 'create') {
      await prisma.newsletterSubscriber.upsert({
        where: { email },
        create: {
          email,
          name: name || null,
          status: 'pending',
          locale: lang,
          source,
          consentText: consentTextFor(lang),
          consentAt: now,
          confirmToken,
          unsubscribeToken: newToken(),
          ipHash: hashIp(ip) || null,
          userAgent: (req.headers.get('user-agent') || '').slice(0, 300) || null,
        },
        // Re-subscribing after an opt-out starts a FRESH consent: new tokens,
        // new consent wording, back to pending.
        update: {
          name: name || undefined,
          status: 'pending',
          locale: lang,
          source,
          consentText: consentTextFor(lang),
          consentAt: now,
          confirmToken,
          unsubscribeToken: newToken(),
          confirmedAt: null,
          unsubscribedAt: null,
        },
      });
    } else {
      // Pending and the link was never used: re-issue it rather than creating
      // a second row.
      await prisma.newsletterSubscriber.update({
        where: { email },
        data: { confirmToken, locale: lang, lastEmailAt: null },
      });
    }

    const content = confirmationEmailContent(lang, newsletterUrl(lang, 'confirm', confirmToken), name || undefined);
    const html = buildBrandedEmailHtml({
      title: content.subject,
      bodyMarkdown: content.bodyMarkdown,
      ctaText: content.ctaText,
      ctaUrl: content.ctaUrl,
      badgeText: content.badgeText,
      preheaderText: content.preheaderText,
    });

    const sent = await sendEmail({ to: email, subject: content.subject, html }).catch((error) => {
      console.error('[newsletter] confirmation email failed:', error);
      return false;
    });

    // lastEmailAt is stamped only when the email actually went out, so a
    // failed send can be retried immediately instead of waiting out the
    // throttle window for a message that never arrived.
    if (sent) {
      await prisma.newsletterSubscriber.update({
        where: { email },
        data: { lastEmailAt: new Date() },
      });
    }

    return NextResponse.json({ ok: true, status: 'check_email', emailSent: sent });
  } catch (error) {
    console.error('[newsletter] subscribe failed:', error);
    return NextResponse.json({ error: getDatabaseErrorMessage(error) }, { status: 500 });
  }
}

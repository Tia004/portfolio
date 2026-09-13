import type { NextRequest } from 'next/server';
import type { Lang } from '@/lib/translations';
import { normalizeEmail } from '@/lib/newsletter';

// Shared plumbing for the two newsletter ACTION endpoints (confirm and
// unsubscribe). Both are reached by a plain HTML <form method="post"> rendered
// on our own pages, so they must accept form-encoded bodies — and they answer
// with a redirect to a branded page rather than JSON, because the visitor
// arrives there from an email client, not from a fetch() call.

export function langFrom(value: unknown): Lang {
  return value === 'en' || value === 'es' ? value : 'it';
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export interface NewsletterActionInput {
  token: string;
  email: string;
  lang: Lang;
}

export async function readNewsletterAction(req: NextRequest): Promise<NewsletterActionInput> {
  const contentType = req.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    const body = await req.json().catch(() => ({})) as Record<string, unknown>;
    return {
      token: asString(body.token),
      email: normalizeEmail(body.email),
      lang: langFrom(body.lang),
    };
  }
  const form = await req.formData().catch(() => null);
  return {
    token: form ? asString(form.get('token')) : '',
    email: normalizeEmail(form ? form.get('email') : ''),
    lang: langFrom(form ? form.get('lang') : ''),
  };
}

/**
 * Redirect back to a branded page on the domain the visitor actually used.
 *
 * `SITE_URL` is the canonical production origin, which would bounce a local
 * request to production and a preview deployment to the live site; the
 * forwarded/host headers keep the visitor where they came from.
 */
export function actionRedirect(req: NextRequest, path: string, esito: string): Response {
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || 'tiadesigns.it';
  const proto = req.headers.get('x-forwarded-proto') || (host.startsWith('localhost') ? 'http' : 'https');
  const url = `${proto}://${host}${path}?esito=${encodeURIComponent(esito)}`;
  // 303: the browser must follow with GET, otherwise reloading the result page
  // would re-post the token.
  return new Response(null, { status: 303, headers: { Location: url, 'Cache-Control': 'no-store' } });
}

/** Status page path for a language: /newsletter/… or /en/newsletter/…. */
export function newsletterPagePath(lang: Lang, page: 'confirm' | 'unsubscribe'): string {
  const prefix = lang === 'it' ? '' : `/${lang}`;
  return `${prefix}${page === 'confirm' ? '/newsletter/conferma' : '/newsletter/disiscrizione'}`;
}

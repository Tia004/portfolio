import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { decrypt } from './lib/session';

const VALID_LANGS = new Set(['it', 'en', 'es']);

export async function middleware(request: NextRequest) {
  const token = request.cookies.get('master_session')?.value;
  const { pathname } = request.nextUrl;

  // 0. Language-prefixed routes: /en or /es → set cookie + redirect to /
  // This gives Google distinct URLs per language for hreflang SEO
  const langMatch = pathname.match(/^\/(en|es)(\/.*)?$/);
  if (langMatch) {
    const lang = langMatch[1];
    const homeUrl = new URL('/', request.url);
    const response = NextResponse.redirect(homeUrl);
    // Cookie name mirrors LanguageProvider.getCookieKey(): __Host-lang on HTTPS, lang on HTTP
    const cookieName = request.url.startsWith('https') ? '__Host-lang' : 'lang';
    response.cookies.set(cookieName, lang, {
      path: '/',
      maxAge: 365 * 24 * 60 * 60,
      sameSite: 'lax',
      secure: request.url.startsWith('https'),
    });
    return response;
  }

  // Decrypt session safely using edge-compatible jose library
  const session = token ? await decrypt(token) : null;

  // 1. Route protection: dashboard and analytics require authenticated session
  if (pathname.startsWith('/loginmaster/dashboard') || pathname.startsWith('/loginmaster/analytics')) {
    if (!session) {
      const loginUrl = new URL('/loginmaster', request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  // 2. Already logged in check: redirect from login to dashboard
  if (pathname === '/loginmaster') {
    if (session) {
      const dashboardUrl = new URL('/loginmaster/dashboard', request.url);
      return NextResponse.redirect(dashboardUrl);
    }
  }

  // 3. Pass language cookie to server components via x-lang header
  // Tries __Host-lang (production) first, then lang (development/legacy)
  const response = NextResponse.next();
  const langCookie = request.cookies.get('__Host-lang')?.value || request.cookies.get('lang')?.value;
  if (langCookie && VALID_LANGS.has(langCookie)) {
    response.headers.set('x-lang', langCookie);
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next|api|favicon|site\\.webmanifest|apple-touch-icon).*)'],
};

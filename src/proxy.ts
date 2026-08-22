import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { decrypt } from './lib/session';

const VALID_LANGS = new Set(['it', 'en', 'es']);

export async function proxy(request: NextRequest) {
  const token = request.cookies.get('master_session')?.value;
  const { pathname } = request.nextUrl;

  // Language from the URL path (/en, /es) — these are real pages now (no
  // redirect), so CrUX can collect per-language metrics on distinct URLs.
  const langMatch = pathname.match(/^\/(en|es)\/?$/);
  const pathLang = langMatch ? langMatch[1] : null;

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

  // 3. Pass language to server components via x-lang header.
  // Priority: URL path (/en, /es) > cookie (persisted preference on /).
  const response = NextResponse.next();
  const langCookie = request.cookies.get('__Host-lang')?.value || request.cookies.get('lang')?.value;
  const lang = pathLang || (langCookie && VALID_LANGS.has(langCookie) ? langCookie : null);
  if (lang) {
    response.headers.set('x-lang', lang);
  }

  // Persist a path-based language choice so a later visit to / defaults to it.
  if (pathLang) {
    const cookieName = request.url.startsWith('https') ? '__Host-lang' : 'lang';
    response.cookies.set(cookieName, pathLang, {
      path: '/',
      maxAge: 365 * 24 * 60 * 60,
      sameSite: 'lax',
      secure: request.url.startsWith('https'),
    });
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next|api|favicon|site\\.webmanifest|apple-touch-icon).*)'],
};

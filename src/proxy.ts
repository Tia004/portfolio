import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { decrypt } from './lib/session';

const VALID_LANGS = new Set(['it', 'en', 'es']);

export async function proxy(request: NextRequest) {
  const token = request.cookies.get('master_session')?.value;
  const { pathname } = request.nextUrl;

  // Language from the URL path (/en, /es) — these are real pages now (no
  // redirect), so CrUX can collect per-language metrics on distinct URLs.
  //
  // The match covers ANY path under the prefix, not just the prefix itself:
  // `/en/qualcosa` with an Italian cookie used to fall back to the cookie and
  // render in Italian (it is what made the 404 of an English URL Italian). The
  // prefix is a promise about the language of everything below it.
  const langMatch = pathname.match(/^\/(en|es)(?:\/|$)/);
  const pathLang = langMatch ? langMatch[1] : null;
  // Only the language root PERSISTS the choice: deep links must not silently
  // overwrite a visitor's stored preference.
  const isLangRoot = /^\/(en|es)\/?$/.test(pathname);

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

  // 2b. `/it` is not a route (Italian lives at the root) but it is the URL
  // people type, and it used to answer with a 404 — a dead end for a visitor
  // who was already in the right place. Send them to the equivalent root path
  // instead: permanent, and method-preserving.
  if (pathname === '/it' || pathname.startsWith('/it/')) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.slice(3) || '/';
    return NextResponse.redirect(url, 308);
  }

  // 3. Pass language to server components via x-lang header.
  // Priority: URL path (/en, /es) > cookie (persisted preference on /).
  //
  // The cookie speaks for the ROOT ONLY. Every other unprefixed path has an
  // Italian canonical URL (`/progetti/gsa-hotels`, `/newsletter/conferma`), so
  // answering it with the cookie's language would ship Spanish content under an
  // Italian canonical with <html lang="es"> — the page a visitor shared and
  // Google indexed is the Italian one. Only `/` is language-neutral, which is
  // where a stored preference belongs.
  const response = NextResponse.next();
  const langCookie = request.cookies.get('__Host-lang')?.value || request.cookies.get('lang')?.value;
  const cookieApplies = pathname === '/' && langCookie && VALID_LANGS.has(langCookie);
  const lang = pathLang || (cookieApplies ? langCookie : null);
  if (lang) {
    response.headers.set('x-lang', lang);
  }

  // Persist a path-based language choice so a later visit to / defaults to it.
  if (isLangRoot && pathLang) {
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

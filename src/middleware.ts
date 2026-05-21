import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { decrypt } from './lib/session';

export async function middleware(request: NextRequest) {
  const token = request.cookies.get('master_session')?.value;
  const { pathname } = request.nextUrl;

  // Decrypt session safely using edge-compatible jose library
  const session = token ? await decrypt(token) : null;

  // 1. Route protection: dashboard requires authenticated session
  if (pathname.startsWith('/loginmaster/dashboard')) {
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

  return NextResponse.next();
}

export const config = {
  matcher: ['/loginmaster/:path*'],
};

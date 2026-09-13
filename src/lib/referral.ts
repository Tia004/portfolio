'use client';

// ── Referral attribution ──────────────────────────────────────────────────
// The footer has promised a referral discount since the first release, but
// nothing measured it: a shared link arrived at the site looking exactly like
// any other visit, so "word of mouth" was invisible in the analytics — the one
// channel a small studio can actually scale.
//
// This module does the two cheap halves of that loop:
//   • capture `?ref=<code>` from the landing URL and keep it for the session,
//     so every analytics event (see lib/analytics) carries the code that
//     brought the visitor — and the conversion that code produced;
//   • hand every visitor a stable share link (`?ref=<their own code>`), so the
//     referral they generate is attributable too.
//
// Session-scoped on purpose: the code belongs to THIS visit. The share code,
// however, lives in localStorage so the same person keeps the same link.

const REF_KEY = 'tia-ref';
const CODE_KEY = 'tia-share-code';
const MAX_LENGTH = 32;

let cached: string | null | undefined;

/** Keep codes short and URL-safe: letters, digits, dash, underscore. */
function sanitize(value: string | null | undefined): string | null {
  if (!value) return null;
  const clean = value.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, MAX_LENGTH);
  return clean.length >= 2 ? clean : null;
}

/**
 * Read `?ref=` (or the short `?r=`) from the landing URL and remember it for
 * the session. Call once on mount. Returns the active code, if any.
 */
export function captureReferral(search?: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const params = new URLSearchParams(search ?? window.location.search);
    const incoming = sanitize(params.get('ref') ?? params.get('r'));
    if (incoming) {
      window.sessionStorage.setItem(REF_KEY, incoming);
      cached = incoming;
      return incoming;
    }
  } catch {
    /* private mode — fall through to the cached/empty value */
  }
  return getReferral();
}

/** The referral code that brought this visitor (null for direct traffic). */
export function getReferral(): string | null {
  if (cached !== undefined) return cached;
  if (typeof window === 'undefined') return null;
  try {
    cached = sanitize(window.sessionStorage.getItem(REF_KEY));
  } catch {
    cached = null;
  }
  return cached;
}

/** Stable per-device share code (created on first use). */
export function myShareCode(): string {
  if (typeof window === 'undefined') return '';
  try {
    const stored = sanitize(window.localStorage.getItem(CODE_KEY));
    if (stored) return stored;
    const code = Math.random().toString(36).slice(2, 8);
    window.localStorage.setItem(CODE_KEY, code);
    return code;
  } catch {
    return '';
  }
}

/** Absolute URL to share, carrying a referral code. */
export function shareLink(code?: string): string {
  const base = typeof window !== 'undefined' ? `${window.location.origin}/` : 'https://tiadesigns.it/';
  const chosen = sanitize(code) ?? myShareCode();
  return chosen ? `${base}?ref=${chosen}` : base;
}

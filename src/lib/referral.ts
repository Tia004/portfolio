'use client';

// ── Referral attribution ──────────────────────────────────────────────────
// The site promises a word-of-mouth discount (20% off, see the hero promo and
// `footer.referral`). A promise you cannot measure is a promise you cannot
// honour cheaply, so this module does the one cheap half that matters: it reads
// `?ref=<code>` from the landing URL and keeps it for the session, so every
// analytics event (see lib/analytics) carries the code that brought the
// visitor — and so does the conversion that code produced.
//
// It used to also hand every visitor a personal share link. That card lived
// under the contact section and was removed: the offer belongs in the hero, one
// line, not as a widget competing with the contact form. If the share-card ever
// comes back, this is where the generator goes.
//
// Session-scoped on purpose: a code belongs to THIS visit, not to the device.

const REF_KEY = 'tia-ref';
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
      // Record visit hit in background for attribution metrics
      try {
        fetch('/api/referral/hit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ref: incoming }),
          keepalive: true,
        }).catch(() => {});
      } catch {
        /* ignore network failures on hit tracking */
      }
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

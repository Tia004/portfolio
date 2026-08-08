'use client';

const STORAGE_KEY = 'tia-cookie-consent';
const COOKIE_KEY = 'cookie-consent';

export type ConsentLevel = 'all' | 'technical' | 'none';

export interface ConsentState {
  level: ConsentLevel;
  timestamp: number;
}

/** Set consent cookie — mirrors localStorage. Secure only on HTTPS. */
function setConsentCookie(state: ConsentState): void {
  if (typeof document === 'undefined') return;
  const maxAge = 365 * 24 * 60 * 60;
  const secure = location.protocol === 'https:' ? ';Secure' : '';
  document.cookie = `${COOKIE_KEY}=${encodeURIComponent(JSON.stringify(state))};path=/;max-age=${maxAge};SameSite=Lax${secure}`;
}

/** Read consent from cookie. Returns null if not set or invalid. */
export function getConsentCookie(): ConsentState | null {
  if (typeof document === 'undefined') return null;
  try {
    const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${COOKIE_KEY}=([^;]*)`));
    if (!match?.[1]) return null;
    const parsed = JSON.parse(decodeURIComponent(match[1]));
    if (parsed && typeof parsed.level === 'string' && typeof parsed.timestamp === 'number') {
      return parsed as ConsentState;
    }
  } catch {}
  return null;
}

/** Read current consent. Checks localStorage first, falls back to cookie. */
export function getConsent(): ConsentState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.level === 'string' && typeof parsed.timestamp === 'number') {
        return parsed as ConsentState;
      }
    }
  } catch {}
  // Fallback: recover from cookie if localStorage was cleared
  return getConsentCookie();
}

/** Save consent — persists to both localStorage and cookie. */
export function setConsent(level: ConsentLevel): void {
  const state: ConsentState = { level, timestamp: Date.now() };
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
  setConsentCookie(state);
}

/** Check if analytics/tracking cookies are allowed. */
export function hasAnalyticsConsent(): boolean {
  const c = getConsent();
  return c?.level === 'all';
}

/** Check if consent has ever been given (any level). */
export function hasConsent(): boolean {
  return getConsent() !== null;
}

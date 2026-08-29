'use client';

import { hasAnalyticsConsent, getConsent } from './cookie-consent';

const ENDPOINT = '/api/analytics/log';
const BATCH_SIZE = 5;
const FLUSH_INTERVAL = 5000; // 5 seconds

let queue: AnalyticsEvent[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;

interface AnalyticsEvent {
  type: 'pageview' | 'click' | 'scroll_25' | 'scroll_50' | 'scroll_75' | 'scroll_100' | 'cookie_consent' | 'webgl_context';
  url: string;
  timestamp: number;
  sessionId: string;
  data?: Record<string, unknown>;
}

let sessionId = '';

/**
 * Checks if the current visitor is an admin or browsing the dashboard.
 * Completely disables analytics tracking for the site owner / admin.
 */
export function isAdminOrDashboardUser(): boolean {
  if (typeof window === 'undefined') return true;

  const pathname = window.location.pathname || '';
  if (
    pathname.startsWith('/loginmaster') ||
    pathname.startsWith('/api/master') ||
    pathname.startsWith('/api/auth')
  ) {
    return true;
  }

  // Check if master session cookie exists in browser
  if (typeof document !== 'undefined' && document.cookie && document.cookie.includes('master_session=')) {
    return true;
  }

  // Check if admin session flag is set in storage
  try {
    if (
      sessionStorage.getItem('master_authenticated') === 'true' ||
      localStorage.getItem('master_authenticated') === 'true'
    ) {
      return true;
    }
  } catch {}

  return false;
}

function getSessionId(): string {
  if (sessionId) return sessionId;
  const stored = typeof window !== 'undefined' ? sessionStorage.getItem('tia-sid') : null;
  if (stored) {
    sessionId = stored;
    return sessionId;
  }
  sessionId = `s${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  try { sessionStorage.setItem('tia-sid', sessionId); } catch {}
  return sessionId;
}

function enqueue(event: Omit<AnalyticsEvent, 'timestamp' | 'sessionId'>) {
  // Strictly ignore all admin / dashboard activity
  if (isAdminOrDashboardUser()) return;
  if (
    event.url &&
    (event.url.startsWith('/loginmaster') ||
      event.url.startsWith('/api/master') ||
      event.url.startsWith('/api/auth'))
  ) {
    return;
  }

  // Only track if public visitor gave full consent
  if (!hasAnalyticsConsent()) return;

  queue.push({
    ...event,
    timestamp: Date.now(),
    sessionId: getSessionId(),
  });

  if (queue.length >= BATCH_SIZE) flush();
  else scheduleFlush();
}

function scheduleFlush() {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    flush();
  }, FLUSH_INTERVAL);
}

async function flush() {
  if (isAdminOrDashboardUser()) {
    queue = [];
    return;
  }
  if (queue.length === 0) return;
  const batch = queue.splice(0, BATCH_SIZE);
  try {
    await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        events: batch,
        consent: getConsent(),
      }),
      keepalive: true,
    });
  } catch {
    // Silent — don't disrupt UX
  }
}

// ─── Public API ──────────────────────────────────────────────────

/** Track page view. Call once per route change (regular public visitors only). */
export function trackPageView(url?: string) {
  if (isAdminOrDashboardUser()) return;
  const targetUrl = url || (typeof window !== 'undefined' ? location.pathname : '');
  if (targetUrl.startsWith('/loginmaster') || targetUrl.startsWith('/api/')) return;
  enqueue({ type: 'pageview', url: targetUrl });
}

/** Track a click on an element (regular public visitors only). */
export function trackClick(element: string, extra?: Record<string, unknown>) {
  if (isAdminOrDashboardUser()) return;
  const currentPath = typeof window !== 'undefined' ? location.pathname : '';
  if (currentPath.startsWith('/loginmaster') || currentPath.startsWith('/api/')) return;
  enqueue({
    type: 'click',
    url: currentPath,
    data: { element, ...extra },
  });
}

/** Track scroll depth milestones (regular public visitors only). */
export function trackScrollDepth(depth: 25 | 50 | 75 | 100) {
  if (isAdminOrDashboardUser()) return;
  const currentPath = typeof window !== 'undefined' ? location.pathname : '';
  if (currentPath.startsWith('/loginmaster') || currentPath.startsWith('/api/')) return;
  enqueue({ type: `scroll_${depth}`, url: currentPath });
}

/** Track cookie consent acceptance. */
export function trackCookieConsent(categories: string[]) {
  if (isAdminOrDashboardUser()) return;
  enqueue({
    type: 'cookie_consent',
    url: typeof window !== 'undefined' ? location.pathname : '',
    data: { categories },
  });
}

/** Track a WebGL context loss/restore diagnostic. */
export function trackWebGLContext(info: Record<string, unknown>) {
  if (isAdminOrDashboardUser()) return;
  enqueue({
    type: 'webgl_context',
    url: typeof window !== 'undefined' ? location.pathname : '',
    data: info,
  });
}

/** Flush any pending events before page unload. */
export function flushAnalytics() {
  if (isAdminOrDashboardUser()) {
    queue = [];
    return;
  }
  if (queue.length === 0 || !hasAnalyticsConsent()) return;
  try {
    navigator.sendBeacon(
      ENDPOINT,
      JSON.stringify({
        events: queue,
        consent: getConsent(),
      })
    );
    queue = [];
  } catch {}
}

// ─── Auto-track page views for regular visitors only ─────────────

if (typeof window !== 'undefined' && !(window as any).__tiaAnalyticsInit) {
  (window as any).__tiaAnalyticsInit = true;

  if (!isAdminOrDashboardUser()) {
    // Initial pageview
    trackPageView();

    // Scroll depth tracking
    const milestones = new Set<number>();
    let cachedDocHeight = 0;
    const refreshDocHeight = () => {
      cachedDocHeight = document.documentElement.scrollHeight;
    };
    let rafPending = false;
    const handleScroll = () => {
      if (isAdminOrDashboardUser()) return;
      if (rafPending) return;
      rafPending = true;
      requestAnimationFrame(() => {
        rafPending = false;
        const scrollPercent = Math.round(
          (window.scrollY / Math.max(1, cachedDocHeight - window.innerHeight)) * 100
        );
        const milestone = [25, 50, 75, 100].find(m => scrollPercent >= m && !milestones.has(m));
        if (milestone) {
          milestones.add(milestone);
          trackScrollDepth(milestone as 25 | 50 | 75 | 100);
        }
      });
    };
    refreshDocHeight();
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', refreshDocHeight, { passive: true });
    window.addEventListener('load', refreshDocHeight, { passive: true });

    // Flush on page exit
    window.addEventListener('beforeunload', flushAnalytics);
    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') flushAnalytics();
    });
  }
}

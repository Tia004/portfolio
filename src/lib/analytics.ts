'use client';

import { hasAnalyticsConsent, getConsent } from './cookie-consent';

const ENDPOINT = '/api/analytics/log';
const BATCH_SIZE = 5;
const FLUSH_INTERVAL = 5000; // 5 seconds

let queue: AnalyticsEvent[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;

interface AnalyticsEvent {
  type: 'pageview' | 'click' | 'scroll_25' | 'scroll_50' | 'scroll_75' | 'scroll_100' | 'cookie_consent';
  url: string;
  timestamp: number;
  sessionId: string;
  data?: Record<string, unknown>;
}

let sessionId = '';

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
  // Only track if user gave full consent
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

/** Track page view. Call once per route change. */
export function trackPageView(url?: string) {
  enqueue({ type: 'pageview', url: url || location.pathname });
}

/** Track a click on an element. Call from event handlers. */
export function trackClick(element: string, extra?: Record<string, unknown>) {
  enqueue({
    type: 'click',
    url: location.pathname,
    data: { element, ...extra },
  });
}

/** Track scroll depth milestones. Automatically called by the tracker. */
export function trackScrollDepth(depth: 25 | 50 | 75 | 100) {
  enqueue({ type: `scroll_${depth}`, url: location.pathname });
}

/** Track cookie consent acceptance. Call from CookieBanner on accept. */
export function trackCookieConsent(categories: string[]) {
  enqueue({
    type: 'cookie_consent',
    url: location.pathname,
    data: { categories },
  });
}

/** Flush any pending events before page unload. Call in beforeunload listener. */
export function flushAnalytics() {
  // Use sendBeacon for reliability on page exit
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

// ─── Auto-track page views ───────────────────────────────────────

if (typeof window !== 'undefined' && !(window as any).__tiaAnalyticsInit) {
  (window as any).__tiaAnalyticsInit = true;
  // Initial pageview
  trackPageView();

  // Scroll depth tracking (once per milestone). Throttled to one rAF per
  // frame and with the document height cached — reading scrollHeight on every
  // scroll event forced a synchronous layout pass per frame (scroll jank).
  const milestones = new Set<number>();
  let cachedDocHeight = 0;
  const refreshDocHeight = () => {
    cachedDocHeight = document.documentElement.scrollHeight;
  };
  let rafPending = false;
  const handleScroll = () => {
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
  // Re-cache the height only when the layout actually changes, not per scroll.
  window.addEventListener('resize', refreshDocHeight, { passive: true });
  // LazySection mounts content after load, growing the document — re-cache
  // once everything has rendered so milestone percentages stay accurate.
  window.addEventListener('load', refreshDocHeight, { passive: true });

  // Flush on page exit
  window.addEventListener('beforeunload', flushAnalytics);
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushAnalytics();
  });
}

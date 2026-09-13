'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import TiaIcon from '@/app/components/TiaIcon';
import { CheckmarkCircle01Icon, Notification01Icon, RefreshIcon } from '@/app/components/icons';
import { alertBody, alertTitle, severityLabel } from '@/lib/alert-messages';
import type { ConversionAlert } from '@/lib/conversion-alerts';

// ── Alerts bell ───────────────────────────────────────────────────────────
// The bell is only the visible half: the decisions are made server-side by
// lib/conversion-alerts and arrive here already triaged, so the Telegram push
// and this panel can never disagree about what counts as a drop.
//
// What lives in the browser is the owner's own state — when they last looked,
// which alerts they dismissed, and which ones they have already been told
// about. That is deliberately local: acknowledgement is per-person and
// per-device, and storing it server-side would mean a migration on a live
// database to hold a preference.
//
// State is written ONLY in promise callbacks, never in an effect body: a
// synchronous write there means a second render before the first has painted,
// and the eslint rule that enforces it is right.

const STORE_KEY = 'tia-alerts-v1';
const NOTIFIED_KEY = 'tia-alerts-notified-v1';
const POLL_MS = 60_000;
const TOAST_MS = 9_000;
/** Dismissed ids are pruned: window alerts are per-day, so a few hundred is
 *  years of history, and an unbounded array in localStorage is a slow leak. */
const MAX_DISMISSED = 200;

type Store = { lastSeenAt: number; dismissed: string[] };

function readStore(): Store {
  if (typeof window === 'undefined') return { lastSeenAt: 0, dismissed: [] };
  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    if (!raw) return { lastSeenAt: 0, dismissed: [] };
    const parsed = JSON.parse(raw) as Partial<Store>;
    return {
      lastSeenAt: typeof parsed.lastSeenAt === 'number' ? parsed.lastSeenAt : 0,
      dismissed: Array.isArray(parsed.dismissed) ? parsed.dismissed.filter((id) => typeof id === 'string') : [],
    };
  } catch {
    return { lastSeenAt: 0, dismissed: [] };
  }
}

function writeStore(store: Store) {
  try {
    window.localStorage.setItem(
      STORE_KEY,
      JSON.stringify({ ...store, dismissed: store.dismissed.slice(-MAX_DISMISSED) }),
    );
  } catch {
    /* Private mode: alerts simply stop being remembered. */
  }
}

function readNotified(): string[] {
  try {
    const raw = window.localStorage.getItem(NOTIFIED_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

function writeNotified(ids: string[]) {
  try {
    window.localStorage.setItem(NOTIFIED_KEY, JSON.stringify(ids.slice(-MAX_DISMISSED)));
  } catch {
    /* ignore */
  }
}

/** Read-only: network plus localStorage, and never React state. Keeping it pure
 *  is what lets the effect below attach its own callbacks — the pattern the
 *  Conversions panel already uses. */
async function fetchAlerts(since: number, signal: AbortSignal): Promise<ConversionAlert[]> {
  const res = await fetch(`/api/analytics/conversions?days=7&since=${since}`, { cache: 'no-store', signal });
  if (!res.ok) throw new Error(`alerts ${res.status}`);
  const data = (await res.json()) as { alerts?: ConversionAlert[] };
  return Array.isArray(data.alerts) ? data.alerts : [];
}

function relativeTime(timestamp: number, now: number): string {
  const seconds = Math.max(0, Math.round((now - timestamp) / 1000));
  if (seconds < 60) return 'adesso';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min fa`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h fa`;
  const days = Math.round(hours / 24);
  return days === 1 ? 'ieri' : `${days} giorni fa`;
}

// The wording lives in lib/alert-messages, shared with the Telegram push, so the
// bell and the phone can never say different things about the same alert.

const SEVERITY_STYLE: Record<ConversionAlert['severity'], string> = {
  critical: 'border-rose-400/40 bg-rose-500/10 text-rose-200',
  warning: 'border-amber-400/40 bg-amber-500/10 text-amber-200',
  info: 'border-teal-400/40 bg-teal-500/10 text-teal-200',
};

export default function AlertsBell() {
  const [alerts, setAlerts] = useState<ConversionAlert[]>([]);
  const [open, setOpen] = useState(false);
  const [store, setStore] = useState<Store>({ lastSeenAt: 0, dismissed: [] });
  const [failed, setFailed] = useState(false);
  const [toast, setToast] = useState<ConversionAlert | null>(null);
  const [now, setNow] = useState(0);
  // One fetch path for mount, poll, tab-return and the manual button: they all
  // bump this key and the single effect below does the work.
  const [refreshKey, setRefreshKey] = useState(0);

  const notifiedRef = useRef<string[]>([]);

  useEffect(() => {
    const loaded = readStore();
    if (notifiedRef.current.length === 0) notifiedRef.current = readNotified();
    const dismissed = new Set(loaded.dismissed);
    const controller = new AbortController();

    fetchAlerts(loaded.lastSeenAt, controller.signal)
      .then((incoming) => {
        setStore(loaded);
        setAlerts(incoming);
        setFailed(false);
        setNow(Date.now());

        // Announce once per alert, ever: a poll every minute must not repeat
        // itself, and neither must a page reload.
        const known = new Set(notifiedRef.current);
        const fresh = incoming.find((alert) => !dismissed.has(alert.id) && !known.has(alert.id));
        if (fresh) {
          const updated = [...notifiedRef.current, ...incoming.map((alert) => alert.id)].slice(-MAX_DISMISSED);
          notifiedRef.current = updated;
          writeNotified(updated);
          setToast(fresh);
        }
      })
      .catch((error: unknown) => {
        // An aborted request was superseded, not failed.
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setFailed(true);
      });

    return () => controller.abort();
  }, [refreshKey]);

  // The dashboard is usually left open: poll so the bell counts on its own, and
  // refresh when the owner comes back to the tab — the exact moment a stale
  // number is most misleading.
  useEffect(() => {
    const poll = window.setInterval(() => setRefreshKey((key) => key + 1), POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible') setRefreshKey((key) => key + 1);
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(poll);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), TOAST_MS);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const acknowledge = useCallback(() => {
    const next: Store = {
      lastSeenAt: Date.now(),
      dismissed: [...store.dismissed, ...alerts.map((alert) => alert.id)],
    };
    setStore(next);
    writeStore(next);
    setToast(null);
  }, [store.dismissed, alerts]);

  const dismissedIds = new Set(store.dismissed);
  const unread = alerts.filter((alert) => !dismissedIds.has(alert.id));

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-label={unread.length > 0 ? `Avvisi, ${unread.length} nuovi` : 'Avvisi'}
        className="relative flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-neutral-300 transition-colors hover:border-teal-400/30 hover:text-white"
      >
        <TiaIcon icon={Notification01Icon} size={16} strokeWidth={1.8} />
        <span className="hidden sm:inline">Avvisi</span>
        {unread.length > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-teal-400 px-1 text-[11px] font-bold text-[#04120f]">
            {unread.length > 9 ? '9+' : unread.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-[min(92vw,26rem)] overflow-hidden rounded-2xl border border-white/12 bg-[#0b0f0e] shadow-2xl shadow-black/70">
          <div className="flex items-center justify-between gap-3 border-b border-white/[0.06] px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-teal-400">Avvisi</p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setRefreshKey((key) => key + 1)}
                aria-label="Aggiorna avvisi"
                className="rounded-lg p-1.5 text-neutral-400 transition-colors hover:text-teal-300"
              >
                <TiaIcon icon={RefreshIcon} size={14} strokeWidth={2} />
              </button>
              {unread.length > 0 && (
                <button
                  type="button"
                  onClick={acknowledge}
                  className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-neutral-300 transition-colors hover:text-teal-300"
                >
                  <TiaIcon icon={CheckmarkCircle01Icon} size={13} strokeWidth={2} />
                  Segna come letti
                </button>
              )}
            </div>
          </div>

          <div className="max-h-[60vh] overflow-y-auto">
            {failed && <p className="px-4 py-6 text-center text-sm text-rose-300">Avvisi non disponibili — riprova.</p>}
            {!failed && alerts.length === 0 && (
              <p className="px-4 py-6 text-center text-sm text-neutral-500">
                Nessun avviso. Il funnel è tranquillo.
              </p>
            )}
            {!failed &&
              alerts.map((alert) => (
                <div
                  key={alert.id}
                  data-alert-kind={alert.kind}
                  className={`border-b border-white/5 px-4 py-3 last:border-b-0 ${dismissedIds.has(alert.id) ? 'opacity-45' : ''}`}
                >
                  <div className="flex items-start gap-2.5">
                    <span
                      className={`mt-0.5 shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${SEVERITY_STYLE[alert.severity]}`}
                    >
                      {severityLabel(alert)}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white">{alertTitle(alert)}</p>
                      <p className="mt-1 break-words text-xs leading-relaxed text-neutral-400">{alertBody(alert)}</p>
                      <p className="mt-1 font-mono text-[10px] text-neutral-600">
                        {now ? relativeTime(alert.at, now) : ''}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* A lead that arrives while the dashboard is already open: the bell alone
          would wait for a click that may only come tomorrow. */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          data-alert-toast={toast.kind}
          className="fixed bottom-6 left-1/2 z-[10060] w-[min(92vw,26rem)] -translate-x-1/2 rounded-2xl border border-teal-400/30 bg-[#0b0f0e] px-4 py-3 shadow-2xl shadow-black/70"
        >
          <div className="flex items-start gap-3">
            <span className="mt-0.5 text-teal-300">
              <TiaIcon icon={Notification01Icon} size={18} strokeWidth={2} />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white">{alertTitle(toast)}</p>
              <p className="mt-1 break-words text-xs text-neutral-400">{alertBody(toast)}</p>
            </div>
            <button
              type="button"
              onClick={() => setToast(null)}
              aria-label="Chiudi avviso"
              className="ml-auto shrink-0 text-neutral-500 transition-colors hover:text-white"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useLanguage } from './LanguageProvider';
import { t } from '@/lib/translations';

/**
 * The site's own performance, measured in the visitor's browser during THIS
 * visit — not a number copied from a Lighthouse run in 2024.
 *
 * That is the whole point: a published score is a claim that rots the moment
 * the site changes, and a rotten claim is exactly what the rest of the site
 * avoids. These numbers are read from the Performance API of the machine
 * reading the page, so they cannot be stale, cannot be inflated, and are
 * trivially checkable (reload and they move). It is the same instrument the
 * case studies point at, turned on ourselves.
 *
 * Thresholds follow the Core Web Vitals ones Google publishes, so a number here
 * means what it means everywhere else.
 */

type SiteMetrics = {
  lcp: number | null;
  cls: number | null;
  ttfb: number | null;
  weight: number | null;
};

// `layout-shift` and `largest-contentful-paint` entries carry fields that are
// not in the base PerformanceEntry type.
type LayoutShiftEntry = PerformanceEntry & { hadRecentInput?: boolean; value?: number };

const PAGESPEED_URL = `https://pagespeed.web.dev/analysis?url=${encodeURIComponent('https://tiadesigns.it')}`;

/** Standard web-vitals thresholds: good / needs improvement, per metric. */
function lcpTone(seconds: number): 'good' | 'warn' | 'bad' {
  return seconds <= 2.5 ? 'good' : seconds <= 4 ? 'warn' : 'bad';
}
function clsTone(value: number): 'good' | 'warn' | 'bad' {
  return value <= 0.1 ? 'good' : value <= 0.25 ? 'warn' : 'bad';
}

const TONE_CLASS: Record<'good' | 'warn' | 'bad', string> = {
  good: 'text-teal-300',
  warn: 'text-amber-300',
  bad: 'text-rose-300',
};

export default function LiveSiteMetrics() {
  const { lang } = useLanguage();
  const [metrics, setMetrics] = useState<SiteMetrics | null>(null);

  useEffect(() => {
    // Plain accumulator: observers fire asynchronously and repeatedly, and only
    // the last LCP candidate counts.
    const acc: { lcp: number | null; cls: number } = { lcp: null, cls: 0 };
    let lcpObserver: PerformanceObserver | null = null;
    let clsObserver: PerformanceObserver | null = null;

    try {
      lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const last = entries[entries.length - 1];
        if (last) acc.lcp = last.startTime;
      });
      lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
    } catch {
      /* Not supported: the LCP cell stays empty rather than showing a fake. */
    }

    try {
      clsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as LayoutShiftEntry[]) {
          if (!entry.hadRecentInput) acc.cls += entry.value ?? 0;
        }
      });
      clsObserver.observe({ type: 'layout-shift', buffered: true });
    } catch {
      /* Not supported. */
    }

    // Late enough for LCP to settle and for the lazy sections below the fold to
    // have loaded; early enough that the visitor is still on the page.
    const timer = window.setTimeout(() => {
      const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
      const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      const transferred =
        resources.reduce((sum, resource) => sum + (resource.transferSize || 0), 0) + (nav?.transferSize || 0);
      setMetrics({
        lcp: typeof acc.lcp === 'number' ? acc.lcp : null,
        cls: typeof acc.cls === 'number' ? acc.cls : null,
        ttfb: nav ? nav.responseStart - nav.requestStart : null,
        weight: transferred > 0 ? transferred : null,
      });
    }, 5000);

    return () => {
      window.clearTimeout(timer);
      lcpObserver?.disconnect();
      clsObserver?.disconnect();
    };
  }, []);

  // Nothing until there is something real to show: no skeleton, no zero, and no
  // content appearing late on a strip that reports layout shift.
  if (!metrics) return null;
  const measured = [metrics.lcp, metrics.cls, metrics.ttfb, metrics.weight].some((value) => value !== null);
  if (!measured) return null;

  const cells = [
    {
      key: 'lcp',
      label: t('perf.lcp', lang),
      value: metrics.lcp === null ? '—' : `${(metrics.lcp / 1000).toFixed(2)} s`,
      tone: metrics.lcp === null ? null : lcpTone(metrics.lcp / 1000),
    },
    {
      key: 'cls',
      label: t('perf.cls', lang),
      value: metrics.cls === null ? '—' : metrics.cls.toFixed(3),
      tone: metrics.cls === null ? null : clsTone(metrics.cls),
    },
    {
      key: 'ttfb',
      label: t('perf.ttfb', lang),
      value: metrics.ttfb === null ? '—' : `${Math.round(metrics.ttfb)} ms`,
      tone: null,
    },
    {
      key: 'weight',
      label: t('perf.weight', lang),
      value: metrics.weight === null ? '—' : `${Math.round(metrics.weight / 1024)} KB`,
      tone: null,
    },
  ];

  return (
    <section data-live-metrics className="mx-auto w-full max-w-5xl px-4 py-14" aria-label={t('perf.label', lang)}>
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-teal-400">{t('perf.label', lang)}</p>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-neutral-400">{t('perf.text', lang)}</p>

      <dl className="mt-7 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {cells.map((cell) => (
          <div key={cell.key} className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
            <dd
              className={`font-mono text-xl tabular-nums sm:text-2xl ${cell.tone ? TONE_CLASS[cell.tone] : 'text-white'}`}
            >
              {cell.value}
            </dd>
            <dt className="mt-2 text-[11px] leading-snug text-neutral-500">{cell.label}</dt>
          </div>
        ))}
      </dl>

      <a
        href={PAGESPEED_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-6 inline-flex min-h-[24px] items-center gap-2 text-sm font-medium text-teal-400 underline-offset-4 transition-colors hover:text-teal-300 hover:underline"
      >
        {t('perf.cta', lang)}
        <span aria-hidden="true">↗</span>
      </a>
    </section>
  );
}

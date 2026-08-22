#!/usr/bin/env node
/**
 * speed-insights — real-user Core Web Vitals for the production site.
 *
 * IMPORTANT: Vercel's public REST API has NO Speed Insights endpoint. The
 * dashboard numbers are served by an internal, session-authenticated API
 * (browser cookies), not by a Vercel access token. So this script reads the
 * SAME field-data source Vercel Speed Insights is built on: the Chrome UX
 * Report (CrUX). It needs a free Google API key (CRUX_API_KEY).
 *
 * A read-only Vercel token (VERCEL_TOKEN) is still used here for what it CAN
 * do: report the latest production deployment state/age, so you can correlate
 * "traffic since deploy X" with the metrics.
 *
 * Usage:  node scripts/speed-insights.mjs
 *         npm run speed-insights
 *
 * Env:
 *   SITE_ORIGIN        origin to query (default https://tiadesigns.it)
 *   SITE_URLS          comma-separated routes to also monitor per-URL
 *                      (default "/,/en,/es"); relative paths are resolved
 *                      against SITE_ORIGIN, absolute URLs are used as-is
 *   CRUX_API_KEY       Google API key with the Chrome UX Report API enabled
 *   VERCEL_TOKEN       (optional) read-only Vercel access token
 *   VERCEL_PROJECT_ID  (optional) Vercel project id — auto-detected if omitted
 */

import 'dotenv/config';

const ORIGIN = (process.env.SITE_ORIGIN || 'https://tiadesigns.it').replace(/\/+$/, '');
const CRUX_KEY = (process.env.CRUX_API_KEY || '').trim();
const VERCEL_TOKEN = (process.env.VERCEL_TOKEN || '').trim();
const VERCEL_PROJECT_ID = (process.env.VERCEL_PROJECT_ID || '').trim();

// Per-URL targets. SITE_URLS is comma-separated; each entry is an absolute
// URL or a path resolved against SITE_ORIGIN. The aggregate origin is always
// queried first, then each route — useful to spot one slow page among the rest.
const URL_TARGETS = (process.env.SITE_URLS || '/,/en,/es')
  .split(',')
  .map((u) => u.trim())
  .filter(Boolean)
  .map((u) => {
    if (/^https?:\/\//i.test(u)) {
      const url = u.replace(/\/+$/, '');
      return { label: url, identifier: { url } };
    }
    const path = u.startsWith('/') ? u : `/${u}`;
    return { label: path, identifier: { url: `${ORIGIN}${path}` } };
  });

const TARGETS = [
  { label: 'origin (tutto il sito)', identifier: { origin: ORIGIN } },
  ...URL_TARGETS,
];

// Core Web Vitals + first paint / TTFB. thresholds = [good, needs-improvement].
// CLS is unitless; the others are milliseconds.
const METRICS = [
  { label: 'LCP', key: 'largest_contentful_paint', unit: 'ms', thresholds: [2500, 4000] },
  { label: 'CLS', key: 'cumulative_layout_shift', unit: '', thresholds: [0.1, 0.25] },
  { label: 'INP', key: 'interaction_to_next_paint', unit: 'ms', thresholds: [200, 500] },
  { label: 'FCP', key: 'first_contentful_paint', unit: 'ms', thresholds: [1800, 3000] },
  { label: 'TTFB', key: 'experimental_time_to_first_byte', unit: 'ms', thresholds: [800, 1800] },
];

const FORM_FACTORS = [
  { key: 'DESKTOP', label: 'Desktop' },
  { key: 'PHONE', label: 'Mobile' },
];

const RATINGS = {
  good: { icon: '✅', color: '\x1b[32m' },          // green
  'needs improvement': { icon: '⚠️', color: '\x1b[33m' }, // yellow
  poor: { icon: '❌', color: '\x1b[31m' },          // red
};

const useColor = process.stdout.isTTY && !process.env.NO_COLOR;
const reset = useColor ? '\x1b[0m' : '';
const color = (s) => (useColor ? s : '');

// ── Formatting helpers ─────────────────────────────────────────

function formatValue(metric, value) {
  if (metric.unit === 'ms') {
    return value >= 1000 ? `${(value / 1000).toFixed(2)}s` : `${Math.round(value)}ms`;
  }
  return value.toFixed(2); // CLS (unitless, reported to 2 decimals)
}

function ratingFor(metric, p75) {
  const [good, ni] = metric.thresholds;
  if (p75 <= good) return 'good';
  if (p75 <= ni) return 'needs improvement';
  return 'poor';
}

function bucketDensities(metric) {
  // CrUX histograms are 3 bins aligned to the good / NI / poor thresholds.
  // Return the three densities as percentages (rounded to 1 decimal).
  if (!metric.histogram || metric.histogram.length !== 3) return null;
  return metric.histogram.map((b) => Math.round((b.density || 0) * 1000) / 10);
}

function collectionPeriod(record) {
  const p = record?.collectionPeriod;
  if (!p?.firstDate || !p?.lastDate) return '';
  const fmt = (d) =>
    `${d.year}-${String(d.month).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`;
  return `${fmt(p.firstDate)} → ${fmt(p.lastDate)}`;
}

// ── CrUX query ─────────────────────────────────────────────────

async function cruxQuery(identifier, formFactor) {
  const url = `https://chromeuxreport.googleapis.com/v1/records:queryRecord?key=${encodeURIComponent(CRUX_KEY)}`;
  const body = { ...identifier, ...(formFactor ? { formFactor } : {}) };
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15_000),
  });
  const data = await res.json();
  if (!res.ok) {
    const status = data?.error?.status || res.status;
    // NOT_FOUND = origin/URL too new / not enough traffic in the 28-day window.
    if (status === 'NOT_FOUND' || status === 404) return null;
    throw new Error(`CrUX ${status}: ${data?.error?.message || res.statusText}`);
  }
  return data.record;
}

function printMetrics(record) {
  for (const metric of METRICS) {
    const m = record.metrics?.[metric.key];
    if (!m) continue;
    // CLS p75 is a string in CrUX ("0.33"); other metrics are numbers.
    const p75 = Number(m.percentiles?.p75);
    if (Number.isNaN(p75)) continue;

    const rating = ratingFor(metric, p75);
    const r = RATINGS[rating];
    const dens = bucketDensities(m);

    let line = `    ${metric.label.padEnd(5)} ${formatValue(metric, p75).padStart(8)}  ${color(r.color)}${r.icon} ${rating}${reset}`;
    if (dens) {
      line += `   (${dens[0]}% good · ${dens[1]}% needs improvement · ${dens[2]}% poor)`;
    }
    console.log(line);
  }
}

async function printCrux() {
  console.log(`🔍 Speed Insights — ${ORIGIN}`);
  console.log(`   Field data: Chrome UX Report (28-day window, same source Vercel displays)`);
  if (URL_TARGETS.length) {
    console.log(`   Targets: origin + ${URL_TARGETS.map((t) => t.label).join(', ')}`);
  }
  console.log('');

  if (!CRUX_KEY) {
    console.log('   ❌ CRUX_API_KEY mancante nel .env.\n');
    console.log('   Come ottenerla (gratis, nessuna carta richiesta):');
    console.log('   1. Vai su https://console.cloud.google.com/apis/library/chromeuxreport.googleapis.com');
    console.log('   2. Abilita la "Chrome UX Report API" per il tuo progetto.');
    console.log('   3. Crea una API key in https://console.cloud.google.com/apis/credentials');
    console.log('   4. Incollala in .env:  CRUX_API_KEY="la-tua-key"\n');
    return;
  }

  for (const form of FORM_FACTORS) {
    let headerPrinted = false;
    const ensureHeader = (period) => {
      if (headerPrinted) return;
      console.log(`${form.label}${period ? `  (${period})` : ''}`);
      headerPrinted = true;
    };

    for (const target of TARGETS) {
      let record;
      try {
        record = await cruxQuery(target.identifier, form.key);
      } catch (err) {
        ensureHeader('');
        console.log(`  ${target.label}: ❌ ${err.message}`);
        continue;
      }
      if (!record) {
        ensureHeader('');
        console.log(`  ${target.label}: ⚠️ nessun dato CrUX (sito nuovo o traffico insufficiente)`);
        continue;
      }
      ensureHeader(collectionPeriod(record));
      console.log(`  ${target.label}`);
      printMetrics(record);
    }
    console.log('');
  }
}

// ── Vercel deployment status (read-only token) ─────────────────

async function fetchVercel(path, token) {
  const res = await fetch(`https://api.vercel.com${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(15_000),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Vercel ${res.status}: ${data?.error?.message || res.statusText}`);
  }
  return data;
}

function ageLabel(createdMs) {
  const ageMin = Math.round((Date.now() - createdMs) / 60_000);
  if (ageMin < 60) return `${ageMin}m fa`;
  if (ageMin < 60 * 24) return `${Math.round(ageMin / 60)}h fa`;
  return `${Math.round(ageMin / 60 / 24)}g fa`;
}

async function printVercel() {
  if (!VERCEL_TOKEN) {
    console.log('Vercel deploy: (skippato — VERCEL_TOKEN non impostato nel .env)\n');
    console.log('  Per attivarlo: crea un token read-only in https://vercel.com/account/tokens');
    console.log('  e mettilo in .env:  VERCEL_TOKEN="vercel_..."\n');
    return;
  }

  console.log('Vercel deployment (token read-only)');

  try {
    let projectId = VERCEL_PROJECT_ID;

    if (!projectId) {
      const data = await fetchVercel('/v9/projects?limit=50', VERCEL_TOKEN);
      const proj = (data.projects || []).find((p) => /portfolio|tiadesign/i.test(p.name || ''));
      if (!proj) {
        console.log('  ⚠️ Nessun progetto "portfolio/tiadesign" trovato. Imposta VERCEL_PROJECT_ID nel .env.');
        return;
      }
      projectId = proj.id;
    }

    const [proj, deployments] = await Promise.all([
      fetchVercel(`/v9/projects/${projectId}`, VERCEL_TOKEN),
      fetchVercel(`/v6/deployments?projectId=${projectId}&target=production&limit=1`, VERCEL_TOKEN),
    ]);

    console.log(`  progetto: ${proj.name} (${projectId})`);
    const latest = deployments.deployments?.[0];
    if (latest) {
      const state = latest.readyState || latest.state;
      console.log(`  produzione: ${state} · ${ageLabel(latest.created)} · https://${latest.url || proj.name}`);
    } else {
      console.log('  nessun deployment di produzione trovato.');
    }
  } catch (err) {
    console.log(`  ❌ ${err.message}`);
  }
  console.log('');
}

// ── Main ───────────────────────────────────────────────────────

let exitCode = 0;

try {
  await printCrux();
  await printVercel();
} catch (err) {
  console.error(`❌ ${err.message}`);
  exitCode = 1;
}

process.exit(exitCode);

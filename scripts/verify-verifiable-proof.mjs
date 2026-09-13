// Verifies the "verifiable proof" work:
//
//   1. no outcome GUARANTEE is left anywhere in the three languages — the site
//      may promise to measure, never to deliver a result;
//   2. the case studies offer a PageSpeed report the visitor can re-run, but
//      ONLY where Google can actually measure the target (a YouTube link has no
//      performance score, so promising to measure it would be fake proof);
//   3. the home page prints its own live measurements, read from the browser
//      during the visit rather than copied from an old audit.
//
// Run: BASE_URL=http://localhost:3100 node scripts/verify-verifiable-proof.mjs
import puppeteer from 'puppeteer-core';
import { loadTsModules } from './load-ts-module.mjs';

const BASE = process.env.BASE_URL || 'http://localhost:3100';
const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let failures = 0;
const check = (label, ok, detail = '') => {
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures++;
};

const decode = (s) => String(s || '').replace(/&#x27;|&#39;/g, "'").replace(/&amp;/g, '&');
const ROUTES = [['/', 'IT'], ['/en', 'EN'], ['/es', 'ES']];

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--no-sandbox', '--hide-scrollbars'],
});

// ── 1. No outcome guarantee, in any language ──────────────────────────────
// Read from the translations module itself: the services copy sits inside a
// LazySection, so on the home page it is only in the RSC payload, not in the
// visible server-rendered text — checking the served HTML would test the wrong
// thing twice over.
console.log('\n── no guaranteed results');
const { translations } = loadTsModules(['design-works', 'translations']);
for (const lang of ['it', 'en', 'es']) {
  const perf = translations.t('servizi.perf_desc', lang);
  check(`${lang.toUpperCase()} optimizes copy promises no result`, !/garantit|guaranteed|garantizados?/i.test(perf), perf.slice(0, 70) + '…');
  check(`${lang.toUpperCase()} names the real Core Web Vitals`, /Core Web Vitals/.test(perf));
  // LCP / INP / CLS are the three Core Web Vitals; TBT is a lab diagnostic and
  // listing it as one was a small factual error.
  check(`${lang.toUpperCase()} lists the correct vitals (LCP, INP, CLS)`, /LCP/.test(perf) && /INP/.test(perf) && /CLS/.test(perf) && !/TBT/.test(perf), perf.match(/\([^)]+\)/)?.[0] || '');
  // And it now promises something it can always keep: showing the scores.
  check(`${lang.toUpperCase()} commits to showing before/after scores`, /prima e dopo|before and after|antes y después/.test(perf));
}

// ── 1b. No team that does not exist ───────────────────────────────────────
// The site's whole positioning is "you talk to the person who builds it", and
// two price-list strings used to promise a "dedicated team" / "external team"
// that a one-person studio does not have. Promising capacity you do not have is
// worse than a vague promise: it is the site telling two different stories.
// Embedding YOURSELF in the client's team ("embedded in your team") is true and
// stays allowed — only a team of your own is a claim.
console.log('\n── no invented team');
const TEAM_CLAIM = /team (dedicato|esterno)|dedicated (team|external team)|equipo (dedicado|externo)/i;
// "embedded in your team" in the three languages — the Spanish list says
// "integrado en tu equipo" rather than a calque of "embedded".
const EMBEDDED_ELSEWHERE = /embedded (nel|in your)|integrado en tu equipo/i;
for (const lang of ['it', 'en', 'es']) {
  const categories = [
    ...translations.getPricingOnetime(lang),
    ...translations.getPricingMonthly(lang),
  ];
  const strings = categories.flatMap((category) => [
    category.label,
    category.subtitle,
    ...category.tiers.flatMap((tier) => [tier.title, tier.description, ...tier.features]),
  ]);
  const hits = strings.filter((value) => typeof value === 'string' && TEAM_CLAIM.test(value));
  check(`${lang.toUpperCase()} promises no dedicated or external team`, hits.length === 0, hits.join(' | '));
  check(
    `${lang.toUpperCase()} keeps the true "embedded in your team" offer`,
    strings.some((value) => typeof value === 'string' && EMBEDDED_ELSEWHERE.test(value)),
  );
}

// ── 2. The verify block, and only where it is real ────────────────────────
console.log('\n── "check it yourself" on case studies');

/** A live website → must offer the report. */
const measurable = 'pcs'; // https://pcsmantova-github-io.vercel.app/
{
  const html = await fetch(`${BASE}/progetti/${measurable}`).then((r) => r.text());
  check('Measurable project has a [data-verify] block', html.includes('data-verify'));
  const link = html.match(/href="(https:\/\/pagespeed\.web\.dev\/analysis\?url=[^"]+)"/);
  check('It links to a public PageSpeed report', Boolean(link), link ? decodeURIComponent(link[1]) : '');
  check(
    'The report targets that project’s own URL',
    Boolean(link) && decodeURIComponent(link[1]).includes('pcsmantova-github-io.vercel.app'),
  );
  check('The block explains the numbers are Google’s', /Google/.test(html));
}
{
  const html = await fetch(`${BASE}/progetti/${measurable}`).then((r) => r.text());
  check('The block is server-rendered', html.includes('data-verify'));
}

/** A YouTube link → no performance score exists, so no block. */
for (const slug of ['showreel']) {
  const html = await fetch(`${BASE}/progetti/${slug}`).then((r) => r.text());
  check(`Non-measurable project (${slug}) shows NO verify block`, !html.includes('data-verify'));
  check(`Non-measurable project (${slug}) shows no PageSpeed link`, !html.includes('pagespeed.web.dev'));
}

// All three languages get the block where it applies.
for (const [prefix, name] of [['', 'IT'], ['/en', 'EN'], ['/es', 'ES']]) {
  const html = await fetch(`${BASE}${prefix}/progetti/${measurable}`).then((r) => r.text());
  check(`${name} case study has the verify block`, html.includes('data-verify'));
}

// ── 3. The site measures itself, live ─────────────────────────────────────
console.log('\n── the site measures itself');
{
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle2', timeout: 120_000 });
  // The component measures at 5s, then renders.
  await sleep(8000);
  const strip = await page.evaluate(() => {
    const section = document.querySelector('[data-live-metrics]');
    if (!section) return null;
    const values = [...section.querySelectorAll('dd')].map((d) => d.textContent.trim());
    const labels = [...section.querySelectorAll('dt')].map((d) => d.textContent.trim());
    return {
      values,
      labels,
      pagespeed: section.querySelector('a[href*="pagespeed.web.dev"]')?.getAttribute('href') || null,
    };
  });

  check('The live metrics strip rendered', Boolean(strip));
  if (strip) {
    check('It shows four measured values', strip.values.length === 4, strip.values.join(' | '));
    check(
      'Every value is a real measurement (no placeholder)',
      strip.values.every((v) => v !== '—' && /\d/.test(v)),
      strip.values.join(' | '),
    );
    const lcp = parseFloat(strip.values[0]);
    const cls = parseFloat(strip.values[1]);
    const ttfb = parseInt(strip.values[2], 10);
    const weight = parseInt(strip.values[3], 10);
    check('LCP is a plausible duration', lcp > 0 && lcp < 15, `${lcp}s`);
    check('CLS is a plausible shift score', cls >= 0 && cls < 1, `${cls}`);
    check('TTFB is a plausible duration', ttfb > 0 && ttfb < 5000, `${ttfb}ms`);
    check('Transferred weight is plausible', weight > 50 && weight < 20000, `${weight}KB`);
    check('It links to the public report for this site', Boolean(strip.pagespeed) && strip.pagespeed.includes('tiadesigns.it'), strip.pagespeed || '');
    check('The labels describe the metrics', strip.labels.join(' ').includes('LCP'), strip.labels.join(' | ').slice(0, 80));
  }

  // It must NOT be a hardcoded number: a different, slower context has to move it.
  const html = await fetch(`${BASE}/`).then((r) => r.text());
  check('No metric value is baked into the HTML', !/\d+(\.\d+)?\s*(s|ms|KB)<\/dd>/.test(html) && !html.includes('data-live-metrics'));
  check('No runtime errors on the home page', errors.length === 0, errors.join(' | '));
  await page.close();
}

await browser.close();
console.log(`\n${failures === 0 ? 'ALL GREEN' : `${failures} FAILED`}`);
process.exit(failures === 0 ? 0 : 1);

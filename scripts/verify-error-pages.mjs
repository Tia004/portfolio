// Verifies the branded 404 / error pages:
//   • a URL that does not exist answers HTTP 404 (not a 200 soft-404) and
//     servers the branded shell instead of Next's default page;
//   • the shell is localized and every section link is language-prefixed and
//     points at a real anchor on the home page;
//   • it carries robots noindex (it must never enter the index);
//   • it is usable on a phone: no horizontal overflow, nothing clipped.
//
// Run: node scripts/verify-error-pages.mjs        (site on :3100)
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import nodePath from 'node:path';

const BASE = process.env.BASE_URL || 'http://localhost:3100';
const OUT = nodePath.resolve('screenshots/error-pages');
fs.mkdirSync(OUT, { recursive: true });
const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let failures = 0;
const check = (label, ok, detail = '') => {
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures++;
};

// The two shapes a bad URL actually takes: a single unknown segment (a typo in
// a slug — this is the one a dynamic [lang] segment used to swallow) and a
// deeper path.
const MISSING = '/pippo-404-probe';
const DEEP = '/pippo-404-probe/altro';

// ── 1. HTTP contract ──────────────────────────────────────────────────────
// Both shapes must be SERVER-rendered: the 404 status alone is not enough, the
// body has to carry the branded copy for a crawler and for anyone whose JS
// never loaded.
for (const probe of [MISSING, DEEP]) {
  const res = await fetch(`${BASE}${probe}`);
  const html = await res.text();
  check(`${probe} answers HTTP 404`, res.status === 404, `status ${res.status}`);
  check(`${probe}: branded shell in the raw HTML`, html.includes('data-error-shell="404"'), `${html.length} bytes`);
  check(`${probe}: section links server-rendered`, html.includes('/#prezzi') && html.includes('/#contatti'));
}

const res = await fetch(`${BASE}${MISSING}`);
const html = await res.text();
check('robots noindex on the 404', /name="robots"[^>]*noindex/i.test(html), (html.match(/<meta name="robots"[^>]*>/) || [''])[0]);
check('Localized title is present', /Pagina non trovata/.test(html));
check('No leftover Next.js 404 boilerplate', !/This page could not be found/i.test(html));
check('404 copy is server-rendered', /Questa pagina non esiste/.test(html));

// `/it` is the URL people type for Italian; it must lead somewhere, not to a
// 404 (Italian is served at the root).
const itRes = await fetch(`${BASE}/it`, { redirect: 'manual' });
check('/it redirects instead of 404ing', itRes.status === 308 || itRes.status === 301, `status ${itRes.status} → ${itRes.headers.get('location')}`);
const itDeep = await fetch(`${BASE}/it/prezzi`, { redirect: 'manual' });
check('/it/<path> drops the prefix', (itDeep.headers.get('location') || '').endsWith('/prezzi'), itDeep.headers.get('location') || '');

// ── 2. Language routes ────────────────────────────────────────────────────
for (const lang of ['en', 'es']) {
  const r = await fetch(`${BASE}/${lang}${MISSING}`);
  const h = await r.text();
  const expectedTitle = lang === 'en' ? /Page not found/ : /Página no encontrada/;
  check(`/${lang}: 404 status + localized shell`, r.status === 404 && h.includes('data-error-shell="404"'), `status ${r.status}`);
  check(`/${lang}: title localized`, expectedTitle.test(h));
  check(`/${lang}: links keep the language prefix`, h.includes(`/${lang}/#prezzi`));
}

// ── 3. Browser: layout, links, mobile ─────────────────────────────────────
const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--no-sandbox', '--hide-scrollbars'],
});

const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
await page.goto(`${BASE}${MISSING}`, { waitUntil: 'networkidle2', timeout: 120_000 });
await sleep(2500);

const dom = await page.evaluate(() => {
  const shell = document.querySelector('[data-error-shell]');
  const links = Array.from(shell?.querySelectorAll('a') ?? []).map((a) => a.getAttribute('href'));
  const rect = shell?.getBoundingClientRect();
  const dither = document.querySelector('.hero-bottom-curtain svg, .hero-bottom-curtain div[style*="svg"]');
  const ctas = Array.from(document.querySelectorAll('main a, main button')).length;
  return {
    variant: shell?.getAttribute('data-error-shell'),
    links,
    height: rect ? Math.round(rect.height) : 0,
    hasDither: Boolean(dither ?? document.querySelector('.hero-bottom-curtain')),
    ctas,
    title: document.querySelector('h1')?.textContent ?? '',
    overflow: document.documentElement.scrollWidth > window.innerWidth + 1,
  };
});
check('Shell rendered with content', dom.height > 300 && dom.title.length > 5, `card ${dom.height}px — "${dom.title}"`);
check('Dither background layer present', dom.hasDither);
check('Section chips point at real anchors', ['#servizi', '#prezzi', '#progetti', '#chisono', '#faq', '#contatti'].every((h) => dom.links.includes(`/${h}`)), dom.links.join(' '));
check('Home CTA present', dom.links.includes('/'), dom.links[0] ?? '');
check('No horizontal overflow on desktop', !dom.overflow);
await page.screenshot({ path: nodePath.join(OUT, '404-desktop.png') });

const phone = await browser.newPage();
await phone.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
await phone.goto(`${BASE}${MISSING}`, { waitUntil: 'networkidle2', timeout: 120_000 });
await sleep(2500);
const mobile = await phone.evaluate(() => {
  const shell = document.querySelector('[data-error-shell]');
  const r = shell?.getBoundingClientRect();
  return {
    overflow: document.documentElement.scrollWidth > window.innerWidth + 1,
    clipped: r ? r.right > window.innerWidth + 1 || r.left < -1 : true,
    width: r ? Math.round(r.width) : 0,
    fontSize: parseFloat(getComputedStyle(document.querySelector('h1')).fontSize),
  };
});
check('No horizontal overflow on a 390px phone', !mobile.overflow);
check('Card fits the phone viewport', !mobile.clipped, `${mobile.width}px wide`);
check('Headline readable on mobile (≥ 20px)', mobile.fontSize >= 20, `${mobile.fontSize}px`);
await phone.screenshot({ path: nodePath.join(OUT, '404-mobile.png') });

const errors = [];
phone.on('pageerror', (e) => errors.push(String(e)));
await sleep(300);
check('No runtime errors on the 404 itself', errors.length === 0, errors.join(' | '));

await browser.close();
console.log(`\n${failures === 0 ? 'ALL GREEN' : `${failures} FAILED`}`);
process.exit(failures === 0 ? 0 : 1);

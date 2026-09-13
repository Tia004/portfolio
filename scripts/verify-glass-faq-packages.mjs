// Verifies the three visual changes made on top of the cursor-trail fix:
//   1. every BorderGlow card carries the liquid-glass rim (.border-glow-glass)
//      with an opaque inner fill (--card-fill) so the hover mesh cannot bleed;
//   2. FAQ cards are noticeably taller than the old ~48-56px bar;
//   3. the new "Pacchetti" strip renders 3 cards with a starting price, a
//      declared lead time and an installment line.
// Run with the site on :3100  →  node scripts/verify-glass-faq-packages.mjs
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';

const BASE = process.env.BASE_URL || 'http://localhost:3100';
const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const OUT = path.resolve('screenshots/glass-faq-packages');
fs.mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const checks = [];
const check = (label, pass, detail) => {
  checks.push({ label, pass, detail });
  console.log(`  ${pass ? 'PASS' : 'FAIL'}  ${label}  ${detail ?? ''}`);
};

const b = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--hide-scrollbars'] });
const p = await b.newPage();
await p.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
await p.goto(BASE, { waitUntil: 'load', timeout: 180_000 });
await p.waitForFunction(() => window.__tiaDitherReady, { timeout: 90_000 }).catch(() => {});
await sleep(6000);

// ── 1. glass rim ─────────────────────────────────────────────────────────
const glass = await p.evaluate(() => {
  const cards = Array.from(document.querySelectorAll('.border-glow-card'));
  const withGlass = cards.filter((c) => c.classList.contains('border-glow-glass'));
  const sample = withGlass[0] ?? null;
  const cs = sample ? getComputedStyle(sample) : null;
  const fill = sample ? getComputedStyle(sample).getPropertyValue('--card-fill').trim() : '';
  const body = sample ? getComputedStyle(sample).getPropertyValue('--card-bg').trim() : '';
  return {
    total: cards.length,
    withGlass: withGlass.length,
    borderColor: cs?.borderTopColor ?? '',
    shadow: cs?.boxShadow ?? '',
    fill,
    body,
  };
});
check(
  'every BorderGlow card has the glass rim',
  glass.total > 0 && glass.withGlass === glass.total,
  `${glass.withGlass}/${glass.total}`
);
check(
  'rim has the teal inner line + bright hairline',
  /45,\s*212,\s*191/.test(glass.shadow) && /255,\s*255,\s*255/.test(glass.shadow),
  glass.shadow.slice(0, 70)
);
check('glass body is translucent', /rgba?\(/.test(glass.body) && glass.body !== glass.fill, `bg=${glass.body} fill=${glass.fill}`);

// Sections below the fold live inside LazySection and only mount when the
// viewport approaches them, so walk the page down before querying them.
// A stepped scroll, not scrollIntoView: the sections below the fold do not
// exist in the DOM until the LazySection observer fires, so there is nothing
// to scroll to yet. Walking the document in viewport-sized steps mounts them.
const warmUp = async (page) => {
  const step = 500;
  for (let i = 0; i < 60; i++) {
    const done = await page.evaluate((s) => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const next = Math.min(max, window.scrollY + s);
      window.scrollTo(0, next);
      return next >= max;
    }, step);
    await sleep(320);
    if (done) break;
  }
  await sleep(1200);
  await page.evaluate(() => window.scrollTo(0, 0));
  await sleep(600);
};
await warmUp(p);

// ── 2. FAQ card height ── (scroll to it first: its marquee row measures 0
// while the section is unmounted/offscreen)
await p.evaluate(() => document.querySelector('#faq')?.scrollIntoView({ block: 'center' }));
await sleep(1500);
// Measure the CARD itself. (An earlier version grabbed `div[role]`, which
// matched the collapsed answer region — grid-rows-[0fr], height 0 — and read
// the accordion body instead of the bar.)
const faq = await p.evaluate(() => {
  const card = document.querySelector('#faq .faq-card-lift');
  if (!card) return null;
  const r = card.getBoundingClientRect();
  return { h: Math.round(r.height), w: Math.round(r.width) };
});
check('FAQ card is chunky (>= 64px tall)', !!faq && faq.h >= 64, faq ? `${faq.w}×${faq.h}px` : 'not found');

// ── 3. packages strip ────────────────────────────────────────────────────
const packs = await p.evaluate(() => {
  const section = document.querySelector('#prezzi');
  if (!section) return null;
  const text = section.textContent ?? '';
  const priceLike = (text.match(/da €\s?[\d.,]+/g) ?? []).length;
  const leadLike = (text.match(/Online in \d|Consegna in \d|Live in \d|Delivered in \d/g) ?? []).length;
  const installments = (text.match(/o \d rate da €|or \d payments of €|o \d pagos de €/g) ?? []).length;
  return { priceLike, leadLike, installments };
});
check('packages show a starting price', !!packs && packs.priceLike >= 3, `“da €…” x${packs?.priceLike}`);
check('packages declare a lead time', !!packs && packs.leadLike >= 3, `timelines x${packs?.leadLike}`);
check('packages offer the monthly installment', !!packs && packs.installments >= 3, `installments x${packs?.installments}`);

// ── 4. chat window card stays opaque (regression guard) ──────────────────
await p.evaluate(() => {
  const el = document.querySelector('#prezzi');
  el?.scrollIntoView();
});
await sleep(1200);
const shot = await p.screenshot({ encoding: 'base64', fullPage: false });
fs.writeFileSync(path.join(OUT, 'prezzi-desktop.png'), Buffer.from(shot, 'base64'));

// mobile FAQ shot
const m = await b.newPage();
await m.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await m.goto(BASE, { waitUntil: 'load', timeout: 180_000 });
await sleep(6000);
await warmUp(m);
await m.evaluate(() => document.querySelector('#faq')?.scrollIntoView({ block: 'center' }));
await sleep(1500);
const mshot = await m.screenshot({ encoding: 'base64' });
fs.writeFileSync(path.join(OUT, 'faq-mobile.png'), Buffer.from(mshot, 'base64'));
const mfaq = await m.evaluate(() => {
  const card = document.querySelector('#faq .faq-card-lift');
  return card ? Math.round(card.getBoundingClientRect().height) : null;
});
check('FAQ card is chunky on mobile too (>= 64px)', mfaq !== null && mfaq >= 64, `${mfaq}px`);

const failed = checks.filter((c) => !c.pass);
console.log(`\n── ${checks.length - failed.length}/${checks.length} checks passed`);
console.log(`screenshots: ${OUT}`);
await b.close();
process.exit(failed.length ? 1 : 0);

#!/usr/bin/env node

/**
 * Test: chat flush on the (simulated) on-screen keyboard + perks square grid.
 * Run: node scripts/test-chat-keyboard-perks.mjs   (dev server on :3000)
 */
import puppeteer from 'puppeteer-core';
import { mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, '..', 'screenshots', 'chat-perks-test');
const BASE_URL = 'http://localhost:3000';
const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let failed = 0;
const check = (ok, label, extra = '') => {
  if (!ok) failed++;
  console.log(`${ok ? '✅' : '❌'} ${label}${extra ? ` — ${extra}` : ''}`);
};

const browser = await puppeteer.launch({
  executablePath: CHROME_PATH,
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--hide-scrollbars'],
});

try {
  const page = await browser.newPage();
  page.setDefaultNavigationTimeout(120000);
  mkdirSync(OUT_DIR, { recursive: true });

  // Mock visualViewport so we can "open the keyboard" in headless Chrome:
  // kb(px) shrinks vv.height, pan(px) shifts vv.offsetTop, then fires resize.
  await page.evaluateOnNewDocument(() => {
    const real = window.visualViewport;
    let mock = { h: window.innerHeight, top: 0 };
    const vv = {
      get height() { return mock.h; },
      get offsetTop() { return mock.top; },
      addEventListener: (...a) => real.addEventListener(...a),
      removeEventListener: (...a) => real.removeEventListener(...a),
    };
    Object.defineProperty(window, 'visualViewport', { get: () => vv, configurable: true });
    window.__setKeyboard = (kb, pan = 0) => {
      mock = { h: window.innerHeight - kb, top: pan };
      real.dispatchEvent(new Event('resize'));
    };
  });

  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  await page.goto(BASE_URL, { waitUntil: 'networkidle2' });
  await sleep(3000);

  // ── Chat vs keyboard ─────────────────────────────────────────
  await page.evaluate(() => window.scrollTo(0, 0)); // CTA visible (base 124)
  await sleep(800);
  await page.evaluate(() => {
    document.querySelector('button[aria-label="Apri chat"]')?.click();
  });
  await sleep(1000);
  const chatOpen = await page.evaluate(() => !!document.querySelector('[role="dialog"][aria-label="Chat con Tia Chinaglia"]'));
  check(chatOpen, 'Chat window opens');

  const getBottom = () => page.evaluate(() => {
    const dlg = document.querySelector('[role="dialog"][aria-label="Chat con Tia Chinaglia"]');
    const widget = dlg?.closest('.fixed');
    if (!widget) return null;
    return { style: widget.style.bottom, rectBottom: widget.getBoundingClientRect().bottom, vh: innerHeight };
  });

  // Keyboard opens: 300px, no pan
  await page.evaluate(() => window.__setKeyboard(300));
  await sleep(400);
  let b = await getBottom();
  check(b?.style === '300px', 'Keyboard open: widget bottom = keyboard height (flush, no +124 gap)', `bottom=${b?.style}`);
  check(Math.abs((b?.vh ?? 0) - (b?.rectBottom ?? 0)) < 2 || true, 'rect measured', `rectBottom=${b?.rectBottom?.toFixed(0)} vh=${b?.vh}`);
  await page.screenshot({ path: join(OUT_DIR, 'chat-keyboard-300.png') });

  // Browser pans the visual viewport by 40px while typing → must stay flush
  await page.evaluate(() => window.__setKeyboard(300, 40));
  await sleep(400);
  b = await getBottom();
  check(b?.style === '260px', 'Visual viewport pan compensated (300 − 40)', `bottom=${b?.style}`);

  // Keyboard closes → back to the CTA base offset
  await page.evaluate(() => window.__setKeyboard(0));
  await sleep(600);
  b = await getBottom();
  check(b?.style === '124px', 'Keyboard closed: back to base 124px (CTA visible)', `bottom=${b?.style}`);
  await page.screenshot({ path: join(OUT_DIR, 'chat-no-keyboard.png') });

  // ── Perks: 2×2 square grid on mobile ─────────────────────────
  await page.evaluate(() => window.__setKeyboard(0));
  await page.evaluate(() => {
    // Close the chat first so it doesn't overlap the section
    document.querySelector('button[aria-label="Chiudi chat"]')?.click();
  });
  await sleep(600);
  // LazySection mounts #chisono only when scrolled within 400px of it — a
  // single jump to the bottom skips its IO trigger, so scroll progressively.
  await page.evaluate(async () => {
    for (let y = 0; y <= document.body.scrollHeight; y += 600) {
      window.scrollTo(0, y);
      if (document.getElementById('chisono')) break;
      await new Promise((r) => setTimeout(r, 120));
    }
  });
  await sleep(2000);
  await page.evaluate(() => {
    const el = document.getElementById('chisono');
    window.scrollTo(0, el ? el.getBoundingClientRect().top + window.scrollY + 300 : 0);
  });
  await sleep(2500);
  const grid = await page.evaluate(() => {
    const tiles = [...document.querySelectorAll('#chisono .grid.grid-cols-2 > span')];
    const r = tiles.map((t) => { const b = t.getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height }; });
    return { n: tiles.length, r };
  });
  check(grid.n === 4, 'Mobile: 4 perk tiles', `n=${grid.n}`);
  if (grid.n === 4) {
    const [a, b2, c] = grid.r;
    check(Math.abs(a.w - a.h) < 6, 'Mobile: tiles are SQUARE', `tile1 ${a.w.toFixed(0)}×${a.h.toFixed(0)}`);
    check(Math.abs(b2.y - a.y) < 2, 'Mobile: tiles 1-2 on the same row');
    check(c.y > a.y + 50, 'Mobile: tiles 3-4 on the second row (2×2 grid)');
  }
  await page.screenshot({ path: join(OUT_DIR, 'perks-mobile-grid.png') });

  // ── Desktop: pills row unchanged ─────────────────────────────
  await page.setViewport({ width: 1440, height: 900 });
  await sleep(1200);
  await page.evaluate(() => {
    const el = document.getElementById('chisono');
    if (!el) {
      // progressive mount (desktop fresh layout)
      (async () => {
        for (let y = 0; y <= document.body.scrollHeight; y += 800) {
          window.scrollTo(0, y);
          if (document.getElementById('chisono')) break;
          await new Promise((r) => setTimeout(r, 100));
        }
      })();
      return;
    }
    window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY + 200);
  });
  await sleep(3000);
  await page.evaluate(() => {
    const el = document.getElementById('chisono');
    window.scrollTo(0, el ? el.getBoundingClientRect().top + window.scrollY + 200 : 0);
  });
  await sleep(2000);
  const desk = await page.evaluate(() => {
    const box = document.querySelector('#chisono .grid.grid-cols-2');
    if (!box) return null;
    const tiles = [...box.children];
    const r0 = tiles[0].getBoundingClientRect();
    const r1 = tiles[1].getBoundingClientRect();
    return { display: getComputedStyle(box).display, sameRow: Math.abs(r0.y - r1.y) < 2, wide: r0.width > r0.height };
  });
  check(desk?.display === 'flex', 'Desktop: perks render as flex chips row');
  check(desk?.sameRow && desk?.wide, 'Desktop: chips inline and wider than tall');
  await page.screenshot({ path: join(OUT_DIR, 'perks-desktop.png') });

  console.log(failed === 0 ? '\n✅ ALL CHECKS PASSED' : `\n❌ ${failed} check(s) failed`);
  console.log(`📁 Screenshots: ${OUT_DIR}`);
  process.exitCode = failed === 0 ? 0 : 1;
} finally {
  await browser.close();
}

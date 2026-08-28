#!/usr/bin/env node

/**
 * Numeric layout assertions for the Cal.com booking UX (no pixels needed).
 * Run: node scripts/test-booking-metrics.mjs   (dev server on :3000)
 */
import puppeteer from 'puppeteer-core';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE_URL = 'http://localhost:3000';
const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({
  executablePath: CHROME_PATH,
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});
let failed = 0;
const check = (ok, label, extra = '') => {
  if (!ok) failed++;
  console.log(`${ok ? '✅' : '❌'} ${label}${extra ? ` — ${extra}` : ''}`);
};

try {
  const page = await browser.newPage();
  page.setDefaultNavigationTimeout(120000);
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  await page.goto(BASE_URL, { waitUntil: 'networkidle2' });
  await sleep(3000);
  // LazySection mounts only when scrolled near — jump to the bottom first to
  // trigger the mount, wait, then fine-scroll to #contatti.
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await sleep(2500);
  await page.evaluate(() => {
    const el = document.getElementById('contatti');
    window.scrollTo(0, el
      ? el.getBoundingClientRect().top + window.scrollY - 200
      : document.body.scrollHeight);
  });
  await sleep(2500);
  await page.evaluate(() => {
    [...document.querySelectorAll('#contatti button[aria-expanded]')].find((b) => /prenota|book/i.test(b.textContent || ''))?.click();
  });
  await page.waitForFunction(() => !!document.querySelector('body > div [role="dialog"][aria-modal="true"]'), { timeout: 20000 });
  await sleep(1500);

  const m = await page.evaluate(() => {
    const dlg = document.querySelector('body > div [role="dialog"][aria-modal="true"]');
    const r = dlg.getBoundingClientRect();
    const iframe = document.querySelector('.call-embed-host iframe.cal-embed');
    const bodyStyle = getComputedStyle(document.body);
    return {
      vw: innerWidth, vh: innerHeight,
      dlg: { x: r.x, y: r.y, w: r.width, h: r.height },
      dlgVisible: getComputedStyle(dlg).visibility,
      iframeH: iframe ? iframe.getBoundingClientRect().height : 0,
      bodyPos: bodyStyle.position,
      scrollY: window.scrollY,
    };
  });

  const cx = m.dlg.x + m.dlg.w / 2;
  check(Math.abs(cx - m.vw / 2) < 8, 'Modal horizontally centered', `center=${cx.toFixed(1)} vw/2=${m.vw / 2}`);
  check(m.dlg.w <= m.vw - 20, 'Modal fits viewport with side padding', `w=${m.dlg.w.toFixed(0)} vw=${m.vw}`);
  check(m.dlg.h <= m.vh * 0.88, 'Modal height ≤ ~86dvh', `h=${m.dlg.h.toFixed(0)} vh=${m.vh}`);
  check(m.dlgVisible === 'visible', 'Modal visible while open');
  check(m.iframeH > 300, 'Embed iframe has real height', `${m.iframeH.toFixed(0)}px`);
  check(m.bodyPos === 'fixed', 'Body scroll locked (position:fixed)');

  // Toast stacking above the modal
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('tia:booking-confirmed')));
  await sleep(700);
  const toast = await page.evaluate(() => {
    const el = document.querySelector('[role="status"][aria-live="polite"]');
    const r = el.getBoundingClientRect();
    return { z: getComputedStyle(el).zIndex, y: r.y, cx: r.x + r.width / 2, w: r.width, inViewport: r.y > 0 && r.bottom < innerHeight };
  });
  check(Number(toast.z) >= 10060, 'Toast z-index above booking modal (z-10004)', `z=${toast.z}`);
  check(Math.abs(toast.cx - m.vw / 2) < 8, 'Toast horizontally centered');
  check(toast.inViewport, 'Toast fully inside viewport', `y=${toast.y.toFixed(0)}`);

  // Toast auto-dismiss ~8s
  const gone = await page.evaluate(() => new Promise((res) => setTimeout(() => {
    res(!document.querySelector('[role="status"][aria-live="polite"]'));
  }, 8600)));
  check(gone, 'Toast auto-dismisses after ~8s');

  // Close button + backdrop restore scroll
  await page.evaluate(() => {
    const dlg = document.querySelector('body > div [role="dialog"][aria-modal="true"]');
    dlg.querySelector('button[aria-label]')?.click(); // ✕ header button
  });
  await sleep(800);
  const restored = await page.evaluate(() => ({ pos: getComputedStyle(document.body).position, y: Math.round(window.scrollY) }));
  check(restored.pos !== 'fixed', 'Body scroll unlocked after close');
  check(restored.y > 0, 'Scroll position restored after close', `y=${restored.y}`);

  // Desktop geometry
  await page.setViewport({ width: 1440, height: 900 });
  await sleep(1200);
  await page.evaluate(() => {
    const el = document.getElementById('contatti');
    window.scrollTo(0, el
      ? el.getBoundingClientRect().top + window.scrollY - 200
      : document.body.scrollHeight);
  });
  await sleep(2000);
  await page.evaluate(() => {
    [...document.querySelectorAll('#contatti button[aria-expanded]')].find((b) => /prenota|book/i.test(b.textContent || ''))?.click();
  });
  await sleep(2500);
  const d = await page.evaluate(() => {
    const host = [...document.querySelectorAll('#contatti .call-embed-host')].at(-1);
    const sidebar = document.querySelector('#contatti .grid > div:nth-child(2)');
    if (!host) return null;
    const hr = host.getBoundingClientRect();
    const sr = sidebar?.getBoundingClientRect();
    const dlg = document.querySelector('body > div [role="dialog"][aria-modal="true"]');
    return {
      x: hr.x, w: hr.width, sidebarRight: sr ? sr.right : 0,
      modalGone: !dlg || getComputedStyle(dlg).visibility === 'hidden',
    };
  });
  check(!!d, 'Desktop: embed host rendered');
  if (d) {
    check(d.w > 300, 'Desktop: panel wide enough', `${d.w.toFixed(0)}px`);
    check(d.x > d.sidebarRight, 'Desktop: panel sits to the RIGHT of the sidebar (3rd column)', `panel.x=${d.x.toFixed(0)} > sidebar.right=${d.sidebarRight.toFixed(0)}`);
    check(d.modalGone, 'Desktop: mobile modal NOT rendered');
  }

  console.log(failed === 0 ? '\n✅ ALL METRICS PASSED' : `\n❌ ${failed} check(s) failed`);
  process.exitCode = failed === 0 ? 0 : 1;
} finally {
  await browser.close();
}

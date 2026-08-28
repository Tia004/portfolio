#!/usr/bin/env node

/**
 * Visual booking test — verifies the Cal.com booking UX:
 *   1. MOBILE (<lg): tapping "Prenota una call" opens a centered closable
 *      modal (portal) with the Cal.com embed inside — NOT an inline column
 *      below the contacts grid.
 *   2. Booking-confirmed toast renders with the animated checkmark when the
 *      embed event relay fires ('tia:booking-confirmed' CustomEvent).
 *   3. ESC closes the modal; resizing to desktop shows the inline third
 *      column panel instead.
 *
 * Usage:
 *   1. Start dev server:  npm run dev
 *   2. Run this script:   node scripts/test-booking-visual.mjs
 *
 * Output: screenshots/booking-test/ + console report.
 */

import puppeteer from 'puppeteer-core';
import { mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');
const OUT_DIR = join(PROJECT_ROOT, 'screenshots', 'booking-test');
const BASE_URL = 'http://localhost:3000';
const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const results = [];
const report = (ok, label, extra = '') => {
  results.push({ ok, label });
  console.log(`${ok ? '✅' : '❌'} ${label}${extra ? ` — ${extra}` : ''}`);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Scroll near #contatti and wait for the LazySection to mount. */
async function goToContatti(page) {
  await page.evaluate(async () => {
    const target = document.getElementById('contatti');
    const y = target
      ? target.getBoundingClientRect().top + window.scrollY - 200
      : document.body.scrollHeight;
    window.scrollTo(0, Math.max(0, y));
  });
  await sleep(2500);
}

const browser = await puppeteer.launch({
  executablePath: CHROME_PATH,
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--hide-scrollbars'],
});

try {
  const page = await browser.newPage();
  page.setDefaultNavigationTimeout(120000);
  page.setDefaultTimeout(30000);
  const consoleErrors = [];
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  page.on('pageerror', (e) => consoleErrors.push(`pageerror: ${e.message}`));

  mkdirSync(OUT_DIR, { recursive: true });

  // ── 1. MOBILE ────────────────────────────────────────────────
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  await page.goto(BASE_URL, { waitUntil: 'networkidle2' });
  await sleep(3000); // splash
  await goToContatti(page);
  await page.screenshot({ path: join(OUT_DIR, '01-mobile-contatti.png') });

  // No booking dialog/panel should exist before tapping
  const before = await page.evaluate(() => document.querySelectorAll('[role="dialog"][aria-modal="true"]').length);
  report(before === 0, 'Mobile: no booking modal before tapping the trigger');

  // Tap "Prenota una call"
  const clicked = await page.evaluate(() => {
    const btn = [...document.querySelectorAll('#contatti button[aria-expanded]')]
      .find((b) => /prenota|book/i.test(b.textContent || ''));
    if (!btn) return false;
    btn.click();
    return true;
  });
  report(clicked, 'Mobile: booking trigger found and tapped');
  if (!clicked) throw new Error('Trigger button not found — aborting');

  // Wait for the modal + Cal embed iframe
  try {
    await page.waitForFunction(() => {
      const dlg = document.querySelector('body > div [role="dialog"][aria-modal="true"]');
      return !!dlg && dlg.getBoundingClientRect().height > 100;
    }, { timeout: 20000 });
    report(true, 'Mobile: booking modal opened as a centered dialog');
  } catch {
    report(false, 'Mobile: booking modal did NOT open');
  }
  try {
    await page.waitForFunction(() => !!document.querySelector('.call-embed-host iframe.cal-embed'), { timeout: 30000 });
    report(true, 'Mobile: Cal.com embed iframe mounted (.cal-embed)');
  } catch {
    report(false, 'Mobile: Cal.com embed iframe NOT mounted');
  }
  await sleep(2000);
  await page.screenshot({ path: join(OUT_DIR, '02-mobile-booking-modal.png') });

  // Toast simulation — same CustomEvent the embed relay dispatches
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('tia:booking-confirmed')));
  await sleep(900);
  const toast = await page.evaluate(() => {
    const el = document.querySelector('[role="status"][aria-live="polite"]');
    return { exists: !!el, text: el?.textContent?.trim() ?? '', hasCheck: !!el?.querySelector('.booking-check') };
  });
  report(toast.exists, 'Booking toast appears on booking-confirmed event');
  report(toast.hasCheck, 'Booking toast has the animated checkmark');
  report(/confermata|confirmed|confirmada/i.test(toast.text), 'Booking toast shows the confirmed copy', toast.text.slice(0, 80));
  await page.screenshot({ path: join(OUT_DIR, '03-mobile-booking-toast.png') });

  // ESC closes the modal
  await page.keyboard.press('Escape');
  await sleep(700);
  const closed = await page.evaluate(() => {
    const dlg = document.querySelector('body > div [role="dialog"][aria-modal="true"]');
    return !!dlg && getComputedStyle(dlg).visibility === 'hidden';
  });
  report(closed, 'Mobile: ESC closes the booking modal');
  await page.screenshot({ path: join(OUT_DIR, '04-mobile-modal-closed.png') });

  // ── 2. DESKTOP (resize path: isDesktopLayout flips live) ────
  await page.setViewport({ width: 1440, height: 900, isMobile: false, hasTouch: false });
  await sleep(1200);
  await goToContatti(page);
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('#contatti button[aria-expanded]')]
      .find((b) => /prenota|book/i.test(b.textContent || ''));
    btn?.click();
  });
  try {
    await page.waitForFunction(() => {
      const panel = [...document.querySelectorAll('#contatti .call-embed-host')].at(-1);
      return !!panel && panel.getBoundingClientRect().width > 300;
    }, { timeout: 20000 });
    report(true, 'Desktop: inline booking panel visible (third column)');
  } catch {
    report(false, 'Desktop: inline booking panel NOT visible');
  }
  await sleep(1500);
  await page.screenshot({ path: join(OUT_DIR, '05-desktop-booking-panel.png') });

  // ── 3. Console errors ────────────────────────────────────────
  const relevant = consoleErrors.filter((e) => !/net::ERR|Failed to load resource|favicon/i.test(e));
  report(relevant.length === 0, 'No console errors', relevant.slice(0, 3).join(' | '));

  console.log(`\n📁 Screenshots: ${OUT_DIR}`);
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${failed === 0 ? '✅ ALL CHECKS PASSED' : `❌ ${failed} check(s) failed`}`);
  process.exitCode = failed === 0 ? 0 : 1;
} finally {
  await browser.close();
}

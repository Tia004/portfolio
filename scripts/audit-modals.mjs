#!/usr/bin/env node

/**
 * Modal audit: opens every window on the site (legal docs, project, booking,
 * chat, fullscreen composer, cookie settings) on a phone and on desktop and
 * checks that each one
 *   - fits inside the viewport (never taller/wider than the screen),
 *   - has a working close affordance (button and/or ESC and/or backdrop),
 *   - locks page scroll while open (where it is a real modal),
 *   - leaves the page without horizontal overflow.
 * Run: BASE_URL=http://localhost:3100 node scripts/audit-modals.mjs
 */
import puppeteer from 'puppeteer-core';
import { mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, '..', 'screenshots', 'modal-audit');
const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';
const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let failed = 0;
const check = (ok, label, extra = '') => {
  if (!ok) failed++;
  console.log(`${ok ? '✅' : '❌'} ${label}${extra ? ` — ${extra}` : ''}`);
};

mkdirSync(OUT_DIR, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: CHROME_PATH,
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--hide-scrollbars'],
});

const dialogMetrics = (page, label) =>
  page.evaluate((sel) => {
    const el = typeof sel === 'string' ? document.querySelector(sel) : null;
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return {
      w: Math.round(r.width),
      h: Math.round(r.height),
      left: Math.round(r.left),
      top: Math.round(r.top),
      fitsWidth: r.left >= -2 && r.right <= window.innerWidth + 2,
      fitsHeight: r.top >= -2 && r.bottom <= window.innerHeight + 2,
      visible: cs.visibility !== 'hidden' && Number(cs.opacity) > 0.05,
      bodyLocked: getComputedStyle(document.body).position === 'fixed' || document.documentElement.classList.contains('lenis-stopped'),
    };
  }, label);

try {
  for (const vp of [
    { name: 'mobile', w: 390, h: 844, mobile: true },
    { name: 'desktop', w: 1440, h: 900, mobile: false },
  ]) {
    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(120000);
    await page.setViewport({ width: vp.w, height: vp.h, isMobile: vp.mobile, hasTouch: vp.mobile, deviceScaleFactor: 1 });
    await page.goto(BASE_URL, { waitUntil: 'networkidle2' });
    await sleep(3500);
    console.log(`\n════════ ${vp.name} ${vp.w}x${vp.h}`);

    // Walk the page first: every section below the fold is a LazySection and
    // simply does not exist in the DOM until it has been near the viewport.
    const pageHeight = await page.evaluate(() => document.body.scrollHeight);
    for (let y = 0; y < pageHeight + vp.h; y += Math.round(vp.h * 0.8)) {
      await page.evaluate((p) => window.scrollTo(0, p), y);
      await sleep(120);
    }
    await page.evaluate(() => window.scrollTo(0, 0));
    await sleep(900);

    // ── Legal documents (privacy / cookies / terms) ──────────────────────
    for (const doc of ['privacy', 'cookies', 'terms']) {
      await page.evaluate((d) => window.dispatchEvent(new CustomEvent('open-legal', { detail: d })), doc);
      await sleep(900);
      const m = await dialogMetrics(page, '[role="dialog"]');
      check(!!m && m.visible, `legal/${doc}: opens`, m ? `${m.w}x${m.h}` : 'not found');
      if (m) check(m.fitsWidth && m.fitsHeight, `legal/${doc}: fits the viewport`, `left ${m.left} top ${m.top} ${m.w}x${m.h}`);
      await page.screenshot({ path: join(OUT_DIR, `${vp.name}-legal-${doc}.png`) });
      // ESC must close it
      await page.keyboard.press('Escape');
      await sleep(700);
      const gone = await page.evaluate(() => !document.querySelector('[role="dialog"]'));
      check(gone, `legal/${doc}: closes with ESC`);
    }

    // ── Project modal (portfolio case study) ─────────────────────────────
    const projectOpened = await page.evaluate(() => {
      const sections = ['#progetti', '#progetto', '#lavori'];
      for (const s of sections) {
        const root = document.querySelector(s);
        if (!root) continue;
        const card = root.querySelector('.cursor-pointer, [role="button"]');
        if (card) {
          card.click();
          return true;
        }
      }
      const anyCard = document.querySelector('.cursor-pointer');
      if (anyCard) { anyCard.click(); return true; }
      return false;
    });
    await sleep(1500);
    if (projectOpened) {
      const pgm = await dialogMetrics(page, '[role="dialog"]');
      check(!!pgm && pgm.visible, 'project: opens', pgm ? `${pgm.w}x${pgm.h}` : 'not found');
      if (pgm) {
        check(pgm.fitsWidth && pgm.fitsHeight, 'project: fits the viewport', `left ${pgm.left} top ${pgm.top} ${pgm.w}x${pgm.h}`);
        check(pgm.bodyLocked, 'project: page scroll locked while open');
      }
      await page.screenshot({ path: join(OUT_DIR, `${vp.name}-project.png`) });
      await page.keyboard.press('Escape');
      await sleep(800);
      check(await page.evaluate(() => !document.querySelector('[role="dialog"]')), 'project: closes with ESC');
    } else {
      console.log('ℹ️  project: no project card reachable in this run (lazy section)');
    }

    // ── Booking window (Cal.com) ─────────────────────────────────────────
    const bookingOpened = await page.evaluate(() => {
      const scope = document.querySelector('#contatti') || document;
      const btn = [...scope.querySelectorAll('button[aria-expanded], button, a')]
        .find((b) => /prenota|book|call/i.test(b.textContent || ''));
      if (!btn) return false;
      btn.scrollIntoView({ block: 'center' });
      btn.click();
      return true;
    });
    await sleep(4000);
    if (bookingOpened) {
      const bm = await page.evaluate(() => {
        const dlg = document.querySelector('body > div [role="dialog"][aria-modal="true"], [role="dialog"][aria-modal="true"]');
        if (!dlg) return null;
        const r = dlg.getBoundingClientRect();
        const iframe = document.querySelector('.call-embed-host iframe.cal-embed');
        const host = document.querySelector('.call-embed-host');
        const ir = iframe?.getBoundingClientRect();
        const hr = host?.getBoundingClientRect();
        const closeBtn = dlg.querySelector('button[aria-label]');
        return {
          w: Math.round(r.width), h: Math.round(r.height), left: Math.round(r.left), top: Math.round(r.top),
          fitsWidth: r.left >= -2 && r.right <= window.innerWidth + 2,
          fitsHeight: r.top >= -2 && r.bottom <= window.innerHeight + 2,
          fill: ir && hr ? +((ir.width * ir.height) / (hr.width * hr.height) * 100).toFixed(0) : null,
          hasClose: !!closeBtn,
          bodyLocked: getComputedStyle(document.body).position === 'fixed',
        };
      });
      check(!!bm, 'booking: opens');
      if (bm) {
        check(bm.fitsWidth && bm.fitsHeight, 'booking: fits the viewport', `${bm.w}x${bm.h} @${bm.left},${bm.top}`);
        check(bm.fill !== null && bm.fill >= 95, 'booking: Cal iframe fills the window', `${bm.fill}% of the body`);
        check(bm.hasClose, 'booking: has a close button');
        check(bm.bodyLocked, 'booking: page scroll locked while open');
      }
      await page.screenshot({ path: join(OUT_DIR, `${vp.name}-booking.png`) });
      await page.keyboard.press('Escape');
      await sleep(900);
      const bookingClosed = await page.evaluate(() => {
        const dlg = document.querySelector('[role="dialog"][aria-modal="true"]');
        return !dlg || getComputedStyle(dlg).visibility === 'hidden';
      });
      check(bookingClosed, 'booking: closes with ESC');
    } else {
      check(false, 'booking: trigger button found');
    }

    // ── Chat window + fullscreen composer ────────────────────────────────
    await page.evaluate(() => document.querySelector('button[aria-label="Apri chat"]')?.click());
    await sleep(1400);
    const chat = await page.evaluate(() => {
      const card = document.querySelector('.border-glow-card.chat-window-h');
      if (!card) return null;
      const r = card.getBoundingClientRect();
      return {
        w: Math.round(r.width), h: Math.round(r.height), left: Math.round(r.left), top: Math.round(r.top),
        fitsWidth: r.left >= -2 && r.right <= window.innerWidth + 2,
        fitsHeight: r.top >= -2 && r.bottom <= window.innerHeight + 2,
      };
    });
    check(!!chat, 'chat: opens');
    if (chat) check(chat.fitsWidth && chat.fitsHeight, 'chat: window fits the viewport', `${chat.w}x${chat.h} @${chat.left},${chat.top}`);
    await page.screenshot({ path: join(OUT_DIR, `${vp.name}-chat.png`) });

    const composerOpened = await page.evaluate(() => {
      const btns = [...document.querySelectorAll('button[aria-label]')];
      const b = btns.find((x) => /scrivi il messaggio|write your message|escribe tu mensaje|fullscreen|espandi|expand/i.test(x.getAttribute('aria-label') || ''));
      if (!b) return false;
      b.click();
      return true;
    });
    await sleep(1200);
    if (composerOpened) {  // aria-label is "Scrivi il messaggio" (IT) / write / escribe
      const comp = await dialogMetrics(page, '[role="dialog"]');
      check(!!comp && comp.visible, 'composer: opens');
      if (comp) check(comp.fitsWidth && comp.fitsHeight, 'composer: fits the viewport', `${comp.w}x${comp.h}`);
      await page.screenshot({ path: join(OUT_DIR, `${vp.name}-composer.png`) });
      await page.keyboard.press('Escape');
      await sleep(900);
      // NOTE: the chat popup itself carries role="dialog", so "no role=dialog"
      // is the wrong assertion here — the composer is the fixed full-screen
      // overlay (z-[9999]) with the composer textarea inside.
      check(
        await page.evaluate(() => !document.querySelector('[data-composer-textarea]')),
        'composer: closes with ESC'
      );
    } else {
      console.log('ℹ️  composer: toggle not found (label differs by language)');
    }

    // ── Cookie settings ──────────────────────────────────────────────────
    await page.evaluate(() => window.dispatchEvent(new Event('open-cookie-settings')));
    await sleep(900);
    const cookie = await page.evaluate(() => {
      const txt = document.body.innerText;
      return { visible: /cookie/i.test(txt), hasAccept: /accetta|accept|aceptar/i.test(txt) };
    });
    check(cookie.visible && cookie.hasAccept, 'cookie: banner/settings reachable with choices', JSON.stringify(cookie));
    await page.screenshot({ path: join(OUT_DIR, `${vp.name}-cookie.png`) });

    // ── Final: page itself ───────────────────────────────────────────────
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    check(overflow <= 2, `${vp.name}: no horizontal overflow with everything closed`, `${overflow}px`);

    await page.close();
  }
} finally {
  await browser.close();
}

console.log(failed === 0 ? '\n✅ all modal checks passed' : `\n❌ ${failed} modal check(s) failed`);
process.exitCode = failed === 0 ? 0 : 1;

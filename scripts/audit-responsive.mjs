#!/usr/bin/env node

/**
 * Responsive audit: for every common viewport, scroll the whole page (LazySection
 * mounts as you go) and report
 *   - document horizontal overflow (the real "not responsive" symptom),
 *   - elements sticking out of the viewport,
 *   - primary CTA tap-target sizes,
 *   - a screenshot per breakpoint.
 * Run: BASE_URL=http://localhost:3100 node scripts/audit-responsive.mjs
 */
import puppeteer from 'puppeteer-core';
import { mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, '..', 'screenshots', 'responsive-audit');
const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';
const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const VIEWPORTS = [
  { name: 'phone-small-320', w: 320, h: 568, mobile: true },
  { name: 'phone-360', w: 360, h: 740, mobile: true },
  { name: 'iphone-se-375', w: 375, h: 667, mobile: true },
  { name: 'iphone-390', w: 390, h: 844, mobile: true },
  { name: 'pixel-412', w: 412, h: 915, mobile: true },
  { name: 'phone-landscape', w: 844, h: 390, mobile: true },
  { name: 'tablet-768', w: 768, h: 1024, mobile: true },
  { name: 'tablet-834', w: 834, h: 1112, mobile: true },
  { name: 'laptop-1280', w: 1280, h: 800, mobile: false },
  { name: 'desktop-1440', w: 1440, h: 900, mobile: false },
  { name: 'wide-1920', w: 1920, h: 1080, mobile: false },
];

let problems = 0;

mkdirSync(OUT_DIR, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: CHROME_PATH,
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--hide-scrollbars'],
});

try {
  for (const vp of VIEWPORTS) {
    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(120000);
    await page.setViewport({ width: vp.w, height: vp.h, isMobile: vp.mobile, hasTouch: vp.mobile, deviceScaleFactor: 1 });
    await page.goto(BASE_URL, { waitUntil: 'networkidle2' });
    await sleep(3500);

    // Walk the page so every LazySection mounts.
    const total = await page.evaluate(() => document.body.scrollHeight);
    for (let y = 0; y < total + vp.h; y += Math.round(vp.h * 0.8)) {
      await page.evaluate((p) => window.scrollTo(0, p), y);
      await sleep(120);
    }
    await page.evaluate(() => window.scrollTo(0, 0));
    await sleep(900);

    const audit = await page.evaluate(() => {
      const vw = window.innerWidth;
      const doc = document.documentElement;
      const overflow = doc.scrollWidth - vw;

      // Elements sticking out horizontally. Marquees/tracks legitimately
      // overflow inside a clipped/hidden container, so only elements whose own
      // box crosses the viewport edge AND that are not inside a scroller with
      // overflow hidden/auto/scroll are counted.
      const offenders = [];
      // Marquees/tracks legitimately overflow: they live inside a container with
      // overflow-x hidden/auto or a mask — including <html> itself, which the
      // global stylesheet clips (overflow-x: hidden). Walk the whole chain.
      const clippedBy = (el) => {
        let p = el.parentElement;
        while (p) {
          const cs = getComputedStyle(p);
          if (/(hidden|auto|scroll|clip)/.test(cs.overflowX)) return true;
          if (cs.maskImage && cs.maskImage !== 'none') return true;
          if (cs.clipPath && cs.clipPath !== 'none') return true;
          p = p.parentElement;
        }
        return false;
      };
      for (const el of [...document.querySelectorAll('body *')]) {
        const cs = getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0) continue;
        if (cs.position === 'fixed') continue; // chat widget / CTA overlays are intentionally pinned
        const r = el.getBoundingClientRect();
        if (r.width < 24 || r.height < 8) continue;
        if (r.right > vw + 2 || r.left < -2) {
          if (clippedBy(el)) continue;
          offenders.push({
            tag: el.tagName,
            cls: String(el.className).slice(0, 60),
            left: Math.round(r.left),
            right: Math.round(r.right),
          });
        }
      }

      // Primary CTAs must be comfortably tappable on phones.
      const small = [];
      for (const el of [...document.querySelectorAll('a[href], button')]) {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        const cs = getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden') continue;
        if (r.height < 36 || r.width < 36) {
          small.push({ text: (el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 28), w: Math.round(r.width), h: Math.round(r.height) });
        }
      }

      // The CTAs that actually matter on a phone.
      const primaryCta = [...document.querySelectorAll('a, button')]
        .filter((el) => /richiedi preventivo|vedi i prezzi|invia|request a quote|see prices|send|solicitar|ver precios|enviar/i.test(el.textContent || ''))
        .map((el) => {
          const r = el.getBoundingClientRect();
          return { text: (el.textContent || '').trim().slice(0, 24), w: Math.round(r.width), h: Math.round(r.height) };
        })
        .filter((t) => t.w > 0);

      return {
        overflow,
        offenders: offenders.slice(0, 6),
        offenderCount: offenders.length,
        smallTargets: small.length,
        primaryCta: primaryCta.slice(0, 4),
        pageHeight: document.body.scrollHeight,
      };
    });

    const bad = audit.overflow > 2 || audit.offenderCount > 0;
    if (bad) problems++;
    console.log(
      `${bad ? '❌' : '✅'} ${vp.name} (${vp.w}x${vp.h})  document overflow ${audit.overflow}px  unclipped out-of-viewport ${audit.offenderCount}  small tap targets (<36px, incl. marquee chips) ${audit.smallTargets}`
    );
    if (audit.primaryCta.length) {
      const worst = audit.primaryCta.reduce((a, b) => (a.h <= b.h ? a : b));
      console.log(`     CTAs: ${audit.primaryCta.map((c) => `${c.text} ${c.w}x${c.h}`).join(' | ')}${worst.h < 40 ? '  ⚠️ smallest under 40px tall' : ''}`);
    }
    if (audit.offenders.length) console.log('     ', JSON.stringify(audit.offenders));
    await page.screenshot({ path: join(OUT_DIR, `${vp.name}.png`) });
    await page.close();
  }
} finally {
  await browser.close();
}

console.log(problems === 0 ? '\n✅ no layout overflow on any breakpoint' : `\n❌ ${problems} breakpoint(s) with layout overflow`);
process.exitCode = problems === 0 ? 0 : 1;

// Renders a case study in a real browser: does it actually LOOK like a page of
// this site, or does it merely return 200? Checks the things a broken page
// fails at — overflow, images that never load, a missing navbar or footer, a
// dead CTA — and captures screenshots for the human eye.
//
// Run: BASE_URL=http://localhost:3100 node scripts/verify-case-study-ui.mjs
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import nodePath from 'node:path';

const BASE = process.env.BASE_URL || 'http://localhost:3100';
const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const OUT = nodePath.resolve('screenshots/case-studies');
fs.mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let failures = 0;
const check = (label, ok, detail = '') => {
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures++;
};

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--hide-scrollbars'] });

for (const view of [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
]) {
  console.log(`\n── /progetti/pcs (${view.name})`);
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.setViewport({ width: view.width, height: view.height, deviceScaleFactor: 1 });
  await page.goto(`${BASE}/progetti/pcs`, { waitUntil: 'networkidle2', timeout: 120_000 });
  await sleep(3000);
  // Walk the page: the lazy images and the footer only mount once reached.
  const height = await page.evaluate(() => document.body.scrollHeight);
  for (let y = 0; y < height; y += 700) {
    await page.evaluate((step) => window.scrollTo(0, step), y);
    await sleep(220);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await sleep(600);

  const dom = await page.evaluate(() => {
    const imgs = [...document.querySelectorAll('main img')];
    return {
      overflowX: document.documentElement.scrollWidth > window.innerWidth + 1,
      h1Count: document.querySelectorAll('h1').length,
      h1Text: document.querySelector('h1')?.textContent?.trim() || '',
      nav: document.querySelectorAll('header').length > 0,
      footer: document.body.innerText.includes('Tia Designs') && document.querySelectorAll('footer, [class*="footer"]').length > 0,
      brokenImages: imgs.filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.getAttribute('src')),
      imageCount: imgs.length,
      ctaHref: [...document.querySelectorAll('a')].map((a) => a.getAttribute('href')).find((h) => h && h.includes('#contatti')),
      backHome: [...document.querySelectorAll('a')].some((a) => a.getAttribute('href') === '/' || a.getAttribute('href') === ''),
      relatedCount: [...document.querySelectorAll('a[href*="/progetti/"]')].length,
      bodyLen: document.body.innerText.trim().length,
      langSwitcher: [...document.querySelectorAll('button')].some((b) => /Italiano|English|Español/.test(b.textContent || '')),
      // Section links must not point at anchors that do not exist on this page.
      deadAnchors: [...document.querySelectorAll('a[href^="#"]')]
        .map((a) => a.getAttribute('href'))
        .filter((h) => h && h.length > 1 && !document.querySelector(h)),
      homeAnchors: [...document.querySelectorAll('a[href^="/#"]')].length,
    };
  });

  check('No horizontal overflow', !dom.overflowX);
  check('Exactly one h1', dom.h1Count === 1, `${dom.h1Count}: ${dom.h1Text}`);
  check('Navbar is mounted', dom.nav);
  check('Footer is mounted', dom.footer);
  check('All images actually loaded', dom.brokenImages.length === 0, dom.brokenImages.join(', ') || `${dom.imageCount} images`);
  check('CTA points at the contact section', Boolean(dom.ctaHref), String(dom.ctaHref));
  check('A link back to the home exists', dom.backHome);
  check('Neighbouring case studies are linked', dom.relatedCount >= 3, `${dom.relatedCount} links`);
  check('Page has real content (not a stub)', dom.bodyLen > 400, `${dom.bodyLen} chars`);
  check('Language switcher is reachable', dom.langSwitcher);
  check('No section link points at a missing anchor', dom.deadAnchors.length === 0, dom.deadAnchors.join(', '));
  check('Section links are pointed at the home page', dom.homeAnchors > 0, `${dom.homeAnchors} links`);
  check('No runtime errors', errors.length === 0, errors.join(' | '));

  await page.screenshot({ path: nodePath.join(OUT, `case-study-${view.name}.png`), fullPage: true });
  await page.close();
}

await browser.close();
console.log(`\n${failures === 0 ? 'ALL GREEN' : `${failures} FAILED`}`);
process.exit(failures === 0 ? 0 : 1);

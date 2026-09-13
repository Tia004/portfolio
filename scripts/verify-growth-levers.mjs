// Verifies the three growth levers added on top of the price list:
//   1. instant estimate — three chips produce a price range + lead time, and
//      the choice lands in the shared visitor context (Cal/chat prefill);
//   2. referral — the card hands out a ?ref= link and the code is captured
//      from a landing URL;
//   3. structured data — ProfessionalService node with services, starting
//      prices and areas served, server-rendered.
//
// Run: node scripts/verify-growth-levers.mjs        (site on :3100)
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import nodePath from 'node:path';

const BASE = process.env.BASE_URL || 'http://localhost:3100';
const OUT = nodePath.resolve('screenshots/growth-levers');
fs.mkdirSync(OUT, { recursive: true });
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let failures = 0;
const check = (label, ok, detail = '') => {
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures++;
};

// ── 1. Server-rendered structured data ────────────────────────────────────
const html = await fetch(BASE).then((r) => r.text());
const ldMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
check('JSON-LD script is server-rendered', Boolean(ldMatch));
if (ldMatch) {
  const schema = JSON.parse(ldMatch[1].replace(/\\u003c/g, '<'));
  const graph = schema['@graph'] || [];
  const business = graph.find((node) => node['@type'] === 'ProfessionalService');
  check('ProfessionalService node present', Boolean(business));
  if (business) {
    const offers = business.hasOfferCatalog?.itemListElement ?? [];
    check(
      'Offer catalog lists each service with its price range',
      offers.length >= 4 &&
        offers.every((o) => o.offers?.lowPrice && o.offers?.highPrice && o.offers?.priceCurrency === 'EUR'),
      offers.map((o) => `${o.name}:${o.offers?.lowPrice}-${o.offers?.highPrice}`).join(' '),
    );
    check('Area served includes Mantova + Italy', JSON.stringify(business.areaServed).includes('Mantova') && JSON.stringify(business.areaServed).includes('Italia'));
    check('Exactly one local name (no street address leaked)', !JSON.stringify(business).match(/streetAddress|Via /) && JSON.stringify(business).includes('Mantova'));
  }
}
// The price list itself must be readable without JavaScript, and the packages
// strip must not come back.
check('Price list present in the raw HTML', /1[.,]750/.test(html) && /3[.,]250/.test(html) && /7[.,]500/.test(html));
check('Packages strip is gone', !html.includes('Prezzo chiaro, tempi chiari'));

// ── 2 + 3. Browser behaviour ──────────────────────────────────────────────
const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--no-sandbox', '--hide-scrollbars'],
});
const page = await browser.newPage();
await page.setViewport({ width: 1600, height: 900, deviceScaleFactor: 1 });
await page.goto(`${BASE}/?ref=prova-verifica`, { waitUntil: 'networkidle2', timeout: 120_000 });
await sleep(4000);

// The contact section (referral card) is lazy-mounted: scroll through the page
// so every LazySection has a chance to mount before probing.
for (let i = 1; i <= 14; i++) {
  await page.evaluate((step) => window.scrollTo(0, step), i * 900);
  await sleep(250);
}
await page.waitForSelector('[data-estimator]', { timeout: 20_000 }).catch(() => {});
await page.waitForSelector('[data-referral]', { timeout: 20_000 }).catch(() => {});
await page.evaluate(() => document.querySelector('[data-estimator]')?.scrollIntoView({ block: 'center' }));
await sleep(600);

// Estimator: click the first chip of each of the three rows.
const chips = await page.$$('[data-estimator] button[aria-pressed]');
check('Estimator renders three chip rows', chips.length >= 10, `${chips.length} chips`);
if (chips.length >= 10) {
  // Rows are 4 (service) + 3 (size) + 3 (timing) in DOM order.
  await chips[0].click();          // site
  await sleep(120);
  const sizeChips = await page.$$('[data-estimator] button[aria-pressed]');
  await sizeChips[5].click();      // standard (index 5 = second row, middle)
  await sleep(120);
  const timingChips = await page.$$('[data-estimator] button[aria-pressed]');
  await timingChips[8].click();    // within a month
  await sleep(300);
}
const estimatorText = await page.$eval('[data-estimator]', (el) => el.innerText);
// The locale decides the position of the symbol ("900 €" in IT, "€900" in EN).
check('Price range shown', /(€\s?[\d.,]+|[\d.,]+\s?€)/.test(estimatorText), estimatorText.split('\n').filter((l) => l.includes('€')).slice(0, 2).join(' | '));
check('Lead time shown', /\d+-\d+ (settimane|weeks|semanas)/i.test(estimatorText));

// Save what the visitor (and the crawler) actually sees.
const estimatorBox = await page.$('[data-estimator]');
if (estimatorBox) await estimatorBox.screenshot({ path: nodePath.join(OUT, 'estimator-desktop.png') });
const referralSelector = await page.$('[data-referral]');
if (referralSelector) await referralSelector.screenshot({ path: nodePath.join(OUT, 'referral-desktop.png') });

// The instalment rule must follow the SAME threshold as the price cards: a
// range below €1.000 says nothing, a range above it states the rule.
const lowText = await page.$eval('[data-estimator]', (el) => el.innerText);
const chips3 = await page.$$('[data-estimator] button[aria-pressed]');
let highText = '';
if (chips3.length >= 10) {
  await chips3[6].click(); // "complete" scope → range above €1.000
  await sleep(400);
  highText = await page.$eval('[data-estimator]', (el) => el.innerText);
}
check('no instalment line under €1.000', !/rateizzabil/i.test(lowText), lowText.split('\n').find((l) => /€/.test(l)) || '');
check('instalment line shown above €1.000', /rateizzabil/i.test(highText), highText.split('\n').find((l) => /rateizzabil/i.test(l)) || '');

const ctx = await page.evaluate(() => window.sessionStorage.getItem('tia-visitor-context'));
check('Selection stored in the shared visitor context', Boolean(ctx && ctx.includes('budget') && ctx.includes('estimator')), ctx || '(empty)');

// Referral: a visitor landing with ?ref= gets a share link carrying a code.
const referral = await page.evaluate(() => {
  const el = document.querySelector('[data-referral]');
  return el ? el.innerText : '';
});
check('Referral card renders', referral.length > 20);
const storedRef = await page.evaluate(() => window.sessionStorage.getItem('tia-ref'));
check('Incoming ?ref= code captured', storedRef === 'prova-verifica', String(storedRef));

// A fresh visitor (no ?ref=) must still get a shareable, coded link.
const page2 = await browser.newPage();
await page2.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
await page2.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 120_000 });
await sleep(3500);
// Mobile look of the estimator with a full selection.
await page2.waitForSelector('[data-estimator]', { timeout: 20_000 }).catch(() => {});
const mobileChips = await page2.$$('[data-estimator] button[aria-pressed]');
if (mobileChips.length >= 10) {
  await mobileChips[0].click();
  await sleep(150);
  const row2 = await page2.$$('[data-estimator] button[aria-pressed]');
  await row2[4].click();
  await sleep(150);
  const row3 = await page2.$$('[data-estimator] button[aria-pressed]');
  await row3[7].click();
  await sleep(400);
  const mobileEstimator = await page2.$('[data-estimator]');
  if (mobileEstimator) await mobileEstimator.screenshot({ path: nodePath.join(OUT, 'estimator-mobile.png') });
}
const ownCode = await page2.evaluate(() => window.localStorage.getItem('tia-share-code'));
check('Share code generated for a direct visitor', Boolean(ownCode && ownCode.length >= 4), String(ownCode));
await page2.close();

await browser.close();
console.log(`\n${failures === 0 ? 'ALL GREEN' : `${failures} FAILED`}`);
process.exit(failures === 0 ? 0 : 1);

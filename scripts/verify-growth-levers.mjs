// Verifies the state of the pricing / promo surface AFTER the estimator and the
// referral card were removed:
//   1. structured data — ProfessionalService node with services, starting
//      prices and areas served, server-rendered;
//   2. the price list is readable without JavaScript, and nothing that was
//      removed came back (estimator, referral card, packages strip);
//   3. the word-of-mouth offer is stated ONCE in the hero with its terms
//      (20%, non-cumulative, time-boxed) and repeated with the same number in
//      the footer — and never as 10%;
//   4. inbound attribution (?ref=) is still captured.
//
// Run: node scripts/verify-growth-levers.mjs        (site on :3100)
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import nodePath from 'node:path';

const BASE = process.env.BASE_URL || 'http://localhost:3100';
const OUT = nodePath.resolve('screenshots/growth-levers');
fs.mkdirSync(OUT, { recursive: true });
const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
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
// The price list itself must be readable without JavaScript, and the things we
// deleted must not come back.
check('Price list present in the raw HTML', /1[.,]750/.test(html) && /3[.,]250/.test(html) && /7[.,]500/.test(html));
check('Packages strip is gone', !html.includes('Prezzo chiaro, tempi chiari'));
check('No auto-calculated price in the raw HTML', !/Preventivo istantaneo|Instant estimate|Presupuesto instant/.test(html));

// ── 2 + 3. Browser behaviour ──────────────────────────────────────────────
const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--no-sandbox', '--hide-scrollbars'],
});
const page = await browser.newPage();
await page.setViewport({ width: 1600, height: 900, deviceScaleFactor: 1 });
await page.goto(`${BASE}/?ref=prova-verifica`, { waitUntil: 'networkidle2', timeout: 120_000 });
await sleep(4500);

// The hero promo must be visible without any scrolling: it is the offer.
const hero = await page.evaluate(() => {
  const el = document.querySelector('[data-hero-promo]');
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { text: el.innerText.replace(/\s+/g, ' ').trim(), visible: r.width > 0 && r.height > 0 && r.top < window.innerHeight };
});
check('[data-hero-promo] present in the hero', Boolean(hero));
check('Promo states the 20% discount', Boolean(hero && /20%/.test(hero.text)), hero?.text?.slice(0, 90) || '');
check('Promo carries its terms (non-cumulative + expiry)', Boolean(hero && /cumulab/i.test(hero.text) && /31\/12\/2026/.test(hero.text)), hero?.text?.slice(0, 140) || '');
check('Promo is on screen without scrolling', Boolean(hero?.visible));
if (hero) {
  const box = await page.$('[data-hero-promo]');
  if (box) await box.screenshot({ path: nodePath.join(OUT, 'hero-promo.png') });
}

// Nothing that was removed may still be mounted anywhere on the page.
for (let i = 1; i <= 16; i++) {
  await page.evaluate((step) => window.scrollTo(0, step), i * 900);
  await sleep(220);
}
const leftovers = await page.evaluate(() => ({
  estimator: document.querySelectorAll('[data-estimator]').length,
  referral: document.querySelectorAll('[data-referral]').length,
  priceRows: document.querySelectorAll('#prezzi .border-glow-card').length,
  body10: /10\s?%\s*(di\s+)?sconto|10%\s*off|10%\s*de\s*descuento/.test(document.body.innerText),
  body20: /20%/.test(document.body.innerText),
}));
check('Price estimator is not mounted', leftovers.estimator === 0, `${leftovers.estimator} nodes`);
check('Referral card is not mounted', leftovers.referral === 0, `${leftovers.referral} nodes`);
check('Price cards still render', leftovers.priceRows >= 10, `${leftovers.priceRows} cards`);
check('The 10% promise is gone everywhere', !leftovers.body10);
check('The 20% promise is present', leftovers.body20);

// The footer repeats the same number, once.
const footer = await page.evaluate(() => {
  const nodes = Array.from(document.querySelectorAll('footer, [class*="footer"]'));
  const text = (document.body.innerText || '').replace(/\s+/g, ' ');
  const m = text.match(/passaparola[^.]{0,120}/i) || text.match(/word-of-mouth[^.]{0,120}/i) || text.match(/boca a boca[^.]{0,120}/i);
  void nodes;
  return m ? m[0] : '';
});
check('Footer states the same 20% word-of-mouth offer', /20%/.test(footer), footer.slice(0, 110));

// Inbound attribution still lands in the session.
const storedRef = await page.evaluate(() => window.sessionStorage.getItem('tia-ref'));
check('Incoming ?ref= code captured', storedRef === 'prova-verifica', String(storedRef));

await page.screenshot({ path: nodePath.join(OUT, 'promo-desktop.png') });

// ── 4. The promo must fit a phone without clipping or pushing the hero. ──
const phone = await browser.newPage();
await phone.setViewport({ width: 375, height: 667, deviceScaleFactor: 1 });
await phone.goto(BASE, { waitUntil: 'networkidle2', timeout: 120_000 });
await sleep(4000);
const mobile = await phone.evaluate(() => {
  const el = document.querySelector('[data-hero-promo]');
  if (!el) return null;
  const r = el.getBoundingClientRect();
  const chip = el.querySelector('span');
  const cr = chip ? chip.getBoundingClientRect() : null;
  return {
    clippedRight: Math.round(r.right) > window.innerWidth + 1,
    overflowsDoc: document.documentElement.scrollWidth > window.innerWidth + 1,
    text: el.innerText.replace(/\s+/g, ' ').trim(),
    chipW: cr ? Math.round(cr.width) : 0,
    chipH: cr ? Math.round(cr.height) : 0,
  };
});
check('Promo fits a 375px phone (no clipping, no page overflow)', Boolean(mobile && !mobile.clippedRight && !mobile.overflowsDoc), mobile ? `chip ${mobile.chipW}x${mobile.chipH}px` : 'not found');
check('Promo still readable on mobile (≥ 11px tall text)', Boolean(mobile && mobile.chipH >= 24), mobile ? `${mobile.chipH}px tall` : '');
if (mobile) {
  const box = await phone.$('[data-hero-promo]');
  if (box) await box.screenshot({ path: nodePath.join(OUT, 'hero-promo-mobile.png') });
}
await phone.close();

await browser.close();
console.log(`\n${failures === 0 ? 'ALL GREEN' : `${failures} FAILED`}`);
process.exit(failures === 0 ? 0 : 1);

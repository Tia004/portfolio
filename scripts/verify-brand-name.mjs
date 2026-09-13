// Verifies the brand/legal-name split and the address-privacy policy:
//   • the "Chi sono" heading shows the BRAND ("Tia Designs") in IT, EN and ES;
//   • the legal name (Tia Chinaglia) is still where it is legally required:
//     the JSON-LD legalName and the Terms the footer opens;
//   • the private street address is NEVER rendered anywhere public.
//
// Each language runs in its own isolated browser context: the site persists the
// chosen language, so a shared profile makes the /en and /es visits bleed into
// the next page load (that is what made an earlier revision of this script
// assert an Italian sentence against the English Terms).
//
// Run: node scripts/verify-brand-name.mjs      (site on :3100)
import puppeteer from 'puppeteer-core';

const BASE = process.env.BASE_URL || 'http://localhost:3100';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** The private street address. Must never appear in public HTML or modals. */
const PRIVATE_STREET = 'Labriola';

/** Per-language proof that the Terms state the address policy correctly. */
const ADDRESS_POLICY = {
  it: /indirizzo civico completo/,
  en: /full street address is provided in writing/i,
  es: /dirección completa se comunica por escrito/i,
};

let failures = 0;
const check = (label, ok, detail = '') => {
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures++;
};

// ── 1. Server-rendered structured data ────────────────────────────────────
const html = await fetch(BASE).then((r) => r.text());
const ld = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
const graph = ld ? JSON.parse(ld[1].replace(/\\u003c/g, '<'))['@graph'] : [];
const org = graph.find((n) => n['@type'] === 'Organization');
check('JSON-LD keeps the legal person name', org?.legalName === 'Tia Chinaglia', String(org?.legalName));
check('JSON-LD brand name is Tia Designs', org?.name === 'Tia Designs', String(org?.name));
check('Server HTML never publishes the street', !html.includes(PRIVATE_STREET));

// ── 2. Heading + Terms, per language, in isolated contexts ────────────────
const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--no-sandbox', '--hide-scrollbars'],
});

const scrollToSection = async (page, selector, steps = 14) => {
  for (let i = 1; i <= steps; i++) {
    await page.evaluate((y) => window.scrollTo(0, y), i * 900);
    await sleep(220);
    if (await page.$(selector)) return true;
  }
  return false;
};

for (const [route, lang] of [['/', 'it'], ['/en', 'en'], ['/es', 'es']]) {
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  await page.setViewport({ width: 1280, height: 900, deviceScaleFactor: 1 });
  await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded', timeout: 120_000 });
  await sleep(3000);

  // #chisono is lazy-mounted: walk the page down until it exists.
  await scrollToSection(page, '#chisono h2');
  const heading = await page.$eval('#chisono h2', (el) => el.textContent?.trim()).catch(() => null);
  check(`Chi sono heading is the brand (${lang})`, heading === 'Tia Designs', String(heading));

  // Open the Terms the way the footer does (custom event → portal modal).
  const terms = await page.evaluate(async () => {
    window.dispatchEvent(new CustomEvent('open-legal', { detail: 'terms' }));
    await new Promise((r) => setTimeout(r, 1600));
    return Array.from(document.querySelectorAll('[role="dialog"]'))
      .filter((d) => /Termini|Terms|Términos/.test(d.getAttribute('aria-label') ?? ''))
      .map((d) => d.textContent ?? '')
      .join('\n');
  });
  check(`Terms modal opens (${lang})`, terms.length > 2000, `${terms.length} chars`);
  check(`Terms name the professional (${lang})`, terms.includes('Tia Chinaglia'));
  check(`Terms state the address policy (${lang})`, ADDRESS_POLICY[lang].test(terms));
  check(`Terms never publish the street (${lang})`, !terms.includes(PRIVATE_STREET));

  await context.close();
}

// ── 3. The whole public page, fully scrolled, leaks no address ────────────
{
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  await page.setViewport({ width: 1280, height: 900, deviceScaleFactor: 1 });
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 120_000 });
  await sleep(3000);
  await scrollToSection(page, '#chisono h2', 20);
  const text = await page.evaluate(() => document.body.innerText);
  check('Rendered page never publishes the street', !text.includes(PRIVATE_STREET));
  await context.close();
}

await browser.close();
console.log(`\n${failures === 0 ? 'ALL GREEN' : `${failures} FAILED`}`);
process.exit(failures === 0 ? 0 : 1);

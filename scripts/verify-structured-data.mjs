// Verifies the structured data on the public pages (IT/EN/ES):
//
//   1. the JSON-LD is SERVER-RENDERED — present in the raw HTML, readable
//      without executing a single line of JavaScript (that is what crawlers
//      and most AI fetchers actually get);
//   2. the entity graph is connected: Organization / ProfessionalService /
//      Person / WebSite / FAQPage resolve into one graph by @id, with the
//      Person linked as founder of both the Organization and the business;
//   3. the trust signals are HONEST: the AggregateRating is recomputed from
//      the embedded Review nodes, and every marked-up review must be one the
//      page actually renders in the reviews section. Marking up reviews that
//      are not on the page is a policy violation, so this is the check that
//      matters most;
//   4. per-language correctness: each route declares its own inLanguage and
//      quotes reviews in its own language (a leaked Italian quote on /en is a
//      silent, invisible bug);
//   5. no street address leaks into the markup (the operating address is a
//      private home: city level only, on contracts and invoices only).
//
// Run: BASE_URL=http://localhost:3100 node scripts/verify-structured-data.mjs
import puppeteer from 'puppeteer-core';

const BASE = process.env.BASE_URL || 'http://localhost:3100';
const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const SITE_URL = 'https://tiadesigns.it';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const ROUTES = [
  { path: '/', lang: 'it' },
  { path: '/en', lang: 'en' },
  { path: '/es', lang: 'es' },
];

let failures = 0;
const check = (label, ok, detail = '') => {
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures++;
};
const norm = (s) => String(s || '').replace(/\s+/g, ' ').replace(/[“”"]/g, '').trim();

/** All JSON-LD scripts of a page, as a flat list of nodes merged by @id. */
function extractNodes(html) {
  const scripts = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  const nodes = [];
  for (const [, body] of scripts) {
    const parsed = JSON.parse(body.replace(/\\u003c/g, '<'));
    const list = parsed['@graph'] ? parsed['@graph'] : [parsed];
    nodes.push(...list);
  }
  return nodes;
}

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--no-sandbox', '--hide-scrollbars'],
});

const reviewBodiesByLang = {};

for (const { path, lang } of ROUTES) {
  console.log(`\n── ${path} (${lang})`);

  // ── 1. Raw HTML: no JavaScript executed ──────────────────────────────────
  const html = await fetch(`${BASE}${path}`).then((r) => r.text());
  const nodes = extractNodes(html);
  check('JSON-LD is server-rendered (in the raw HTML)', nodes.length > 0, `${nodes.length} nodes`);

  const byId = new Map(nodes.filter((n) => n['@id']).map((n) => [n['@id'], n]));
  const organization = nodes.find((n) => n['@type'] === 'Organization');
  const business = nodes.find((n) => n['@type'] === 'ProfessionalService');
  const person = nodes.find((n) => n['@type'] === 'Person');
  const website = nodes.find((n) => n['@type'] === 'WebSite');
  const faq = nodes.find((n) => n['@type'] === 'FAQPage');

  // ── 2. The graph ─────────────────────────────────────────────────────────
  check('Organization node present', Boolean(organization));
  check('ProfessionalService node present', Boolean(business));
  check('WebSite node present', Boolean(website));
  check('Person node present', Boolean(person));
  check('FAQPage node present', Boolean(faq));

  if (person && organization && business) {
    const personId = `${SITE_URL}/#person`;
    check('Person has a stable @id', person['@id'] === personId, String(person['@id']));
    check('Person is named', Boolean(person.name), String(person.name));
    check('Organization points at the Person as founder', organization.founder?.['@id'] === personId);
    check('Business points at the Person as founder', business.founder?.['@id'] === personId);
    check('Business points at the Person as employee', business.employee?.['@id'] === personId);
    const worksFor = person.worksFor?.['@id'];
    check('Person points back at the Organization (worksFor)', Boolean(worksFor) && byId.has(worksFor), String(worksFor));
  }
  if (faq && organization) {
    check('FAQPage is linked to the Organization graph', faq.mainEntityOfPage?.['@id'] === organization['@id']);
  }
  if (faq) {
    check('FAQPage carries all 20 questions', faq.mainEntity?.length === 20, `${faq.mainEntity?.length}`);
    check(
      'Every FAQ has a question and an answer',
      (faq.mainEntity || []).every((q) => q.name && q.acceptedAnswer?.text),
    );
  }

  // ── 3. Trust signals ─────────────────────────────────────────────────────
  const reviews = business?.review ?? [];
  const rating = business?.aggregateRating;
  check('Review nodes are embedded', reviews.length > 0, `${reviews.length} reviews`);
  check('AggregateRating present', Boolean(rating));

  if (rating) {
    const values = reviews.map((r) => Number(r.reviewRating?.ratingValue));
    const expectedAvg = values.reduce((a, b) => a + b, 0) / values.length;
    check(
      'AggregateRating.reviewCount matches the embedded reviews',
      Number(rating.reviewCount) === reviews.length,
      `${rating.reviewCount} vs ${reviews.length}`,
    );
    check(
      'AggregateRating.ratingValue is the real average of those reviews',
      Math.abs(Number(rating.ratingValue) - expectedAvg) < 0.05,
      `${rating.ratingValue} vs ${expectedAvg.toFixed(2)}`,
    );
    check(
      'Ratings stay inside their own bounds',
      Number(rating.worstRating) <= Number(rating.ratingValue) &&
        Number(rating.ratingValue) <= Number(rating.bestRating),
      `${rating.worstRating} ≤ ${rating.ratingValue} ≤ ${rating.bestRating}`,
    );
  }

  check(
    'Every review names its author, its rating and its text',
    reviews.every((r) => r.author?.name && r.reviewRating?.ratingValue >= 1 && r.reviewRating?.ratingValue <= 5 && r.reviewBody),
  );
  check(
    'Every review is attached to THIS business by @id',
    reviews.every((r) => r.itemReviewed?.['@id'] === business?.['@id']),
    String(business?.['@id']),
  );
  check('Reviews declare the page language', reviews.every((r) => r.inLanguage === lang));

  // ── 4. No private address anywhere in the graph ──────────────────────────
  const flat = JSON.stringify(nodes);
  check(
    'No street address leaked into the structured data',
    !/streetAddress|Via\s+[A-Z]|Labriola/.test(flat) && flat.includes('Mantova'),
  );

  // ── 5. Markup ⇄ visible content parity ───────────────────────────────────
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.setViewport({ width: 1600, height: 900, deviceScaleFactor: 1 });
  await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle2', timeout: 120_000 });
  await sleep(3500);
  // The reviews and FAQ sections live inside LazySection: they do NOT exist in
  // the DOM until they are scrolled near, so a direct scrollIntoView would find
  // nothing and report a false failure. Walk the whole page first to trigger
  // every mount, then read what the visitor can actually see.
  const pageHeight = await page.evaluate(() => document.body.scrollHeight);
  for (let y = 0; y < pageHeight; y += 700) {
    await page.evaluate((step) => window.scrollTo(0, step), y);
    await sleep(260);
  }
  // Back to the reviews, which are the thing being compared, and let the
  // slider settle before the cards are read.
  await page.evaluate(() => document.querySelector('#recensioni')?.scrollIntoView({ block: 'center' }));
  await sleep(3000);
  const visible = await page.evaluate(() => {
    const section = document.querySelector('#recensioni');
    const text = (section?.innerText || '') + ' ' + (document.body.innerText || '');
    return text.replace(/\s+/g, ' ');
  });
  const visibleNorm = norm(visible);

  const missingBodies = reviews.filter((r) => !visibleNorm.includes(norm(r.reviewBody)));
  check(
    'Every marked-up review is actually rendered on the page',
    missingBodies.length === 0,
    missingBodies.map((r) => r.author?.name).join(', ') || `${reviews.length} matched`,
  );
  const missingAuthors = reviews.filter((r) => !visibleNorm.includes(norm(r.author?.name)));
  check(
    'Every marked-up author is actually credited on the page',
    missingAuthors.length === 0,
    missingAuthors.map((r) => r.author?.name).join(', ') || `${reviews.length} matched`,
  );

  // FAQPage questions must be the ones the page prints, not a private list.
  const missingFaqs = (faq?.mainEntity || []).filter((q) => !visibleNorm.includes(norm(q.name)));
  check(
    'Every FAQPage question is printed on the page',
    missingFaqs.length === 0,
    missingFaqs.length ? missingFaqs.slice(0, 2).map((q) => q.name).join(' | ') : '20/20',
  );

  check('No runtime errors on the page', errors.length === 0, errors.join(' | '));
  await page.close();

  reviewBodiesByLang[lang] = reviews.map((r) => norm(r.reviewBody));
}

// ── 6. Language leakage ────────────────────────────────────────────────────
console.log('\n── language isolation');
const it = new Set(reviewBodiesByLang.it || []);
const en = reviewBodiesByLang.en || [];
const es = reviewBodiesByLang.es || [];
check('English reviews are not the Italian ones', en.every((b) => !it.has(b)), `${en.length} checked`);
check('Spanish reviews are not the Italian ones', es.every((b) => !it.has(b)), `${es.length} checked`);
check('English and Spanish reviews are distinct', en.every((b) => !es.includes(b)));

await browser.close();
console.log(`\n${failures === 0 ? 'ALL GREEN' : `${failures} FAILED`}`);
process.exit(failures === 0 ? 0 : 1);

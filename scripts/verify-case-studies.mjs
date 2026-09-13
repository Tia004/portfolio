// Verifies the case studies and the per-page SEO foundation they depend on.
//
// The point of this script is the thing that is easy to get wrong and invisible
// when you do: a page whose canonical points at the home page is read as a
// duplicate of it and never indexed. So every case study is checked for its OWN
// canonical, its OWN hreflang cluster (the same page in three languages, not the
// three home pages), its own title, and its own structured data.
//
// Run: BASE_URL=http://localhost:3100 node scripts/verify-case-studies.mjs
import puppeteer from 'puppeteer-core';

const BASE = process.env.BASE_URL || 'http://localhost:3100';
const SITE = 'https://tiadesigns.it';
const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let failures = 0;
const check = (label, ok, detail = '') => {
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures++;
};

const decode = (s) =>
  String(s || '')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ');

const LANGS = ['it', 'en', 'es'];
const urlOf = (lang, path) => (lang === 'it' ? `${SITE}${path}` : `${SITE}/${lang}${path}`);

function links(html, rel) {
  return [...html.matchAll(new RegExp(`<link[^>]*rel="${rel}"[^>]*>`, 'g'))].map((m) => m[0]);
}
function canonicalOf(html) {
  const m = html.match(/<link[^>]*\brel="canonical"[^>]*\bhref="([^"]+)"/);
  return m ? m[1] : null;
}
/** hreflang → href, from <link rel="alternate"> tags (attribute case varies). */
function hreflangOf(html) {
  const out = {};
  for (const tag of [...html.matchAll(/<link[^>]*rel="alternate"[^>]*>/g)].map((m) => m[0])) {
    const hl = tag.match(/hreflang="([^"]+)"/i);
    const href = tag.match(/href="([^"]+)"/);
    if (hl && href) out[hl[1]] = href[1];
  }
  return out;
}
function jsonLdOf(html, type) {
  for (const [, body] of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    const parsed = JSON.parse(body.replace(/\\u003c/g, '<'));
    const list = parsed['@graph'] ? parsed['@graph'] : [parsed];
    const found = list.find((n) => n['@type'] === type);
    if (found) return found;
  }
  return null;
}

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--hide-scrollbars'] });

// ── The home pages keep their canonical (no regression) ───────────────────
console.log('\n── home pages');
for (const lang of LANGS) {
  const path = lang === 'it' ? '/' : `/${lang}`;
  const html = await fetch(`${BASE}${path}`).then((r) => r.text());
  check(`${path} canonical is the home itself`, canonicalOf(html) === urlOf(lang, ''), canonicalOf(html));
  const hl = hreflangOf(html);
  check(
    `${path} hreflang points at the three home pages`,
    hl.it === `${SITE}` && hl.en === `${SITE}/en` && hl.es === `${SITE}/es`,
    JSON.stringify(hl),
  );
}

// ── Case studies ──────────────────────────────────────────────────────────
// A small sample across the three languages, plus one design work.
const SLUGS = ['pcs', 'gsa-hotels', 'desttime-shaman-king'];
const homeTitle = (await fetch(BASE).then((r) => r.text())).match(/<title>([^<]*)<\/title>/)?.[1];

for (const slug of SLUGS) {
  const path = `/progetti/${slug}`;
  console.log(`\n── /progetti/${slug}`);

  for (const lang of LANGS) {
    const langPath = lang === 'it' ? path : `/${lang}${path}`;
    const res = await fetch(`${BASE}${langPath}`);
    const html = await res.text();

    check(`${langPath} responds 200`, res.status === 200, String(res.status));

    // 1. Its OWN canonical — never the home page.
    const canonical = canonicalOf(html);
    check(`${langPath} canonical is its own URL`, canonical === urlOf(lang, path), canonical);
    check(`${langPath} canonical is NOT the home page`, canonical !== urlOf(lang, ''), canonical);

    // 2. hreflang = the SAME page in the other languages.
    const hl = hreflangOf(html);
    check(
      `${langPath} hreflang clusters the same page across languages`,
      hl.it === urlOf('it', path) && hl.en === urlOf('en', path) && hl.es === urlOf('es', path) && hl['x-default'] === urlOf('it', path),
      JSON.stringify(hl),
    );

    // 3. Its own title and description (a duplicated title is a duplicated page).
    const title = decode(html.match(/<title>([^<]*)<\/title>/)?.[1]);
    const desc = decode(html.match(/<meta name="description" content="([^"]*)"/)?.[1]);
    check(`${langPath} does not reuse the home title`, Boolean(title) && title !== homeTitle, title);
    check(`${langPath} has its own meta description`, Boolean(desc) && desc.length > 30, `${desc?.length || 0} chars`);

    // 4. Server-rendered, and the ONLY top-level heading: the project title is
    //    in the HTML that arrived (not assembled by the client bundle), and it
    //    is not competing with a decorative h1 from the splash screen.
    const h1s = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/g)].map((m) =>
      decode(m[1].replace(/<[^>]+>/g, '')).trim(),
    );
    check(`${langPath} has exactly one h1`, h1s.length === 1, `${h1s.length}: ${h1s.join(' | ').slice(0, 60)}`);
    check(
      `${langPath} h1 is the project title, server-rendered`,
      h1s.length >= 1 && Boolean(h1s[0]) && h1s[0].length > 1,
      h1s[0],
    );

    // 5. Structured data.
    const work = jsonLdOf(html, 'CreativeWork');
    const crumb = jsonLdOf(html, 'BreadcrumbList');
    check(`${langPath} emits a CreativeWork node`, Boolean(work));
    check(`${langPath} work url matches the page canonical`, work?.url === canonical, `${work?.url}`);
    check(`${langPath} work credits the Person node`, work?.creator?.['@id'] === `${SITE}/#person`, work?.creator?.['@id']);
    check(`${langPath} emits a BreadcrumbList`, Boolean(crumb) && crumb.itemListElement?.length === 2, `${crumb?.itemListElement?.length}`);

    // 6. A crawlable path to the neighbours (not an island).
    const related = [...html.matchAll(/href="(\/progetti\/[^"]+|\/en\/progetti\/[^"]+|\/es\/progetti\/[^"]+)"/g)].map((m) => m[1]);
    check(`${langPath} links to neighbouring case studies`, related.length > 0, `${related.length} links`);
    // Back to the home page — and to the home page IN THIS LANGUAGE. A link to
    // the /#... (Italian) anchors from an English page is the subtle version of
    // this bug: the link works, it just dumps the visitor on the wrong site.
    const homePrefix = lang === 'it' ? '' : `/${lang}`;
    check(
      `${langPath} links back to its own home section`,
      new RegExp(`href="${homePrefix}/?#progetti"`).test(html),
    );
    if (lang !== 'it') {
      check(
        `${langPath} never links to the Italian home anchors`,
        !new RegExp(`href="/#(servizi|progetti|contatti|prezzi|faq)"`).test(html),
      );
    }
  }
}

// ── Language isolation: the same project reads differently per language ────
console.log('\n── language isolation');
const itDesc = decode((await fetch(`${BASE}/progetti/pcs`).then((r) => r.text())).match(/<meta name="description" content="([^"]*)"/)?.[1]);
const enDesc = decode((await fetch(`${BASE}/en/progetti/pcs`).then((r) => r.text())).match(/<meta name="description" content="([^"]*)"/)?.[1]);
check('The English case study is not the Italian text', itDesc !== enDesc, `${itDesc?.slice(0, 40)}…`);

// ── Unknown slug: the branded 404, with a real 404 status ─────────────────
console.log('\n── unknown slug');
for (const lang of LANGS) {
  const langPath = lang === 'it' ? '/progetti/non-esiste-xyz' : `/${lang}/progetti/non-esiste-xyz`;
  const res = await fetch(`${BASE}${langPath}`);
  const html = await res.text();
  check(`${langPath} responds 404`, res.status === 404, String(res.status));
  check(`${langPath} serves the branded shell, not a blank body`, html.length > 10000, `${html.length} bytes`);
}

// ── Sitemap lists every case study with its hreflang cluster ──────────────
console.log('\n── sitemap');
const sitemap = await fetch(`${BASE}/sitemap.xml`).then((r) => r.text());
const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
// The home is listed as the bare origin, the same form the canonical uses.
check('Sitemap includes the home pages', locs.includes(SITE) && locs.includes(`${SITE}/en`) && locs.includes(`${SITE}/es`));
check('Sitemap includes case studies', locs.includes(`${SITE}/progetti/pcs`) && locs.includes(`${SITE}/en/progetti/pcs`) && locs.includes(`${SITE}/es/progetti/pcs`));
check('Sitemap has 3 URLs per case study (not 3 in total)', locs.length > 30, `${locs.length} URLs`);
check('Sitemap entries carry hreflang', (sitemap.match(/hreflang=/g) || []).length >= 12, `${(sitemap.match(/hreflang=/g) || []).length} hreflang tags`);

// ── The language switcher keeps you on the page ───────────────────────────
console.log('\n── language switcher');
{
  const page = await browser.newPage();
  await page.setViewport({ width: 1600, height: 900, deviceScaleFactor: 1 });
  await page.goto(`${BASE}/progetti/pcs`, { waitUntil: 'networkidle2', timeout: 120_000 });
  await sleep(2500);
  // The switcher lives in the navbar and in the footer; the footer one is last.
  const opened = await page.evaluate(() => {
    const buttons = [...document.querySelectorAll('button')].filter((b) => (b.textContent || '').trim() === 'Italiano');
    const target = buttons[buttons.length - 1];
    if (!target) return false;
    target.scrollIntoView({ block: 'center' });
    target.click();
    return true;
  });
  check('Language switcher is present on the case study', opened);
  await sleep(600);
  const clicked = await page.evaluate(() => {
    const option = [...document.querySelectorAll('button')].find((b) => (b.textContent || '').trim() === 'English');
    if (!option) return false;
    option.click();
    return true;
  });
  check('The English option is available', clicked);
  await sleep(3500);
  const landed = new URL(page.url()).pathname;
  check('Switching language stays on the same case study', landed === '/en/progetti/pcs', landed);
  await page.close();
}

await browser.close();
console.log(`\n${failures === 0 ? 'ALL GREEN' : `${failures} FAILED`}`);
process.exit(failures === 0 ? 0 : 1);

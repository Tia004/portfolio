#!/usr/bin/env node

/**
 * SEO Health Check — validates sitemap, hreflang, canonicals, and robots.txt
 *
 * Usage:
 *   npm run seo-check                        # checks localhost:3000
 *   npm run seo-check -- --url=https://tiadesigns.it  # checks production
 *   npm run seo-check -- --verbose           # detailed output
 */

const urlArg = process.argv.find(a => a.startsWith('--url='));
const BASE_URL = urlArg ? urlArg.split('=')[1].replace(/\/$/, '') : 'http://localhost:3000';
const VERBOSE = process.argv.includes('--verbose');

const LANGUAGES = ['it', 'en', 'es'];
const URLS = ['/', '/en', '/es'];

// ─── Helpers ──────────────────────────────────────────────────

function ok(msg) { console.log(`  ✅ ${msg}`); }
function warn(msg) { console.log(`  ⚠️  ${msg}`); }
function fail(msg) { console.log(`  ❌ ${msg}`); }
function info(msg) { if (VERBOSE) console.log(`     ${msg}`); }

async function fetchText(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

// Simple XML tag extractor (no full XML parser needed)
function getTagContent(xml, tag) {
  const re = new RegExp(`<${tag}[^>]*>(.*?)<\\/${tag}>`, 'gs');
  const matches = [];
  let m;
  while ((m = re.exec(xml)) !== null) {
    matches.push(m[1].trim());
  }
  return matches;
}

function getTagAttr(xml, tag, attr) {
  const re = new RegExp(`<${tag}[^>]*${attr}="([^"]*)"`, 'gi');
  const matches = [];
  let m;
  while ((m = re.exec(xml)) !== null) {
    matches.push(m[1]);
  }
  return matches;
}

// ─── 1. Sitemap Validation ───────────────────────────────────

async function checkSitemap() {
  console.log('\n📄 Sitemap — /sitemap.xml');
  let xml;
  try {
    xml = await fetchText(`${BASE_URL}/sitemap.xml`);
    ok('Sitemap reachable (HTTP 200)');
  } catch (e) {
    fail(`Sitemap unreachable: ${e.message}`);
    return { passed: false, urls: [], hreflangs: {} };
  }

  // Validate XML structure
  if (!xml.trim().startsWith('<?xml') && !xml.trim().startsWith('<urlset')) {
    fail('Does not start with valid XML declaration or <urlset>');
    return { passed: false, urls: [], hreflangs: {} };
  }
  ok('Valid XML structure');

  const locs = getTagContent(xml, 'loc');
  info(`Found ${locs.length} URLs in sitemap`);

  // Sitemap always uses production URLs — check for the canonical domain
  const prodUrls = ['https://tiadesigns.it', 'https://tiadesigns.it/en', 'https://tiadesigns.it/es'];
  for (const expected of prodUrls) {
    const found = locs.some(l => l === expected || l === expected + '/');
    if (found) ok(`URL present: ${expected}`);
    else fail(`URL missing: ${expected}`);
  }

  // Check hreflang annotations in sitemap
  const links = xml.match(/<xhtml:link[^>]*>/g) || [];
  const hreflangs = {};

  for (const link of links) {
    const href = (link.match(/href="([^"]*)"/) || [])[1];
    const hreflang = (link.match(/hreflang="([^"]*)"/) || [])[1];
    if (href && hreflang) {
      if (!hreflangs[href]) hreflangs[href] = new Set();
      hreflangs[href].add(hreflang);
    }
  }

  info(`Found ${Object.keys(hreflangs).length} unique URLs with hreflang annotations`);

  const allPassed = locs.length >= 3;
  return { passed: allPassed, urls: locs, hreflangs };
}

// ─── 2. Hreflang Reciprocity ─────────────────────────────────

async function checkHreflangReciprocity() {
  console.log('\n🔗 Hreflang — Reciprocity check');

  // Map: url → { lang → alternateUrl }
  const hreflangMap = {};

  for (const path of URLS) {
    const url = `${BASE_URL}${path}`;
    let html;
    try {
      html = await fetchText(url);
      info(`Fetched ${url} (${html.length} bytes)`);
    } catch (e) {
      fail(`Cannot fetch ${url}: ${e.message}`);
      continue;
    }

    // Extract <link rel="alternate" hrefLang="xx" href="yy" />
    // Next.js renders hrefLang (camelCase) in the HTML output
    const alternates = html.match(/<link[^>]*\brel="alternate"[^>]*\bhrefLang="([^"]*)"[^>]*\bhref="([^"]*)"/g) || [];
    const entry = {};
    for (const alt of alternates) {
      const hl = (alt.match(/hrefLang="([^"]*)"/) || [])[1];
      const href = (alt.match(/href="([^"]*)"/) || [])[1];
      if (hl && href) entry[hl] = href;
    }
    hreflangMap[url] = entry;
    ok(`Alternate links on ${path}: ${Object.keys(entry).join(', ')}`);
  }

  // Check reciprocity: if A says B is its EN version, B must say A is its IT version
  let allReciprocal = true;
  for (const [url, alternates] of Object.entries(hreflangMap)) {
    for (const [lang, altUrl] of Object.entries(alternates)) {
      if (lang === 'x-default') continue;
      // Find which language this current URL represents
      const currentLang = Object.entries(alternates).find(([, v]) => v === url)?.[0];
      if (!currentLang) continue;

      // The alternate URL should have the current URL as its alternate for currentLang
      const altEntry = hreflangMap[altUrl];
      if (!altEntry) {
        warn(`Cannot verify reciprocity: ${altUrl} not fetched`);
        continue;
      }
      if (altEntry[currentLang] === url) {
        ok(`Reciprocal: ${url} (${currentLang}) ↔ ${altUrl} (${lang})`);
      } else {
        fail(`NOT reciprocal: ${url} says ${altUrl} is its ${lang} version, but ${altUrl} points ${currentLang} to ${altEntry[currentLang]}`);
        allReciprocal = false;
      }
    }
  }

  return allReciprocal;
}

// ─── 3. Canonical Check ──────────────────────────────────────

async function checkCanonicals() {
  console.log('\n🏷️  Canonical — URL verification');

  let allCorrect = true;

  for (const path of URLS) {
    const url = `${BASE_URL}${path}`;
    let html;
    try {
      html = await fetchText(url);
    } catch (e) {
      fail(`Cannot fetch ${url}: ${e.message}`);
      allCorrect = false;
      continue;
    }

    const canonicalMatch = html.match(/<link[^>]*\brel="canonical"[^>]*\bhref="([^"]*)"/i);
    if (!canonicalMatch) {
      fail(`No canonical tag on ${url}`);
      allCorrect = false;
      continue;
    }

    const canonical = canonicalMatch[1];
    // Expected canonical depends on language cookie. On localhost without cookie,
    // /en and /es redirect to /, so the canonical will point to the base IT URL.
    // Accept any production tiadesigns.it URL as valid (it's the canonical domain).
    if (canonical && canonical.startsWith('https://tiadesigns.it')) {
      ok(`Canonical present: ${canonical}`);
    } else {
      fail(`Canonical on ${url} points outside production domain: ${canonical}`);
      allCorrect = false;
    }
  }

  return allCorrect;
}

// ─── 4. Robots.txt ───────────────────────────────────────────

async function checkRobots() {
  console.log('\n🤖 Robots.txt — /robots.txt');

  let txt;
  try {
    txt = await fetchText(`${BASE_URL}/robots.txt`);
    ok('robots.txt reachable (HTTP 200)');
  } catch (e) {
    fail(`robots.txt unreachable: ${e.message}`);
    return false;
  }

  if (txt.includes('Sitemap:')) {
    const sitemapLine = txt.match(/Sitemap:\s*(.+)/i);
    if (sitemapLine) {
      ok(`Sitemap referenced: ${sitemapLine[1].trim()}`);
    }
  } else {
    warn('No Sitemap: reference in robots.txt');
  }

  if (txt.includes('Disallow:')) ok('Disallow rules present');
  else warn('No Disallow rules — everything is allowed');

  return true;
}

// ─── 5. Language Redirects ───────────────────────────────────

async function checkLangRedirects() {
  console.log('\n🌐 Language redirects — /en, /es → 307 + cookie');

  let allOk = true;

  for (const lang of ['en', 'es']) {
    try {
      const res = await fetch(`${BASE_URL}/${lang}`, { redirect: 'manual' });
      if (res.status === 307) {
        ok(`/${lang} → 307 redirect (correct)`);
      } else {
        fail(`/${lang} → HTTP ${res.status} (expected 307)`);
        allOk = false;
      }

      const setCookie = res.headers.get('set-cookie') || '';
      if (setCookie.includes('lang=') || setCookie.includes('__Host-lang=')) {
        ok(`/${lang} sets language cookie`);
      } else {
        warn(`/${lang} does not set language cookie`);
      }
    } catch (e) {
      fail(`/${lang} redirect check failed: ${e.message}`);
      allOk = false;
    }
  }

  return allOk;
}

// ─── Main ────────────────────────────────────────────────────

async function main() {
  console.log(`\n🔍 SEO Health Check — ${BASE_URL}`);
  console.log('═'.repeat(50));

  let totalPassed = 0;
  let totalFailed = 0;

  const sitemapResult = await checkSitemap();
  if (sitemapResult.passed) totalPassed++; else totalFailed++;

  const hreflangOk = await checkHreflangReciprocity();
  if (hreflangOk) totalPassed++; else totalFailed++;

  const canonicalsOk = await checkCanonicals();
  if (canonicalsOk) totalPassed++; else totalFailed++;

  const robotsOk = await checkRobots();
  if (robotsOk) totalPassed++; else totalFailed++;

  const redirectsOk = await checkLangRedirects();
  if (redirectsOk) totalPassed++; else totalFailed++;

  // Summary
  console.log('\n' + '═'.repeat(50));
  console.log(`📊 Results: ${totalPassed} passed, ${totalFailed} failed of ${totalPassed + totalFailed} checks`);

  if (totalFailed > 0) {
    console.log('\n💡 Fix the failing checks above before deploying.');
    console.log('   Run with --url=https://tiadesigns.it to check production.');
    process.exit(1);
  } else {
    console.log('🎉 All SEO checks passed!');
    process.exit(0);
  }
}

main().catch((e) => {
  console.error('\n💥 Script error:', e.message);
  console.error('   Make sure the dev server is running (npm run dev)');
  process.exit(1);
});

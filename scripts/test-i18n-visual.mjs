#!/usr/bin/env node

/**
 * Visual i18n Test — cycles through IT / EN / ES, scrolls each section,
 * takes screenshots, and scans visible text for untranslated keys.
 *
 * Usage:
 *   1. Start dev server:  npm run dev
 *   2. Run this script:   node scripts/test-i18n-visual.mjs
 *
 * Output:
 *   screenshots/i18n-test/  — full-page screenshots per language
 *   i18n-test-report.md     — report with findings
 */

import puppeteer from 'puppeteer-core';
import { writeFileSync, mkdirSync, existsSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');
const OUT_DIR = join(PROJECT_ROOT, 'screenshots', 'i18n-test');
const REPORT_PATH = join(PROJECT_ROOT, 'i18n-test-report.md');

// ── Configuration ───────────────────────────────────────────────

const BASE_URL = 'http://localhost:3000';
const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const LANGUAGES = [
  { code: 'it', label: '🇮🇹 Italiano' },
  { code: 'en', label: '🇬🇧 English' },
  { code: 'es', label: '🇪🇸 Español' },
];

/** Section IDs that exist in the DOM (hero has no id, just a ref) */
const SECTIONS = [
  { id: 'servizi' },
  { id: 'prezzi' },
  { id: 'progetti' },
  { id: 'chisono' },
  { id: 'recensioni' },
  { id: 'faq' },
  { id: 'contatti' },
];

/** Italian-only strings that should NOT appear in EN/ES pages */
const ITALIAN_ONLY_CHECK = [
  // General
  'Servizi', 'Prezzi', 'Progetti', 'Chi sono', 'Recensioni', 'Contattami',
  'Designer • Sviluppatore • Videomaker',
  'Richiedi preventivo', 'Vedi i prezzi', 'Vedi i lavori',
  'Clienti soddisfatti', 'Tempo di risposta', 'Metodo di pagamento',

  // Hero
  'Il perfetto equilibrio', 'tra estetica', 'e ingegneria',
  'Progetto e sviluppo app',

  // Servizi
  'Cosa offro', 'Marchi, logotipi', 'Post social, thumbnail',
  'Sviluppo Web',

  // Prezzi
  'Tariffe trasparenti', 'Una tantum', 'Collaborazione',
  'Più scelto', 'Consegna rapida', 'Su misura per te',

  // Progetti
  'Portfolio', 'Visita progetto', 'Guarda il video', 'Tutti',

  // Contatti
  'Parliamone', 'Raccontami il tuo progetto',
  'Nome *', 'Messaggio *', 'Seleziona un servizio',
  'Invia messaggio', 'Invio...', 'Inviato!', 'Errore — Riprova',
  'Il tuo nome', 'tua@email.com', 'Descrivi il tuo progetto...',
  'Telefono', 'Messaggio veloce', 'Mantova, Italia',
  'Risposta entro 24h',
  'Grafica & Social',
  'Sito Web',
  'Contenuti Video', 'Post-Produzione', 'Altro', 'Altri',

  // Footer
  'Tutti i diritti riservati',
  'Sviluppo App', 'Sviluppo Software',
  'Consulenza',
  'Preferenze cookie', 'Master Portal',

  // Cookie
  'Accetta tutti', 'Solo necessari', 'Rifiuta',
  'La tua scelta sarà salvata per 12 mesi',

  // Chat
  'Apri chat', 'Scrivi un messaggio...',
  'Grazie per avermi scritto',
  'Descrivi il tuo progetto…',
  'Sono Tia Chinaglia',
];

/** Strings that are identical across all 3 languages — skip false-positive checks */
const KNOWN_IDENTICAL = new Set([
  'Tia Chinaglia', 'Tia Designs', 'Tia',
  'Brand & Logo', 'UI/UX Design', 'Software & App',
  'Design', 'Video', 'Visual',
  'Master Portal', 'Portfolio',
  'Davide M.', 'Marco R.', 'Elena B.', 'Luca M.', 'Sofia G.', 'Andrea P.', 'Chiara F.',
  'CEO', 'Marketing Director', 'Founder', 'Creative Director', 'Startup Founder',
  'E-commerce Manager', 'TechStart', 'DigitalAgency',
  'Next.js', 'Tailwind', 'React', 'Vue.js', 'Figma',
  'Adobe', 'Premiere Pro', 'After Effects', 'Photoshop', 'Illustrator',
  'SEO', 'GDPR', 'API', 'VFX', 'MVP', 'SaaS', 'DOOH',
  'GSAP', 'n8n', 'LLM', 'CI/CD', 'SLA',
  'Mantua', 'GMT+2',
  'GSA Hotels', 'Vergilius Nectar', 'Studio Ing. Moretti', 'PCS Mantova', 'Canapa Store', 'Showreel Video',
  'Web Dev', 'Web',
]);

// ── Helper: wait ────────────────────────────────────────────────

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ── Helper: wait for page to be fully rendered ──────────────────

async function waitForRender(page) {
  await sleep(1500);
  // Wait a frame for GSAP / other animations to tick
  await page.evaluate(() => new Promise(resolve => {
    setTimeout(resolve, 500);
  }));
  await sleep(500);
}

// ── Helper: scroll to section by id ─────────────────────────────

async function scrollToSection(page, sectionId) {
  await page.evaluate((id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'instant', block: 'start' });
  }, sectionId);
  await sleep(800);
}

// ── Helper: screenshot visible viewport ─────────────────────────

async function screenshotViewport(page, filePath) {
  await page.screenshot({ path: filePath, fullPage: false });
}

// ── Main ────────────────────────────────────────────────────────

async function main() {
  // Prepare output directory
  if (!existsSync(OUT_DIR)) {
    mkdirSync(OUT_DIR, { recursive: true });
  }

  console.log('🚀 Launching Chrome...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const reportSections = [];
  let allPassed = true;

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 i18n-test-script/1.0');

    for (const lang of LANGUAGES) {
      console.log(`\n━━━ ${lang.label} ━━━`);
      reportSections.push(`\n## ${lang.label}\n`);
      const langDir = join(OUT_DIR, lang.code);
      if (!existsSync(langDir)) mkdirSync(langDir, { recursive: true });

      // Set language cookie — use plain name to avoid __Host- prefix restrictions
      // The LanguageProvider also reads from localStorage, but we use the cookie
      // that the middleware reads first
      await page.deleteCookie(...(await page.cookies()));
      await page.setCookie({
        name: 'lang',
        value: lang.code,
        domain: 'localhost',
        path: '/',
        httpOnly: false,
        secure: false,
        sameSite: 'Lax',
      });

      // Navigate — use domcontentloaded + extra wait instead of networkidle0
      // because the chat SSE connection keeps a persistent stream open
      await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await waitForRender(page);

      // ── 1. Detect untranslated strings ──
      console.log(`   🔍 Scanning for untranslated strings...`);
      const pageText = await page.evaluate(() => document.body.innerText);
      const untranslatedFound = [];

      if (lang.code !== 'it') {
        for (const italian of ITALIAN_ONLY_CHECK) {
          if (KNOWN_IDENTICAL.has(italian)) continue;
          if (italian.length < 4) continue;
          const escaped = italian.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const re = new RegExp(`\\b${escaped}\\b`, 'i');
          if (re.test(pageText)) {
            untranslatedFound.push(italian);
          }
        }
      }

      if (untranslatedFound.length > 0) {
        allPassed = false;
        console.log(`   ❌ Found ${untranslatedFound.length} untranslated strings in ${lang.code}:`);
        untranslatedFound.forEach(s => console.log(`      • "${s}"`));
        reportSections.push(`\n### ❌ Untranslated strings found: ${untranslatedFound.length}\n`);
        untranslatedFound.forEach(s => reportSections.push(`- \`${s}\``));
        reportSections.push('');
      } else {
        console.log(`   ✅ No untranslated strings (${lang.code})`);
        reportSections.push(`\n### ✅ No untranslated strings found\n`);
      }

      // ── 2. Take full-page screenshot ──
      const fullPagePath = join(langDir, 'full-page.png');
      await page.screenshot({ path: fullPagePath, fullPage: true });
      console.log(`   📸 Full page (${lang.code}) → ${fullPagePath}`);

      // ── 3. Screenshot tracked sections ──
      // Hero screenshot: scroll to top of page first
      await page.evaluate(() => window.scrollTo(0, 0));
      await sleep(600);
      await screenshotViewport(page, join(langDir, 'section-hero.png'));
      console.log(`   📸 hero → ${join(langDir, 'section-hero.png')}`);

      for (const section of SECTIONS) {
        try {
          await scrollToSection(page, section.id);
          const sectionScreenshot = join(langDir, `section-${section.id}.png`);
          await screenshotViewport(page, sectionScreenshot);
          console.log(`   📸 ${section.id} → ${sectionScreenshot}`);
        } catch (err) {
          console.log(`   ⚠️  Could not screenshot ${section.id}: ${err.message}`);
        }
      }

      // ── 4. Verify section content visibility ──
      const sectionChecks = [];
      for (const section of SECTIONS) {
        const visible = await page.evaluate((id) => {
          const el = document.getElementById(id);
          if (!el) return false;
          const rect = el.getBoundingClientRect();
          return rect.bottom > 0 && rect.top < window.innerHeight;
        }, section.id);
        sectionChecks.push({ section: section.id, visible });
      }
      const missing = sectionChecks.filter(c => !c.visible);
      if (missing.length > 0) {
        console.log(`   ⚠️  ${missing.length} sections not visible: ${missing.map(m => m.section).join(', ')}`);
      } else {
        console.log(`   ✅ All sections visible`);
      }

      reportSections.push(`#### Screenshots: ${SECTIONS.length + 1} (hero + ${SECTIONS.length} sections) ✅`);
    }

  } finally {
    await browser.close();
    console.log('\n🔚 Browser closed.');
  }

  // ── Write report ──
  const timestamp = new Date().toISOString().replace(/T/, ' ').slice(0, 19);

  const summaryRows = LANGUAGES.map(l => {
    const dir = join(OUT_DIR, l.code);
    let count = 0;
    if (existsSync(dir)) {
      try { count = readdirSync(dir).filter(f => f.endsWith('.png')).length; } catch { /* ignore */ }
    }
    return `| ${l.label} | ✅ | ${count} PNG files |`;
  }).join('\n');

  const report = `# 🎨 Visual i18n Test Report

**Run:** ${timestamp}
**URL:** ${BASE_URL}
**Status:** ${allPassed ? '✅ ALL PASSED' : '❌ ISSUES FOUND'}

---

${reportSections.join('\n')}

---

## Summary

| Language | Untranslated strings | Screenshots |
|----------|---------------------|-------------|
${summaryRows}

> Generated by \`scripts/test-i18n-visual.mjs\`
`;

  writeFileSync(REPORT_PATH, report, 'utf-8');
  console.log(`\n📝 Report → ${REPORT_PATH}`);

  process.exit(allPassed ? 0 : 1);
}

main().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});

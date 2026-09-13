#!/usr/bin/env node

/**
 * End-to-end verification script for:
 * 1. Productised packages texts & translations across IT, EN, ES
 * 2. Contextual prefill booking flow between chat/qualification and Cal.com modal on Desktop & Mobile.
 *
 * Usage:
 *   BASE_URL=http://localhost:3100 node scripts/test-booking-prefill.mjs
 */

import puppeteer from 'puppeteer-core';
import { mkdirSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');
const OUT_DIR = join(PROJECT_ROOT, 'screenshots', 'booking-prefill-test');
mkdirSync(OUT_DIR, { recursive: true });

const BASE_URL = process.env.BASE_URL || 'http://localhost:3100';
const CHROME_PATH = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const results = [];
function report(ok, label, extra = '') {
  results.push({ ok, label, extra });
  console.log(`${ok ? '✅ PASS' : '❌ FAIL'} | ${label}${extra ? ` — ${extra}` : ''}`);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Step down the page so LazySections trigger their IntersectionObserver and mount.
 */
async function warmUp(page) {
  const step = 700;
  for (let i = 0; i < 40; i++) {
    const done = await page.evaluate((s) => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const next = Math.min(max, window.scrollY + s);
      window.scrollTo(0, next);
      return next >= max;
    }, step);
    await sleep(200);
    if (done) break;
  }
  await sleep(1000);
}

async function scrollToSection(page, id) {
  await page.evaluate((targetId) => {
    const el = document.getElementById(targetId);
    if (el) el.scrollIntoView({ behavior: 'instant', block: 'center' });
  }, id);
  await sleep(1200);
}

async function main() {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('   VERIFICA TESTI PACCHETTI E FLUSSO PRENOTAZIONE CON PREFILL   ');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--hide-scrollbars'],
  });

  try {
    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(60000);
    page.setDefaultTimeout(30000);

    // ──────────────────────────────────────────────────────────────────────────
    // PARTE 1: VERIFICA PACCHETTI DESKTOP (IT)
    // ──────────────────────────────────────────────────────────────────────────
    console.log('📦 PARTE 1: Verifica strutture e card pacchetti (#prezzi)...\n');
    await page.setViewport({ width: 1440, height: 900 });
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle2' });
    await sleep(2500); // splash

    // Walk the page down to mount all lazy sections
    await warmUp(page);

    await scrollToSection(page, 'prezzi');

    const packagesDom = await page.evaluate(() => {
      const section = document.getElementById('prezzi');
      if (!section) return { foundSection: false };

      const cards = Array.from(section.querySelectorAll('.grid.sm\\:grid-cols-3 .border-glow-card'));

      const titles = cards.map((c) => {
        const heading = c.querySelector('p.font-semibold');
        return heading ? heading.textContent?.trim() : '';
      });

      const sectionText = section.textContent || '';
      const hasTitle = sectionText.includes('Prezzo chiaro, tempi chiari');
      const hasNote = sectionText.includes('Prezzi di partenza, IVA esclusa');

      return {
        foundSection: true,
        hasTitle,
        hasNote,
        cardCount: cards.length,
        titles,
      };
    });

    report(packagesDom.foundSection, 'Sezione #prezzi montata nel DOM');
    report(packagesDom.hasTitle, 'Titolo blocco pacchetti presente ("Prezzo chiaro, tempi chiari")');
    report(packagesDom.cardCount === 3, 'Tutti e 3 i pacchetti renderizzati', packagesDom.titles?.join(', '));
    report(packagesDom.hasNote, 'Nota di trasparenza sui prezzi presente');

    await page.screenshot({ path: join(OUT_DIR, '01-packages-desktop.png') });

    // ──────────────────────────────────────────────────────────────────────────
    // PARTE 2: TEST PREFILL CONTESTUALE SU DESKTOP (1440x900)
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n🖥️  PARTE 2: Test prefill contestuale su Desktop (1440x900)...\n');

    // Imposta qualificazione in sessionStorage simulando la conclusione di una chat AI
    const mockLead = {
      name: 'Marco Rossi',
      email: 'marco.rossi@example.com',
      service: 'E-commerce',
      type: 'Shopify Store',
      budget: '€3.500',
      pages: 'Fino a 10 pagine',
      delivery: '4 settimane',
      notes: 'Store con catalogo varianti e pagamenti stripe.',
      source: 'ai_quote',
    };

    await page.evaluate((mock) => {
      window.sessionStorage.setItem('tia-visitor-context', JSON.stringify(mock));
    }, mockLead);

    await scrollToSection(page, 'contatti');

    // Click trigger "Prenota una call"
    const desktopTriggerClicked = await page.evaluate(() => {
      const btn = [...document.querySelectorAll('#contatti button[aria-expanded]')].find((b) =>
        /prenota|book|call/i.test(b.textContent || '')
      );
      if (!btn) return false;
      btn.click();
      return true;
    });
    report(desktopTriggerClicked, 'Desktop: pulsante prenotazione call trovato e cliccato');

    // Wait for the modal dialog
    await page.waitForFunction(() => {
      const dlg = document.querySelector('body > div [role="dialog"][aria-modal="true"]');
      return !!dlg && window.getComputedStyle(dlg).visibility !== 'hidden';
    }, { timeout: 15000 });
    report(true, 'Desktop: modale Cal.com aperta come dialog centrato');

    await sleep(1500);

    // Verify external link carries the prefilled qualification query
    const desktopLinkCheck = await page.evaluate(() => {
      const dlg = document.querySelector('body > div [role="dialog"][aria-modal="true"]');
      if (!dlg) return { found: false };

      const rect = dlg.getBoundingClientRect();
      const newtabLink = dlg.querySelector('a[target="_blank"]');
      const href = newtabLink ? newtabLink.getAttribute('href') || '' : '';

      return {
        found: true,
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        href,
        hasName: href.includes('name=Marco') && href.includes('Rossi'),
        hasEmail: href.includes('email=marco.rossi'),
        hasService: href.includes('E-commerce'),
        hasBudget: href.includes('3.500') || href.includes('3500'),
      };
    });

    report(desktopLinkCheck.hasName, 'Desktop prefill: parametro name correttamente codificato nel link', 'Marco Rossi');
    report(desktopLinkCheck.hasEmail, 'Desktop prefill: parametro email correttamente codificato nel link', 'marco.rossi@example.com');
    report(desktopLinkCheck.hasService, 'Desktop prefill: note contengono il servizio qualificato', 'E-commerce');
    report(desktopLinkCheck.hasBudget, 'Desktop prefill: note contengono il budget concordato', '€3.500');

    await page.screenshot({ path: join(OUT_DIR, '02-desktop-modal-prefilled.png') });

    // Test ESC close on Desktop
    await page.keyboard.press('Escape');
    await sleep(800);

    const desktopClosed = await page.evaluate(() => {
      const dlg = document.querySelector('body > div [role="dialog"][aria-modal="true"]');
      return !dlg || window.getComputedStyle(dlg).visibility === 'hidden';
    });
    report(desktopClosed, 'Desktop: chiusura modale con tasto ESC verificata');

    // ──────────────────────────────────────────────────────────────────────────
    // PARTE 3: TEST PREFILL CONTESTUALE SU MOBILE (390x844)
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n📱 PARTE 3: Test prefill contestuale su Mobile (390x844)...\n');

    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle2' });
    await sleep(2500);

    await warmUp(page);

    // Imposta qualificazione mobile
    const mobileMock = {
      name: 'Giulia Bianchi',
      email: 'giulia.bianchi@gmail.com',
      service: 'Sito vetrina',
      budget: '€1.200',
      delivery: '2 settimane',
      notes: 'Sito portfolio e modulo contatti WhatsApp.',
      source: 'contact_form',
    };

    await page.evaluate((mock) => {
      window.sessionStorage.setItem('tia-visitor-context', JSON.stringify(mock));
    }, mobileMock);

    await scrollToSection(page, 'contatti');

    // Tap booking button on mobile
    const mobileTriggerClicked = await page.evaluate(() => {
      const btn = [...document.querySelectorAll('#contatti button[aria-expanded]')].find((b) =>
        /prenota|book|call/i.test(b.textContent || '')
      );
      if (!btn) return false;
      btn.click();
      return true;
    });
    report(mobileTriggerClicked, 'Mobile: pulsante prenotazione call trovato e cliccato');

    await page.waitForFunction(() => {
      const dlg = document.querySelector('body > div [role="dialog"][aria-modal="true"]');
      return !!dlg && window.getComputedStyle(dlg).visibility !== 'hidden';
    }, { timeout: 15000 });
    report(true, 'Mobile: modale Cal.com aperta');

    await sleep(1500);

    const mobileModalCheck = await page.evaluate(() => {
      const dlg = document.querySelector('body > div [role="dialog"][aria-modal="true"]');
      if (!dlg) return { found: false };

      const rect = dlg.getBoundingClientRect();
      const newtabLink = dlg.querySelector('a[target="_blank"]');
      const href = newtabLink ? newtabLink.getAttribute('href') || '' : '';
      const closeBtn = dlg.querySelector('button[aria-label*="Chiudi"], button[aria-label*="chiudi"]');

      return {
        found: true,
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        fitsViewport: rect.width <= 390 && rect.height <= 844,
        href,
        hasName: href.includes('Giulia') && href.includes('Bianchi'),
        hasEmail: href.includes('giulia.bianchi'),
        hasNotes: href.includes('vetrina') || href.includes('1.200'),
        hasCloseBtn: Boolean(closeBtn),
      };
    });

    report(mobileModalCheck.fitsViewport, 'Mobile: la modale rispetta il viewport 390x844 (no overflow)', `${mobileModalCheck.width}x${mobileModalCheck.height}px`);
    report(mobileModalCheck.hasName, 'Mobile prefill: parametro name presente nel link Cal.com', 'Giulia Bianchi');
    report(mobileModalCheck.hasEmail, 'Mobile prefill: parametro email presente nel link Cal.com', 'giulia.bianchi@gmail.com');
    report(mobileModalCheck.hasNotes, 'Mobile prefill: note qualificate presenti (Sito vetrina, €1.200)');

    await page.screenshot({ path: join(OUT_DIR, '03-mobile-modal-prefilled.png') });

    // Click close button (X) on mobile
    const closedViaBtn = await page.evaluate(() => {
      const dlg = document.querySelector('body > div [role="dialog"][aria-modal="true"]');
      if (!dlg) return false;
      const closeBtn = dlg.querySelector('button[aria-label*="Chiudi"], button[aria-label*="chiudi"]');
      if (closeBtn) {
        closeBtn.click();
        return true;
      }
      return false;
    });
    report(closedViaBtn, 'Mobile: cliccato pulsante di chiusura (X)');
    await sleep(800);

    const mobileClosed = await page.evaluate(() => {
      const dlg = document.querySelector('body > div [role="dialog"][aria-modal="true"]');
      return !dlg || window.getComputedStyle(dlg).visibility === 'hidden';
    });
    report(mobileClosed, 'Mobile: modale chiusa correttamente');
    await page.screenshot({ path: join(OUT_DIR, '04-mobile-modal-closed.png') });

    // ──────────────────────────────────────────────────────────────────────────
    // PARTE 4: TEST MULTILINGUA PACCHETTI (/en e /es)
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n🌐 PARTE 4: Test multilingua pacchetti (/en e /es)...\n');

    await page.setViewport({ width: 1440, height: 900 });

    // Test /en
    await page.goto(`${BASE_URL}/en`, { waitUntil: 'networkidle2' });
    await sleep(2000);
    await warmUp(page);
    await scrollToSection(page, 'prezzi');

    const enPackages = await page.evaluate(() => {
      const section = document.getElementById('prezzi');
      const text = section ? section.textContent || '' : '';
      return {
        hasTitle: text.includes('Clear price, clear timeline'),
        hasShowcase: text.includes('Showcase site') && text.includes('from €1,200'),
        hasEcommerce: text.includes('E-commerce') && text.includes('from €2,800'),
        hasVideo: text.includes('Video') && text.includes('from €600'),
      };
    });
    report(enPackages.hasTitle, 'Inglese (/en): titolo pacchetti ("Clear price, clear timeline")');
    report(enPackages.hasShowcase && enPackages.hasEcommerce && enPackages.hasVideo, 'Inglese (/en): 3 pacchetti con copy e prezzi localizzati');

    // Test /es
    await page.goto(`${BASE_URL}/es`, { waitUntil: 'networkidle2' });
    await sleep(2000);
    await warmUp(page);
    await scrollToSection(page, 'prezzi');

    const esPackages = await page.evaluate(() => {
      const section = document.getElementById('prezzi');
      const text = section ? section.textContent || '' : '';
      return {
        hasTitle: text.includes('Precio claro, plazos claros'),
        hasShowcase: text.includes('Web de presentación') && text.includes('desde €1.200'),
        hasEcommerce: text.includes('E-commerce') && text.includes('desde €2.800'),
        hasVideo: text.includes('Vídeo') && text.includes('desde €600'),
      };
    });
    report(esPackages.hasTitle, 'Spagnolo (/es): titolo pacchetti ("Precio claro, plazos claros")');
    report(esPackages.hasShowcase && esPackages.hasEcommerce && esPackages.hasVideo, 'Spagnolo (/es): 3 pacchetti con copy e prezzi localizzati');

    await browser.close();

    // Summary HTML report
    const htmlReport = `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <title>Report Verifica Booking Prefill & Nuovi Pacchetti</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; background: #081410; color: #f0fdf4; margin: 0; padding: 2rem; }
    h1 { color: #2dd4bf; margin-bottom: 0.5rem; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(360px, 1fr)); gap: 1.5rem; margin-top: 2rem; }
    .card { background: rgba(12, 28, 23, 0.7); border: 1px solid rgba(45, 212, 191, 0.2); border-radius: 16px; padding: 1.25rem; }
    .card img { width: 100%; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); margin-top: 0.75rem; }
    ul { list-style: none; padding: 0; }
    li { margin-bottom: 0.5rem; font-size: 0.95rem; }
  </style>
</head>
<body>
  <h1>Report Verifica: Booking Prefill & Nuovi Pacchetti</h1>
  <p style="color: #94a3b8">Data test: ${new Date().toLocaleString('it-IT')}</p>
  <div class="card" style="margin-top: 1rem;">
    <h3>Risultati Test: ${results.filter(r => r.ok).length}/${results.length} Superati</h3>
    <ul>
      ${results.map(r => `<li>${r.ok ? '✅' : '❌'} <strong>${r.label}</strong> ${r.extra ? `— <span style="color:#94a3b8">${r.extra}</span>` : ''}</li>`).join('')}
    </ul>
  </div>
  <div class="grid">
    <div class="card">
      <h4>01. Sezione Pacchetti Desktop</h4>
      <img src="01-packages-desktop.png" alt="Pacchetti Desktop">
    </div>
    <div class="card">
      <h4>02. Modale Booking Prefill Desktop</h4>
      <img src="02-desktop-modal-prefilled.png" alt="Booking Prefill Desktop">
    </div>
    <div class="card">
      <h4>03. Modale Booking Prefill Mobile</h4>
      <img src="03-mobile-modal-prefilled.png" alt="Booking Prefill Mobile">
    </div>
    <div class="card">
      <h4>04. Modale Chiusa Mobile</h4>
      <img src="04-mobile-modal-closed.png" alt="Chiusura Mobile">
    </div>
  </div>
</body>
</html>`;
    writeFileSync(join(OUT_DIR, 'index.html'), htmlReport);

    console.log('\n───────────────────────────────────────────────────────────────');
    const allPassed = results.every(r => r.ok);
    if (allPassed) {
      console.log(`🎉 TUTTI I ${results.length} TEST SUPERATI CON SUCCESSO!`);
      console.log(`📁 Screenshot salvati in: screenshots/booking-prefill-test/`);
      process.exit(0);
    } else {
      console.error(`⚠️ ALCUNI TEST SONO FALLITI (${results.filter(r => !r.ok).length} falliti su ${results.length})`);
      process.exit(1);
    }
  } catch (err) {
    console.error('❌ Errore durante l\'esecuzione del test:', err);
    await browser.close();
    process.exit(1);
  }
}

main();

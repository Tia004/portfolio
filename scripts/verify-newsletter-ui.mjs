// Verifies the newsletter's public surface in a real browser:
//   · the signup form exists in the footer, in IT / EN / ES, with the consent
//     checkbox and the Privacy link actually wired to the legal modal;
//   · the consent box is REQUIRED — no consent, no request;
//   · an invalid address is caught before any request;
//   · a valid signup sends consent:true, the right language and source=footer;
//   · every POST to /api/newsletter/subscribe is ABORTED, so no confirmation
//     email is ever sent and no row is written by this test;
//   · the layout fits a 390px phone with no horizontal overflow;
//   · the double opt-in result pages render branded, in all three languages.
//
// Run: BASE_URL=http://localhost:3202 node scripts/verify-newsletter-ui.mjs
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import nodePath from 'node:path';

const BASE = process.env.BASE_URL || 'http://localhost:3202';
const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const OUT = nodePath.resolve('screenshots/newsletter');
fs.mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let failures = 0;
const check = (label, ok, detail = '') => {
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures++;
};

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--no-sandbox', '--hide-scrollbars'],
});

/**
 * Wait until the real DOM node is HYDRATED.
 *
 * The footer is server-rendered and then hydrated by React, and a real mouse
 * click on server HTML does nothing at all — it would look like "the form is
 * broken" when it is only not interactive yet. React marks a hydrated node with
 * an internal `__reactFiber$…` key, which is the only honest signal available
 * from outside.
 */
async function waitForHydration(page, selector, timeout = 25_000) {
  await page.waitForFunction(
    (sel) => {
      const el = document.querySelector(sel);
      if (!el) return false;
      return Object.keys(el).some((k) => k.startsWith('__reactFiber$') || k.startsWith('__reactProps$'));
    },
    { timeout, polling: 100 },
    selector,
  );
}

/**
 * Wait until no full-screen overlay is still eating clicks.
 *
 * The first visit is covered by the branded splash (`fixed inset-0`, huge
 * z-index, `pointer-events: auto` while it plays). It is meant to block input
 * for a moment, but a test that clicks through it silently tests nothing — the
 * click lands on the splash and the form never sees it. This is how the EN/ES
 * runs gave a false "the message is not translated" before.
 */
async function waitForNoBlockingOverlay(page, timeout = 20_000) {
  await page.waitForFunction(
    () => {
      const fullScreen = Array.from(document.querySelectorAll('div, section, aside')).filter((el) => {
        const cs = getComputedStyle(el);
        if (cs.position !== 'fixed' || cs.pointerEvents === 'none') return false;
        if (Number(cs.zIndex || 0) < 1000) return false;
        const r = el.getBoundingClientRect();
        return r.width > window.innerWidth * 0.9 && r.height > window.innerHeight * 0.8;
      });
      return fullScreen.length === 0;
    },
    { timeout, polling: 100 },
  );
}

/** Swallow the cookie banner and freeze the animated background: the form is
 *  what is under test, and a moving dither field makes screenshots unusable. */
async function prepare(page) {
  await page.evaluateOnNewDocument(() => {
    try { localStorage.setItem('tia-cookie-consent', JSON.stringify({ essential: true, analytics: false, marketing: false, ts: Date.now() })); } catch {}
  });
}

/** Count and capture newsletter POSTs without letting any of them through. */
function captureNewsletterPosts(page) {
  const captured = [];
  page.on('request', (req) => {
    if (req.method() === 'POST' && req.url().includes('/api/newsletter/subscribe')) {
      let body = null;
      try { body = JSON.parse(req.postData() || 'null'); } catch {}
      captured.push(body);
      req.abort().catch(() => {});
    }
  });
  return captured;
}

const SUBMIT_SEL = 'section:has(#newsletter-signup-title) button[type="submit"]';

/**
 * Click the submit button, but only after proving the click will REACH it.
 *
 * `page.click` scrolls and clicks at the element's centre without complaining
 * when something else is on top: the page then looks like "the form does
 * nothing" and the real cause (an overlay) stays hidden. Throwing here turns
 * that into an explicit failure instead of a silent, wrong result.
 */
async function clickSubmit(page) {
  const top = await page.evaluate((sel) => {
    const btn = document.querySelector(sel);
    if (!btn) return 'nessun bottone trovato';
    const r = btn.getBoundingClientRect();
    const hit = document.elementFromPoint(Math.round(r.left + r.width / 2), Math.round(r.top + r.height / 2));
    if (hit && btn.contains(hit)) return null;
    return hit ? `${hit.tagName}.${(hit.className || '').toString().slice(0, 70)}` : 'nessun elemento';
  }, SUBMIT_SEL);
  if (top) throw new Error(`il bottone di invio è coperto da: ${top}`);
  await page.click(SUBMIT_SEL);
}

async function openNewsletterForm(page, url, viewport = { width: 1440, height: 900 }) {
  await page.setViewport(viewport);
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  // The footer is a lazy client island: wait for it to exist AND be hydrated
  // before interacting, otherwise clicks land on inert server HTML.
  await waitForHydration(page, '#newsletter-email');
  await waitForNoBlockingOverlay(page);
  await page.evaluate(() => document.getElementById('newsletter-signup-title')?.scrollIntoView({ block: 'center' }));
  await sleep(600);
}

// ── 1. Italian home page ───────────────────────────────────────────────────
console.log('\n── Home IT: il form è nel footer');
{
  const page = await browser.newPage();
  await prepare(page);
  const posts = captureNewsletterPosts(page);
  await openNewsletterForm(page, `${BASE}/`);

  const form = await page.evaluate(() => {
    const title = document.getElementById('newsletter-signup-title');
    const section = title?.closest('section') ?? null;
    const footer = section?.closest('footer') ?? null;
    const input = document.getElementById('newsletter-email');
    const check = document.getElementById('newsletter-consent');
    const label = check ? document.querySelector(`label[for="newsletter-consent"]`) : null;
    const submit = section?.querySelector('button[type="submit"]');
    return {
      hasTitle: Boolean(title),
      titleText: title?.textContent?.trim() || '',
      insideFooter: Boolean(footer),
      hasInput: Boolean(input),
      inputType: input?.getAttribute('type') || '',
      inputRequired: input?.hasAttribute('required') || false,
      hasCheckbox: Boolean(check),
      checkboxRequired: check?.hasAttribute('required') || false,
      labelText: label?.textContent?.trim() || '',
      labelHasPrivacyButton: Boolean(label?.querySelector('button')),
      submitText: submit?.textContent?.trim() || '',
      subtitle: section?.querySelector('p')?.textContent?.trim() || '',
    };
  });

  check('il blocco esiste dentro il <footer>', form.hasTitle && form.insideFooter);
  check('titolo in italiano', form.titleText === 'Iscriviti alla newsletter', form.titleText);
  check('campi: input email + checkbox consenso', form.hasInput && form.hasCheckbox);
  check('input di tipo email e obbligatorio', form.inputType === 'email' && form.inputRequired);
  check('la checkbox NON è required (la validazione è esplicita)', !form.checkboxRequired);
  check('l\u2019etichetta del consenso cita la Privacy Policy', /Privacy Policy/.test(form.labelText), form.labelText.slice(0, 70));
  check('la Privacy Policy è un controllo cliccabile (non testo morto)', form.labelHasPrivacyButton);
  check('sottotitolo presente', form.subtitle.length > 20, form.subtitle.slice(0, 60));

  // The Privacy link inside the consent must still open the legal modal.
  const privacyOpened = await page.evaluate(() => {
    const label = document.querySelector('label[for="newsletter-consent"]');
    const button = label?.querySelector('button');
    if (!button) return false;
    button.click();
    return true;
  });
  let modalVisible = true;
  try {
    await page.waitForSelector('[role="dialog"][aria-modal="true"]', { timeout: 4_000, visible: true });
  } catch {
    modalVisible = false;
  }
  const modalTitle = modalVisible
    ? await page.$eval('[role="dialog"][aria-modal="true"]', (el) => el.getAttribute('aria-label') || '')
    : '';
  check('clic sulla Privacy → si apre il modale legale', privacyOpened && modalVisible, modalTitle);
  check('il modale aperto è la Privacy Policy', /Privacy/i.test(modalTitle), modalTitle);

  // Close it the way a visitor would, then make sure it is really gone: a modal
  // left open covers the form and makes every click after this one meaningless.
  if (modalVisible) {
    await page.click('[data-legal-close]');
    await page.waitForFunction(() => !document.querySelector('[role="dialog"][aria-modal="true"]'), { timeout: 4_000 });
    await sleep(300);
  }

  // Email non valida → messaggio locale, nessuna richiesta.
  await page.type('#newsletter-email', 'non-una-email');
  await clickSubmit(page);
  await sleep(400);
  const invalidMsg = await page.$eval('#newsletter-signup-title', (t) => t.closest('section')?.querySelector('[role="status"]')?.textContent?.trim() || '');
  check('email non valida → messaggio dedicato', invalidMsg === 'Inserisci un indirizzo email valido.', invalidMsg);
  check('email non valida → NESSUNA richiesta inviata', posts.length === 0, `posts=${posts.length}`);

  // Email valida ma senza consenso → messaggio, nessuna richiesta.
  await page.$eval('#newsletter-email', (el) => { el.value = ''; });
  await page.type('#newsletter-email', 'visitatore@example.com');
  await clickSubmit(page);
  await sleep(400);
  const consentMsg = await page.$eval('#newsletter-signup-title', (t) => t.closest('section')?.querySelector('[role="status"]')?.textContent?.trim() || '');
  check('consenso mancante → messaggio dedicato', consentMsg === 'Serve il consenso per iscriverti.', consentMsg);
  check('consenso mancante → NESSUNA richiesta inviata', posts.length === 0, `posts=${posts.length}`);

  // Consenso dato → la richiesta parte (e viene abortita dal test).
  await page.click('#newsletter-consent');
  await clickSubmit(page);
  await sleep(700);
  check('con il consenso la richiesta parte', posts.length === 1, `posts=${posts.length}`);
  const payload = posts[0] || {};
  check('il payload dichiara consent: true', payload.consent === true);
  check('il payload porta la lingua corrente', payload.lang === 'it', String(payload.lang));
  check('il payload marca la sorgente "footer"', payload.source === 'footer', String(payload.source));
  check('il payload contiene l\u2019email digitata', payload.email === 'visitatore@example.com', String(payload.email));

  await page.screenshot({ path: nodePath.join(OUT, 'signup-it-desktop.png') });
  await page.close();
}

// ── 2. Il form segue la lingua della pagina ────────────────────────────────
console.log('\n── EN / ES: la copia segue la lingua');
for (const { url, lang, title, consentFragment } of [
  { url: `${BASE}/en`, lang: 'en', title: 'Subscribe to the newsletter', consentFragment: 'Privacy Policy' },
  { url: `${BASE}/es`, lang: 'es', title: 'Suscríbete al boletín', consentFragment: 'Política de Privacidad' },
]) {
  const page = await browser.newPage();
  await prepare(page);
  const posts = captureNewsletterPosts(page);
  await openNewsletterForm(page, url);

  const info = await page.evaluate(() => {
    const title = document.getElementById('newsletter-signup-title');
    const section = title?.closest('section');
    const label = document.querySelector('label[for="newsletter-consent"]');
    return {
      title: title?.textContent?.trim() || '',
      label: label?.textContent?.trim() || '',
      inFooter: Boolean(section?.closest('footer')),
      exists: Boolean(section),
    };
  });
  check(`${lang}: form presente nel footer`, info.exists && info.inFooter);
  check(`${lang}: titolo tradotto`, info.title === title, info.title);
  check(`${lang}: consenso tradotto`, info.label.includes(consentFragment), info.label.slice(0, 80));

  await page.type('#newsletter-email', 'visitatore@example.com');
  await clickSubmit(page);
  await sleep(400);
  const msg = await page.$eval('#newsletter-signup-title', (t) => t.closest('section')?.querySelector('[role="status"]')?.textContent?.trim() || '');
  check(`${lang}: il messaggio di consenso mancante è tradotto`, /[Cc]onsentimiento|is required/.test(msg), msg);
  check(`${lang}: nessuna richiesta senza consenso`, posts.length === 0);

  await page.screenshot({ path: nodePath.join(OUT, `signup-${lang}.png`) });
  await page.close();
}

// ── 2b. Anche sui casi di studio: il footer è lo stesso, il form deve esserci ──
console.log('\n── Pagina caso di studio: stesso footer, stesso form');
{
  const page = await browser.newPage();
  await prepare(page);
  await openNewsletterForm(page, `${BASE}/progetti/gsa-hotels`);
  const info = await page.evaluate(() => {
    const title = document.getElementById('newsletter-signup-title');
    return {
      exists: Boolean(title),
      inFooter: Boolean(title?.closest('footer')),
      title: title?.textContent?.trim() || '',
      hasCheckbox: Boolean(document.getElementById('newsletter-consent')),
    };
  });
  check('il form newsletter è presente anche nei casi di studio', info.exists && info.inFooter && info.hasCheckbox);
  check('il caso di studio mostra la copia italiana', info.title === 'Iscriviti alla newsletter', info.title);
  await page.close();
}

// ── 3. Mobile 390px ───────────────────────────────────────────────────────
console.log('\n── Mobile 390px');
{
  const page = await browser.newPage();
  await prepare(page);
  await openNewsletterForm(page, `${BASE}/`, { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });

  const layout = await page.evaluate(() => {
    const title = document.getElementById('newsletter-signup-title');
    const section = title?.closest('section');
    const input = document.getElementById('newsletter-email');
    const check = document.getElementById('newsletter-consent');
    const submit = section?.querySelector('button[type="submit"]');
    const rect = (el) => (el ? el.getBoundingClientRect() : null);
    const inputRect = rect(input);
    const checkRect = rect(check);
    return {
      docOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      sectionWidth: rect(section)?.width || 0,
      inputWidth: inputRect?.width || 0,
      inputLeft: inputRect?.left || 0,
      inputRight: inputRect?.right || 0,
      submitVisible: Boolean(submit && submit.getBoundingClientRect().height > 20),
      checkboxSize: checkRect ? Math.min(checkRect.width, checkRect.height) : 0,
      viewport: window.innerWidth,
    };
  });

  check('nessun overflow orizzontale in pagina', layout.docOverflow <= 1, `overflow=${layout.docOverflow}px`);
  check('il campo email sta dentro il viewport', layout.inputLeft >= 0 && layout.inputRight <= layout.viewport, `left=${Math.round(layout.inputLeft)} right=${Math.round(layout.inputRight)}`);
  check('il campo email occupa la larghezza utile', layout.inputWidth > 200, `${Math.round(layout.inputWidth)}px`);
  check('il bottone di invio è visibile', layout.submitVisible);
  check('la checkbox ha un\u2019area toccabile (≥ 16px)', layout.checkboxSize >= 16, `${layout.checkboxSize}px`);

  await page.screenshot({ path: nodePath.join(OUT, 'signup-it-mobile.png') });
  await page.close();
}

// ── 4. Pagine di esito (dove portano i link nelle email) ───────────────────
console.log('\n── Pagine di esito del doppio opt-in');
for (const { url, attr, fragment } of [
  { url: `${BASE}/newsletter/conferma?esito=confermato`, attr: 'confirm-confermato', fragment: 'Iscrizione confermata' },
  { url: `${BASE}/newsletter/conferma?esito=non-valido`, attr: 'confirm-non-valido', fragment: 'Link non più valido' },
  { url: `${BASE}/newsletter/disiscrizione?esito=disiscritto`, attr: 'unsubscribe-disiscritto', fragment: 'Disiscrizione completata' },
  { url: `${BASE}/en/newsletter/conferma?esito=confermato`, attr: 'confirm-confermato', fragment: 'Subscription confirmed' },
  { url: `${BASE}/es/newsletter/disiscrizione?esito=disiscritto`, attr: 'unsubscribe-disiscritto', fragment: 'Baja completada' },
]) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await sleep(500);
  const info = await page.evaluate((expected) => ({
    marker: document.querySelector(`[data-newsletter-page="${expected}"]`) !== null,
    text: document.body.innerText,
    hasSections: document.querySelectorAll('main a[href*="#"]').length >= 3,
    overflows: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  }), attr);

  const label = url.replace(BASE, '') || '/';
  check(`${label}: stato corretto (${attr})`, info.marker);
  check(`${label}: testo "${fragment}"`, info.text.includes(fragment));
  check(`${label}: link alle sezioni principali`, info.hasSections);
  check(`${label}: nessun overflow orizzontale`, info.overflows <= 1, `overflow=${info.overflows}px`);
  await page.close();
}

await browser.close();

console.log(`\n${failures === 0 ? '✅' : '❌'} ${failures === 0 ? 'Tutti i controlli UI newsletter superati.' : `${failures} controlli falliti.`}`);
console.log(`   Screenshot: ${nodePath.relative(process.cwd(), OUT)}\n`);
process.exit(failures === 0 ? 0 : 1);

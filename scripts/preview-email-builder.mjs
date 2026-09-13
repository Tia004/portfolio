// Renders a full sample of the branded email — every formatting feature the
// composer can produce — then screenshots it and MEASURES the result in a real
// browser, because "it looks fine" is not evidence.
//
// The logo is served from https://tiadesigns.it in the real email, but that file
// only exists after a deploy, so for this local render it is rewritten to a copy
// sitting next to the HTML. Everything else is the exact sent markup.
//
// Run: node scripts/preview-email-builder.mjs
// Out: screenshots/email-builder/{preview.html,logo.png,desktop.png,mobile.png}
import { copyFileSync, mkdirSync, writeFileSync, rmSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import puppeteer from 'puppeteer-core';
import { loadTsModules, ROOT } from './load-ts-module.mjs';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const OUT = resolve(ROOT, 'screenshots/email-builder');
const TEAL = 'rgb(45, 212, 191)';

const { 'email-template': template } = loadTsModules(['email-markdown', 'email-template']);
const { buildBrandedEmailHtml } = template;

const SAMPLE = `## Il tuo nuovo sito è online

Ciao, ti scrivo per dirti che **il progetto è concluso** e la nuova piattaforma è in produzione. *Grazie* per la collaborazione.

Qui sotto trovi cosa abbiamo consegnato:

- Sito vetrina con 6 sezioni su misura
- Pannello per aggiornare i contenuti in autonomia
- Ottimizzazione SEO e velocità
- 90 giorni di assistenza inclusa

Le prossime attività consigliate:

1. Attivare la newsletter mensile
2. Collegare il CRM al form contatti
3. Pianificare la campagna video

> La manutenzione annuale copre aggiornamenti, backup e monitoraggio: 175 € al mese, disdicibile quando vuoi.

[Bottone: Prenota la call di verifica](https://tiadesigns.it/#contatti)

---

### Riferimenti utili

Documentazione completa su https://tiadesigns.it e per qualsiasi dubbio scrivi a info@tiadesigns.it.

[Rivedi il progetto](https://tiadesigns.it) — oppure avvia il progetto in locale con \`npm run dev\`
`;

const html = buildBrandedEmailHtml({
  recipientName: 'Marco',
  preheaderText: 'Il tuo nuovo sito è online — ecco cosa abbiamo consegnato.',
  bodyMarkdown: SAMPLE,
  ctaText: 'Scheda progetto completa',
  ctaUrl: 'https://tiadesigns.it',
  badgeText: 'Consegna Progetto',
});

mkdirSync(OUT, { recursive: true });
copyFileSync(resolve(ROOT, 'public/TiaDesignsLogo-white.png'), resolve(OUT, 'logo.png'));
const localHtml = html.replace(
  'https://tiadesigns.it/TiaDesignsLogo-white.png',
  './logo.png',
);
writeFileSync(resolve(OUT, 'preview.html'), localHtml);

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox'] });
const reports = {};

for (const [label, viewport] of [
  ['desktop', { width: 720, height: 1400, deviceScaleFactor: 2 }],
  ['mobile', { width: 390, height: 1200, deviceScaleFactor: 2 }],
]) {
  const page = await browser.newPage();
  await page.setViewport(viewport);
  // Navigate to the file rather than setContent: a relative asset path (the
  // logo copy) only resolves against a real document URL.
  await page.goto(pathToFileURL(resolve(OUT, 'preview.html')).href, { waitUntil: 'load' });
  await new Promise((r) => setTimeout(r, 400));

  reports[label] = await page.evaluate((teal) => {
    const css = (el, prop) => (el ? getComputedStyle(el).getPropertyValue(prop) : null);
    const all = (sel) => Array.from(document.querySelectorAll(sel));
    const links = all('a');
    const buttons = all('a[style*="border-radius:999px"]');
    const logo = document.querySelector('img[alt="Tia Designs"]');
    return {
      logoLoaded: logo ? logo.naturalWidth : 0,
      logoBox: logo ? `${Math.round(logo.getBoundingClientRect().width)}x${Math.round(logo.getBoundingClientRect().height)}` : null,
      h2: all('h2').map((el) => css(el, 'font-size')),
      h3: all('h3').map((el) => css(el, 'font-size')),
      strongCount: all('strong').length,
      emCount: all('em').length,
      codeCount: all('code').length,
      liCount: all('li').length,
      blockquoteCount: all('blockquote').length,
      dividerCount: all('div[style*="height:1px"]').length,
      buttonCount: buttons.length,
      buttonRadius: buttons.map((el) => css(el, 'border-radius')),
      buttonWrapMargin: buttons.map((el) => css(el.parentElement, 'margin-top')),
      linksTotal: links.length,
      // Buttons are anchors too, but their text is dark-on-teal by design.
      textLinks: links.filter((el) => !el.hasAttribute('data-button')).length,
      linksTeal: links.filter((el) => css(el, 'color') === teal).length,
      linksDefaultBlue: links.filter((el) => css(el, 'color') === 'rgb(0, 0, 238)').length,
      linksUnderlined: links
        .filter((el) => !el.hasAttribute('data-button'))
        .filter((el) => css(el, 'text-decoration-line').includes('underline')).length,
      literalMarkers: /(^|\s)(##|-\s|\*\*|\[Bottone:)/.test(document.body.innerText),
      horizontalOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      preheaderHidden: (() => {
        const el = all('div').find((d) => d.style.display === 'none');
        return el ? getComputedStyle(el).display : null;
      })(),
    };
  }, TEAL);

  await page.screenshot({ path: resolve(OUT, `${label}.png`), fullPage: true });
  await page.close();
}
await browser.close();
rmSync(resolve(ROOT, 'node_modules/.cache/ts-modules'), { recursive: true, force: true });

// ── Report ────────────────────────────────────────────────────────────────
let failures = 0;
const check = (label, ok, detail = '') => {
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures++;
};

for (const [label, r] of Object.entries(reports)) {
  console.log(`\n── Rendered in a browser: ${label} (${label === 'mobile' ? '390px' : '720px'}) ──`);
  check('logo actually loads', r.logoLoaded > 0, `naturalWidth ${r.logoLoaded}, box ${r.logoBox}`);
  check('## produced an 18px h2', r.h2[0] === '18px', String(r.h2));
  check('### produced a 13px h3', r.h3[0] === '13px', String(r.h3));
  check('**bold** rendered', r.strongCount === 1, String(r.strongCount));
  check('*italic* rendered', r.emCount === 1, String(r.emCount));
  check('`code` rendered', r.codeCount === 1, String(r.codeCount));
  check('lists rendered 7 items total', r.liCount === 7, String(r.liCount));
  check('quote rendered', r.blockquoteCount === 1, String(r.blockquoteCount));
  check('divider rendered', r.dividerCount >= 1, String(r.dividerCount));
  check('buttons rendered (inline + template CTA)', r.buttonCount === 2, String(r.buttonCount));
  check('buttons are pills', r.buttonRadius.every((v) => v === '999px'), JSON.stringify(r.buttonRadius));
  check('buttons keep their own space', r.buttonWrapMargin.every((v) => parseFloat(v) >= 26), JSON.stringify(r.buttonWrapMargin));
  check('every non-button link is the brand teal', r.linksTeal === r.textLinks, `${r.linksTeal}/${r.textLinks}`);
  check('no link left at the browser default blue', r.linksDefaultBlue === 0, String(r.linksDefaultBlue));
  check('every non-button link is underlined', r.linksUnderlined === r.textLinks, `${r.linksUnderlined}/${r.textLinks}`);
  check('no literal markdown markers in the text', !r.literalMarkers);
  check('preheader is hidden', r.preheaderHidden === 'none', String(r.preheaderHidden));
  check('no horizontal overflow', r.horizontalOverflow <= 0, `${r.horizontalOverflow}px`);
}

console.log(`\nWritten:\n  ${OUT}/preview.html\n  ${OUT}/desktop.png  (${(statSync(resolve(OUT, 'desktop.png')).size / 1024).toFixed(0)} KB)\n  ${OUT}/mobile.png  (${(statSync(resolve(OUT, 'mobile.png')).size / 1024).toFixed(0)} KB)`);
console.log(`\n${failures === 0 ? 'ALL GREEN' : `${failures} FAILED`}`);
process.exit(failures === 0 ? 0 : 1);

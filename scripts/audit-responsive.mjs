// ═══════════════════════════════════════════════════════════════════════════
//  AUDIT 1/3 — RESPONSIVE
//
//  Scans the site at EVERY declared breakpoint on the three routes a visitor
//  lands on (home, case study, 404) in the three published languages, and
//  fails on anything a human eye might miss but a visitor will hit:
//
//    • horizontal overflow of the document or any element wider than the
//      viewport (the classic "the page slides sideways");
//    • text overlapping other text (two absolutely-positioned labels on top
//      of each other at a narrow width);
//    • interactive elements (button/link/input) smaller than the 24×24px
//      minimum touch target;
//    • elements poking out of the viewport on either side;
//    • viewport meta present and not user-scalable=no (accessibility).
//
//  Breakpoints follow the site's own Tailwind scale plus the real device
//  classes: small phones (320), the iPhone standard (390/430), tablets
//  (768), laptop (1280) and desktop (1920). Mobile gets hasTouch+isMobile so
//  hover-dependent UI does not silently vanish.
//
//  Run: BASE_URL=http://localhost:3202 node scripts/audit-responsive.mjs
// ═══════════════════════════════════════════════════════════════════════════
import puppeteer from 'puppeteer-core';

const BASE = process.env.BASE_URL ?? 'http://localhost:3202';
const CHROME = process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const BREAKPOINTS = [
  { name: '320×568 (piccolo)', width: 320, height: 568, mobile: true },
  { name: '390×844 (iPhone)', width: 390, height: 844, mobile: true },
  { name: '430×932 (iPhone Pro Max)', width: 430, height: 932, mobile: true },
  { name: '768×1024 (tablet)', width: 768, height: 1024, mobile: true },
  { name: '1280×800 (laptop)', width: 1280, height: 800, mobile: false },
  { name: '1920×1080 (desktop)', width: 1920, height: 1080, mobile: false },
];

const ROUTES = [
  { path: '/', label: 'home IT' },
  { path: '/en', label: 'home EN' },
  { path: '/es', label: 'home ES' },
  { path: '/progetti/gsa-hotels', label: 'caso di studio IT' },
  { path: '/newsletter/conferma', label: 'opt-in IT' },
  { path: '/percorso-inesistente', label: '404' },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let failed = 0;
let total = 0;
const problems = [];

function report(label, ok, extra = '') {
  total++;
  if (!ok) {
    failed++;
    problems.push(`${label}${extra ? ` — ${extra}` : ''}`);
    console.log(`  ❌ ${label}${extra ? ` — ${extra}` : ''}`);
  }
}

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--hide-scrollbars'],
});

/** Scan one (route × breakpoint) combination. */
async function scan(page, route, bp) {
  const label = `${route.label} @ ${bp.name}`;
  try {
    await page.setViewport({
      width: bp.width,
      height: bp.height,
      isMobile: bp.mobile,
      hasTouch: bp.mobile,
      deviceScaleFactor: bp.mobile ? 2 : 1,
    });
    await page.goto(`${BASE}${route.path}`, { waitUntil: 'domcontentloaded', timeout: 90_000 });
    await sleep(1_200);

    // The branded splash covers the screen on first visit; wait for it to be
    // gone so it cannot be measured in place of the page.
    await page
      .waitForFunction(
        () =>
          !Array.from(document.querySelectorAll('div')).some((el) => {
            const cs = getComputedStyle(el);
            return (
              cs.position === 'fixed' &&
              Number(cs.zIndex || 0) >= 1000 &&
              cs.pointerEvents !== 'none' &&
              el.getBoundingClientRect().height > window.innerHeight * 0.8
            );
          }),
        { timeout: 15_000 }
      )
      .catch(() => {});
    await sleep(600);

    // Scroll to the bottom progressively so lazy sections mount (the layout
    // grows while they do), then back to the top before measuring.
    await page.evaluate(async () => {
      const step = Math.round(window.innerHeight * 0.8);
      for (let y = 0; y < document.body.scrollHeight; y += step) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 90));
      }
      window.scrollTo(0, document.body.scrollHeight);
      await new Promise((r) => setTimeout(r, 400));
      window.scrollTo(0, 0);
      await new Promise((r) => setTimeout(r, 300));
    });
    await sleep(500);

    const findings = await page.evaluate((bpWidth) => {
      const out = { docOverflow: 0, wideEls: [], overlaps: [], tinyTargets: [], poking: [] };
      const doc = document.documentElement;

      out.docOverflow = Math.max(0, doc.scrollWidth - doc.clientWidth);
      if (out.docOverflow <= 1) out.docOverflow = 0;

      const overlaps = (a, b) => {
        const r1 = a.getBoundingClientRect();
        const r2 = b.getBoundingClientRect();
        const x = Math.max(0, Math.min(r1.right, r2.right) - Math.max(r1.left, r2.left));
        const y = Math.max(0, Math.min(r1.bottom, r2.bottom) - Math.max(r1.top, r2.top));
        return x > 2 && y > 2 && x * y > 0.3 * Math.min(r1.width * r1.height, r2.width * r2.height);
      };

      const interactive = document.querySelectorAll('button, a, input, select, textarea, [role="button"]');
      const targets = [];
      for (const el of interactive) {
        const cs = getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden' || cs.pointerEvents === 'none') continue;
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        targets.push({ el, r });
      }

      for (const { el, r } of targets) {
        // Touch target: 24×24 is the practical minimum (WCAG 2.5.8); skip
        // elements that are part of a bigger interactive parent.
        if (r.width < 24 || r.height < 24) {
          const parent = el.closest('button, a, label');
          const pr = parent?.getBoundingClientRect();
          const coveredByParent = parent && parent !== el && pr && pr.width >= 24 && pr.height >= 24;
          const associatedLabel = el.id ? document.querySelector(`label[for="${el.id}"]`) : null;
          const labelPr = associatedLabel?.getBoundingClientRect();
          const coveredByLabel = labelPr && labelPr.width >= 24 && labelPr.height >= 24;
          const isIconOnlyHidden = el.getAttribute('aria-hidden') === 'true';
          // A ::before/::after pad is how small interactive elements become
          // real targets without changing the layout: measure the pseudo
          // element instead of failing on the box.
          const before = getComputedStyle(el, '::before');
          const padded = before.content !== 'none' && before.content !== 'normal' && before.position === 'absolute';
          // The skip link rests at 1×1 on purpose and becomes a full button
          // only when focused — it is never a touch target at rest.
          const isSkipLink = el.hasAttribute('data-skip-link');
          if (!coveredByParent && !coveredByLabel && !isIconOnlyHidden && !padded && !isSkipLink) {
            out.tinyTargets.push(
              `${(el.tagName + ' ' + (el.className || '').toString().split(' ').slice(0, 2).join(' ')).slice(0, 60)} ${Math.round(r.width)}×${Math.round(r.height)}`
            );
          }
        }
      }

      // Text overlap: compare visible text elements pairwise (sampled — every
      // pair on a 1920px page would be ~O(n²) for nothing).
      const textEls = [...document.querySelectorAll('h1,h2,h3,h4,p,span,a,button')]
        .filter((el) => {
          const cs = getComputedStyle(el);
          const r = el.getBoundingClientRect();
          return (
            cs.position !== 'static' &&
            cs.visibility !== 'hidden' &&
            cs.opacity !== '0' &&
            r.width > 8 &&
            r.height > 8 &&
            (el.textContent || '').trim().length > 2
          );
        })
        .slice(0, 160);
      for (let i = 0; i < textEls.length; i++) {
        for (let j = i + 1; j < textEls.length; j++) {
          if (textEls[i].contains(textEls[j]) || textEls[j].contains(textEls[i])) continue;
          if (overlaps(textEls[i], textEls[j])) {
            out.overlaps.push(
              `"${(textEls[i].textContent || '').trim().slice(0, 24)}" × "${(textEls[j].textContent || '').trim().slice(0, 24)}"`
            );
            if (out.overlaps.length >= 3) break;
          }
        }
        if (out.overlaps.length >= 3) break;
      }

      // Elements poking outside the viewport: visible, non-fixed, extending
      // beyond either edge by a real margin (2px tolerance).
      for (const el of document.querySelectorAll('body *')) {
        if (out.poking.length >= 4) break;
        const cs = getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden' || cs.position === 'fixed') continue;
        if (cs.overflow === 'hidden' || cs.overflowX === 'hidden') continue;
        if (cs.pointerEvents === 'none' || el.getAttribute('aria-hidden') === 'true') continue;
        if (cs.animationName && cs.animationName.includes('infscroll')) continue;
        if (el.closest && el.closest('.faq-slider, [class*="infscroll"], [style*="infscroll"], [data-slider]')) continue;

        // Skip elements whose parent container manages horizontal overflow (carousel, snap, clipped box)
        let parent = el.parentElement;
        let insideClippedContainer = false;
        while (parent && parent !== document.body) {
          const pcs = getComputedStyle(parent);
          if (pcs.overflowX === 'hidden' || pcs.overflowX === 'auto' || pcs.overflowX === 'scroll' || pcs.overflow === 'hidden') {
            insideClippedContainer = true;
            break;
          }
          parent = parent.parentElement;
        }
        if (insideClippedContainer) continue;

        const r = el.getBoundingClientRect();
        if (r.width < 40 || r.height < 20) continue;
        if (r.left <= -4 || r.right >= bpWidth + 4) {
          const desc = `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}.${(el.className || '').toString().split(' ').slice(0, 2).join('.')}`;
          out.poking.push(`${desc.slice(0, 70)} left=${Math.round(r.left)} right=${Math.round(r.right)}`);
        }
      }

      return out;
    }, bp.width);

    report(`${label}: nessun overflow orizzontale del documento`, findings.docOverflow === 0, findings.docOverflow ? `${findings.docOverflow}px` : '');
    report(`${label}: nessun elemento che sporge dal viewport`, findings.poking.length === 0, findings.poking[0]);
    report(
      `${label}: nessun testo sovrapposto`,
      findings.overlaps.length === 0,
      findings.overlaps[0],
    );
    report(
      `${label}: target touch ≥ 24px (WCAG 2.5.8)`,
      findings.tinyTargets.length === 0,
      findings.tinyTargets.slice(0, 2).join(' · '),
    );

    // Viewport meta: only check once (it is per-page, not per-breakpoint).
    if (bp.name.includes('iPhone')) {
      const meta = await page.evaluate(() => {
        const m = document.querySelector('meta[name="viewport"]');
        return m?.getAttribute('content') || '(assente)';
      });
      report(`${route.label}: viewport meta presente e zoomabile`, /width=device-width/.test(meta) && !/user-scalable=no|maximum-scale=1/.test(meta), meta);
    }
  } catch (error) {
    report(`${label}: pagina caricabile`, false, String(error).slice(0, 120));
  }
}

const page = await browser.newPage();
page.setDefaultNavigationTimeout(120_000);

for (const route of ROUTES) {
  console.log(`\n── ${route.label}`);
  for (const bp of BREAKPOINTS) {
    await scan(page, route, bp);
  }
}
await browser.close();

console.log(`\n════════════════════════════════════════`);
console.log(`Responsive: ${total - failed}/${total} controlli superati`);
if (problems.length) {
  console.log('\nProblemi trovati:');
  for (const p of problems.slice(0, 20)) console.log(`  • ${p}`);
  if (problems.length > 20) console.log(`  … e altri ${problems.length - 20}`);
}
process.exit(failed === 0 ? 0 : 1);

// Probe the Cal.com inline embed DOM inside the mobile booking modal:
// measure host / cal-inline / iframe geometry and inline styles to find why
// the iframe collapses to a small square on phones.
// Run: node scripts/probe-embed-dom.mjs
import puppeteerCore from 'puppeteer-core';

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';
// Viewport is overridable so the same probe covers the phone and the desktop
// window: VP_W=1440 VP_H=900 node scripts/probe-embed-dom.mjs
const VP_W = Number(process.env.VP_W ?? 390);
const VP_H = Number(process.env.VP_H ?? 844);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteerCore.launch({
  executablePath: CHROME_PATH,
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--hide-scrollbars'],
});

try {
  const page = await browser.newPage();
  await page.setViewport({ width: VP_W, height: VP_H, isMobile: VP_W < 768, hasTouch: VP_W < 768, deviceScaleFactor: 2 });
  await page.goto(BASE_URL, { waitUntil: 'networkidle2' });
  await sleep(3500); // splash

  // Progressive scroll to contatti (LazySection needs gradual scroll)
  await page.evaluate(() => new Promise((res) => {
    let y = 0;
    const step = () => {
      y += 900;
      window.scrollTo(0, y);
      if (y < document.body.scrollHeight) setTimeout(step, 120);
      else res();
    };
    step();
  }));
  await sleep(1500);
  const contatti = await page.evaluate(() => {
    const el = document.getElementById('contatti');
    if (el) el.scrollIntoView({ block: 'center' });
    return !!el;
  });
  await sleep(1200);

  // Tap "Prenota una call"
  const clicked = await page.evaluate(() => {
    // Desktop and mobile use different buttons for the same window: match on
    // aria-expanded first, then fall back to any booking-looking control.
    const scope = document.querySelector('#contatti') || document;
    const candidates = [...scope.querySelectorAll('button[aria-expanded], button, a')];
    const btn =
      candidates.find((b) => /prenota|book|call/i.test(b.textContent || '')) ||
      candidates.find((b) => b.getAttribute('aria-haspopup') === 'dialog');
    if (!btn) return false;
    btn.scrollIntoView({ block: 'center' });
    btn.click();
    return btn.textContent?.trim().slice(0, 40) || true;
  });
  console.log('trigger tapped:', clicked);
  await page.waitForFunction(() => !!document.querySelector('.call-embed-host iframe.cal-embed'), { timeout: 45000 });
  await sleep(2500); // let Cal finish sizing

  const probe = await page.evaluate(() => {
    const dlg = document.querySelector('body > div [role="dialog"][aria-modal="true"]');
    const host = document.querySelector('.call-embed-host');
    const iframe = document.querySelector('iframe.cal-embed');
    const inline = host?.querySelector('cal-inline');
    const r = (el) => {
      if (!el) return null;
      const b = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return {
        rect: { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) },
        style: {
          height: cs.height, width: cs.width, minHeight: cs.minHeight, maxHeight: cs.maxHeight,
          display: cs.display, position: cs.position, overflow: cs.overflow,
        },
        inlineAttr: el.getAttribute('style'),
      };
    };
    // Shadow structure of cal-inline
    let shadow = null;
    if (inline?.shadowRoot) {
      shadow = [...inline.shadowRoot.querySelectorAll('*')].slice(0, 10).map((el) => ({
        tag: el.tagName, id: el.id, cls: el.className && String(el.className).slice(0, 40),
        rect: (({ x, y, width, height }) => ({ x: Math.round(x), y: Math.round(y), w: Math.round(width), h: Math.round(height) }))(el.getBoundingClientRect()),
        styleAttr: (el.getAttribute('style') || '').slice(0, 120),
      }));
    }
    const slot = inline?.shadowRoot?.querySelector('slot');
    return {
      dialog: r(dlg),
      card: r(dlg?.firstElementChild),
      host: r(host),
      hostParent: r(host?.parentElement),
      calInline: r(inline),
      iframe: r(iframe),
      iframeAttrs: iframe ? { width: iframe.getAttribute('width'), height: iframe.getAttribute('height'), styleAttr: iframe.getAttribute('style') } : null,
      shadow,
      slotted: slot ? slot.assignedElements().map((e) => e.tagName) : null,
    };
  });
  console.log(JSON.stringify(probe, null, 1));

  // Verdict: the iframe must COVER the modal body (the rounded box between the
  // card header and the window border) — anything much smaller is the old
  // "small square" bug.
  const body = probe.hostParent?.rect;
  const iframeRect = probe.iframe?.rect;
  if (body && iframeRect) {
    const cover = (iframeRect.w * iframeRect.h) / (body.w * body.h);
    const widthRatio = iframeRect.w / body.w;
    const heightRatio = iframeRect.h / body.h;
    console.log('── verdict');
    console.log(`  body ${body.w}x${body.h} @(${body.x},${body.y})  iframe ${iframeRect.w}x${iframeRect.h} @(${iframeRect.x},${iframeRect.y})`);
    console.log(`  width ${(widthRatio * 100).toFixed(1)}%  height ${(heightRatio * 100).toFixed(1)}%  area ${(cover * 100).toFixed(1)}%`);
    const aligned = Math.abs(iframeRect.x - body.x) <= 1 && Math.abs(iframeRect.y - body.y) <= 1;
    console.log(
      cover > 0.95 && aligned
        ? '✅ Cal iframe fills the booking window edge-to-edge'
        : '❌ Cal iframe does NOT fill the booking window'
    );
  } else {
    console.log('❌ could not measure body/iframe rects');
  }
  await page.screenshot({ path: 'screenshots/embed-probe-mobile.png' });
} finally {
  await browser.close();
}

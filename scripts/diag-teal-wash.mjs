// Which layer paints the flat teal wash that appears as soon as the pointer
// moves? Walk the DOM, list every element that covers the viewport, then hide
// them ONE AT A TIME and re-measure the page colour after each removal.
// Run with the site on :3100  →  node scripts/diag-teal-wash.mjs
import puppeteer from 'puppeteer-core';

const BASE = process.env.BASE_URL || 'http://localhost:3100';
const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Decoding happens INSIDE the page (this script runs in Node, which has no
// Image/canvas). Returns mean luminance + mean RGB + the variance, so a flat
// full-screen fill (variance ~0) is distinguishable from a textured hero.
const decodeInPage = (dataUrl) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = img.width;
      c.height = img.height;
      const ctx = c.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const d = ctx.getImageData(0, 0, c.width, c.height).data;
      let sum = 0;
      let n = 0;
      let r = 0;
      let g = 0;
      let b = 0;
      const lums = [];
      for (let i = 0; i < d.length; i += 4) {
        const l = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
        sum += l;
        r += d[i];
        g += d[i + 1];
        b += d[i + 2];
        n++;
        if (i % 4000 === 0) lums.push(l);
      }
      const mean = sum / n;
      const varc = lums.reduce((a, l) => a + (l - mean) * (l - mean), 0) / lums.length;
      resolve({
        lum: +mean.toFixed(1),
        rgb: `${Math.round(r / n)},${Math.round(g / n)},${Math.round(b / n)}`,
        sd: +Math.sqrt(varc).toFixed(1),
      });
    };
    img.onerror = () => reject(new Error('decode'));
    img.src = dataUrl;
  });

const b = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--hide-scrollbars'] });
const p = await b.newPage();
await p.setViewport({ width: 1600, height: 900, deviceScaleFactor: 1 });
await p.goto(BASE, { waitUntil: 'load', timeout: 180_000 });
// Real readiness: the app dispatches splash-complete / dither-ready.
await p
  .waitForFunction(() => window.__tiaDitherReady && window.__tiaMoltenReady, { timeout: 90_000 })
  .catch(() => console.log('!! readiness markers never fired'));
await sleep(6000);

const shot = async () => {
  const raw = await p.screenshot({ encoding: 'base64' });
  return p.evaluate(decodeInPage, `data:image/png;base64,${raw}`);
};

// Every element that covers (most of) the viewport, top-most first.
const stack = await p.evaluate(() => {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const out = [];
  document.querySelectorAll('*').forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.width < vw * 0.8 || r.height < vh * 0.8) return;
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) < 0.05) return;
    out.push({
      tag: el.tagName.toLowerCase(),
      id: el.id || '',
      cls: (el.className && typeof el.className === 'string' ? el.className : '').slice(0, 70),
      pos: cs.position,
      z: cs.zIndex,
      bg: cs.backgroundImage !== 'none' ? 'gradient' : cs.backgroundColor,
      op: cs.opacity,
    });
  });
  return out;
});
console.log('\n── full-viewport elements (document order)');
for (const e of stack) console.log(`  ${e.tag}${e.id ? '#' + e.id : ''} z=${e.z} pos=${e.pos} op=${e.op} bg=${e.bg} | ${e.cls}`);

const topAt = () => p.evaluate(() => {
  const el = document.elementFromPoint(window.innerWidth / 2, window.innerHeight / 2);
  return el ? `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}.${(typeof el.className === 'string' ? el.className : '').slice(0, 60)}` : 'none';
});

console.log('\n▸ baseline (no pointer):', await shot(), 'top:', await topAt());
await p.mouse.move(400, 400);
await sleep(120);
await p.mouse.move(900, 500);
await sleep(1500);
console.log('▸ after pointer move :', await shot(), 'top:', await topAt());

// Hide candidates one at a time and re-measure.
const candidates = [
  ['.pixel-trail-canvas', 'cursor trail wrapper'],
  ['.pixel-canvas', 'cursor trail canvas'],
  ['.molten-metal-container', 'molten metal'],
  ['.click-spark-wrapper', 'click spark'],
  ['[data-molten-cover]', 'molten covers'],
];
const cookies = await p.evaluate(() => {
  const els = document.querySelectorAll('.z-\\[10000\\]');
  return els.length;
});
console.log(`\n(cookie/consent overlay candidates: ${cookies})`);

for (const [sel, label] of candidates) {
  const n = await p.evaluate((s) => {
    const els = document.querySelectorAll(s);
    els.forEach((el) => { el.style.display = 'none'; });
    return els.length;
  }, sel);
  await sleep(900);
  console.log(`▸ hidden ${label.padEnd(22)} (${n})  ->`, await shot());
}

await b.close();
process.exit(0);

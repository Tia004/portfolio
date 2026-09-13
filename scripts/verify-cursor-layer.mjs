// Verifies the cursor-layer fix:
//   1. BEFORE any pointer movement the fullscreen layer must contribute
//      NOTHING (this is the state that used to paint the site-wide wash);
//   2. AFTER real mouse movement the page must still be a dark hero — the
//      trail is allowed to draw a small teal trail, not a full-screen field;
//   3. once the trail decays, the page must be dark again.
//
// Run: node scripts/verify-cursor-layer.mjs     (site on :3100)
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';

const BASE = process.env.BASE_URL || 'http://localhost:3100';
const OUT = path.resolve('screenshots/gl-fix');
fs.mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function report(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = img.width;
      c.height = img.height;
      const ctx = c.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const d = ctx.getImageData(0, 0, c.width, c.height).data;
      let sum = 0, green = 0, n = 0;
      for (let i = 0; i < d.length; i += 4) {
        sum += 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
        if (d[i + 1] > 120 && d[i + 1] - d[i] > 30) green++;
        n++;
      }
      const cols = 8;
      const rows = 4;
      const cw = Math.floor(c.width / cols);
      const ch = Math.floor(c.height / rows);
      const grid = [];
      for (let ry = 0; ry < rows; ry++) {
        const row = [];
        for (let rx = 0; rx < cols; rx++) {
          const g = ctx.getImageData(rx * cw, ry * ch, cw, ch).data;
          let r = 0, gg = 0, b = 0, m = 0;
          for (let i = 0; i < g.length; i += 4) { r += g[i]; gg += g[i + 1]; b += g[i + 2]; m++; }
          row.push(
            '#' +
              [Math.round(r / m), Math.round(gg / m), Math.round(bb0(b, m))]
                .map((v) => v.toString(16).padStart(2, '0'))
                .join('')
          );
        }
        grid.push(row.join(' '));
      }
      resolve({ meanLum: +(sum / n).toFixed(1), greenPct: +((green / n) * 100).toFixed(1), grid });
    };
    img.onerror = () => reject(new Error('decode'));
    img.src = dataUrl;
    function bb0(b, m) { return b / m; }
  });
}

// Is the trail actually PAINTED? Sample a box centred on the pointer and a
// control box far away, immediately after a movement (the trail fades in
// ~350ms). A working effect shows a clearly teal box under the pointer.
const regionProbe = (dataUrl, cx, cy, size) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = img.width;
      c.height = img.height;
      const ctx = c.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const mean = (x, y) => {
        const w = Math.min(size, img.width - x);
        const h = Math.min(size, img.height - y);
        if (w <= 0 || h <= 0) return null;
        const d = ctx.getImageData(x, y, w, h).data;
        let r = 0, g = 0, b = 0, n = 0;
        for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; b += d[i + 2]; n++; }
        return { r: +(r / n).toFixed(1), g: +(g / n).toFixed(1), b: +(b / n).toFixed(1) };
      };
      const X = Math.max(0, Math.round(cx - size / 2));
      const Y = Math.max(0, Math.round(cy - size / 2));
      resolve({ onTrail: mean(X, Y), offTrail: mean(20, Y) });
    };
    img.onerror = () => reject(new Error('decode'));
    img.src = dataUrl;
  });

const guard = (p, ms, label) =>
  Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error(`WATCHDOG ${label}`)), ms))]);

const b = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
  args: ['--no-sandbox', '--hide-scrollbars'],
});
const p = await b.newPage();
await p.setViewport({ width: 1600, height: 900, deviceScaleFactor: 1 });
await guard(p.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 120_000 }), 130_000, 'goto');
await p.waitForFunction(() => window.__tiaMoltenReady && window.__tiaDitherReady, { timeout: 45_000 }).catch(() => {});
await sleep(4000);

const shot = async (label, save) => {
  const raw = await guard(p.screenshot({ encoding: 'base64' }), 40_000, label);
  if (save) fs.writeFileSync(path.join(OUT, `cursor-${label}.png`), Buffer.from(raw, 'base64'));
  const r = await p.evaluate(report, `data:image/png;base64,${raw}`);
  console.log(`\n▸ ${label}   mean lum ${r.meanLum}   green ${r.greenPct}%`);
  for (const line of r.grid) console.log('   ' + line);
  return r;
};

const before = await shot('before-pointer', true);

// Real mouse movement across the hero (arms the layer and paints a trail).
for (const [x, y] of [[300, 300], [600, 420], [900, 500], [1200, 620], [1400, 300]]) {
  await p.mouse.move(x, y);
  await sleep(60);
}
const during = await shot('after-pointer', true);

// ── Trail presence: park the pointer, then screenshot while the trail is
// still fresh (~40ms). The box under the pointer must be markedly MORE teal
// than a control box on the same row, far from the path.
await p.mouse.move(500, 450);
await sleep(40);
const freshRaw = await guard(p.screenshot({ encoding: 'base64' }), 40_000, 'trail-fresh');
const fresh = await p.evaluate(regionProbe, `data:image/png;base64,${freshRaw}`, 500, 450, 140);
const greenExcess = (m) => (m ? +(m.g - (m.r + m.b) / 2).toFixed(1) : NaN);
const cursorHidden = await p.evaluate(() =>
  document.documentElement.classList.contains('custom-cursor-active')
);
console.log('\n▸ trail under pointer ', JSON.stringify(fresh.onTrail), ' green-excess', greenExcess(fresh.onTrail));
console.log('▸ control (same row)  ', JSON.stringify(fresh.offTrail), ' green-excess', greenExcess(fresh.offTrail));
console.log(`▸ native cursor hidden: ${cursorHidden}`);
const trailVisible =
  greenExcess(fresh.onTrail) > 20 && greenExcess(fresh.onTrail) > greenExcess(fresh.offTrail) + 15;
console.log(`   → ${trailVisible ? 'PASS (trail drawn)' : 'FAIL (no trail painted)'}`);

await p.mouse.move(60, 860);
await sleep(3000);
const decay3s = await shot('trail-decayed-3s', false);
await sleep(5000);
const after = await shot('trail-decayed-8s', true);

const verdict = (label, r) =>
  console.log(
    `   ${label.padEnd(18)} lum ${String(r.meanLum).padStart(6)}  green ${String(r.greenPct).padStart(5)}%  → ${
      r.meanLum < 90 && r.greenPct < 40 ? 'PASS (no wash)' : 'FAIL (wash)'
    }`
  );
console.log('\n── verdict');
verdict('before pointer', before);
verdict('after pointer', during);
verdict('decay 3s', decay3s);
verdict('decay 8s', after);
await b.close();
process.exit(0);

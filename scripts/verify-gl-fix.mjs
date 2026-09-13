// Verifies the WebGL fixes reported for the Windows machine:
//   1. the dither shader output stays DARK (it must not become a green wash);
//   2. a SOFTWARE renderer (SwiftShader) skips WebGL entirely — no canvas, no
//      freeze — and shows the dark static base instead;
//   3. the hero never turns into a bright wash in either mode;
//   4. no THREE.Clock deprecation warning;
//   5. the frame loop stays healthy (no long tasks, no frozen canvas).
//
// Run: node scripts/verify-gl-fix.mjs      (expects the site on :3100)
//      ONLY=swiftshader node scripts/verify-gl-fix.mjs
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';

const CHROME_PATH =
  process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const BASE = process.env.BASE_URL || 'http://localhost:3100';
const OUT = path.resolve('screenshots/gl-fix');
fs.mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const MODES = {
  gpu: [],
  swiftshader: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'],
};

function glInfo() {
  const c = document.createElement('canvas');
  const gl = c.getContext('webgl2') || c.getContext('webgl');
  if (!gl) return { renderer: 'none' };
  const d = gl.getExtension('WEBGL_debug_renderer_info');
  return { renderer: d ? String(gl.getParameter(d.UNMASKED_RENDERER_WEBGL)) : 'n/a' };
}

// Canvas inventory: count, and the real pixel content of the hero backdrop
// canvas (read through a 2D canvas, so it is independent of the screenshot
// compositor).
function canvases() {
  const list = Array.from(document.querySelectorAll('canvas'));
  const stats = list.map((c) => {
    const tmp = document.createElement('canvas');
    tmp.width = 48;
    tmp.height = 27;
    const ctx = tmp.getContext('2d');
    try {
      ctx.drawImage(c, 0, 0, 48, 27);
    } catch {
      return null;
    }
    const d = ctx.getImageData(0, 0, 48, 27).data;
    let s = 0, n = 0, mn = 255, mx = 0;
    for (let i = 0; i < d.length; i += 4) {
      const l = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
      s += l; n++;
      if (l < mn) mn = l;
      if (l > mx) mx = l;
    }
    return { lum: +(s / n).toFixed(1), range: [Math.round(mn), Math.round(mx)] };
  });
  return { count: list.length, stats };
}

function measure(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = img.width;
      c.height = img.height;
      const ctx = c.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const d = ctx.getImageData(0, 0, c.width, c.height).data;
      let sum = 0, green = 0, bright = 0, n = 0;
      for (let i = 0; i < d.length; i += 4) {
        const l = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
        sum += l; n++;
        if (d[i + 1] > 120 && d[i + 1] - d[i] > 30) green++;
        if (l > 200) bright++;
      }
      resolve({
        meanLum: +(sum / n).toFixed(1),
        greenPct: +((green / n) * 100).toFixed(1),
        brightPct: +((bright / n) * 100).toFixed(1),
      });
    };
    img.onerror = () => reject(new Error('decode'));
    img.src = dataUrl;
  });
}

function perf() {
  return new Promise((resolve) => {
    let frames = 0, longTasks = 0, settled = false;
    const start = performance.now();
    try {
      new PerformanceObserver((l) => { longTasks += l.getEntries().length; }).observe({
        entryTypes: ['longtask'],
      });
    } catch {}
    const finish = () => {
      if (settled) return;
      settled = true;
      resolve({ fps: +(frames / ((performance.now() - start) / 1000)).toFixed(1), longTasks });
    };
    setTimeout(finish, 2600);
    const tick = () => {
      frames++;
      if (performance.now() - start < 2500) requestAnimationFrame(tick);
      else finish();
    };
    requestAnimationFrame(tick);
  });
}

const guard = (p, ms, label) =>
  Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error(`WATCHDOG ${label}`)), ms))]);

const b = await puppeteer.launch({
  executablePath: CHROME_PATH,
  headless: true,
  args: ['--no-sandbox', '--hide-scrollbars', ...MODES[process.env.ONLY || 'gpu']],
});
const p = await b.newPage();
await p.setViewport({ width: 1600, height: 900, deviceScaleFactor: 1 });
const logs = [];
p.on('console', (m) => logs.push(`${m.type()}: ${m.text()}`));
p.on('pageerror', (e) => logs.push(`pageerror: ${String(e).slice(0, 140)}`));

await guard(p.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 120_000 }), 130_000, 'goto');
await p.waitForFunction(() => window.__tiaMoltenReady && window.__tiaDitherReady, { timeout: 45_000 }).catch(() => {});
await sleep(4000);

const info = await p.evaluate(glInfo);
const cv = await p.evaluate(canvases);
const raw = await guard(p.screenshot({ encoding: 'base64' }), 40_000, 'shot');
fs.writeFileSync(path.join(OUT, `${process.env.ONLY || 'gpu'}-hero.png`), Buffer.from(raw, 'base64'));
const hero = await p.evaluate(measure, `data:image/png;base64,${raw}`);
const fr = await guard(p.evaluate(perf), 20_000, 'perf');
const deprecated = logs.filter((l) => /deprecated/i.test(l));
const errors = logs.filter((l) => /pageerror|WebGL|shader/i.test(l));

const mode = process.env.ONLY || 'gpu';
console.log(`\n▶ ${mode}`);
console.log(`   renderer          ${info.renderer}`);
console.log(`   canvases          ${cv.count}  ${JSON.stringify(cv.stats.filter(Boolean))}`);
console.log(`   hero screenshot   mean lum ${hero.meanLum}  green ${hero.greenPct}%  bright ${hero.brightPct}%`);
console.log(`   perf              ${fr.fps} fps, ${fr.longTasks} long tasks`);
console.log(`   deprecation warns ${deprecated.length}${deprecated.length ? ' → ' + deprecated[0].slice(0, 90) : ''}`);
console.log(`   errors/webgl logs ${errors.length}${errors.length ? ' → ' + errors[0].slice(0, 90) : ''}`);
console.log(`   screenshot        ${path.join(OUT, `${mode}-hero.png`)}`);
await b.close();
process.exit(0);

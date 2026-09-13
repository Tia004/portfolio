// Reproduces the "green wash over the whole site + freeze" reported on Windows.
//
// Hypothesis under test: that machine has no usable GPU acceleration, so
// Chromium falls back to SOFTWARE WebGL (SwiftShader). We render this same
// build twice — on the real GPU and forced through SwiftShader — and measure
// for each: mean brightness, how green the page is, the WebGL renderer string,
// frame rate and long tasks. If the software run is bright green AND slow, the
// two symptoms share one cause.
//
// Run: node scripts/repro-gl-wash.mjs        (expects the site on :3100)
import puppeteerCore from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';

const CHROME_PATH =
  process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const BASE_URL = process.env.BASE_URL || 'http://localhost:3100';
const OUT_DIR = path.resolve('screenshots/gl-wash');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const MODES = [
  { name: 'gpu', args: [] },
  {
    name: 'swiftshader',
    args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'],
  },
].filter((m) => !process.env.ONLY || m.name === process.env.ONLY);

// Page-side helpers. Defined as plain functions: puppeteer serialises them to
// source and runs them inside the browser (they must not close over Node
// values — arguments are passed explicitly).
// eslint-disable-next-line no-unused-vars
function measureShot(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = img.width;
      c.height = img.height;
      const ctx = c.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const d = ctx.getImageData(0, 0, c.width, c.height).data;
      let sumL = 0, sumR = 0, sumG = 0, sumB = 0, green = 0, bright = 0, black = 0, n = 0;
      for (let i = 0; i < d.length; i += 4) {
        const r = d[i], g = d[i + 1], b = d[i + 2];
        const l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        sumL += l; sumR += r; sumG += g; sumB += b; n++;
        if (g > 120 && g - r > 30 && g - b > 0) green++;
        if (l > 200) bright++;
        if (l < 20) black++;
      }
      resolve({
        meanLum: +(sumL / n).toFixed(1),
        meanR: +(sumR / n).toFixed(1), meanG: +(sumG / n).toFixed(1), meanB: +(sumB / n).toFixed(1),
        greenPct: +((green / n) * 100).toFixed(1),
        brightPct: +((bright / n) * 100).toFixed(1),
        blackPct: +((black / n) * 100).toFixed(1),
      });
    };
    img.onerror = () => reject(new Error('screenshot decode failed'));
    img.src = dataUrl;
  });
}

// Never hangs: a timer resolves the probe even if rAF never ticks (headless
// pages can stop producing frames, which would otherwise stall forever).
// eslint-disable-next-line no-unused-vars
function fpsProbe() {
  return new Promise((resolve) => {
    let frames = 0, longTasks = 0, settled = false;
    const start = performance.now();
    try {
      const po = new PerformanceObserver((list) => { longTasks += list.getEntries().length; });
      po.observe({ entryTypes: ['longtask'] });
    } catch {}
    const finish = () => {
      if (settled) return;
      settled = true;
      const ms = performance.now() - start;
      resolve({ frames, fps: +(frames / (ms / 1000)).toFixed(1), longTasks });
    };
    setTimeout(finish, 2200);
    const tick = () => {
      frames++;
      if (performance.now() - start < 2000) requestAnimationFrame(tick);
      else finish();
    };
    requestAnimationFrame(tick);
  });
}

// eslint-disable-next-line no-unused-vars
function glInfo() {
  const c = document.createElement('canvas');
  const gl = c.getContext('webgl2') || c.getContext('webgl');
  if (!gl) return { webgl: false };
  const dbg = gl.getExtension('WEBGL_debug_renderer_info');
  return { webgl: true, renderer: dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : 'n/a' };
}

const guard = (p, ms, label) =>
  Promise.race([
    p,
    new Promise((_, rej) => setTimeout(() => rej(new Error(`WATCHDOG ${label} (${ms}ms)`)), ms)),
  ]);

async function runMode(mode) {
  const browser = await puppeteerCore.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--hide-scrollbars', ...mode.args],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1600, height: 900, deviceScaleFactor: 1 });
  const logs = [];
  page.on('console', (m) => logs.push(`${m.type()}: ${m.text()}`));

  await guard(page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 120_000 }), 130_000, 'goto');
  const glInfoResult = await page.evaluate(glInfo);
  await guard(
    page.waitForFunction(() => window.__tiaMoltenReady && window.__tiaDitherReady, { timeout: 45_000 }),
    55_000,
    'ready'
  ).catch(() => {});
  await sleep(3500);

  const results = { mode: mode.name, gl: glInfoResult, shots: {} };
  const positions = process.env.FULL
    ? [['hero', 0], ['mid', 2200], ['lower', 5200], ['footer', 99_000]]
    : [['hero', 0], ['mid', 2200]];

  for (const [label, y] of positions) {
    await page.evaluate((target) => {
      const el = document.scrollingElement;
      el.scrollTop = Math.min(target, el.scrollHeight - window.innerHeight);
    }, y);
    await sleep(2000);
    const raw = await guard(page.screenshot({ encoding: 'base64' }), 45_000, `shot-${label}`);
    fs.writeFileSync(path.join(OUT_DIR, `${mode.name}-${label}.png`), Buffer.from(raw, 'base64'));
    const stats = await page.evaluate(measureShot, `data:image/png;base64,${raw}`);
    results.shots[label] = stats;
    console.log(
      `   ${label.padEnd(7)} lum ${String(stats.meanLum).padStart(5)}  rgb(${stats.meanR},${stats.meanG},${stats.meanB})  green ${String(stats.greenPct).padStart(4)}%  bright ${String(stats.brightPct).padStart(4)}%  black ${String(stats.blackPct).padStart(4)}%`
    );
  }

  await page.evaluate(() => { document.scrollingElement.scrollTop = 0; });
  await sleep(1200);
  results.perf = await guard(page.evaluate(fpsProbe), 20_000, 'fps');
  results.console = {
    deprecated: logs.filter((l) => /deprecated/i.test(l)).length,
    contextLost: logs.filter((l) => /context lost/i.test(l)).length,
    sample: logs.filter((l) => /deprecated|error|warn/i.test(l)).slice(0, 6),
  };
  await browser.close();
  return results;
}

fs.mkdirSync(OUT_DIR, { recursive: true });

// Hard process watchdog: pending puppeteer requests can keep the event loop
// alive forever after a rejected step, so the run must be able to end itself.
const GLOBAL_MS = Number(process.env.GLOBAL_MS || 240_000);
setTimeout(() => {
  console.log(`\nGLOBAL WATCHDOG after ${GLOBAL_MS}ms — forcing exit`);
  process.exit(3);
}, GLOBAL_MS);

const out = [];
for (const mode of MODES) {
  console.log(`\n▶ ${mode.name}…`);
  try {
    const r = await runMode(mode);
    console.log(`   renderer: ${r.gl.renderer || 'none'}`);
    console.log(
      `   fps ${r.perf.fps}  longTasks ${r.perf.longTasks}  deprecated ${r.console.deprecated}  contextLost ${r.console.contextLost}`
    );
    if (r.console.sample.length) console.log('   console: ' + JSON.stringify(r.console.sample));
    out.push(r);
  } catch (err) {
    console.log(`   FAILED — ${err.message}`);
    out.push({ mode: mode.name, error: String(err) });
  }
}

console.log('\n════ SUMMARY ════');
for (const r of out) {
  if (r.error) { console.log(`${r.mode}: FAILED — ${r.error}`); continue; }
  const hero = r.shots.hero;
  const mid = r.shots.mid;
  console.log(
    `${r.mode.padEnd(12)} hero lum ${String(hero.meanLum).padStart(5)} (green ${hero.greenPct}%)  mid lum ${String(mid.meanLum).padStart(5)} (green ${mid.greenPct}%)  fps ${r.perf.fps}  longTasks ${r.perf.longTasks}`
  );
}
console.log(`\nScreenshots in ${OUT_DIR}`);
process.exit(0);

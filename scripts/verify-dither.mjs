#!/usr/bin/env node

/**
 * Dither health checks:
 *  1. the live WebGL canvas always shows STRUCTURE (so the new "flat buffer"
 *     dead-canvas test cannot false-positive on the dark palette) and its
 *     pixel signature keeps CHANGING (so the freeze watchdog cannot false-fire);
 *  2. the page still renders its content with WebGL unavailable;
 *  3. A/B of the static fallback layer: the OLD bright/TV-noise version vs the
 *     new dark one — the fix that stops a degraded GPU from showing a blinding
 *     hero.
 * Run: BASE_URL=http://localhost:3100 node scripts/verify-dither.mjs
 */
import puppeteer from 'puppeteer-core';
import { mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, '..', 'screenshots', 'dither-verify');
const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';
const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let failed = 0;
const check = (ok, label, extra = '') => {
  if (!ok) failed++;
  console.log(`${ok ? '✅' : '❌'} ${label}${extra ? ` — ${extra}` : ''}`);
};

const DITHER_CANVAS = '.hero-bottom-curtain canvas';

/** Replicates Dither.tsx's sampling: 12x8 grid + 5x45 signature strips. */
const sampleDither = (page) =>
  page.evaluate((sel) => {
    const canvas = document.querySelector(sel);
    if (!canvas) return null;
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) return { error: 'no-gl-context' };
    const px = new Uint8Array(4);
    const COLS = 12, ROWS = 8;
    let min = 255, max = 0, sum = 0, n = 0;
    for (let ry = 0; ry < ROWS; ry++) {
      for (let rx = 0; rx < COLS; rx++) {
        const x = Math.min(canvas.width - 1, Math.floor(((rx + 0.5) / COLS) * canvas.width));
        const y = Math.min(canvas.height - 1, Math.floor(((ry + 0.5) / ROWS) * canvas.height));
        gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
        const l = 0.2126 * px[0] + 0.7152 * px[1] + 0.0722 * px[2];
        min = Math.min(min, l); max = Math.max(max, l); sum += l; n++;
      }
    }
    const row = new Uint8Array(45 * 4);
    let sig = '';
    for (let i = 0; i < 5; i++) {
      const y = Math.min(canvas.height - 1, Math.floor(((i + 0.5) / 5) * canvas.height));
      gl.readPixels(0, y, 45, 1, gl.RGBA, gl.UNSIGNED_BYTE, row);
      for (let k = 0; k < row.length; k++) sig += row[k].toString(16).padStart(2, '0');
    }
    return { spread: +(max - min).toFixed(1), mean: +(sum / n).toFixed(1), sig };
  }, DITHER_CANVAS);

const statsOfScreenshot = (page, b64) =>
  page.evaluate(async (uri) => {
    const img = new Image();
    img.src = uri;
    await new Promise((r, j) => { img.onload = r; img.onerror = j; });
    const c = document.createElement('canvas');
    const W = 320;
    const H = Math.round((320 * img.height) / img.width);
    c.width = W; c.height = H;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, W, H);
    const d = ctx.getImageData(0, 0, W, H).data;
    const lum = [];
    for (let i = 0; i < d.length; i += 4) lum.push(0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]);
    lum.sort((a, b) => a - b);
    const q = (p) => Math.round(lum[Math.floor(p * (lum.length - 1))]);
    const over200 = lum.filter((l) => l > 200).length / lum.length * 100;
    return { mean: Math.round(lum.reduce((a, v) => a + v, 0) / lum.length), p50: q(0.5), p95: q(0.95), over200pct: +over200.toFixed(1) };
  }, `data:image/png;base64,${b64}`);

mkdirSync(OUT_DIR, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: CHROME_PATH,
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--hide-scrollbars'],
});

try {
  // ── 1. Healthy WebGL path ─────────────────────────────────────────────
  const page = await browser.newPage();
  page.setDefaultNavigationTimeout(120000);
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  await page.goto(BASE_URL, { waitUntil: 'networkidle2' });
  await sleep(7000);

  const spreads = [];
  const means = [];
  const sigs = [];
  for (let i = 0; i < 6; i++) {
    const s = await sampleDither(page);
    if (s && !s.error) { spreads.push(s.spread); means.push(s.mean); sigs.push(s.sig); }
    else if (s?.error) console.log('   sample error:', s.error);
    await sleep(1600);
  }
  if (spreads.length) {
    const minSpread = Math.min(...spreads);
    console.log(`   spreads: ${spreads.map((v) => v.toFixed(0)).join(', ')} (luminance range over 96 samples)`);
    console.log(`   means:   ${means.map((v) => v.toFixed(0)).join(', ')} (real shader target for the fallback)`);
    check(minSpread >= 4, 'canvas is never a flat fill → dead-canvas test cannot false-positive', `min spread ${minSpread}`);
    const unique = new Set(sigs).size;
    check(unique > 1, 'frame signature keeps changing → freeze watchdog cannot false-fire', `${unique}/${sigs.length} distinct`);
  } else {
    check(false, 'dither canvas pixels readable', `found ${await page.$eval(DITHER_CANVAS, (e) => `${e.width}x${e.height}`).catch(() => 'no canvas')}`);
  }
  await page.screenshot({ path: join(OUT_DIR, 'hero-webgl.png') });
  await page.close();

  // ── 2. WebGL unavailable ──────────────────────────────────────────────
  const blocked = await browser.newPage();
  blocked.setDefaultNavigationTimeout(120000);
  await blocked.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  await blocked.evaluateOnNewDocument(() => {
    const orig = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...rest) {
      if (String(type).includes('webgl')) return null;
      return orig.call(this, type, ...rest);
    };
  });
  await blocked.goto(BASE_URL, { waitUntil: 'networkidle2' });
  await sleep(9000);
  const alive = await blocked.evaluate(() => ({
    heroHeading: /Il perfetto equilibrio/i.test(document.body.innerText),
    fallbackInDom: !!document.querySelector('.hero-bottom-curtain > div[aria-hidden="true"]'),
  }));
  console.log('── WebGL blocked:', JSON.stringify(alive));
  check(alive.heroHeading, 'page still renders its content without WebGL (no black screen)');
  await blocked.close();

  // ── 3. Fallback layer A/B (old bright vs new dark) ────────────────────
  const noise = (bf) => `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='d'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='${bf}' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix type='matrix' values='0 0 0 0 0.176  0 0 0 0 0.831  0 0 0 0 0.749  16 0 0 0 -7.2'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23d)'/%3E%3C/svg%3E")`;
  const svgNoise = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='240' height='240'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.72' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='240' height='240' filter='url(%23n)'/%3E%3C/svg%3E")`;
  const oldMarkup = `<div style="position:absolute;inset:0;background:#010101">
    <div style="position:absolute;inset:0;background:radial-gradient(ellipse 95% 75% at 50% 30%,rgba(45,212,191,0.62),rgba(0,0,0,0) 72%),radial-gradient(ellipse 60% 45% at 80% 80%,rgba(45,212,191,0.42),rgba(0,0,0,0) 70%),radial-gradient(ellipse 35% 28% at 20% 58%,rgba(45,212,191,0.30),rgba(0,0,0,0) 68%)"></div>
    <div style="position:absolute;inset:0;background-image:${noise('0.9')};opacity:0.9"></div>
    <div style="position:absolute;inset:0;background-image:${noise('0.28')};opacity:0.55"></div>
    <div style="position:absolute;inset:0;background-image:${svgNoise};opacity:0.55;mix-blend-mode:screen"></div>
  </div>`;
  const newMarkup = `<div style="position:absolute;inset:0;background:#010101">
    <div style="position:absolute;inset:0;background:radial-gradient(ellipse 85% 70% at 46% 32%,rgba(45,212,191,0.58),rgba(0,0,0,0) 72%),radial-gradient(ellipse 55% 45% at 78% 74%,rgba(45,212,191,0.38),rgba(0,0,0,0) 70%),radial-gradient(ellipse 40% 32% at 22% 62%,rgba(45,212,191,0.26),rgba(0,0,0,0) 68%)"></div>
    <div style="position:absolute;inset:0;background-image:${noise('0.34')};opacity:0.45"></div>
    <div style="position:absolute;inset:0;background-image:${noise('0.16')};opacity:0.28"></div>
  </div>`;

  const ab = await browser.newPage();
  await ab.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  const results = {};
  for (const [name, markup] of [['old bright fallback', oldMarkup], ['new dark fallback', newMarkup]]) {
    await ab.setContent(`<body style="margin:0;background:#010101"><div style="position:relative;width:1440px;height:900px">${markup}</div></body>`);
    await sleep(400);
    const buf = await ab.screenshot({ encoding: 'base64' });
    await ab.screenshot({ path: join(OUT_DIR, `${name.replace(/\s+/g, '-')}.png`) });
    results[name] = await statsOfScreenshot(ab, buf);
  }
  await ab.close();

  for (const [name, s] of Object.entries(results)) {
    console.log(`   ${name}: mean ${s.mean}, p50 ${s.p50}, p95 ${s.p95}, >200lum ${s.over200pct}%`);
  }
  // Target: same brightness BAND as the real shader (mean 47-71 over the same
  // grid, measured above), never a blinding wash.
  const fb = results['new dark fallback'].mean;
  check(fb >= 25 && fb <= 95, 'fallback brightness sits in the shader range (dark, not blinding)', `mean ${fb}`);
} finally {
  await browser.close();
}

console.log(failed === 0 ? '\n✅ all checks passed' : `\n❌ ${failed} check(s) failed`);
process.exitCode = failed === 0 ? 0 : 1;

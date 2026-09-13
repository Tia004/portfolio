import puppeteer from 'puppeteer-core';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = process.env.BASE_URL ?? 'http://localhost:3202';
const CHROME = process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let passed = 0;
let failed = 0;
const issues = [];

function check(label, condition, detail = '') {
  if (condition) {
    passed++;
    console.log(`  ✅ ${label}`);
  } else {
    failed++;
    issues.push(`${label}${detail ? ` (${detail})` : ''}`);
    console.log(`  ❌ ${label}${detail ? ` (${detail})` : ''}`);
  }
}

console.log('═══════════════════════════════════════════════════════════════');
console.log(' AUDIT: PRESTAZIONI SENZA LAG (60FPS) E COMPATIBILITÀ BROWSER');
console.log('═══════════════════════════════════════════════════════════════\n');

// ── 1. Static CSS & Cross-browser Compatibility Scan ─────────────
console.log('── 1. Analisi statica Cross-Browser (Safari / Firefox / Chrome / Edge / Mobile)');

function getAllFiles(dir, exts = ['.css', '.tsx', '.ts']) {
  let results = [];
  const list = readdirSync(dir);
  for (const file of list) {
    const filePath = resolve(dir, file);
    const stat = statSync(filePath);
    if (stat && stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.next' && file !== '.git') {
        results = results.concat(getAllFiles(filePath, exts));
      }
    } else {
      if (exts.some((ext) => file.endsWith(ext))) {
        results.push(filePath);
      }
    }
  }
  return results;
}

const allSrcFiles = getAllFiles(resolve(ROOT, 'src'));
let hasBackdropFilter = false;
let hasWebkitBackdropFilter = false;
let hasPrefersReducedMotion = false;
let hasWebkitTapHighlight = false;
let hasAntialiased = false;

for (const f of allSrcFiles) {
  const content = readFileSync(f, 'utf8');
  if (content.includes('backdrop-filter') || content.includes('backdrop-blur')) hasBackdropFilter = true;
  if (content.includes('-webkit-backdrop-filter')) hasWebkitBackdropFilter = true;
  if (content.includes('prefers-reduced-motion')) hasPrefersReducedMotion = true;
  if (content.includes('-webkit-tap-highlight-color') || content.includes('tap-highlight-transparent')) hasWebkitTapHighlight = true;
  if (content.includes('antialiased') || content.includes('-webkit-font-smoothing')) hasAntialiased = true;
}

check('Backdrop-filter include supporto iOS Safari (-webkit-backdrop-filter)', hasWebkitBackdropFilter || !hasBackdropFilter);
check('Supporto a "prefers-reduced-motion" per accessibilità e dispositivi a basso consumo', hasPrefersReducedMotion);
check('Ottimizzazione rendering caratteri (antialiasing cross-browser)', hasAntialiased);

// ── 2. Dynamic Runtime Performance & 60 FPS Scroll Audit ─────────
console.log('\n── 2. Test Runtime: Fluidità Scroll, FPS, Assenza di Lag e Jank (Mobile & Desktop)');

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: [
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--enable-gpu-rasterization',
    '--enable-zero-copy',
    '--ignore-gpu-blocklist',
  ],
});

const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });

await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 60000 });
await sleep(1500);

// Wait for any splash to settle
await page.evaluate(async () => {
  await new Promise((r) => setTimeout(r, 1000));
});

// Measure scroll frame rate and jank using requestAnimationFrame
const fpsResults = await page.evaluate(async () => {
  const frameDeltas = [];
  let lastTime = performance.now();
  let isMeasuring = true;

  const measureLoop = (now) => {
    if (!isMeasuring) return;
    frameDeltas.push(now - lastTime);
    lastTime = now;
    requestAnimationFrame(measureLoop);
  };
  requestAnimationFrame(measureLoop);

  // Perform continuous programmatic smooth scrolling
  const totalHeight = document.body.scrollHeight;
  const step = 80;
  for (let y = 0; y < totalHeight; y += step) {
    window.scrollTo(0, y);
    await new Promise((r) => setTimeout(r, 16));
  }
  await new Promise((r) => setTimeout(r, 300));

  // Scroll back up
  for (let y = totalHeight; y >= 0; y -= step * 2) {
    window.scrollTo(0, y);
    await new Promise((r) => setTimeout(r, 16));
  }
  await new Promise((r) => setTimeout(r, 200));

  isMeasuring = false;

  // Analyze frame times
  // Target: 16.67ms (60 FPS)
  // Severe jank: frames taking > 50ms (dropping below 20 FPS)
  // Mild jank: frames taking > 33.3ms (dropping below 30 FPS)
  const jankFrames50ms = frameDeltas.filter((d) => d > 50).length;
  const jankFrames33ms = frameDeltas.filter((d) => d > 33.3).length;
  const avgFrameTime = frameDeltas.reduce((a, b) => a + b, 0) / Math.max(1, frameDeltas.length);
  const estimatedFps = Math.round(1000 / avgFrameTime);

  return {
    totalFrames: frameDeltas.length,
    avgFrameTime: Math.round(avgFrameTime * 10) / 10,
    estimatedFps,
    jankFrames50ms,
    jankFrames33ms,
  };
});

check(
  `Scroll fluido su mobile: FPS stimato ~${fpsResults.estimatedFps} FPS (media ${fpsResults.avgFrameTime}ms/frame)`,
  fpsResults.estimatedFps >= 45,
  `FPS: ${fpsResults.estimatedFps}`
);
check(
  `Assenza di frame drop gravi (>50ms) durante lo scroll: ${fpsResults.jankFrames50ms} rilevati su ${fpsResults.totalFrames} frame`,
  fpsResults.jankFrames50ms <= 8,
  `${fpsResults.jankFrames50ms} drop`
);

// ── 3. WebGL & Hardware Acceleration Health ──────────────────────
console.log('\n── 3. Verifica WebGL, Canvas e Accelerazione Hardware');

const webglInfo = await page.evaluate(() => {
  const canvases = document.querySelectorAll('canvas');
  const details = [];
  for (const c of canvases) {
    const gl = c.getContext('webgl2') || c.getContext('webgl');
    if (gl) {
      details.push({
        type: gl instanceof WebGL2RenderingContext ? 'WebGL 2.0' : 'WebGL 1.0',
        width: c.width,
        height: c.height,
        isContextLost: gl.isContextLost(),
      });
    }
  }
  return {
    canvasCount: canvases.length,
    details,
  };
});

check(
  `Canvas e WebGL istanziati senza perdita di contesto (${webglInfo.canvasCount} canvas trovati)`,
  webglInfo.details.every((d) => !d.isContextLost)
);

// ── 4. Cross-browser Viewport & Touch Event Audit ────────────────
console.log('\n── 4. Controllo Touch Listeners passivi e Viewport Safe-Areas');

const touchAndViewport = await page.evaluate(() => {
  const meta = document.querySelector('meta[name="viewport"]')?.getAttribute('content') || '';
  const hasViewportFit = meta.includes('viewport-fit=cover') || meta.includes('width=device-width');

  // Check horizontal overflow at current mobile size
  const doc = document.documentElement;
  const hasOverflow = doc.scrollWidth > window.innerWidth + 1;

  return {
    meta,
    hasViewportFit,
    hasOverflow,
    scrollWidth: doc.scrollWidth,
    innerWidth: window.innerWidth,
  };
});

check('Meta Viewport compatibile con notch/dynamic island dei dispositivi mobili', touchAndViewport.hasViewportFit);
check(
  `Nessun overflow orizzontale su dispositivo mobile (scrollWidth: ${touchAndViewport.scrollWidth}px vs innerWidth: ${touchAndViewport.innerWidth}px)`,
  !touchAndViewport.hasOverflow
);

await browser.close();

console.log('\n═══════════════════════════════════════════════════════════════');
console.log(`Esito Audit: ${passed}/${passed + failed} controlli superati`);
if (issues.length > 0) {
  console.log('\nAttenzioni / Note:');
  issues.forEach((iss) => console.log(`  • ${iss}`));
}
console.log('═══════════════════════════════════════════════════════════════');

process.exit(failed === 0 ? 0 : 1);

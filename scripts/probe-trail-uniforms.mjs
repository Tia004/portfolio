// Read the LIVE PixelTrail material straight out of the R3F store and report
// what the shader actually receives: the sampler's texture, its buffer bytes,
// the resolution uniform and the arm flag.
// Run: node scripts/probe-trail-uniforms.mjs   (site on :3100)
import puppeteer from 'puppeteer-core';

const BASE = process.env.BASE_URL || 'http://localhost:3100';
const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const b = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--hide-scrollbars'] });
const p = await b.newPage();
await p.setViewport({ width: 1200, height: 800, deviceScaleFactor: 1 });
await p.goto(BASE, { waitUntil: 'load', timeout: 180_000 });
await sleep(8000);

const probe = () => {
  const canvas = document.querySelector('.pixel-canvas');
  if (!canvas) return { error: 'no .pixel-canvas' };
  const root = canvas.__r3f;
  const keys = root ? Object.getOwnPropertyNames(root) : [];
  const proto = root ? Object.getOwnPropertyNames(Object.getPrototypeOf(root) || {}) : [];
  const desc = root
    ? Object.fromEntries(keys.map((k) => [k, typeof root[k]]))
    : null;
  const state = root && root.root ? root.root.getState?.() : root && root.getState ? root.getState() : null;
  let mesh = null;
  if (state?.scene) {
    state.scene.traverse((o) => {
      if (o.material && o.material.uniforms && o.material.uniforms.mouseTrail) mesh = o;
    });
  }
  if (!mesh) return { error: 'material not found', keys, proto, desc, hasState: !!state };
  const u = mesh.material.uniforms;
  const tex = u.mouseTrail.value;
  const img = tex && tex.image;
  let data = null;
  let max = null;
  let nonZero = null;
  if (img && img.data) {
    const d = img.data;
    max = 0;
    nonZero = 0;
    for (let i = 0; i < d.length; i++) {
      if (d[i] > max) max = d[i];
      if (d[i] !== 0) nonZero++;
    }
    data = Array.from(d.slice(0, 8));
  }
  return {
    texType: tex ? tex.constructor.name : String(tex),
    texFormat: tex ? tex.format : null,
    texTypeConst: tex ? tex.type : null,
    isDataTexture: !!(tex && tex.isDataTexture),
    width: img?.width ?? null,
    height: img?.height ?? null,
    firstBytes: data,
    maxByte: max,
    nonZeroBytes: nonZero,
    resolution: u.resolution.value ? [u.resolution.value.x, u.resolution.value.y] : null,
    armed: u.uArmed.value,
    gridSize: u.gridSize.value,
    cursorGrid: u.cursorGrid.value ? [u.cursorGrid.value.x, u.cursorGrid.value.y] : null,
    pixelColor: u.pixelColor.value ? [u.pixelColor.value.r, u.pixelColor.value.g, u.pixelColor.value.b] : null,
  };
};

console.log('▸ before pointer:', JSON.stringify(await p.evaluate(probe), null, 1));
await p.mouse.move(300, 300);
await sleep(60);
await p.mouse.move(700, 400);
await sleep(600);
console.log('\n▸ after pointer move:', JSON.stringify(await p.evaluate(probe), null, 1));
await b.close();
process.exit(0);

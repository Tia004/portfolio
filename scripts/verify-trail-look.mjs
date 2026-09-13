// Measures the CURSOR TRAIL's visibility (not the page wash):
//   • how much teal the trail adds along a known sweep path vs a control band;
//   • how bright the parked idle dot is;
//   • that no full-screen wash is introduced.
//
// Run: node scripts/verify-trail-look.mjs     (site on :3100)
import puppeteer from 'puppeteer-core';
import sharp from 'sharp';
import fs from 'node:fs';
import nodePath from 'node:path';

const BASE = process.env.BASE_URL || 'http://localhost:3100';
const OUT = nodePath.resolve('screenshots/trail-look');
fs.mkdirSync(OUT, { recursive: true });
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function stats(buf, box) {
  const { data, info } = await sharp(buf)
    .extract({ left: box.x, top: box.y, width: box.w, height: box.h })
    .raw()
    .toBuffer({ resolveWithObject: true });
  const ch = info.channels;
  let sum = 0, n = 0, maxG = 0, tealPixels = 0;
  for (let i = 0; i < data.length; i += ch) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    sum += g - (r + b) / 2;
    if (g > maxG) maxG = g;
    if (g > 90 && g - Math.max(r, b) > 25) tealPixels++;
    n++;
  }
  return { greenExcess: +(sum / n).toFixed(1), maxGreen: maxG, tealPct: +((100 * tealPixels) / n).toFixed(1) };
}

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--no-sandbox', '--hide-scrollbars', '--enable-gpu', '--use-gl=angle', '--use-angle=metal'],
});
const page = await browser.newPage();
await page.setViewport({ width: 1600, height: 900, deviceScaleFactor: 1 });
await page.goto(BASE, { waitUntil: 'networkidle2', timeout: 120_000 });
await sleep(5000);

// A) sweep along y≈450 (well inside the hero), then measure immediately
for (let i = 0; i <= 40; i++) {
  await page.mouse.move(280 + i * 26, 452 + Math.round(Math.sin(i / 5) * 6));
  await sleep(22);
}
const swept = await page.screenshot();
fs.writeFileSync(nodePath.join(OUT, 'trail-mid-sweep.png'), swept);
const trailBand = await stats(swept, { x: 280, y: 400, w: 1040, h: 100 });
const control = await stats(swept, { x: 280, y: 80, w: 1040, h: 100 });
const page1 = await stats(swept, { x: 0, y: 0, w: 1600, h: 900 });

// B) parked idle dot: pointer still at the end of the sweep
await page.mouse.move(820, 452);
await sleep(500);
const parked = await page.screenshot();
fs.writeFileSync(nodePath.join(OUT, 'idle-dot.png'), parked);
const dot = await stats(parked, { x: 720, y: 352, w: 200, h: 200 });
const dotControl = await stats(parked, { x: 120, y: 652, w: 200, h: 200 });

// C) decay: 2.5s after leaving the hero path, the trail must be gone
await page.mouse.move(120, 860);
await sleep(2500);
const decayed = await page.screenshot();
const after = await stats(decayed, { x: 280, y: 400, w: 1040, h: 100 });
const page2 = await stats(decayed, { x: 0, y: 0, w: 1600, h: 900 });

const show = (label, s) =>
  console.log(
    `  ${label.padEnd(26)} green-excess ${String(s.greenExcess).padStart(6)}  max-green ${String(s.maxGreen).padStart(3)}  teal ${String(s.tealPct).padStart(5)}%`
  );

console.log('\n── cursor trail');
show('trail band (sweep path)', trailBand);
show('control band (same width)', control);
show('idle dot box', dot);
show('idle dot control box', dotControl);
show('trail band 2.5s later', after);
console.log('\n── page wash guard (full viewport)');
show('page right after sweep', page1);
show('page after decay', page2);

const trailVisible = trailBand.greenExcess > control.greenExcess + 15 && trailBand.greenExcess > 12;
const dotVisible = dot.greenExcess > dotControl.greenExcess + 15 && dot.maxGreen > 140;
// The wash was a FLAT teal fill: it showed up as a page-wide green excess far
// above the decayed baseline and as a large share of teal pixels. Bright white
// UI text legitimately reaches max-green 255, so max-green is not a signal.
const noWash = page1.tealPct < 40 && page1.greenExcess < 60;
console.log(
  `\n  trail clearly visible: ${trailVisible ? 'PASS' : 'FAIL'}   idle dot: ${dotVisible ? 'PASS' : 'FAIL'}   no site-wide wash: ${noWash ? 'PASS' : 'FAIL'}`
);

await browser.close();
process.exit(trailVisible && dotVisible && noWash ? 0 : 1);

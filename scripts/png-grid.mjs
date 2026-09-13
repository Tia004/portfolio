// Prints a coarse colour grid for PNG files so their content can be read as
// text (no image viewer available in this environment).
// Run: node scripts/png-grid.mjs screenshots/gl-fix/gpu-hero.png
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';

const files = process.argv.slice(2);
if (!files.length) {
  console.error('usage: node scripts/png-grid.mjs <png> [png...]');
  process.exit(1);
}

function grid(dataUrl, cols, rows) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = img.width;
      c.height = img.height;
      const ctx = c.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const out = [];
      const cw = Math.floor(c.width / cols);
      const ch = Math.floor(c.height / rows);
      let sumL = 0, n = 0, minL = 255, maxL = 0;
      const uniq = new Set();
      for (let ry = 0; ry < rows; ry++) {
        const row = [];
        for (let rx = 0; rx < cols; rx++) {
          const d = ctx.getImageData(rx * cw, ry * ch, cw, ch).data;
          let r = 0, g = 0, b = 0, m = 0;
          for (let i = 0; i < d.length; i += 4) {
            r += d[i]; g += d[i + 1]; b += d[i + 2]; m++;
            const l = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
            sumL += l; n++;
            if (l < minL) minL = l;
            if (l > maxL) maxL = l;
          }
          const rr = Math.round(r / m), gg = Math.round(g / m), bb = Math.round(b / m);
          uniq.add((rr >> 4) * 256 + (gg >> 4) * 16 + (bb >> 4));
          row.push(
            `#${rr.toString(16).padStart(2, '0')}${gg.toString(16).padStart(2, '0')}${bb
              .toString(16)
              .padStart(2, '0')}`
          );
        }
        out.push(row);
      }
      resolve({
        size: `${c.width}x${c.height}`,
        meanLum: +(sumL / n).toFixed(1),
        minL: Math.round(minL),
        maxL: Math.round(maxL),
        distinctColourBuckets: uniq.size,
        out,
      });
    };
    img.onerror = () => reject(new Error('decode'));
    img.src = dataUrl;
  });
}

const b = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
  args: ['--no-sandbox'],
});
const p = await b.newPage();
await p.goto('about:blank');
for (const f of files) {
  const abs = path.resolve(f);
  const dataUrl = 'data:image/png;base64,' + fs.readFileSync(abs).toString('base64');
  const g = await p.evaluate(grid, dataUrl, 12, 8);
  console.log(`\n${f}  ${g.size}  meanLum ${g.meanLum}  min ${g.minL}  max ${g.maxL}  colour buckets ${g.distinctColourBuckets}`);
  for (const row of g.out) console.log('   ' + row.join(' '));
}
await b.close();
process.exit(0);

#!/usr/bin/env node
/**
 * Generates uniform 16:9 CROPPED thumbnail variants for every design-works
 * project thumbnail.
 *
 * The project-card grid renders every thumbnail inside a 16:9 frame, but the
 * source artwork mixes proportions (portrait posters, square slides, landscape
 * shots). This script crops each thumbnail to exactly 16:9 (center crop) and
 * writes `<name>-thumb.avif` + `<name>-thumb.webp` next to the existing
 * variants. The card <picture> prefers the -thumb variant and falls back to
 * the full uncropped avif/webp when it doesn't exist.
 *
 * Usage (from project root):
 *   npm run gen:thumbs          # generate for all design-works thumbnails
 *
 * Idempotent: skips a variant when it exists and is newer than the source.
 */
import { stat, access, readFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const THUMB_W = 960; // 16:9 @ 960×540 — crisp on 2x displays at card sizes
const THUMB_H = 540;
const AVIF_QUALITY = 60;
const WEBP_QUALITY = 75;
const UPLOADS_ROOT = 'public/uploads';

async function newerOrMissing(variantPath, srcMtime) {
  try {
    const st = await stat(variantPath);
    return st.mtimeMs < srcMtime;
  } catch {
    return true; // missing → generate
  }
}

/** Pull the thumbnails straight from the data files so the list never drifts. */
async function getThumbnails() {
  // design-works.ts only has a type-only import of translations (erased at
  // runtime), so it can be imported directly in plain Node.
  const design = await import('../src/lib/design-works.ts');
  const thumbs = design
    .getDesignWorks('it')
    .map((p) => p.thumbnail)
    .filter((t) => t.startsWith('/uploads/'));

  // Web projects (translations.ts PROJECTS_BY_LANG) can't be imported in Node
  // ESM — translations.ts imports './design-works' without the .ts extension,
  // which only Next.js resolves. Their thumbnails are the ONLY literal
  // `thumbnail: '/uploads/…'` strings in the file, so a source regex stays in
  // sync without the import chain.
  const translationsSource = await readFile(new URL('../src/lib/translations.ts', import.meta.url), 'utf8');
  for (const m of translationsSource.matchAll(/thumbnail:\s*'\/uploads\/([^']+)'/g)) {
    thumbs.push(`/uploads/${m[1]}`);
  }

  return [...new Set(thumbs.map((t) => UPLOADS_ROOT + decodeURIComponent(t).replace(/^\/uploads/, '')))];
}

async function gen(relPath) {
  const base = relPath.replace(/\.(png|jpe?g)$/i, '');
  const srcAvif = `${base}.avif`;
  const srcWebp = `${base}.webp`;

  // Prefer the existing avif as source (best quality, smallest); fall back to webp.
  let src = srcAvif;
  try {
    await access(srcAvif);
  } catch {
    try {
      await access(srcWebp);
    } catch {
      console.error(`✗ ${relPath}: no .avif/.webp source found — run gen:variants first`);
      return false;
    }
    src = srcWebp;
  }

  const srcMtime = (await stat(src)).mtimeMs;
  const before = (await stat(src)).size;
  const out = { avif: `${base}-thumb.avif`, webp: `${base}-thumb.webp` };

  const crop = () =>
    sharp(src, { failOn: 'none' })
      .rotate()
      .resize({ width: THUMB_W, height: THUMB_H, fit: 'cover', position: 'centre', withoutEnlargement: true });

  let made = false;
  if (await newerOrMissing(out.avif, srcMtime)) {
    await crop().avif({ quality: AVIF_QUALITY, effort: 5 }).toFile(out.avif);
    made = true;
  }
  if (await newerOrMissing(out.webp, srcMtime)) {
    await crop().webp({ quality: WEBP_QUALITY }).toFile(out.webp);
    made = true;
  }

  const fmt = (n) => (n / 1024).toFixed(0) + 'KB';
  const avifSize = (await stat(out.avif)).size;
  const webpSize = (await stat(out.webp)).size;
  console.log(
    `${made ? 'GENERATED' : '  cached'} ${path.basename(base)}: ${fmt(before)} → thumb avif ${fmt(avifSize)} · webp ${fmt(webpSize)}`
  );
  return made;
}

const thumbnails = await getThumbnails();
console.log(`design-works thumbnails found: ${thumbnails.length}`);

let generated = 0;
let failed = 0;
for (const rel of thumbnails) {
  try {
    if (await gen(rel)) generated++;
  } catch (err) {
    failed++;
    console.error(`✗ ${rel}: ${err.message}`);
  }
}

console.log(
  `\nDone: ${generated} thumbnail(s) cropped to 16:9, ${thumbnails.length - generated - failed} already up to date${failed ? `, ${failed} failed` : ''}.`
);
if (failed > 0) process.exitCode = 1;

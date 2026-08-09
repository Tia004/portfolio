#!/usr/bin/env node
/**
 * Generates .avif + .webp variants next to source images (resized, compressed).
 *
 * The site serves <picture> sources (avif → webp → original) for every
 * /uploads thumbnail. The upload root already follows this convention
 * (canapastore.png → canapastore.avif/.webp); design-works images
 * (some 20MB+) never got variants, so the mobile project slider and the
 * ProjectModal gallery were downloading full-res PNGs. This script fills
 * the gap and keeps it filled.
 *
 * Usage (from project root):
 *   npm run gen:variants          # scan public/uploads, generate all missing
 *   node scripts/gen-image-variants.mjs "public/uploads/design-works/Misti/IntrospectionPoster.png" ...
 *
 * Idempotent: skips a variant when it exists and is newer than the source.
 */
import { stat, access, readdir } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const MAX_DIM = 1600; // cap the longer side — plenty for card + modal carousel
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

/** Recursively collect .png/.jpg/.jpeg sources under a directory (no shell, safe with spaces). */
async function collectImages(dir) {
  const out = [];
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...(await collectImages(full)));
    } else if (/\.(png|jpe?g)$/i.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

async function gen(srcPath) {
  const srcMtime = (await stat(srcPath)).mtimeMs;
  const base = srcPath.replace(/\.(png|jpe?g)$/i, '');
  const out = { avif: `${base}.avif`, webp: `${base}.webp` };
  const before = (await stat(srcPath)).size;

  const pipeline = () =>
    sharp(srcPath, { failOn: 'none', animated: false })
      .rotate() // honor EXIF orientation
      .resize({ width: MAX_DIM, height: MAX_DIM, fit: 'inside', withoutEnlargement: true });

  let made = false;
  if (await newerOrMissing(out.avif, srcMtime)) {
    await pipeline().avif({ quality: AVIF_QUALITY, effort: 5 }).toFile(out.avif);
    made = true;
  }
  if (await newerOrMissing(out.webp, srcMtime)) {
    await pipeline().webp({ quality: WEBP_QUALITY }).toFile(out.webp);
    made = true;
  }

  const fmt = (n) => (n / 1024 / 1024).toFixed(2) + 'MB';
  const avifSize = (await stat(out.avif)).size;
  const webpSize = (await stat(out.webp)).size;
  const tag = made ? 'GENERATED' : '  cached';
  console.log(
    `${tag} ${path.basename(srcPath)}: ${fmt(before)} → avif ${fmt(avifSize)} · webp ${fmt(webpSize)}`
  );
  return made;
}

const explicit = process.argv.slice(2);
const files = explicit.length > 0 ? explicit : await collectImages(UPLOADS_ROOT);

if (files.length === 0) {
  if (explicit.length > 0) {
    console.error('Usage: node scripts/gen-image-variants.mjs <image> [image...]');
    process.exit(1);
  }
  console.log(`No source images found under ${UPLOADS_ROOT}/ — nothing to do.`);
  process.exit(0);
}

if (explicit.length === 0) {
  console.log(`Scanning ${UPLOADS_ROOT}/ — ${files.length} source image(s) found.`);
}

let generated = 0;
let failed = 0;
for (const f of files) {
  try {
    await access(f);
    if (await gen(f)) generated++;
  } catch (err) {
    failed++;
    console.error(`✗ ${f}: ${err.message}`);
  }
}

console.log(`\nDone: ${generated} image(s) got new variants, ${files.length - generated - failed} already up to date${failed ? `, ${failed} failed` : ''}.`);
if (failed > 0) process.exitCode = 1;

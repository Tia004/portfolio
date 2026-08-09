#!/usr/bin/env node
/**
 * Generates .avif + .webp variants next to source images (resized, compressed).
 *
 * The site serves <picture> sources (avif → webp → original) for every
 * /uploads thumbnail. The upload root already follows this convention
 * (canapastore.png → canapastore.avif/.webp); design-works thumbnails
 * (some 20MB+) never got variants, so the mobile project slider was
 * downloading full-res PNGs on swipe. This script fills the gap.
 *
 * Usage (from project root):
 *   node scripts/gen-image-variants.mjs "public/uploads/design-works/Misti/IntrospectionPoster.png" ...
 *
 * Idempotent: skips a variant when it exists and is newer than the source.
 */
import { stat, access } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const MAX_DIM = 1600; // cap the longer side — plenty for card + modal carousel
const AVIF_QUALITY = 60;
const WEBP_QUALITY = 75;

async function newerOrMissing(variantPath, srcMtime) {
  try {
    const st = await stat(variantPath);
    return st.mtimeMs < srcMtime;
  } catch {
    return true; // missing → generate
  }
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
}

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error('Usage: node scripts/gen-image-variants.mjs <image> [image...]');
  process.exit(1);
}
for (const f of files) {
  try {
    await access(f);
    await gen(f);
  } catch (err) {
    console.error(`✗ ${f}: ${err.message}`);
  }
}

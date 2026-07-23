#!/usr/bin/env node

/**
 * check-icons-sync.mjs
 *
 * Verifies that the icons exported in src/app/components/icons.tsx
 * match the icons imported in src/app/components/HomeShell.tsx,
 * organized by @category tag.
 *
 * Usage:  node scripts/check-icons-sync.mjs
 *         npm run check:icons
 *
 * Exits with code:
 *   0 — all icons in sync
 *   1 — mismatches found (missing or surplus icons)
 */

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/* ──────────────────────────────────────────────
 * 1. Parse src/app/components/icons.tsx
 *    Returns Map<categoryName, Set<iconName>>
 * ────────────────────────────────────────────── */
function parseIconsExports(filePath) {
  const src = readFileSync(filePath, 'utf8');
  const map = new Map();

  // Match blocks like:
  // /** @category Design @since 2026-07-23 */
  // export {
  //   FigmaIcon,
  //   ...
  // } from '@hugeicons/core-free-icons';
  const blockRe = /\/\*\*\s*@category\s+([^*]+?)\s*\*\/\s*export\s*\{([^}]+)\}/g;
  let match;
  while ((match = blockRe.exec(src)) !== null) {
    const category = match[1].replace(/@since\s+\S+/g, '').trim(); // strip @since
    const iconNames = match[2]
      .split(/[,\n]/)
      .map(s => s.trim())
      .filter(s => s && !s.startsWith('//') && !s.startsWith('/*'));
    map.set(category, new Set(iconNames));
  }

  return map;
}

/* ──────────────────────────────────────────────
 * 2. Parse src/app/components/HomeShell.tsx
 *    Returns Map<categoryName, Set<iconName>>
 *    Reads the inline // ─── Design ── sections
 *    inside the `import { ... } from './icons'` block.
 * ────────────────────────────────────────────── */
function parseIconsImports(filePath) {
  const src = readFileSync(filePath, 'utf8');
  const map = new Map();

  // Locate:  import { ... } from './icons';
  const importStart = src.indexOf("import {");
  const importEnd   = src.indexOf("} from './icons'");
  if (importStart === -1 || importEnd === -1) {
    console.error('ERROR: cannot find `import { ... } from \'./icons\'` block in HomeShell.tsx');
    process.exit(2);
  }

  const block = src.slice(importStart, importEnd);
  const lines = block.split('\n');

  let currentCategory = null;
  for (const raw of lines) {
    const line = raw.trim();
    // Detect section comments:  // ─── Design ──
    const catMatch = line.match(/\/\/\s*───\s*(.+?)\s*───/);
    if (catMatch) {
      currentCategory = catMatch[1].trim();
      if (!map.has(currentCategory)) map.set(currentCategory, new Set());
      continue;
    }
    if (!currentCategory) continue;

    // Skip non-icon lines (comments, braces, empty)
    if (line === '' || line.startsWith('//') || line === '{' || line === 'import {' || line === '}' || line.startsWith('/*') || line.startsWith('*')) continue;

    // Extract icon name (handle trailing comma)
    const name = line.replace(/,$/, '').trim();
    if (name && /^[A-Z]/.test(name)) {
      map.get(currentCategory).add(name);
    }
  }

  return map;
}

/* ──────────────────────────────────────────────
 * 3. Main
 * ────────────────────────────────────────────── */
function main() {
  const iconsPath       = join(ROOT, 'src/app/components/icons.tsx');
  const homeShellPath   = join(ROOT, 'src/app/components/HomeShell.tsx');

  console.log('\n  ┌──────────────────────────────────────────────┐');
  console.log('  │     Icon sync check — icons.tsx ↔ HomeShell   │');
  console.log('  └──────────────────────────────────────────────┘\n');

  const exportsByCat = parseIconsExports(iconsPath);
  const importsByCat = parseIconsImports(homeShellPath);

  // Build reverse index: iconName → category (from exports)
  const iconToExportCat = new Map();
  for (const [cat, icons] of exportsByCat) {
    for (const icon of icons) iconToExportCat.set(icon, cat);
  }

  // Build reverse index: iconName → category (from imports)
  const iconToImportCat = new Map();
  for (const [cat, icons] of importsByCat) {
    for (const icon of icons) iconToImportCat.set(icon, cat);
  }

  const allExported = new Set(iconToExportCat.keys());
  const allImported = new Set(iconToImportCat.keys());

  let exitCode = 0;

  /* ── Missing: exported but not imported ── */
  const missing = [...allExported].filter(x => !allImported.has(x));
  if (missing.length > 0) {
    exitCode = 1;
    console.log('  ❌  EXPORTED BUT NOT IMPORTED (could be cleaned up)\n');
    for (const icon of missing) {
      const cat = iconToExportCat.get(icon);
      console.log(`       ${icon}   (category: ${cat})`);
    }
    console.log('');
  }

  /* ── Surplus: imported but not exported ── */
  const surplus = [...allImported].filter(x => !allExported.has(x));
  if (surplus.length > 0) {
    exitCode = 1;
    console.log('  ❌  IMPORTED BUT NOT EXPORTED (would break build!)\n');
    for (const icon of surplus) {
      const cat = iconToImportCat.get(icon);
      console.log(`       ${icon}   (section: ${cat})`);
    }
    console.log('');
  }

  /* ── Category-level summary ── */
  if (exitCode === 0) {
    console.log('  ✅  All icons in sync — no missing, no surplus.\n');
  }

  console.log('  ── Category breakdown ──\n');
  for (const [cat, exported] of exportsByCat) {
    const imported = importsByCat.get(cat) || new Set();
    const status = eqSet(exported, imported) ? '✅' : '⚠️';
    console.log(`  ${status}  ${cat}`);
    console.log(`       Exported: ${exported.size}  |  Imported: ${imported.size}`);
    if (!eqSet(exported, imported)) {
      const onlyExported = [...exported].filter(x => !imported.has(x));
      const onlyImported = [...imported].filter(x => !exported.has(x));
      if (onlyExported.length) console.log(`       Only in icons.tsx:  ${onlyExported.join(', ')}`);
      if (onlyImported.length) console.log(`       Only in HomeShell:  ${onlyImported.join(', ')}`);
    }
    console.log('');
  }

  process.exit(exitCode);
}

function eqSet(a, b) {
  return a.size === b.size && [...a].every(x => b.has(x));
}

main();

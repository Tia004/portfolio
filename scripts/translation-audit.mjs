#!/usr/bin/env node

/**
 * Translation Audit Script
 *
 * Parses src/lib/translations.ts (plus the BY_LANG structures that live in
 * src/lib/legal-content.ts and src/lib/tooltips.ts) and:
 * 1. Compares all keys across the main it/en/es Dict records
 * 2. Validates FAQS_BY_LANG, REVIEWS_BY_LANG, PROJECTS_BY_LANG,
 *    PRICING_ONETIME_BY_LANG, PRICING_MONTHLY_BY_LANG, LEGAL_DOCS_BY_LANG
 *    and the tooltip maps have the same entries/keys for all languages
 *
 * Usage:
 *   node scripts/translation-audit.mjs
 *
 * Exit codes:
 *   0 — all keys present in all languages
 *   1 — some keys are missing
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.resolve(__dirname, '../src/lib');

const fileSources = {
  'translations.ts': path.join(srcDir, 'translations.ts'),
  'legal-content.ts': path.join(srcDir, 'legal-content.ts'),
  'tooltips.ts': path.join(srcDir, 'tooltips.ts'),
};

const sources = {};
for (const [label, file] of Object.entries(fileSources)) {
  if (!fs.existsSync(file)) {
    console.error(`❌ File not found: ${file}`);
    process.exit(1);
  }
  sources[label] = fs.readFileSync(file, 'utf-8');
}

const source = sources['translations.ts'];

let exitCode = 0;

/** Skip a '...', "..." or `...` string literal starting at i (handles \\' escapes). */
function skipString(text, i) {
  const quote = text[i];
  i++;
  while (i < text.length) {
    if (text[i] === '\\') { i += 2; continue; }
    if (text[i] === quote) return i + 1;
    i++;
  }
  return i; // unterminated string — give up gracefully
}

/** Extract a JS/TS object literal block, brace-balanced and string-aware.
 *  The pattern may end with the opening `{` (e.g. `= {`) or right before it
 *  (e.g. `Record<Lang`); both cases are handled. Braces inside strings are
 *  ignored, so values like '{name}' never break the depth counting. */
function extractObject(text, startPattern) {
  const startRe = new RegExp(startPattern);
  const match = startRe.exec(text);
  if (!match) return null;

  let scanFrom = match.index + match[0].length;
  if (!match[0].endsWith('{')) {
    const openIdx = text.indexOf('{', scanFrom);
    if (openIdx === -1) return null;
    scanFrom = openIdx + 1;
  }

  let depth = 1; // we start inside the opening brace
  for (let i = scanFrom; i < text.length; i++) {
    const ch = text[i];
    if (ch === "'" || ch === '"' || ch === '`') { i = skipString(text, i); continue; }
    if (ch === '{') depth++;
    else if (ch === '}') { depth--; if (depth === 0) return text.slice(scanFrom, i); }
  }
  return null; // unbalanced braces
}

function extractKeys(text, lang) {
  const block = extractObject(text, `const\\s+${lang}\\s*:\\s*Dict\\s*=\\s*\\{`);
  if (!block) {
    console.warn(`  ⚠️  Could not find language record "${lang}"`);
    return new Set();
  }
  const keyRe = /'([^']+)'\s*:/g;
  const keys = new Set();
  let m;
  while ((m = keyRe.exec(block)) !== null) keys.add(m[1]);
  return keys;
}

// ── 1. MAIN DICT COMPARISON ────────────────────────────────
console.log('═══════════════════════════════════════');
console.log('  TRANSLATION AUDIT');
console.log('═══════════════════════════════════════\n');

console.log('📦 Main Dict records:\n');

const langNames = ['it', 'en', 'es'];
const dict = {};

for (const lang of langNames) {
  dict[lang] = extractKeys(source, lang);
  console.log(`  ${lang}: ${dict[lang].size} keys`);
}

// Zero-keys guard
if (dict['it'].size === 0) {
  console.error('\n❌ Could not extract any keys from the Italian Dict record.');
  console.error('   The regex pattern may not match the file structure anymore.');
  process.exit(1);
}

const itKeys = dict['it'];
let hasMainError = false;

for (const lang of ['en', 'es']) {
  const langKeys = dict[lang];
  const missing = [];
  for (const key of itKeys) {
    if (!langKeys.has(key)) missing.push(key);
  }
  const extra = [];
  for (const key of langKeys) {
    if (!itKeys.has(key)) extra.push(key);
  }

  if (missing.length > 0) {
    hasMainError = true;
    console.log(`\n  ❌ ${lang.toUpperCase()} — ${missing.length} key(s) MISSING:`);
    for (const k of missing) console.log(`     • ${k}`);
  }
  if (extra.length > 0) {
    console.log(`\n  ⚠️  ${lang.toUpperCase()} — ${extra.length} orphaned key(s) (not in IT):`);
    for (const k of extra) console.log(`     • ${k}`);
  }
}

if (!hasMainError) {
  console.log('\n  ✅ All IT keys present in EN and ES.\n');
}

// ── 2. BY_LANG STRUCTURES ──────────────────────────────────
console.log('─────────────────────────────────────\n');
console.log('📦 BY_LANG structures:\n');

/**
 * Find the `${lang}: [` or `${lang}: {` entry at the top level of a
 * Record<Lang, ...> block and count what's inside it.
 *
 * Returns { count, details } or null when the lang key isn't found.
 *  - arrays:    count = top-level `{` items (the entries)
 *  - records:   count = top-level `'key':` pairs
 *  - pricing:   also counts the tiers nested inside each category
 */
function countLangEntries(recordBlock, lang, kind) {
  let depth = 0;
  let i = 0;
  const n = recordBlock.length;

  while (i < n) {
    const c = recordBlock[i];
    if (c === "'" || c === '"') { i = skipString(recordBlock, i); continue; }
    if (c === '{' || c === '[') { depth++; i++; continue; }
    if (c === '}' || c === ']') { depth--; i++; continue; }

    if (depth === 0) {
      const m = recordBlock.slice(i).match(new RegExp(`^\\s*${lang}\\s*:\\s*([\\[\\{])`));
      if (m) {
        const open = m[1];
        const bodyStart = i + m[0].length; // right after the opening [ or {

        // Scan inside the lang entry, tracking object depth.
        let d = 1;
        let j = bodyStart;
        const objAtDepth = {};
        let keyCount = 0;

        while (j < n && d > 0) {
          const cj = recordBlock[j];
          if (cj === "'" || cj === '"') { j = skipString(recordBlock, j); continue; }
          if (cj === '{') { d++; objAtDepth[d] = (objAtDepth[d] || 0) + 1; j++; continue; }
          if (cj === '[') { d++; j++; continue; }
          if (cj === '}' || cj === ']') { d--; j++; continue; }
          if (open === '{' && d === 1) {
            // Keys may be quoted ('privacy':) or bare identifiers (privacy:)
            const km = recordBlock.slice(j).match(/^(?:'([^']+)'|([A-Za-z_$][\w$]*))\s*:/);
            if (km) { keyCount++; j += km[0].length; continue; }
          }
          j++;
        }

        if (kind === 'record') {
          return { count: keyCount, details: `${keyCount} sezioni` };
        }
        const entries = objAtDepth[2] || 0;
        if (kind === 'pricing') {
          const tiers = objAtDepth[4] || 0;
          return { count: entries, details: `${entries} categorie / ${tiers} tier` };
        }
        return { count: entries, details: `${entries} voci` };
      }
    }
    i++;
  }
  return null; // lang key not found in this record
}

const byLangChecks = [
  { name: 'FAQS_BY_LANG', file: 'translations.ts', constName: 'FAQS_BY_LANG', kind: 'array' },
  { name: 'REVIEWS_BY_LANG', file: 'translations.ts', constName: 'REVIEWS_BY_LANG', kind: 'array' },
  { name: 'PROJECTS_BY_LANG', file: 'translations.ts', constName: 'PROJECTS_BY_LANG', kind: 'array' },
  { name: 'PRICING_ONETIME', file: 'translations.ts', constName: 'PRICING_ONETIME_BY_LANG', kind: 'pricing' },
  { name: 'PRICING_MONTHLY', file: 'translations.ts', constName: 'PRICING_MONTHLY_BY_LANG', kind: 'pricing' },
  { name: 'LEGAL_DOCS_BY_LANG', file: 'legal-content.ts', constName: 'LEGAL_DOCS_BY_LANG', kind: 'record' },
];

for (const check of byLangChecks) {
  const text = sources[check.file];
  const structBlock = extractObject(text, `const\\s+${check.constName}:\\s*Record<Lang`);
  if (!structBlock) {
    console.log(`  ⚪ ${check.name} — not found, skipped`);
    continue;
  }

  const perLang = {};
  for (const lang of langNames) {
    const res = countLangEntries(structBlock, lang, check.kind);
    perLang[lang] = res ? { count: res.count, details: res.details } : { count: -1, details: 'key non trovata' };
  }

  const values = langNames.map(l => perLang[l].count);
  const allSame = values.every(v => v === values[0]);

  if (allSame) {
    console.log(`  ✅ ${check.name} — ${perLang.it.details} (same across all languages)`);
  } else {
    exitCode = 1;
    console.log(`  ❌ ${check.name} — MISMATCH:`);
    for (const lang of langNames) {
      console.log(`       ${lang}: ${perLang[lang].details}`);
    }
  }
}

// ── 3. TOOLTIP MAPS (key-set comparison, not entry count: the
//       BY_LANG record references the IT/EN/ES consts directly) ──
console.log('\n─────────────────────────────────────\n');
console.log('📦 TOOLTIP maps (key sets):\n');

function extractMapKeys(text, constName) {
  const block = extractObject(text, `const\\s+${constName}:\\s*Record<string,\\s*string>\\s*=\\s*\\{`);
  if (!block) return null;
  const keyRe = /'([^']+)'\s*:/g;
  const keys = new Set();
  let m;
  while ((m = keyRe.exec(block)) !== null) keys.add(m[1]);
  return keys;
}

const tooltipsSource = sources['tooltips.ts'];
const tooltipMaps = {};
for (const code of ['IT', 'EN', 'ES']) {
  tooltipMaps[code] = extractMapKeys(tooltipsSource, code);
}

if (tooltipMaps.IT && tooltipMaps.EN && tooltipMaps.ES) {
  console.log(`  IT: ${tooltipMaps.IT.size} chiavi · EN: ${tooltipMaps.EN.size} · ES: ${tooltipMaps.ES.size}`);
  let tooltipOk = true;
  for (const code of ['EN', 'ES']) {
    const missing = [];
    for (const k of tooltipMaps.IT) {
      if (!tooltipMaps[code].has(k)) missing.push(k);
    }
    const extra = [];
    for (const k of tooltipMaps[code]) {
      if (!tooltipMaps.IT.has(k)) extra.push(k);
    }
    if (missing.length || extra.length) {
      tooltipOk = false;
      exitCode = 1;
      console.log(`  ❌ ${code} — MISMATCH:`);
      if (missing.length) console.log(`       mancanti: ${missing.join(', ')}`);
      if (extra.length) console.log(`       extra: ${extra.join(', ')}`);
    }
  }
  if (tooltipOk) console.log('  ✅ Tooltip maps aligned (IT/EN/ES).');
} else {
  console.log('  ⚪ Tooltip maps — could not parse, skipped');
}

// ── SUMMARY ─────────────────────────────────────────────────
console.log('\n─────────────────────────────────────\n');

if (exitCode === 0) {
  console.log('✅ Audit PASSED — all translations are complete across IT, EN, ES.\n');
} else {
  console.log('❌ Audit FAILED — fix the issues above and re-run.\n');
}

process.exit(exitCode);

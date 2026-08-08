#!/usr/bin/env node

/**
 * Translation Audit Script
 *
 * Parses src/lib/translations.ts and:
 * 1. Compares all keys across the main it/en/es Dict records
 * 2. Validates FAQS_BY_LANG, REVIEWS_BY_LANG, PRICING_ONETIME,
 *    PRICING_MONTHLY, LEGAL_DOCS_BY_LANG, TOOLTIP_MAP_BY_LANG
 *    have the same entries/keys for all languages
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
const filePath = path.resolve(__dirname, '../src/lib/translations.ts');

if (!fs.existsSync(filePath)) {
  console.error(`❌ File not found: ${filePath}`);
  process.exit(1);
}

const source = fs.readFileSync(filePath, 'utf-8');

let exitCode = 0;

// ── Utility: extract a JS/TS object literal block ───────────
function extractObject(text, startPattern) {
  const startRe = new RegExp(startPattern);
  const match = startRe.exec(text);
  if (!match) return null;

  let depth = 0;
  let opened = false;
  let startIdx = match.index + match[0].length;

  for (let i = startIdx; i < text.length; i++) {
    const ch = text[i];
    if (ch === '{') {
      depth++;
      opened = true;
    } else if (ch === '}') {
      depth--;
      if (opened && depth === 0) {
        return text.slice(startIdx, i);
      }
    }
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

const byLangChecks = [
  {
    name: 'FAQS_BY_LANG',
    pattern: lang => `const\\s+FAQS_BY_LANG:\\s*Record<Lang,\\s*FaqEntry\\[]>\\s*=\\s*\\{[^}]*${lang}:\\s*\\[`,
    type: 'array',
  },
  {
    name: 'REVIEWS_BY_LANG',
    pattern: lang => `const\\s+REVIEWS_BY_LANG:\\s*Record<Lang,\\s*Review\\[]>\\s*=\\s*\\{[^}]*${lang}:\\s*\\[`,
    type: 'array',
  },
  {
    name: 'PROJECTS_BY_LANG',
    pattern: lang => `const\\s+PROJECTS_BY_LANG:\\s*Record<Lang,\\s*ProjectData\\[]>\\s*=\\s*\\{[^}]*${lang}:\\s*\\[`,
    type: 'array',
  },
  {
    name: 'PRICING_ONETIME',
    pattern: lang => `const\\s+PRICING_ONETIME:\\s*Record<Lang,\\s*PricingTier\\[]>\\s*=\\s*\\{[^}]*${lang}:\\s*\\[`,
    type: 'array',
  },
  {
    name: 'PRICING_MONTHLY',
    pattern: lang => `const\\s+PRICING_MONTHLY:\\s*Record<Lang,\\s*PricingTier\\[]>\\s*=\\s*\\{[^}]*${lang}:\\s*\\[`,
    type: 'array',
  },
  {
    name: 'LEGAL_DOCS_BY_LANG (sections)',
    pattern: lang => `const\\s+LEGAL_DOCS_BY_LANG:\\s*Record<Lang,\\s*Record<string,\\s*LegalDoc>>\\s*=\\s*\\{[^}]*${lang}:\\s*\\{`,
    type: 'record',
  },
  {
    name: 'TOOLTIP_MAP_BY_LANG (keys)',
    pattern: lang => `const\\s+TOOLTIP_MAP_BY_LANG:\\s*Record<Lang,\\s*Record<string,\\s*string>>\\s*=\\s*\\{[^}]*${lang}:\\s*\\{`,
    type: 'record',
  },
];

for (const check of byLangChecks) {
  const counts = {};

  for (const lang of langNames) {
    const block = extractObject(source, check.pattern(lang).replace(/\\s*\\[.*/, '') + '='); // try simpler pattern first
    // Actually let me just count opening [ for arrays or { for records per language
    const fullStart = new RegExp(`const\\s+${check.name.split(' ')[0]}:`);
    const fullMatch = fullStart.exec(source);
    if (!fullMatch) {
      console.log(`  ⚪ ${check.name} — not found, skipped`);
      continue;
    }

    const structBlock = extractObject(source, `const\\s+${check.name.split(' ')[0]}:\\s*Record<Lang`);
    if (!structBlock) {
      console.log(`  ⚪ ${check.name} — could not parse, skipped`);
      continue;
    }

    // Count entries per language by counting commas at the top level
    // For arrays: count number of { } items by counting top-level braces
    // For records: count number of top-level keys
    const langRe = new RegExp(`${lang}\\s*:\\s*(\\[|\\{)`, 'g');
    const langMatch = langRe.exec(structBlock);
    if (!langMatch) {
      counts[lang] = 0;
      continue;
    }

    let langStart = langMatch.index + langMatch[0].length;
    let closing = langMatch[1] === '[' ? ']' : '}';

    let ldepth = 1;
    let li = langStart;
    let entryCount = 0;

    // Count by looking for top-level { or 'key': patterns
    if (closing === ']') {
      // Array: count top-level { }
      for (; li < structBlock.length && ldepth > 0; li++) {
        const c = structBlock[li];
        if (c === '{') { ldepth++; if (ldepth === 2) entryCount++; }
        else if (c === '[') ldepth++;
        else if (c === '}') ldepth--;
        else if (c === ']') { if (closing === ']' && ldepth === 1) break; ldepth--; }
      }
    } else {
      // Record: count 'key': patterns
      const keyRe = /'([^']+)'\s*:/g;
      let km;
      while ((km = keyRe.exec(structBlock.slice(langStart))) !== null) {
        // Check we haven't passed the closing brace
        const relPos = km.index;
        if (structBlock[langStart + relPos] === '}') break;
        entryCount++;
      }
    }

    counts[lang] = entryCount;
  }

  const countEntries = Object.entries(counts);
  if (countEntries.length === 0) continue;

  const values = countEntries.map(([, v]) => v);
  const allSame = values.every(v => v === values[0]);
  const name = check.name.split(' ')[0];
  const desc = check.name.includes('(') ? ` ${check.name.match(/\((.+)\)/)[1]}` : '';

  if (allSame) {
    console.log(`  ✅ ${name}${desc} — ${values[0]} entries (same across all languages)`);
  } else {
    exitCode = 1;
    console.log(`  ❌ ${name}${desc} — MISMATCH:`);
    for (const [lang, count] of countEntries) {
      console.log(`       ${lang}: ${count}`);
    }
  }
}

// ── SUMMARY ─────────────────────────────────────────────────
console.log('\n─────────────────────────────────────\n');

if (exitCode === 0) {
  console.log('✅ Audit PASSED — all translations are complete across IT, EN, ES.\n');
} else {
  console.log('❌ Audit FAILED — fix the issues above and re-run.\n');
}

process.exit(exitCode);

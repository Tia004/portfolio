#!/usr/bin/env node
/**
 * check:shaders — validate that every GLSL template literal in .tsx/.ts files
 * has balanced curly braces. Catches the "missing main() closing brace" class
 * of bugs before they hit the browser's GLSL compiler.
 *
 * Usage:  node scripts/check-shaders.mjs
 *         npm run check:shaders
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SRC = join(ROOT, 'src');

// ── Find all source files ──────────────────────────────────────

function collectFiles(dir) {
  const results = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
      results.push(...collectFiles(full));
    } else if (entry.isFile() && /\.(tsx|ts)$/.test(entry.name)) {
      results.push(full);
    }
  }
  return results;
}

// ── Extract GLSL template literals ─────────────────────────────

function extractGlslBlocks(filePath) {
  const blocks = [];
  const source = readFileSync(filePath, 'utf-8');
  const lines = source.split('\n');

  let inTemplate = false;
  let templateStart = 0;
  let templateLines = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (!inTemplate) {
      const backtickIdx = line.indexOf('`');
      if (backtickIdx < 0) continue;

      const prefix = line.substring(0, backtickIdx).toLowerCase();
      const suffix = line.substring(backtickIdx + 1).toLowerCase();
      const looksLikeGlsl =
        prefix.includes('glsl') ||
        prefix.includes('shader') ||
        suffix.includes('uniform ') ||
        suffix.includes('varying ') ||
        suffix.includes('void main') ||
        suffix.includes('gl_fragcolor') ||
        suffix.includes('gl_position') ||
        suffix.includes('precision ');

      if (!looksLikeGlsl) continue;

      inTemplate = true;
      templateStart = i + 1;
      templateLines = [suffix];

      // Template closes on the same line?
      const closingIdx = suffix.lastIndexOf('`');
      if (closingIdx >= 0) {
        templateLines[0] = suffix.substring(0, closingIdx);
        inTemplate = false;
        blocks.push({ path: relative(ROOT, filePath), line: templateStart, content: templateLines.join('\n') });
        templateLines = [];
      }
    } else {
      const closingIdx = line.lastIndexOf('`');
      if (closingIdx >= 0) {
        templateLines.push(line.substring(0, closingIdx));
        blocks.push({ path: relative(ROOT, filePath), line: templateStart, content: templateLines.join('\n') });
        inTemplate = false;
        templateLines = [];
      } else {
        templateLines.push(line);
      }
    }
  }

  // Unclosed template literal
  if (inTemplate) {
    blocks.push({ path: relative(ROOT, filePath), line: templateStart, content: templateLines.join('\n'), unclosed: true });
  }

  return blocks;
}

// ── Brace balance check (respects GLSL comments) ──────────────

function checkBraceBalance(content) {
  let depth = 0;
  let inBlockComment = false;
  let inLineComment = false;

  for (let i = 0; i < content.length; i++) {
    const ch = content[i];
    const next = content[i + 1] || '';

    if (inLineComment) { if (ch === '\n') inLineComment = false; continue; }
    if (inBlockComment) { if (ch === '*' && next === '/') { inBlockComment = false; i++; } continue; }

    if (ch === '/' && next === '/') { inLineComment = true; i++; continue; }
    if (ch === '/' && next === '*') { inBlockComment = true; i++; continue; }

    if (ch === '{') depth++;
    if (ch === '}') depth--;
  }

  return depth;
}

// ── Main ────────────────────────────────────────────────────────

const files = collectFiles(SRC);
console.log(`\n🔍 GLSL brace balance — checking ${files.length} source files...\n`);

let errors = 0;
let checked = 0;

for (const file of files) {
  const blocks = extractGlslBlocks(file);
  for (const block of blocks) {
    checked++;
    if (block.unclosed) {
      console.log(`  ❌ ${block.path}:${block.line}  unclosed template literal`);
      errors++;
      continue;
    }
    const balance = checkBraceBalance(block.content);
    if (balance !== 0) {
      const msg = balance > 0 ? `${balance} extra {` : `${Math.abs(balance)} extra }`;
      console.log(`  ❌ ${block.path}:${block.line}  ${msg}`);
      errors++;
    }
  }
}

if (errors === 0) {
  console.log(`  ✅ All ${checked} GLSL blocks have balanced braces.\n`);
  process.exit(0);
} else {
  console.log(`\n  ❌ ${errors} error(s) in ${checked} GLSL blocks.\n`);
  process.exit(1);
}

#!/usr/bin/env node
/**
 * check:jsx — count JSX opening/closing tags and fail on imbalance.
 *
 * Catches the "stray </div> that breaks the build" class of bugs before they
 * reach the compiler. It is a heuristic scanner, not a JSX parser: it skips
 * comments, string/template literals and TypeScript generics so it doesn't
 * flag false positives, but `npx tsc --noEmit` remains the source of truth.
 *
 * Usage:  node scripts/check-jsx.mjs
 *         npm run check:jsx
 */

import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
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

// ── Tag scanner ────────────────────────────────────────────────

const WORD = /[A-Za-z0-9_$]/;
const NAME_CHAR = /[A-Za-z0-9._-]/;

// Words after which a `/` starts a regex literal rather than a division.
const REGEX_START_KEYWORDS = new Set([
  'return', 'typeof', 'instanceof', 'in', 'of', 'new', 'delete', 'void',
  'throw', 'case', 'do', 'else', 'yield', 'await',
]);

// Heuristic: is the `/` at `start` the beginning of a regex literal?
// (Best-effort; tsc is the real parser. Regexes that slip through just
// risk a missing open/close pair, which is exactly what tsc catches.)
function isRegexStart(source, start) {
  let k = start - 1;
  while (k >= 0 && /\s/.test(source[k])) k--;
  if (k < 0) return true; // start of file
  const prev = source[k];
  if (WORD.test(prev)) {
    // Could be `return /x/` (regex) or `value / 2` (division).
    let wEnd = k + 1;
    let wStart = k;
    while (wStart >= 0 && WORD.test(source[wStart])) wStart--;
    return REGEX_START_KEYWORDS.has(source.slice(wStart + 1, wEnd));
  }
  // After `)` `]` `}` or a quote it's a division / JSX text (e.g.
  // `{a} / {b}`); after an operator, bracket, comma or colon it's a regex.
  return !/['"`)\]}]/.test(prev);
}

// Skip a regex literal `/.../` (handles escapes and character classes,
// so `[&<>"']` or `[^<]` inside the body don't confuse the scanner).
function skipRegex(source, start) {
  const n = source.length;
  let j = start + 1;
  let inClass = false;
  while (j < n) {
    const ch = source[j];
    if (ch === '\\') { j += 2; continue; }
    if (ch === '[') inClass = true;
    else if (ch === ']') inClass = false;
    else if (ch === '/' && !inClass) return j + 1;
    else if (ch === '\n') return start + 1; // unterminated — bail safely
    j++;
  }
  return n;
}

function analyze(source) {
  const counts = new Map(); // name -> { open, close }
  const fragments = { open: 0, close: 0 };
  const n = source.length;

  const bump = (name, key) => {
    if (!counts.has(name)) counts.set(name, { open: 0, close: 0 });
    counts.get(name)[key]++;
  };

  const readName = (start) => {
    let j = start;
    while (j < n && NAME_CHAR.test(source[j])) j++;
    return { name: source.slice(start, j), end: j };
  };

  const skipString = (start, quote) => {
    let j = start + 1;
    while (j < n) {
      if (source[j] === '\\') { j += 2; continue; }
      if (source[j] === quote) return j + 1;
      // `'` / `"` strings cannot span lines in JS/TS. If we hit a newline
      // before the closing quote it was a stray apostrophe in JSX text
      // (e.g. Italian "L'azienda") — treat it as a single text char.
      if (quote !== '`' && source[j] === '\n') return start + 1;
      j++;
    }
    return start + 1;
  };

  // Scan from `start` to the `>` that closes the tag, respecting quotes,
  // braces and parens inside attributes (so `onClick={() => x}` doesn't end
  // the tag early). A `>` directly after `=` is part of `=>`/`>=`, not the end.
  const scanToTagEnd = (start) => {
    let j = start;
    let brace = 0;
    let paren = 0;
    while (j < n) {
      const c = source[j];
      if (c === '"' || c === "'" || c === '`') { j = skipString(j, c); continue; }
      if (c === '{') brace++;
      if (c === '}') brace--;
      if (c === '(') paren++;
      if (c === ')') paren--;
      if (c === '>' && source[j - 1] !== '=' && brace === 0 && paren === 0) return j;
      j++;
    }
    return j; // unclosed — tsc will flag it anyway
  };

  // A `<Name ... extends/... , ...>` is a TS generic declaration, not JSX.
  // (e.g. `const f = <T extends object>(x: T) => x`)
  const isGenericDecl = (end, tagEnd) => {
    // `<Grid<string> />` — generic JSX instantiation, not a plain tag.
    let s = end;
    while (s < tagEnd && /\s/.test(source[s])) s++;
    if (source[s] === '<') return true;
    let brace = 0;
    let paren = 0;
    for (let j = s; j < tagEnd; j++) {
      const ch = source[j];
      // Skip quoted attribute values so a comma/`extends` inside
      // `data-x="a,b"` can't be mistaken for a generic declaration.
      if (ch === '"' || ch === "'") { j = skipString(j, ch) - 1; continue; }
      if (ch === '{') brace++;
      if (ch === '}') brace--;
      if (ch === '(') paren++;
      if (ch === ')') paren--;
      if (brace !== 0 || paren !== 0) continue;
      if (ch === ',') return true;
      if (source.startsWith('extends', j) && !WORD.test(source[j + 7] || '')) return true;
    }
    return false;
  };

  let i = 0;
  while (i < n) {
    const c = source[i];

    // Line comment (`://` is a URL, e.g. https:// — not a comment)
    if (c === '/' && source[i + 1] === '/' && source[i - 1] !== ':') {
      while (i < n && source[i] !== '\n') i++;
      continue;
    }
    // Block comment
    if (c === '/' && source[i + 1] === '*') {
      i += 2;
      while (i < n && !(source[i] === '*' && source[i + 1] === '/')) i++;
      i += 2;
      continue;
    }
    // String / template literal. A quote directly after a word char is an
    // apostrophe in JSX text ("L'azienda", "dell'anno"), not a string start.
    if (c === '"' || c === "'" || c === '`') {
      const prev = i > 0 ? source[i - 1] : '';
      if (c !== '`' && WORD.test(prev)) { i++; continue; }
      i = skipString(i, c);
      continue;
    }

    // Regex literal — must come AFTER the `//` / `/*` comment checks
    // (a bare `/` here is a regex, e.g. /[&<>"']/ or /<title[^>]*>/).
    if (c === '/') {
      if (isRegexStart(source, i)) {
        i = skipRegex(source, i);
      } else {
        i++;
      }
      continue;
    }

    if (c === '<') {
      // Closing tags are NEVER TypeScript generics, even when directly
      // preceded by text (`sessioni</h4>`, `dato</p>`, `0</span>`).
      if (source[i + 1] === '/') {
        if (source[i + 2] === '>') { fragments.close++; i += 3; continue; }
        const { name, end } = readName(i + 2);
        if (name) {
          bump(name, 'close');
          i = scanToTagEnd(end);
        } else {
          i++;
        }
        continue;
      }

      const prev = i > 0 ? source[i - 1] : '';
      // TypeScript generic (Array<string>, useState<T>...) — not a JSX tag.
      if (WORD.test(prev)) { i++; continue; }

      // Fragment <>
      if (source[i + 1] === '>') { fragments.open++; i += 2; continue; }

      // Opening tag <Name ...>
      const { name, end } = readName(i + 1);
      if (name) {
        const tagEnd = scanToTagEnd(end);
        if (isGenericDecl(end, tagEnd)) { i = tagEnd + 1; continue; }
        // Self-closing <Name ... /> ?
        let k = tagEnd - 1;
        while (k > i && /\s/.test(source[k])) k--;
        const selfClosing = source[k] === '/';
        if (!selfClosing) bump(name, 'open');
        i = tagEnd + 1;
      } else {
        i++;
      }
      continue;
    }
    i++;
  }

  return { counts, fragments };
}

// ── Main ────────────────────────────────────────────────────────

const files = collectFiles(SRC);
console.log(`\n🔍 JSX tag balance — checking ${files.length} source files...\n`);

let errors = 0;

for (const file of files) {
  const source = readFileSync(file, 'utf-8');
  const { counts, fragments } = analyze(source);
  const rel = relative(ROOT, file);

  for (const [name, { open, close }] of counts) {
    if (open !== close) {
      const diff = open - close;
      const msg = diff > 0
        ? `${diff} missing </${name}> (${open} opened, ${close} closed)`
        : `${Math.abs(diff)} extra </${name}> (${open} opened, ${close} closed)`;
      console.log(`  ❌ ${rel}  <${name}>  ${msg}`);
      errors++;
    }
  }
  if (fragments.open !== fragments.close) {
    console.log(`  ❌ ${rel}  <> opened ${fragments.open}×, </> closed ${fragments.close}×`);
    errors++;
  }
}

if (errors === 0) {
  console.log(`  ✅ All JSX tags are balanced.\n`);
  process.exit(0);
} else {
  console.log(`\n  ❌ ${errors} imbalance(s) found. Run \`npx tsc --noEmit\` to locate the exact spot.\n`);
  process.exit(1);
}

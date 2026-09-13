// Node module-resolution hook: maps the tsconfig "@/*" path alias to ./src/*
// so the chat test can import the REAL source modules (chatStore, chat-security)
// with native TypeScript type-stripping, instead of re-implementing their logic.
// Loaded via: node --import ./scripts/alias-hooks.mjs scripts/test-chat.mjs
import { registerHooks } from 'node:module';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Anchor to this hook file's own location, not process.cwd(), so the hook
// works even when node is invoked from a different directory.
const SRC_DIR = new URL('../src/', import.meta.url).href;

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('@/')) {
      const bare = specifier.slice(2); // e.g. "lib/prisma"
      const withExt = bare.endsWith('.ts') || bare.endsWith('.tsx') || bare.endsWith('.js') ? bare : `${bare}.ts`;
      return {
        url: new URL(withExt, SRC_DIR).href,
        shortCircuit: true,
      };
    }
    // A RELATIVE import without an extension ("import { x } from './env'") is
    // legal TypeScript but not legal ESM: Node's resolver refuses to guess the
    // extension, so a module the app compiles happily would fail to load here.
    // Try the TS siblings before handing over, so scripts can import the real
    // source modules instead of re-implementing them.
    if ((specifier.startsWith('./') || specifier.startsWith('../')) && !/\.[A-Za-z]+$/.test(specifier) && context.parentURL) {
      for (const ext of ['.ts', '.tsx', '/index.ts', '/index.tsx']) {
        const candidate = new URL(specifier + ext, context.parentURL);
        if (existsSync(fileURLToPath(candidate))) return { url: candidate.href, shortCircuit: true };
      }
    }
    return nextResolve(specifier, context);
  },
});

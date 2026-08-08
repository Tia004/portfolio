// Node module-resolution hook: maps the tsconfig "@/*" path alias to ./src/*
// so the chat test can import the REAL source modules (chatStore, chat-security)
// with native TypeScript type-stripping, instead of re-implementing their logic.
// Loaded via: node --import ./scripts/alias-hooks.mjs scripts/test-chat.mjs
import { registerHooks } from 'node:module';

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
    return nextResolve(specifier, context);
  },
});

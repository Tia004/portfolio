// Load pure TypeScript modules (no JSX, no runtime deps) from a plain Node
// script, so the verification and preview scripts run the SAME code the server
// does instead of a re-implementation of it.
//
// The project has no bundler on hand (Next ships its own binary compiler), but
// it does have `typescript`, so the modules are transpiled to CommonJS in a
// temp folder and required from there.
import { createRequire } from 'node:module';
import { mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ts = require('typescript');
const OUT_DIR = resolve(ROOT, 'node_modules/.cache/ts-modules');

/**
 * @param {string[]} names module names inside `src/lib` (e.g. 'email-markdown')
 * @returns {Record<string, any>} name → compiled module exports
 */
export function loadTsModules(names) {
  rmSync(OUT_DIR, { recursive: true, force: true });
  mkdirSync(OUT_DIR, { recursive: true });

  const loaded = {};
  for (const name of names) {
    const source = readFileSync(resolve(ROOT, 'src/lib', `${name}.ts`), 'utf8');
    const { outputText } = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
        esModuleInterop: true,
      },
      fileName: `${name}.ts`,
    });
    writeFileSync(resolve(OUT_DIR, `${name}.js`), outputText);
    loaded[name] = require(resolve(OUT_DIR, `${name}.js`));
  }
  return loaded;
}

export { ROOT };

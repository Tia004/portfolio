// Turso credentials for CLI scripts — environment only, never a fallback.
//
// Every script that talks to the database used to carry its own copy of the
// URL and the read-write token, which is how that token ended up in git. This
// module is the single place that resolves them, so a missing credential is
// reported the same way everywhere and nothing is ever invented.
//
//   import { tursoCredentials } from './lib/turso-credentials.mjs';
//   const { url, authToken } = tursoCredentials();
import fs from 'node:fs';
import path from 'node:path';

/** Parse .env without pulling a dependency in. Returns {} when there is none. */
function readDotEnvFile() {
  const envPath = path.join(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) return {};
  const values = {};
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const firstEquals = trimmed.indexOf('=');
    if (firstEquals === -1) continue;
    const key = trimmed.slice(0, firstEquals).trim();
    let value = trimmed.slice(firstEquals + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    values[key] = value;
  }
  return values;
}

let dotEnvCache = null;
function fromDotEnv(key) {
  if (dotEnvCache === null) dotEnvCache = readDotEnvFile();
  return dotEnvCache[key] ?? '';
}

/** process.env wins, .env is the local-development fallback, never a hardcoded value. */
export function envValue(key) {
  const fromProcess = process.env[key];
  if (fromProcess && fromProcess !== 'undefined' && fromProcess.trim() !== '') return fromProcess;
  const fromFile = fromDotEnv(key);
  return fromFile === 'undefined' ? '' : fromFile;
}

/**
 * The Turso connection details ({ url, authToken }), or a clear error and a
 * non-zero exit. Ready to spread straight into createClient().
 */
export function tursoCredentials() {
  const url = envValue('TURSO_DATABASE_URL');
  const authToken = envValue('TURSO_AUTH_TOKEN');

  const missing = [];
  if (!url) missing.push('TURSO_DATABASE_URL');
  if (!authToken) missing.push('TURSO_AUTH_TOKEN');

  if (missing.length > 0) {
    console.error('');
    console.error(`❌ Missing ${missing.join(' and ')}.`);
    console.error('   This script reads credentials from the environment only — there is no fallback value in the code.');
    console.error('');
    console.error('   Local run:  add them to .env in the project root');
    console.error('   Deploy:     add them to the Vercel project environment variables');
    console.error('');
    console.error('   Turso dashboard → your database → Connect gives the libsql:// URL,');
    console.error('   and "Create token" gives the read-write TURSO_AUTH_TOKEN.');
    console.error('');
    process.exit(1);
  }

  return { url, authToken };
}

/**
 * The database host, derived from the configured URL — DNS/diagnostic scripts
 * must never hardcode the host either.
 */
export function tursoHostname() {
  try {
    return new URL(envValue('TURSO_DATABASE_URL')).hostname;
  } catch {
    return '';
  }
}

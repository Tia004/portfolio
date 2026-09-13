import fs from 'fs';
import path from 'path';
import dns from 'dns';

// Force Node.js to prefer IPv4 over IPv6 to resolve ENOTFOUND DNS lookup issues on macOS
try {
  dns.setDefaultResultOrder('ipv4first');
} catch (e) {
  // Silent fallback
}


// Locate and parse .env manually to bypass any workspace root issues
try {
  const envPath = path.join(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    for (const line of envContent.split('\n')) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const firstEquals = trimmed.indexOf('=');
        if (firstEquals !== -1) {
          const key = trimmed.substring(0, firstEquals).trim();
          let val = trimmed.substring(firstEquals + 1).trim();
          // Remove surrounding quotes if any
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.substring(1, val.length - 1);
          }
          if (!process.env[key] || process.env[key] === 'undefined') {
            process.env[key] = val;
          }
        }
      }
    }
  }
} catch (e) {
  // Silent fallback
}

// ── Credentials: environment only, never a value baked into the repo ──────
// These used to have hardcoded fallbacks. That is how a read-write database
// token ended up in git, and it is also why a ROTATED token could keep
// "working": the app quietly fell back to the committed copy instead of
// telling anyone the environment was incomplete. Nothing is invented here any
// more — a missing credential fails with a message that says exactly which
// variable is missing and where to set it.

/** A required value, or an error naming the variable and where it comes from. */
export function requireEnv(name: string, hint?: string): string {
  const value = process.env[name];
  if (!value || value === "undefined" || value.trim() === "") {
    throw new Error(
      `Missing required environment variable ${name}.\n` +
      `Set it in .env for local development and in the Vercel project settings for deployments.` +
      (hint ? `\n${hint}` : "")
    );
  }
  return value;
}

/** True when a value is present — for health checks that must not throw. */
export function hasEnv(name: string): boolean {
  const value = process.env[name];
  return typeof value === "string" && value !== "undefined" && value.trim() !== "";
}

export interface TursoConfig {
  url: string;
  authToken: string;
}

/**
 * Turso credentials. Throws when either half is missing: a half-configured
 * database is never "close enough", and the error must reach the log at the
 * moment something tries to use the database.
 */
export function getTursoConfig(): TursoConfig {
  return {
    url: requireEnv(
      "TURSO_DATABASE_URL",
      "Turso dashboard → your database → Connect → copy the libsql:// URL."
    ),
    authToken: requireEnv(
      "TURSO_AUTH_TOKEN",
      "Turso dashboard → your database → Create token (read-write) → copy it into .env."
    ),
  };
}

/** The same credentials without throwing — undefined when the setup is incomplete. */
export function getTursoConfigOrNull(): TursoConfig | null {
  return hasEnv("TURSO_DATABASE_URL") && hasEnv("TURSO_AUTH_TOKEN")
    ? { url: process.env.TURSO_DATABASE_URL as string, authToken: process.env.TURSO_AUTH_TOKEN as string }
    : null;
}

// Warn at startup if AI keys are missing
if (!process.env.GROQ_API_KEY && !process.env.GEMINI_API_KEY) {
  console.warn("\n⚠️  GROQ_API_KEY e GEMINI_API_KEY non configurate — il chatbot AI restituirà messaggio di fallback.");
  console.warn("   Ottieni GROQ_API_KEY: https://console.groq.com/keys");
  console.warn("   Ottieni GEMINI_API_KEY: https://aistudio.google.com/app/apikey");
  console.warn("   Impostane almeno una in .env per attivare il chatbot AI.\n");
}

// Warn at startup if email (Resend) is not configured
if (!process.env.RESEND_API_KEY) {
  console.warn("\n⚠️  RESEND_API_KEY non configurata — il form contatti restituirà errore 500.");
  console.warn("   Crea un account su https://resend.com e ottieni la API key.");
  console.warn("   Poi impostala in .env: RESEND_API_KEY=\"re_xxxxx\"\n");
}

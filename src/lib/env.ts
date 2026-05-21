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

// Programmatic guarantees for Turso credentials at process level
if (!process.env.DATABASE_URL || process.env.DATABASE_URL === "undefined") {
  process.env.DATABASE_URL = "file:./prisma/dev.db";
}
if (!process.env.TURSO_DATABASE_URL || process.env.TURSO_DATABASE_URL === "undefined") {
  process.env.TURSO_DATABASE_URL = "libsql://portfoliodb-tia004.aws-eu-west-1.turso.io";
}
if (!process.env.TURSO_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN === "undefined") {
  process.env.TURSO_AUTH_TOKEN = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzkzMzU2MzgsImlkIjoiMDE5ZTQ4YWEtZjMwMS03YmExLTg5NmUtNGIwNzkwYjFhMGM0IiwicmlkIjoiZTY2MDc2MzktOTllNS00NzE5LTgwOTUtM2FiNDRiMTg3M2NlIn0.EHhH5KQQqjEWg-sqN230LSjcAT5gJyBLeFBAnvVKthMvy28I5GMeo7idq2se_agilOQj2FLJ2qg62PzIqMCLCg";
}

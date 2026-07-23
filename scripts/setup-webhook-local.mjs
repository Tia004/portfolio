/**
 * setup-webhook-local.mjs
 *
 * Starts an ngrok tunnel to expose localhost, then sets the Telegram
 * webhook to the tunnel URL so you can test the Telegram ↔ site
 * integration without deploying to Vercel.
 *
 * Usage:
 *   npm run webhook-local
 *
 * Requires:
 *   - An .env file with TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID
 *   - The Next.js dev server running on PORT (default 3000)
 *
 * When done, press Ctrl+C to stop ngrok AND remove the webhook
 * (so production webhook isn't overridden).
 */

import { spawn, execSync } from 'child_process';
import { createServer } from 'net';
import fs from 'fs';
import path from 'path';

const PORT = process.env.PORT || '3000';
const LOCAL_URL = `http://localhost:${PORT}`;
const WEBHOOK_PATH = '/api/chat/webhook';

let ngrokProcess = null;
let ngrokUrl = null;

// ── Helpers ────────────────────────────────────────────────

function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

function waitForPort(port, timeout = 15000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    function tryConnect() {
      const sock = createServer();
      sock.on('error', () => {});
      sock.listen(port, () => {
        sock.close(() => {
          if (Date.now() - start > timeout) {
            reject(new Error(`Port ${port} timeout`));
          } else {
            setTimeout(tryConnect, 500);
          }
        });
      });
    }
    const sock = createServer();
    sock.on('error', () => resolve());
    sock.listen(port, () => {
      sock.close();
      tryConnect();
    });
  });
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function getNgrokUrl(retries = 20) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch('http://127.0.0.1:4040/api/tunnels');
      const data = await res.json();
      const tunnel = data.tunnels?.find((t) => t.proto === 'https');
      if (tunnel?.public_url) return tunnel.public_url;
    } catch {}
    await sleep(1000);
  }
  return null;
}

function setWebhook(url) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.error('❌ TELEGRAM_BOT_TOKEN non trovato in .env');
    process.exit(1);
  }
  const webhookUrl = `${url}${WEBHOOK_PATH}`;
  const cmd = `curl -s -X POST "https://api.telegram.org/bot${token}/setWebhook?url=${encodeURIComponent(webhookUrl)}"`;
  console.log(`\n🔗 Setting webhook to: ${webhookUrl}`);
  try {
    const out = execSync(cmd, { encoding: 'utf8' });
    const parsed = JSON.parse(out);
    if (parsed.ok) {
      console.log('✅ Webhook set successfully!');
    } else {
      console.error('❌ Telegram API error:', parsed.description || JSON.stringify(parsed));
      process.exit(1);
    }
  } catch (err) {
    console.error('❌ Failed to set webhook:', err.message);
    process.exit(1);
  }
}

function removeWebhook() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return;
  const cmd = `curl -s -X POST "https://api.telegram.org/bot${token}/deleteWebhook"`;
  try {
    execSync(cmd, { encoding: 'utf8' });
    console.log('\n🧹 Webhook rimosso (deleteWebhook).');
  } catch {
    // Ignore cleanup errors
  }
}

function checkWebhook() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const cmd = `curl -s "https://api.telegram.org/bot${token}/getWebhookInfo"`;
  try {
    const out = execSync(cmd, { encoding: 'utf8' });
    const parsed = JSON.parse(out);
    console.log('\n📡 Webhook Info:');
    console.log(`   URL:     ${parsed.result?.url || 'nessuno'}`);
    console.log(`   In coda: ${parsed.result?.pending_update_count || 0} messaggi`);
  } catch {}
}

// ── Cleanup ────────────────────────────────────────────────

function cleanup() {
  console.log('\n\n🛑 Cleaning up...');
  removeWebhook();
  if (ngrokProcess) {
    ngrokProcess.kill('SIGTERM');
    console.log('🧹 ngrok fermato.');
  }
  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

// ── Main ──────────────────────────────────────────────────

async function main() {
  loadEnv();

  // Check that dev server is running
  console.log(`🔍 Checking if Next.js is running on port ${PORT}...`);
  try {
    await waitForPort(Number(PORT));
  } catch {
    console.error(`❌ Next.js non rilevato sulla porta ${PORT}.`);
    console.error(`   Avvia prima: npm run dev`);
    process.exit(1);
  }
  console.log(`✅ Next.js rilevato su ${LOCAL_URL}`);

  // Start ngrok via npx
  console.log('\n🚇 Avvio ngrok tunnel...');
  console.log('   (Prima esecuzione: npx scarica ngrok — potrebbe richiedere qualche secondo)\n');

  ngrokProcess = spawn('npx', ['--yes', 'ngrok', 'http', PORT, '--log=stdout'], {
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  ngrokProcess.stdout.on('data', (data) => {
    const line = data.toString().trim();
    if (line) console.log(`  [ngrok] ${line}`);
  });

  ngrokProcess.stderr.on('data', (data) => {
    const line = data.toString().trim();
    if (line) console.log(`  [ngrok] ${line}`);
  });

  ngrokProcess.on('error', (err) => {
    console.error('❌ Errore avvio ngrok:', err.message);
    cleanup(); // Remove any stale webhook before exiting
  });

  // Wait for ngrok URL
  ngrokUrl = await getNgrokUrl();
  if (!ngrokUrl) {
    console.error('❌ Impossibile ottenere l\'URL da ngrok.');
    console.error('   Assicurati di avere ngrok installato o accesso a npx.');
    console.error('   Installa: npm install -g ngrok  oppure  brew install ngrok');
    cleanup();
    return;
  }

  console.log(`\n🌐 URL pubblico ngrok: ${ngrokUrl}`);

  // Set Telegram webhook
  setWebhook(ngrokUrl);

  // Show webhook info
  checkWebhook();

  console.log('\n────────────────────────────────────────────────────');
  console.log('✅ Webhook locale attivo!');
  console.log(`   URL: ${ngrokUrl}${WEBHOOK_PATH}`);
  console.log('   Ora:');
  console.log('   1. Apri il sito in un browser su un altro dispositivo');
  console.log('   2. Invia un messaggio dalla chat fluttuante');
  console.log('   3. Rispondi su Telegram — la risposta arriverà via SSE');
  console.log('────────────────────────────────────────────────────');
  console.log('\n⚠️  Premi Ctrl+C per fermare ngrok e rimuovere il webhook.\n');

  // Keep running until Ctrl+C
  await new Promise(() => {});
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});

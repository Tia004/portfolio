import { createClient, type Client } from '@libsql/client';

let client: Client | null = null;
let initialized: Promise<Client> | null = null;

export function getServerDb(): Promise<Client> {
  if (initialized) return initialized;
  initialized = (async () => {
    const rawUrl = (process.env.TURSO_DATABASE_URL || '').trim();
    const url = rawUrl || (process.env.NODE_ENV === 'development' || !process.env.VERCEL ? 'file:data/commercial.sqlite' : '');
    const authToken = (process.env.TURSO_AUTH_TOKEN || '').trim() || undefined;
    if (!url) throw new Error('Database non configurato: imposta TURSO_DATABASE_URL e TURSO_AUTH_TOKEN.');
    client = createClient({ url, authToken });
    await client.execute('CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, name TEXT NOT NULL, company TEXT, role TEXT, password_hash TEXT NOT NULL, created_at TEXT NOT NULL)');
    const userColumns = (await client.execute('PRAGMA table_info(users)')).rows.map((row) => String(row.name));
    if (!userColumns.includes('workspace_id')) await client.execute('ALTER TABLE users ADD COLUMN workspace_id TEXT');
    if (!userColumns.includes('email_verified')) await client.execute('ALTER TABLE users ADD COLUMN email_verified INTEGER NOT NULL DEFAULT 1');
    await client.execute("UPDATE users SET email_verified = 1 WHERE email IN ('tiachinaglia@gmail.com', 'info@tiadesigns.it')");
    await client.execute('CREATE TABLE IF NOT EXISTS workspaces (id TEXT PRIMARY KEY, name TEXT NOT NULL, created_at TEXT NOT NULL)');
    const legacyUsers = await client.execute('SELECT id, company, name FROM users WHERE workspace_id IS NULL');
    for (const user of legacyUsers.rows) {
      await client.execute({ sql: 'INSERT OR IGNORE INTO workspaces(id,name,created_at) VALUES (?,?,?)', args: [String(user.id), String(user.company || user.name || 'Workspace'), new Date().toISOString()] });
      await client.execute({ sql: 'UPDATE users SET workspace_id = ?, role = ? WHERE id = ?', args: [String(user.id), 'owner', String(user.id)] });
    }
    await client.execute('CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL, expires_at TEXT NOT NULL)');
    await client.execute('CREATE TABLE IF NOT EXISTS crm_data (user_id TEXT PRIMARY KEY, payload TEXT NOT NULL, updated_at TEXT NOT NULL)');
    const crmColumns = (await client.execute('PRAGMA table_info(crm_data)')).rows.map((row) => String(row.name));
    if (!crmColumns.includes('revision')) await client.execute('ALTER TABLE crm_data ADD COLUMN revision INTEGER NOT NULL DEFAULT 0');
    await client.execute('CREATE TABLE IF NOT EXISTS login_attempts (email TEXT PRIMARY KEY, failures INTEGER NOT NULL, window_started_at TEXT NOT NULL)');
    await client.execute('CREATE TABLE IF NOT EXISTS auth_tokens (token_hash TEXT PRIMARY KEY, purpose TEXT NOT NULL, email TEXT NOT NULL, user_id TEXT, workspace_id TEXT, role TEXT, expires_at TEXT NOT NULL, used_at TEXT)');
    await client.execute('CREATE TABLE IF NOT EXISTS passkeys (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, name TEXT NOT NULL, public_key TEXT NOT NULL, counter INTEGER NOT NULL, transports TEXT NOT NULL, device_type TEXT NOT NULL, backed_up INTEGER NOT NULL, created_at TEXT NOT NULL)');
    await client.execute('CREATE TABLE IF NOT EXISTS webauthn_challenges (key TEXT PRIMARY KEY, challenge TEXT NOT NULL, expires_at TEXT NOT NULL)');
    await client.execute('CREATE TABLE IF NOT EXISTS ip_rate_limits (key TEXT PRIMARY KEY, count INTEGER NOT NULL, window_started_at TEXT NOT NULL)');
    return client;
  })().catch((error) => { initialized = null; throw error; });
  return initialized;
}

export function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp.trim();
  return '127.0.0.1';
}

export async function checkRateLimit(db: Client, ip: string, action: string, maxAttempts = 5, windowMinutes = 60): Promise<boolean> {
  const windowMs = windowMinutes * 60 * 1000;
  const now = Date.now();
  const key = `${ip}:${action}`;
  const res = await db.execute({ sql: 'SELECT count, window_started_at FROM ip_rate_limits WHERE key = ?', args: [key] });
  if (res.rows.length) {
    const started = Date.parse(String(res.rows[0].window_started_at));
    const count = Number(res.rows[0].count);
    if (now - started < windowMs) {
      if (count >= maxAttempts) return false;
      await db.execute({ sql: 'UPDATE ip_rate_limits SET count = count + 1 WHERE key = ?', args: [key] });
      return true;
    }
  }
  await db.execute({
    sql: 'INSERT INTO ip_rate_limits (key, count, window_started_at) VALUES (?, 1, ?) ON CONFLICT(key) DO UPDATE SET count = 1, window_started_at = ?',
    args: [key, new Date().toISOString(), new Date().toISOString()]
  });
  return true;
}

export async function purgeExpiredUnverifiedAccounts(db: Client) {
  try {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    await db.execute({ sql: 'DELETE FROM auth_tokens WHERE expires_at < ?', args: [new Date().toISOString()] });
    await db.execute({ sql: 'DELETE FROM users WHERE email_verified = 0 AND created_at < ?', args: [cutoff] });
  } catch (e) {
    console.warn('Purge skipped:', e);
  }
}

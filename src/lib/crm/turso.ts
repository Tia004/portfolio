import { createClient, Client } from '@libsql/client';

let tursoClient: Client | null = null;

export function getTursoClient(url?: string, authToken?: string): Client | null {
  const dbUrl = url || process.env.TURSO_DATABASE_URL;
  const token = authToken || process.env.TURSO_AUTH_TOKEN;

  if (!dbUrl) return null;

  try {
    return createClient({
      url: dbUrl,
      authToken: token,
    });
  } catch (err) {
    console.error('Failed to create Turso client:', err);
    return null;
  }
}

export async function testTursoConnection(url: string, authToken: string): Promise<{ success: boolean; latencyMs: number; error?: string }> {
  const startTime = Date.now();
  try {
    const client = createClient({ url, authToken });
    await client.execute('SELECT 1 as ping');
    const latencyMs = Date.now() - startTime;
    return { success: true, latencyMs };
  } catch (err: any) {
    return { success: false, latencyMs: Date.now() - startTime, error: err.message || 'Connessione fallita' };
  }
}

export async function initTursoSchema(client: Client): Promise<void> {
  await client.execute(`
    CREATE TABLE IF NOT EXISTS opportunities (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      company TEXT NOT NULL,
      brand TEXT NOT NULL,
      service TEXT NOT NULL,
      leadSource TEXT,
      salesRep TEXT,
      phone TEXT,
      whatsapp TEXT,
      email TEXT,
      value REAL,
      valueType TEXT,
      entryDate TEXT,
      stage TEXT,
      notes TEXT,
      nextAction TEXT,
      history TEXT,
      standbyReason TEXT,
      standbyReactivationDate TEXT,
      updatedAt TEXT
    );
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      dealId TEXT,
      title TEXT NOT NULL,
      client TEXT,
      brand TEXT,
      assignedTo TEXT,
      type TEXT,
      priority TEXT,
      date TEXT,
      time TEXT,
      status TEXT,
      description TEXT
    );
  `);
}

import { randomUUID } from 'node:crypto';
import type { Client } from '@libsql/client';

export const OUTREACH_INTERVAL_MS = 30_000;
export const OUTREACH_DAILY_LIMIT = 150; // Application ceiling, not a provider allowance.
export const OUTREACH_SCHEMA = [
  `CREATE TABLE IF NOT EXISTS OutreachDispatch (id TEXT PRIMARY KEY, email TEXT NOT NULL, attempt TEXT NOT NULL, state TEXT NOT NULL, createdAt INTEGER NOT NULL, messageId TEXT)`,
  `CREATE INDEX IF NOT EXISTS OutreachDispatch_createdAt_idx ON OutreachDispatch(createdAt)`,
  `CREATE TABLE IF NOT EXISTS OutreachThrottle (id TEXT PRIMARY KEY, nextAt INTEGER NOT NULL)`,
];
export type Admission = { ok: true; id: string; attempt: string } | { ok: false; status: number; error: string; retryAfter?: number; uncertain?: boolean };

/** A write transaction serializes independent tabs and serverless instances. */
export function outreachStore(client: Client) {
  let initialized: Promise<void> | undefined;
  const init = () => initialized ||= (async () => {
    for (const sql of OUTREACH_SCHEMA) await client.execute(sql);
  })().catch(error => { initialized = undefined; throw error; });
  return {
    async blocked() {
      await init();
      const rows = await client.execute("SELECT email,state FROM OutreachDispatch WHERE state IN ('pending','unknown','accepted')");
      return rows.rows.map(row => ({ email: String(row.email), state: String(row.state) }));
    },
    async releaseAccepted(email: string) {
      await init();
      const tx = await client.transaction('write');
      try {
        const rows = await tx.execute({ sql: "SELECT id,state FROM OutreachDispatch WHERE email=? AND state IN ('pending','unknown','accepted')", args: [email] });
        if (rows.rows.some(row => row.state !== 'accepted')) return false;
        for (const row of rows.rows) {
          // Keep the attempt in daily accounting even when re-contact is explicit.
          await tx.execute({ sql: "UPDATE OutreachDispatch SET id=?,state='released' WHERE id=? AND state='accepted'", args: [`released:${randomUUID()}`,String(row.id)] });
        }
        await tx.commit();
        return true;
      } finally {
        if (!tx.closed) await tx.rollback();
        tx.close();
      }
    },
    async reserve(email: string, requestId: string, exempt: boolean, now = Date.now()): Promise<Admission> {
      await init();
      const tx = await client.transaction('write');
      try {
        const id = exempt ? `${email}:${requestId}` : email;
        const prior = await tx.execute({ sql: 'SELECT state FROM OutreachDispatch WHERE id = ?', args: [id] });
        if (prior.rows.length) return { ok: false, status: 409, error: 'Invio già registrato o in corso. Verifica lo storico prima di ripetere.', uncertain: prior.rows[0].state !== 'accepted' };
        if (!exempt) {
          const old = await tx.execute({ sql: 'SELECT id FROM SentEmailLog WHERE email = ? LIMIT 1', args: [email] });
          if (old.rows.length) return { ok: false, status: 409, error: 'Destinatario già presente nello storico invii.' };
        }
        const count = await tx.execute({ sql: 'SELECT COUNT(*) AS total FROM OutreachDispatch WHERE createdAt > ?', args: [now - 86_400_000] });
        if (Number(count.rows[0].total) >= OUTREACH_DAILY_LIMIT) return { ok: false, status: 429, error: 'Limite prudenziale del sito raggiunto (150 tentativi in 24 ore). Campagna fermata; verifica il servizio adatto agli invii multipli.' };
        const slot = await tx.execute("SELECT nextAt FROM OutreachThrottle WHERE id = 'aruba'");
        const next = Number(slot.rows[0]?.nextAt || 0);
        if (next > now) return { ok: false, status: 429, retryAfter: Math.ceil((next - now) / 1000), error: 'Attendi il prossimo intervallo di invio. Nessuna email inviata per questa richiesta.' };
        const attempt = randomUUID();
        await tx.execute({ sql: 'INSERT INTO OutreachDispatch (id,email,attempt,state,createdAt) VALUES (?,?,?,?,?)', args: [id,email,attempt,'pending',now] });
        await tx.execute({ sql: "INSERT INTO OutreachThrottle (id,nextAt) VALUES ('aruba',?) ON CONFLICT(id) DO UPDATE SET nextAt=excluded.nextAt", args: [now + OUTREACH_INTERVAL_MS] });
        await tx.commit();
        return { ok: true, id, attempt };
      } finally {
        if (!tx.closed) await tx.rollback();
        tx.close();
      }
    },
    async settle(ticket: { id: string; attempt: string }, state: 'accepted' | 'unknown' | 'rejected', messageId?: string) {
      if (state === 'rejected') {
        const changed = await client.execute({ sql: "UPDATE OutreachDispatch SET id=?,state='rejected' WHERE id=? AND attempt=? AND state='pending'", args: [`rejected:${randomUUID()}`,ticket.id,ticket.attempt] });
        if (changed.rowsAffected !== 1) throw new Error('Rifiuto SMTP non registrato');
      } else {
        const changed = await client.execute({ sql: "UPDATE OutreachDispatch SET state=?,messageId=? WHERE id=? AND attempt=? AND state='pending'", args: [state,messageId || null,ticket.id,ticket.attempt] });
        if (changed.rowsAffected !== 1) throw new Error('Ricevuta invio non registrata');
      }
    },
  };
}

/** Only explicit SMTP refusals prove no acceptance; disconnect/timeouts are unknown. */
export function isExplicitSmtpRejection(error: unknown): boolean {
  const value = error as { responseCode?: number } | null;
  return Number.isInteger(value?.responseCode) && Number(value?.responseCode) >= 400 && Number(value?.responseCode) <= 599;
}

export async function deliverOutreach(
  store: ReturnType<typeof outreachStore>,
  input: { email: string; requestId: string; exempt: boolean },
  send: () => Promise<{ success: boolean; messageId?: string; sentCopySaved?: boolean }>,
  now = Date.now(),
) {
  const admission = await store.reserve(input.email,input.requestId,input.exempt,now);
  if (!admission.ok) return admission;
  let receipt;
  try { receipt = await send(); }
  catch (error) {
    const rejected = isExplicitSmtpRejection(error);
    try { await store.settle(admission,rejected ? 'rejected' : 'unknown'); } catch { /* Pending remains a replay barrier. */ }
    return { ok: false as const, status: 502, uncertain: !rejected, error: rejected ? 'Il server SMTP ha rifiutato il messaggio. Campagna fermata: verifica il motivo prima di riprovare.' : 'Esito SMTP incerto. Campagna fermata: controlla Posta inviata prima di ripetere.' };
  }
  if (!receipt.success) {
    await store.settle(admission,'unknown',receipt.messageId);
    return { ok: false as const, status: 502, uncertain: true, error: 'Accettazione SMTP non confermata. Non ripetere automaticamente.' };
  }
  try { await store.settle(admission,'accepted',receipt.messageId); }
  catch { return { ok: false as const, status: 503, uncertain: true, error: 'SMTP ha accettato il messaggio, ma lo storico non è stato confermato. Non ripetere.' }; }
  return { ok: true as const, messageId: receipt.messageId, sentCopySaved: receipt.sentCopySaved === true };
}

/**
 * Hybrid chat message store.
 *
 * Primary backend: Prisma / Turso (persistente su cloud).
 * Fallback: in-memory Map (quando il DB è offline — locale senza Turso,
 * token scaduto, cold start, ecc.).
 *
 * Il fallback è trasparente: i chiamanti non devono sapere quale backend
 * è in uso. I messaggi in-memory si perdono al restart del server.
 */

import { prisma } from '@/lib/prisma';

export interface ChatMessage {
  id: number;
  text: string;
  sender: 'client' | 'tia';
  timestamp: number;
}

// ── In-memory fallback (mirror dell'originale chatStore) ──
const memoryStore = new Map<string, ChatMessage[]>();
let memoryNextId = 1;
let dbAvailable: boolean | null = null; // null = non testato, true/false = dopo primo tentativo
let dbRetryAt = 0; // timestamp Unix ms per riprovare il DB

/** Se il DB è marcato come non disponibile da più di 30s, lo riprova. */
function shouldRetryDb(): boolean {
  return dbAvailable === false && Date.now() > dbRetryAt;
}

export async function addMessage(sessionId: string, msg: Omit<ChatMessage, 'id'>) {
  // Tentativo DB (se disponibile o se è ora di riprovare)
  if (dbAvailable !== false || shouldRetryDb()) {
    try {
      await prisma.chatMessage.create({
        data: {
          sessionId,
          text: msg.text,
          sender: msg.sender,
          timestamp: BigInt(msg.timestamp),
        },
      });
      dbAvailable = true;
      return; // ✅ Salvato su DB
    } catch (err) {
      dbAvailable = false;
      dbRetryAt = Date.now() + 30_000; // riprova tra 30s
      console.warn('[chatStore] DB non raggiungibile, passo a fallback in-memory:',
        err instanceof Error ? err.message : err);
    }
  }

  // Fallback in-memory
  const entry: ChatMessage = {
    id: memoryNextId++,
    text: msg.text,
    sender: msg.sender,
    timestamp: msg.timestamp,
  };
  if (!memoryStore.has(sessionId)) {
    memoryStore.set(sessionId, []);
  }
  memoryStore.get(sessionId)!.push(entry);
}

/** Returns Tia's messages for this session posted after `since` (Unix ms). */
export async function getTiaMessagesSince(sessionId: string, since: number): Promise<ChatMessage[]> {
  // Tentativo DB (se disponibile o se è ora di riprovare)
  if (dbAvailable !== false || shouldRetryDb()) {
    try {
      const rows = await prisma.chatMessage.findMany({
        where: {
          sessionId,
          sender: 'tia',
          timestamp: { gt: BigInt(since) },
        },
        orderBy: { timestamp: 'asc' },
      });
      dbAvailable = true;
      return rows.map((r) => ({
        id: r.id,
        text: r.text,
        sender: 'tia' as const,
        timestamp: Number(r.timestamp),
      }));
    } catch (err) {
      dbAvailable = false;
      dbRetryAt = Date.now() + 30_000;
      console.warn('[chatStore] DB non raggiungibile in getTiaMessagesSince, uso fallback in-memory:',
        err instanceof Error ? err.message : err);
    }
  }

  // Fallback in-memory
  const msgs = memoryStore.get(sessionId) || [];
  return msgs.filter((m) => m.sender === 'tia' && m.timestamp > since);
}

/**
 * Chat analytics store (in-memory).
 * In production, replace with a persistent store (Turso/Postgres/Redis).
 */

export interface ChatAnalyticsEvent {
  id: number;
  sessionId: string;
  event: 'chat_open' | 'chat_close' | 'message_sent' | 'ai_response';
  text?: string;
  wordCount?: number;
  timestamp: number;
}

let nextId = 1;
const events: ChatAnalyticsEvent[] = [];

export function logEvent(event: Omit<ChatAnalyticsEvent, 'id'>): number {
  const id = nextId++;
  events.push({ ...event, id });
  return id;
}

export interface AnalyticsStats {
  totalChats: number;
  totalMessages: number;
  uniqueSessions: number;
  topQuestions: { text: string; count: number }[];
  avgWordsPerMessage: number;
  botResponseRate: number;
}

export function getStats(): AnalyticsStats {
  const chatOpens = events.filter((e) => e.event === 'chat_open');
  const messages = events.filter((e) => e.event === 'message_sent');
  const responses = events.filter((e) => e.event === 'ai_response');
  const uniqueSessions = new Set(events.map((e) => e.sessionId));

  // Count word frequency from messages
  const wordFreq = new Map<string, number>();
  for (const m of messages) {
    if (m.text) {
      const words = m.text
        .toLowerCase()
        .replace(/[^a-z0-9àèéìòù\s]/g, '')
        .split(/\s+/)
        .filter((w) => w.length > 2 && !w.startsWith('http'));
      for (const w of words) {
        wordFreq.set(w, (wordFreq.get(w) || 0) + 1);
      }
    }
  }

  // Build top questions (full message text, grouped)
  const questionFreq = new Map<string, number>();
  for (const m of messages) {
    if (m.text) {
      const q = m.text.trim().toLowerCase();
      questionFreq.set(q, (questionFreq.get(q) || 0) + 1);
    }
  }
  const topQuestions = [...questionFreq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([text, count]) => ({ text, count }));

  const totalWords = messages.reduce((sum, m) => sum + (m.wordCount || 0), 0);

  return {
    totalChats: chatOpens.length,
    totalMessages: messages.length,
    uniqueSessions: uniqueSessions.size,
    topQuestions,
    avgWordsPerMessage: messages.length > 0 ? Math.round(totalWords / messages.length) : 0,
    botResponseRate: messages.length > 0 ? Math.round((responses.length / messages.length) * 100) : 0,
  };
}

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.username !== 'master') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const channel = searchParams.get('channel');

    if (sessionId) {
      if (!/^[0-9a-f-]{36}$/i.test(sessionId) || (channel !== 'ai' && channel !== 'telegram')) {
        return NextResponse.json({ error: 'Sessione non valida' }, { status: 400 });
      }
      const messages = channel === 'ai'
        ? (await prisma.aiChatMessage.findMany({ where: { sessionId }, orderBy: { createdAt: 'asc' }, take: 300 })).map((m) => ({
            id: m.id, text: m.text, sender: m.role === 'assistant' ? 'bot' : 'client', timestamp: new Date(m.createdAt).getTime(),
          }))
        : (await prisma.chatMessage.findMany({ where: { sessionId }, orderBy: { timestamp: 'asc' }, take: 300 })).map((m) => ({
            id: String(m.id), text: m.text, sender: m.sender, timestamp: Number(m.timestamp),
          }));
      const lead = await prisma.chatSessionLead.findUnique({
        where: { sessionId },
      });
      return NextResponse.json({
        messages,
        lead,
      }, { headers: { 'Cache-Control': 'no-store' } });
    }

    // Get recent chat messages to summarize sessions
    const rawMessages = await prisma.chatMessage.findMany({
      orderBy: { timestamp: 'desc' },
      take: 200,
    });

    const aiMessages = await prisma.aiChatMessage.findMany({ orderBy: { createdAt: 'desc' }, take: 300 });
    const sessionMap = new Map<string, { sessionId: string; channel: string; lastMessage: string; sender: string; timestamp: number; count: number }>();

    for (const msg of rawMessages) {
      const ts = Number(msg.timestamp);
      const key = `telegram:${msg.sessionId}`;
      if (!sessionMap.has(key)) {
        sessionMap.set(key, {
          sessionId: msg.sessionId,
          channel: 'telegram',
          lastMessage: msg.text,
          sender: msg.sender,
          timestamp: ts,
          count: 1,
        });
      } else {
        const item = sessionMap.get(key)!;
        item.count += 1;
      }
    }
    for (const msg of aiMessages) {
      const key = `ai:${msg.sessionId}`;
      if (!sessionMap.has(key)) {
        sessionMap.set(key, { sessionId: msg.sessionId, channel: 'ai', lastMessage: msg.text,
          sender: msg.role, timestamp: new Date(msg.createdAt).getTime(), count: 1 });
      } else {
        sessionMap.get(key)!.count += 1;
      }
    }

    const leads = await prisma.chatSessionLead.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return NextResponse.json({
      sessions: Array.from(sessionMap.values()).sort((a, b) => b.timestamp - a.timestamp),
      leads,
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error: unknown) {
    console.error('Error fetching chats:', error);
    return NextResponse.json({ error: 'Archivio non disponibile' }, { status: 500 });
  }
}

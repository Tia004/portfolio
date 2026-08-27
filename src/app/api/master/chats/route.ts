import { NextRequest, NextResponse } from 'next/server';
import { prisma, getDatabaseErrorMessage } from '@/lib/prisma';
import { getSession } from '@/lib/session';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.username !== 'master') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (sessionId) {
      const messages = await prisma.chatMessage.findMany({
        where: { sessionId },
        orderBy: { timestamp: 'asc' },
      });
      const lead = await prisma.chatSessionLead.findUnique({
        where: { sessionId },
      });
      return NextResponse.json({
        messages: messages.map((m: any) => ({
          ...m,
          timestamp: Number(m.timestamp),
        })),
        lead,
      });
    }

    // Get recent chat messages to summarize sessions
    const rawMessages = await prisma.chatMessage.findMany({
      orderBy: { timestamp: 'desc' },
      take: 200,
    });

    const sessionMap = new Map<string, { sessionId: string; lastMessage: string; sender: string; timestamp: number; count: number }>();

    for (const msg of rawMessages) {
      const ts = Number(msg.timestamp);
      if (!sessionMap.has(msg.sessionId)) {
        sessionMap.set(msg.sessionId, {
          sessionId: msg.sessionId,
          lastMessage: msg.text,
          sender: msg.sender,
          timestamp: ts,
          count: 1,
        });
      } else {
        const item = sessionMap.get(msg.sessionId)!;
        item.count += 1;
      }
    }

    const leads = await prisma.chatSessionLead.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return NextResponse.json({
      sessions: Array.from(sessionMap.values()),
      leads,
    });
  } catch (error: any) {
    console.error('Error fetching chats:', error);
    return NextResponse.json({ error: getDatabaseErrorMessage(error) }, { status: 500 });
  }
}

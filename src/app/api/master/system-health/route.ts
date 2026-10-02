import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';

export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.username !== 'master') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const startTime = Date.now();
    let dbStatus = 'healthy';
    let dbLatencyMs = 0;

    try {
      await prisma.$queryRaw`SELECT 1`;
      dbLatencyMs = Date.now() - startTime;
    } catch {
      dbStatus = 'degraded';
    }

    const resendConfigured = Boolean(process.env.RESEND_API_KEY && process.env.RESEND_API_KEY.startsWith('re_'));
    const smtpConfigured = Boolean(process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS);
    const sessionSecretConfigured = Boolean(process.env.SESSION_SECRET && process.env.SESSION_SECRET.length >= 32);
    const turnstileConfigured = Boolean(process.env.TURNSTILE_SECRET_KEY);

    const [projectCount, messageCount, chatCount, aiChatCount, leadCount, eventCount, quoteCount, recentLogs] = await Promise.all([
      prisma.project.count(), prisma.contactMessage.count(), prisma.chatMessage.count(),
      prisma.aiChatMessage.count(), prisma.chatSessionLead.count(), prisma.analyticsEvent.count(),
      prisma.quote.count(), prisma.systemLog.findMany({ orderBy: { timestamp: 'desc' }, take: 20 }),
    ]);

    // Speed Insights / CrUX Core Web Vitals query if CRUX_API_KEY is present
    const speedInsights = {
      source: 'Nessuna misura raccolta da questo endpoint',
      origin: process.env.SITE_ORIGIN || 'https://tiadesigns.it',
      available: false,
      metrics: null,
      performanceScore: null,
    };

    return NextResponse.json({
      status: dbStatus === 'healthy' ? 'operational' : 'attention_needed',
      timestamp: new Date().toISOString(),
      database: {
        status: dbStatus,
        latencyMs: dbLatencyMs,
        provider: 'Turso LibSQL (AWS EU-West-1)',
      },
      speedInsights,
      services: {
        email: {
          resend: resendConfigured ? 'configured' : 'missing',
          smtp: smtpConfigured ? 'configured' : 'missing',
        },
        security: {
          sessionSecret: sessionSecretConfigured ? 'active' : 'missing',
          turnstile: turnstileConfigured ? 'configured' : 'missing',
        },
      },
      counts: {
        projects: projectCount,
        messages: messageCount,
        chatMessages: chatCount,
        aiChatMessages: aiChatCount,
        leads: leadCount,
        quotes: quoteCount,
        analyticsEvents: eventCount,
      },
      logs: recentLogs,
    });
  } catch (error: unknown) {
    console.error('Error checking system health:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

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
    } catch (e) {
      dbStatus = 'degraded';
    }

    const resendConfigured = Boolean(process.env.RESEND_API_KEY && process.env.RESEND_API_KEY.startsWith('re_'));
    const smtpConfigured = Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
    const sessionSecretConfigured = Boolean(process.env.SESSION_SECRET);
    const turnstileConfigured = Boolean(process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY);

    const projectCount = await prisma.project.count();
    const messageCount = await prisma.contactMessage.count();
    const chatCount = await prisma.chatMessage.count();
    const eventCount = await prisma.analyticsEvent.count();

    const recentLogs = await prisma.systemLog.findMany({
      orderBy: { timestamp: 'desc' },
      take: 20,
    });

    return NextResponse.json({
      status: dbStatus === 'healthy' ? 'operational' : 'attention_needed',
      timestamp: new Date().toISOString(),
      database: {
        status: dbStatus,
        latencyMs: dbLatencyMs,
      },
      services: {
        email: {
          resend: resendConfigured ? 'configured' : 'missing_api_key',
          smtp: smtpConfigured ? 'configured' : 'not_configured',
        },
        security: {
          sessionSecret: sessionSecretConfigured ? 'active' : 'using_fallback',
          turnstile: turnstileConfigured ? 'configured' : 'disabled',
        },
      },
      counts: {
        projects: projectCount,
        messages: messageCount,
        chatMessages: chatCount,
        analyticsEvents: eventCount,
      },
      logs: recentLogs,
    });
  } catch (error: any) {
    console.error('Error checking system health:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

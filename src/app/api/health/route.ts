import { NextResponse } from 'next/server';
import { prisma, getDatabaseErrorMessage } from '@/lib/prisma';
import { getAvailability } from '@/lib/availability';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime_seconds: number;
  services: {
    database: {
      status: 'ok' | 'error';
      latency_ms: number;
      error?: string;
    };
    ai: {
      status: 'ok' | 'missing';
      providers: string[];
    };
    availability: {
      isOnline: boolean;
      updatedAt: string;
    };
  };
}

export async function GET() {
  try {
  const checks: HealthStatus['services'] = {
    database: { status: 'error', latency_ms: 0 },
    ai: { status: 'missing', providers: [] },
    availability: { isOnline: false, updatedAt: new Date().toISOString() },
  };

  // ── Database check ──────────────────────────────────────────
  const dbStart = performance.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database.status = 'ok';
  } catch (err) {
    checks.database.error = getDatabaseErrorMessage(err);
  }
  checks.database.latency_ms = Math.round(performance.now() - dbStart);

  // ── AI API keys check ───────────────────────────────────────
  const aiProviders: string[] = [];
  if (process.env.GROQ_API_KEY) aiProviders.push('groq');
  if (process.env.GEMINI_API_KEY) aiProviders.push('gemini');
  checks.ai = {
    status: aiProviders.length > 0 ? 'ok' : 'missing',
    providers: aiProviders,
  };

  // ── Availability check ──────────────────────────────────────
  const availability = await getAvailability();
  checks.availability = {
    isOnline: availability.isOnline,
    updatedAt: availability.updatedAt.toISOString(),
  };

  // ── Aggregate status ────────────────────────────────────────
  const dbHealthy = checks.database.status === 'ok';
  const aiHealthy = checks.ai.status === 'ok';
  const overall: HealthStatus['status'] = dbHealthy && aiHealthy
    ? 'healthy'
    : dbHealthy || aiHealthy
      ? 'degraded'
      : 'unhealthy';

  const body: HealthStatus = {
    status: overall,
    timestamp: new Date().toISOString(),
    uptime_seconds: Math.round(process.uptime()),
    services: checks,
  };

  const statusCode = overall === 'healthy' ? 200 : overall === 'degraded' ? 200 : 503;

  return NextResponse.json(body, {
    status: statusCode,
    headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' },
  });
  } catch {
    return NextResponse.json(
      { status: 'unhealthy', timestamp: new Date().toISOString(), uptime_seconds: Math.round(process.uptime()), services: {} },
      { status: 503, headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' } },
    );
  }
}

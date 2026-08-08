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
      status: 'ok' | 'error' | 'missing';
      providers: string[];
      liveProviders: string[];
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
    ai: { status: 'missing', providers: [], liveProviders: [] },
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

  // ── AI providers check ──────────────────────────────────────
  // Presence of a key is NOT proof it works (the production key may be
  // expired/revoked while the site still reports "ok"). Fire a real,
  // minimal call to every configured provider in parallel and report which
  // ones actually answer — that is what the chatbot depends on.
  const aiProviders: string[] = [];
  const liveProviders: string[] = [];
  if (process.env.GROQ_API_KEY) aiProviders.push('groq');
  if (process.env.GEMINI_API_KEY) aiProviders.push('gemini');

  // Ping order mirrors the chat route's cascade: Groq 70b → Groq 8b (own
  // quota) → Gemini 2.5 (correct endpoint; 2.0-flash is quota-0 and
  // :streamContent returns 404).
  const pingGroq = async (model: string): Promise<boolean> => {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(6_000),
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: 'ping' }],
        max_tokens: 1,
        stream: false,
      }),
    });
    return res.ok;
  };

  const pingProvider = async (name: string): Promise<boolean> => {
    try {
      if (name === 'groq') {
        return await pingGroq('llama-3.3-70b-versatile') || await pingGroq('llama-3.1-8b-instant');
      }
      if (name === 'gemini') {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: AbortSignal.timeout(6_000),
            body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: 'ping' }] }], generationConfig: { maxOutputTokens: 1 } }),
          },
        );
        return res.ok;
      }
      return false;
    } catch {
      return false;
    }
  };

  const liveResults = await Promise.all(aiProviders.map(async (p) => ({ p, ok: await pingProvider(p) })));
  for (const { p, ok } of liveResults) if (ok) liveProviders.push(p);

  checks.ai = {
    status: liveProviders.length > 0 ? 'ok' : aiProviders.length > 0 ? 'error' : 'missing',
    providers: aiProviders,
    liveProviders,
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

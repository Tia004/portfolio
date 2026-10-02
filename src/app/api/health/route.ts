import { NextRequest, NextResponse } from 'next/server';
import { prisma, getDatabaseErrorMessage } from '@/lib/prisma';
import { getAvailability } from '@/lib/availability';
import { getSession } from '@/lib/session';
import { decryptProviderKey, getChatbotConfig, DEFAULT_GEMINI_MODEL, DEFAULT_NVIDIA_MODEL } from '@/lib/chatbot-config';

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
      liveChecked: boolean;
    };
    availability: {
      isOnline: boolean;
      updatedAt: string;
    };
  };
}

export async function GET(request: NextRequest) {
  try {
  const checks: HealthStatus['services'] = {
    database: { status: 'error', latency_ms: 0 },
    ai: { status: 'missing', providers: [], liveProviders: [], liveChecked: false },
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
  const session = await getSession();
  const deep = session?.username === 'master' && new URL(request.url).searchParams.get('deep') === '1';
  const config = await getChatbotConfig().catch(() => null);
  const nvidiaKey = config?.nvidiaKeyEncrypted ? (() => { try { return decryptProviderKey(config.nvidiaKeyEncrypted); } catch { return null; } })() : process.env.NVIDIA_NIM_API_KEY;
  const geminiKey = config?.geminiKeyEncrypted ? (() => { try { return decryptProviderKey(config.geminiKeyEncrypted); } catch { return null; } })() : process.env.GEMINI_API_KEY;
  const aiProviders: string[] = [];
  const liveProviders: string[] = [];
  if (process.env.GROQ_API_KEY) aiProviders.push('groq');
  if (nvidiaKey) aiProviders.push('nvidia');
  if (geminiKey) aiProviders.push('gemini');

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
          `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(config?.geminiModel || DEFAULT_GEMINI_MODEL)}:generateContent`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-goog-api-key': geminiKey! },
            signal: AbortSignal.timeout(6_000),
            body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: 'ping' }] }], generationConfig: { maxOutputTokens: 1 } }),
          },
        );
        return res.ok;
      }
      if (name === 'nvidia') {
        const res = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
          method: 'POST',
          headers: { Authorization: `Bearer ${nvidiaKey}`, 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(6_000),
          body: JSON.stringify({ model: config?.nvidiaModel || DEFAULT_NVIDIA_MODEL, messages: [{ role: 'user', content: 'ping' }], max_tokens: 8 }),
        });
        return res.ok;
      }
      return false;
    } catch {
      return false;
    }
  };

  if (deep) {
    const liveResults = await Promise.all(aiProviders.map(async (p) => ({ p, ok: await pingProvider(p) })));
    for (const { p, ok } of liveResults) if (ok) liveProviders.push(p);
  }

  checks.ai = {
    status: deep ? (liveProviders.length > 0 ? 'ok' : aiProviders.length > 0 ? 'error' : 'missing') : aiProviders.length > 0 ? 'ok' : 'missing',
    providers: aiProviders,
    liveProviders,
    liveChecked: deep,
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

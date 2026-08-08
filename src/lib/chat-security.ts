import { createHmac, randomBytes, timingSafeEqual } from 'crypto';
import type { NextRequest } from 'next/server';

const CHAT_COOKIE = 'chat_session';
const PRODUCTION_CHAT_COOKIE = '__Host-chat_session';
const SESSION_TTL_SECONDS = 24 * 60 * 60;
const RATE_WINDOW_MS = 60_000;
const BLOCK_MS = 15 * 60_000;
const MAX_MESSAGE_CHARS = 8_000;
const MAX_AI_HISTORY = 24;
const MAX_AI_INPUT_CHARS = 24_000;

interface ChatSessionPayload {
  sid: string;
  exp: number;
  nonce: string;
}

interface RateBucket {
  startedAt: number;
  count: number;
  blockedUntil: number;
}

const rateBuckets = new Map<string, RateBucket>();
const streamConnections = new Map<string, number>();

function getSessionSecret(): string {
  const secret = process.env.CHAT_SESSION_SECRET || process.env.SESSION_SECRET;
  if (secret && secret.length >= 32) return secret;
  if (process.env.NODE_ENV !== 'production') {
    return 'local-development-chat-secret-change-before-production-please';
  }
  throw new Error('CHAT_SESSION_SECRET or SESSION_SECRET must contain at least 32 characters');
}

function encode(value: string): string {
  return Buffer.from(value).toString('base64url');
}

function sign(value: string): string {
  return createHmac('sha256', getSessionSecret()).update(value).digest('base64url');
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function getChatCookieName(): string {
  // The __Host- prefix prevents subdomain/path cookie shadowing in production.
  return process.env.NODE_ENV === 'production' ? PRODUCTION_CHAT_COOKIE : CHAT_COOKIE;
}

export function createChatSessionToken(sessionId: string): string {
  const payload: ChatSessionPayload = {
    sid: sessionId,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
    nonce: randomBytes(16).toString('base64url'),
  };
  const encoded = encode(JSON.stringify(payload));
  return `${encoded}.${sign(encoded)}`;
}

export function readChatSessionToken(token: string | undefined): ChatSessionPayload | null {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [encoded, signature] = parts;
  if (!encoded || !signature || !safeEqual(signature, sign(encoded))) return null;
  try {
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as ChatSessionPayload;
    if (!payload.sid || !payload.nonce || !Number.isFinite(payload.exp) || payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export function getClientIp(req: NextRequest): string {
  // Only trust the header from the edge provider that is actually configured.
  // Generic forwarding headers remain disabled unless a trusted reverse proxy
  // is explicitly declared, preventing direct-origin header spoofing.
  const provider = process.env.CHAT_EDGE_PROVIDER || (process.env.VERCEL ? 'vercel' : '');
  const platformIp = provider === 'vercel'
    ? (req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'))
    : provider === 'cloudflare'
      ? req.headers.get('cf-connecting-ip')
      : null;
  const trustedProxyIp = process.env.TRUST_PROXY === 'true'
    ? (req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'))
    : null;
  const ip = (platformIp || trustedProxyIp)?.split(',')[0]?.trim();
  return ip && ip.length <= 64 ? ip : 'unknown';
}

export function isSameOriginRequest(req: NextRequest): boolean {
  const origin = req.headers.get('origin');
  if (origin) {
    try {
      return new URL(origin).origin === new URL(req.url).origin;
    } catch {
      return false;
    }
  }

  // EventSource and some WebKit requests may omit Origin. Accept only a
  // browser same-site fetch signal or a same-origin Referer; direct requests
  // without either signal remain rejected in production.
  const fetchSite = req.headers.get('sec-fetch-site');
  if (fetchSite === 'same-origin' || fetchSite === 'same-site') return true;
  const referer = req.headers.get('referer');
  if (referer) {
    try {
      return new URL(referer).origin === new URL(req.url).origin;
    } catch {
      return false;
    }
  }
  return process.env.NODE_ENV !== 'production';
}

export function validateChatSession(req: NextRequest, sessionId: unknown): string | null {
  if (typeof sessionId !== 'string' || !/^[0-9a-f-]{36}$/i.test(sessionId)) return null;
  const payload = readChatSessionToken(req.cookies.get(getChatCookieName())?.value);
  return payload?.sid === sessionId ? sessionId : null;
}

export function sanitizeChatText(value: unknown, maxChars = MAX_MESSAGE_CHARS): string {
  if (typeof value !== 'string') return '';
  return value
    .normalize('NFKC')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/<\/?[a-z][^>]*>/gi, '')
    .replace(/javascript\s*:/gi, '')
    .replace(/data\s*:\s*text\/html/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxChars);
}

export function sanitizeChatMessages(input: unknown): { role: 'user' | 'assistant'; content: string }[] {
  if (!Array.isArray(input) || input.length > MAX_AI_HISTORY) return [];
  const messages: { role: 'user' | 'assistant'; content: string }[] = [];
  let total = 0;
  for (const item of input) {
    if (!item || typeof item !== 'object') continue;
    const candidate = item as { role?: unknown; content?: unknown };
    const role = candidate.role === 'assistant' ? 'assistant' : candidate.role === 'user' ? 'user' : null;
    const content = sanitizeChatText(candidate.content, MAX_MESSAGE_CHARS);
    if (!role || !content) continue;
    total += content.length;
    if (total > MAX_AI_INPUT_CHARS) break;
    messages.push({ role, content });
  }
  return messages;
}

export function sanitizeQuoteDraft(input: unknown): Record<string, string> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return {};
  const source = input as Record<string, unknown>;
  const result: Record<string, string> = {};
  for (const key of ['name', 'email', 'service']) {
    const value = sanitizeChatText(source[key], 254);
    if (value) result[key] = value;
  }
  return result;
}

function takeLocalChatRateLimit(ip: string, sessionId: string, scope: string): { ok: boolean; retryAfter: number } {
  const now = Date.now();
  const keys = [`${scope}:ip:${ip}`, `${scope}:session:${sessionId}`];
  let retryAfter = 0;

  for (const key of keys) {
    const bucket = rateBuckets.get(key);
    if (!bucket || now - bucket.startedAt >= RATE_WINDOW_MS) {
      rateBuckets.set(key, { startedAt: now, count: 1, blockedUntil: 0 });
      continue;
    }
    if (bucket.blockedUntil > now) {
      retryAfter = Math.max(retryAfter, Math.ceil((bucket.blockedUntil - now) / 1000));
      continue;
    }
    bucket.count += 1;
    if (bucket.count > 5) {
      bucket.blockedUntil = now + BLOCK_MS;
      retryAfter = Math.max(retryAfter, Math.ceil(BLOCK_MS / 1000));
    }
  }

  // Bound memory in long-lived Node processes. Production deployments should
  // replace this map with a shared Redis/Upstash limiter for multiple regions.
  if (rateBuckets.size > 10_000) {
    for (const [key, bucket] of rateBuckets) {
      if (now - bucket.startedAt > RATE_WINDOW_MS && bucket.blockedUntil < now) rateBuckets.delete(key);
    }
  }

  return { ok: retryAfter === 0, retryAfter };
}

/**
 * Rate-limit with Upstash Redis when configured, falling back to the local
 * bucket for development/single-process deployments. The Redis path keeps the
 * 5/minute + 15-minute block effective across serverless instances.
 */
export async function takeChatRateLimit(ip: string, sessionId: string, scope: string): Promise<{ ok: boolean; retryAfter: number }> {
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL?.replace(/\/$/, '');
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!redisUrl || !redisToken) return takeLocalChatRateLimit(ip, sessionId, scope);

  const now = Math.floor(Date.now() / 1000);
  const keys = [`chat:${scope}:ip:${ip}`, `chat:${scope}:session:${sessionId}`];
  const blockedKeys = keys.map(key => `${key}:blocked`);
  const script = `
    local now = tonumber(ARGV[1])
    local window = tonumber(ARGV[2])
    local limit = tonumber(ARGV[3])
    local block = tonumber(ARGV[4])
    for i = 1, 2 do
      local blockedUntil = tonumber(redis.call('GET', KEYS[i + 2]) or '0')
      if blockedUntil > now then return blockedUntil - now end
      local count = redis.call('INCR', KEYS[i])
      if count == 1 then redis.call('EXPIRE', KEYS[i], window) end
      if count > limit then
        redis.call('SET', KEYS[i + 2], now + block, 'EX', block)
        return block
      end
    end
    return 0
  `;
  try {
    const path = [
      `${redisUrl}/eval`,
      encodeURIComponent(script),
      '4',
      ...[...keys, ...blockedKeys].map(encodeURIComponent),
      String(now),
      String(RATE_WINDOW_MS / 1000),
      '5',
      String(BLOCK_MS / 1000),
    ].join('/');
    const response = await fetch(path, {
      headers: { Authorization: `Bearer ${redisToken}` },
      cache: 'no-store',
      signal: AbortSignal.timeout(2_000),
    });
    if (!response.ok) throw new Error('redis-rate-limit-failed');
    const data = await response.json() as { result?: number };
    const retryAfter = Math.max(0, Number(data.result || 0));
    return { ok: retryAfter === 0, retryAfter };
  } catch {
    // Redis outage must not make the chat unavailable; retain local protection.
    return takeLocalChatRateLimit(ip, sessionId, scope);
  }
}

export function openChatStream(sessionId: string): boolean {
  const count = streamConnections.get(sessionId) || 0;
  if (count >= 2) return false;
  streamConnections.set(sessionId, count + 1);
  return true;
}

export function closeChatStream(sessionId: string): void {
  const count = streamConnections.get(sessionId) || 0;
  if (count <= 1) streamConnections.delete(sessionId);
  else streamConnections.set(sessionId, count - 1);
}

export async function verifyTurnstile(token: unknown, ip: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  // Local development stays usable before a site key is configured. Production
  // is fail-closed: every chat/contact write needs a real Turnstile secret.
  if (!secret) return process.env.NODE_ENV !== 'production';
  if (typeof token !== 'string' || token.length < 10 || token.length > 2_048) return false;

  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ secret, response: token, remoteip: ip }),
      signal: AbortSignal.timeout(4_000),
    });
    if (!response.ok) return false;
    const result = await response.json() as { success?: boolean; hostname?: string; action?: string };
    if (result.success !== true) return false;
    const expectedHostname = process.env.TURNSTILE_EXPECTED_HOSTNAME;
    const expectedAction = process.env.TURNSTILE_EXPECTED_ACTION;
    if (expectedHostname && result.hostname !== expectedHostname) return false;
    if (expectedAction && result.action !== expectedAction) return false;
    return true;
  } catch {
    return false;
  }
}

export function rateLimitResponse(retryAfter: number): Response {
  return new Response(JSON.stringify({ error: 'Troppe richieste. Riprova più tardi.' }), {
    status: 429,
    headers: {
      'Content-Type': 'application/json',
      'Retry-After': String(Math.max(retryAfter, 1)),
      'Cache-Control': 'no-store',
    },
  });
}

export const CHAT_LIMITS = {
  maxMessageChars: MAX_MESSAGE_CHARS,
  maxAiHistory: MAX_AI_HISTORY,
  maxAiInputChars: MAX_AI_INPUT_CHARS,
  sessionTtlSeconds: SESSION_TTL_SECONDS,
};

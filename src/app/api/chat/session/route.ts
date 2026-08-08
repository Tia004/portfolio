import { randomUUID } from 'crypto';
import { NextRequest } from 'next/server';
import {
  createChatSessionToken,
  getChatCookieName,
  getClientIp,
  isSameOriginRequest,
  rateLimitResponse,
  takeChatRateLimit,
} from '@/lib/chat-security';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  if (!isSameOriginRequest(req)) {
    return Response.json({ error: 'Origine non autorizzata' }, { status: 403 });
  }

  const ip = getClientIp(req);
  const limit = await takeChatRateLimit(ip, `${ip}:bootstrap`, 'session');
  if (!limit.ok) return rateLimitResponse(limit.retryAfter);

  const sessionId = randomUUID();

  let token: string;
  try {
    token = createChatSessionToken(sessionId);
  } catch (err) {
    console.error('[session] Failed to create session token:', err instanceof Error ? err.message : err);
    return Response.json({ error: 'Configurazione server incompleta' }, { status: 500 });
  }

  const response = Response.json({ sessionId }, { headers: { 'Cache-Control': 'no-store' } });
  response.headers.append(
    'Set-Cookie',
    `${getChatCookieName()}=${token}; HttpOnly; Path=/; Max-Age=86400; SameSite=Lax${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`
  );
  return response;
}

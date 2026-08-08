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
  // Keep the bootstrap bucket scoped to this IP; a shared literal session ID
  // would otherwise block every visitor after one noisy client.
  const limit = await takeChatRateLimit(ip, `${ip}:bootstrap`, 'session');
  if (!limit.ok) return rateLimitResponse(limit.retryAfter);

  const sessionId = randomUUID();
  const response = Response.json({ sessionId }, { headers: { 'Cache-Control': 'no-store' } });
  response.headers.append(
    'Set-Cookie',
    `${getChatCookieName()}=${createChatSessionToken(sessionId)}; HttpOnly; Path=/; Max-Age=86400; SameSite=Lax${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`
  );
  return response;
}

/**
 * Server-Sent Events (SSE) endpoint.
 *
 * Opens a persistent connection that pushes new Tia messages to the client
 * as they arrive (via the Telegram webhook). The server checks the
 * chatStore every 1.5s for new messages since the connection opened.
 *
 * Usage on the frontend:
 *   const es = new EventSource('/api/chat/stream?sessionId=xxx&since=1234567890');
 *   es.onmessage = (e) => {
 *     const messages = JSON.parse(e.data);
 *     // messages is an array of ChatMessage objects
 *   };
 */

import { NextRequest } from 'next/server';
import { getTiaMessagesSince } from '@/lib/chatStore';
import {
  closeChatStream,
  getClientIp,
  isSameOriginRequest,
  openChatStream,
  rateLimitResponse,
  takeChatRateLimit,
  validateChatSession,
} from '@/lib/chat-security';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  if (!isSameOriginRequest(req)) return new Response('Origin not allowed', { status: 403 });

  const { searchParams } = new URL(req.url);
  const requestedSessionId = searchParams.get('sessionId');
  const sessionId = validateChatSession(req, requestedSessionId);
  const sinceValue = Number(searchParams.get('since') || '0');
  const since = Number.isFinite(sinceValue) ? Math.max(0, Math.min(sinceValue, Date.now())) : 0;

  if (!sessionId) {
    return new Response('Invalid chat session', { status: 401 });
  }

  const ip = getClientIp(req);
  const limit = await takeChatRateLimit(ip, sessionId, 'stream');
  if (!limit.ok) return rateLimitResponse(limit.retryAfter);
  if (!openChatStream(sessionId)) return new Response('Too many open streams', { status: 429, headers: { 'Retry-After': '30', 'Cache-Control': 'no-store' } });

  let lastCheck = since || Date.now();

  const stream = new ReadableStream({
    start(controller) {
      // Send an initial heartbeat to confirm connection
      controller.enqueue(`event: connected\ndata: {}\n\n`);

      const interval = setInterval(() => {
        const now = Date.now();
        getTiaMessagesSince(sessionId, lastCheck).then((messages) => {
          if (messages.length > 0) {
            lastCheck = now;
            controller.enqueue(`data: ${JSON.stringify(messages)}\n\n`);
          }
        }).catch(() => {
          // DB query failed — skip this tick
        });
      }, 1500);

      // Clean up when the client disconnects
      req.signal.addEventListener('abort', () => {
        clearInterval(interval);
        closeChatStream(sessionId);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}

import { createHmac, timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { invalidateSlotsCache } from '@/lib/cal-slots';
import { prisma } from '@/lib/prisma';

/**
 * Cal.com webhook receiver.
 *
 * Invalidates the in-memory free-slot cache whenever a booking event changes
 * availability, so the next GET /api/availability/slots refetches from
 * Cal.com and the pricing badge updates on its own.
 *
 * Setup (Cal.com → Settings → Developer → Webhooks):
 *   Subscriber URL: https://tiadesigns.it/api/cal/webhook
 *   Triggers:       Booking Created, Booking Cancelled, Booking Rescheduled,
 *                   Booking Requested, Booking Rejected
 *   Secret:         <CAL_COM_WEBHOOK_SECRET>  (same value as the env var)
 *
 * Signing: Cal.com computes an HMAC-SHA256 hex digest of the raw request body
 * with the webhook secret and sends it in the `X-Cal-Signature-256` header.
 */
const BOOKING_TRIGGERS = new Set([
  'BOOKING_CREATED',
  'BOOKING_CANCELLED',
  'BOOKING_RESCHEDULED',
  'BOOKING_REQUESTED',
  'BOOKING_REJECTED',
]);

function isValidSignature(req: NextRequest, rawBody: string): boolean {
  const secret = process.env.CAL_COM_WEBHOOK_SECRET;
  if (!secret) return process.env.NODE_ENV !== 'production';
  const received = (req.headers.get('x-cal-signature-256') || '').replace(/^sha256=/, '');
  if (!received) return false;
  try {
    const computed = createHmac('sha256', secret).update(rawBody).digest('hex');
    const left = Buffer.from(received);
    const right = Buffer.from(computed);
    return left.length === right.length && timingSafeEqual(left, right);
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  if (!isValidSignature(req, rawBody)) {
    return NextResponse.json({ ok: false, error: 'Invalid signature' }, { status: 401 });
  }

  let payload: { triggerEvent?: string; payload?: Record<string, unknown> };
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const trigger = payload?.triggerEvent;
  if (trigger && BOOKING_TRIGGERS.has(trigger)) {
    invalidateSlotsCache();

    // Log to dashboard system logs
    try {
      await prisma.systemLog.create({
        data: {
          level: 'info',
          source: 'cal',
          message: `Cal.com booking event: ${trigger}`,
          metadata: JSON.stringify({
            trigger,
            title: payload?.payload?.title || payload?.payload?.eventTitle,
            startTime: payload?.payload?.startTime,
            attendee: payload?.payload?.attendees,
          }),
        },
      });
    } catch {
      // Fire-and-forget: do not block webhook ACK
    }
  }

  return NextResponse.json({ ok: true, trigger });
}

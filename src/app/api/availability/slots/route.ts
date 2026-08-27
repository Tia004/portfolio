import { NextResponse } from 'next/server';
import { getFreeSlotsCount } from '@/lib/cal-slots';

export const dynamic = 'force-dynamic';

/**
 * Free slots for the current month, from the Cal.com "consulenza" event.
 *
 * When Cal.com isn't configured (or is unreachable) the response carries
 * `count: null, fallback: true` and the client keeps the static badge text.
 *
 * The in-memory cache is invalidated by POST /api/cal/webhook whenever a
 * booking is created/cancelled/rescheduled.
 */
export async function GET() {
  const result = await getFreeSlotsCount();
  return NextResponse.json(result, {
    headers: { 'Cache-Control': 'no-store' },
  });
}

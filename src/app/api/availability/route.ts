import { NextRequest, NextResponse } from 'next/server';
import { getAvailability, setAvailability } from '@/lib/availability';
import { isSameOriginRequest } from '@/lib/chat-security';
import { getSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

// Cache the last-known availability so the fallback returns real state
// instead of always defaulting to true when Turso is unreachable.
let lastKnownOnline = true;

export async function GET() {
  try {
    const availability = await getAvailability();
    lastKnownOnline = availability.isOnline;
    return NextResponse.json(
      { isOnline: availability.isOnline, updatedAt: availability.updatedAt.toISOString() },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    console.error('[availability] GET failed:', error);
    // Turso may be unreachable or the table missing — return last known state
    return NextResponse.json(
      { isOnline: lastKnownOnline, updatedAt: new Date().toISOString(), fallback: true },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  }
}

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: 'Origin not allowed' }, { status: 403 });
  }

  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json() as { isOnline?: unknown };
    if (typeof body.isOnline !== 'boolean') {
      return NextResponse.json({ error: 'isOnline must be boolean' }, { status: 400 });
    }

    // Cache the value before DB write so the fallback has it even if Turso fails
    lastKnownOnline = body.isOnline;
    const availability = await setAvailability(body.isOnline);
    return NextResponse.json(
      { isOnline: availability.isOnline, updatedAt: availability.updatedAt.toISOString() },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    console.error('[availability] POST failed:', error);
    // Even if Turso write fails, the in-memory cache retains the new value
    return NextResponse.json(
      { isOnline: lastKnownOnline, updatedAt: new Date().toISOString(), fallback: true },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  }
}

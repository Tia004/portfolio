import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// ── Geo detection from edge headers ────────────────────────────

function extractCountry(req: NextRequest): string | null {
  const vercel = req.headers.get('x-vercel-ip-country');
  if (vercel && vercel.length === 2) return vercel.toUpperCase();
  const cf = req.headers.get('cf-ipcountry');
  if (cf && cf.length === 2) return cf.toUpperCase();
  const netlify = req.headers.get('x-nf-country');
  if (netlify && netlify.length === 2) return netlify.toUpperCase();
  return null;
}

function extractCity(req: NextRequest): string | null {
  const vercel = req.headers.get('x-vercel-ip-city');
  if (vercel) {
    const decoded = decodeURIComponent(vercel);
    if (decoded && decoded.length > 0) return decoded;
  }
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { events, consent } = body;

    if (events && Array.isArray(events) && events.length > 0) {
      // Resolve geo once per batch — same IP for all events
      const country = extractCountry(req);
      const city = extractCity(req);

      // Persist analytics events to the database
      try {
        const rows = events.map((e: { type: string; url: string; timestamp: number; sessionId: string; data?: Record<string, unknown> }) => {
          let merged = e.data ? { ...e.data } : null;
          if (country) merged = { ...(merged || {}), _country: country };
          if (city) merged = { ...(merged || {}), _city: city };
          return {
            type: e.type,
            url: e.url,
            sessionId: e.sessionId,
            data: merged ? JSON.stringify(merged) : null,
            timestamp: BigInt(e.timestamp),
          };
        });

        await prisma.analyticsEvent.createMany({ data: rows });
      } catch (dbErr) {
        console.error('[analytics] DB write failed:', dbErr);
      }

      return NextResponse.json({ ok: true, count: events.length });
    }

    return NextResponse.json({ error: 'Missing events array' }, { status: 400 });
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}

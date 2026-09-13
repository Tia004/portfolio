import { NextRequest, NextResponse } from 'next/server';
import { recordReferralHit } from '@/lib/client-referrals';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const ref = typeof body.ref === 'string' ? body.ref.trim() : null;
    if (!ref) {
      return NextResponse.json({ ok: false, error: 'Missing ref code' }, { status: 400 });
    }

    const recorded = await recordReferralHit(ref);
    return NextResponse.json({ ok: true, recorded });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

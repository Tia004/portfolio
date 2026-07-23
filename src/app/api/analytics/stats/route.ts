import { NextResponse } from 'next/server';
import { getStats } from '@/lib/analytics';

export async function GET() {
  const stats = getStats();
  return NextResponse.json(stats);
}

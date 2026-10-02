import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const authCount = await prisma.authenticator.count({
      where: { user: { username: 'master' } },
    });
    return NextResponse.json({ initialized: authCount > 0, passkeyCount: authCount });
  } catch (error: unknown) {
    console.error('Error checking auth status:', error);
    return NextResponse.json({ error: 'Stato accesso temporaneamente non disponibile' }, { status: 500 });
  }
}

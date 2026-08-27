import { NextResponse } from 'next/server';
import { prisma, getDatabaseErrorMessage } from '@/lib/prisma';

export async function GET() {
  try {
    const authCount = await prisma.authenticator.count({
      where: { user: { username: 'master' } },
    });
    return NextResponse.json({ initialized: authCount > 0, passkeyCount: authCount });
  } catch (error: any) {
    console.error('Error checking auth status:', error);
    return NextResponse.json({ error: getDatabaseErrorMessage(error) }, { status: 500 });
  }
}

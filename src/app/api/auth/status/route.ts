import { NextResponse } from 'next/server';
import { prisma, getDatabaseErrorMessage } from '@/lib/prisma';

export async function GET() {
  try {
    const userCount = await prisma.user.count();
    return NextResponse.json({ initialized: userCount > 0 });
  } catch (error: any) {
    console.error('Error checking auth status:', error);
    return NextResponse.json({ error: getDatabaseErrorMessage(error) }, { status: 500 });
  }
}

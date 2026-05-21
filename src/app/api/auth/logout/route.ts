import { NextResponse } from 'next/server';
import { deleteSession } from '@/lib/session';

export async function POST() {
  try {
    await deleteSession();
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error logging out:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

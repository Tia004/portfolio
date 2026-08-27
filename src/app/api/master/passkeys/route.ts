import { NextRequest, NextResponse } from 'next/server';
import { prisma, getDatabaseErrorMessage } from '@/lib/prisma';
import { getSession } from '@/lib/session';

export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.username !== 'master') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const authenticators = await prisma.authenticator.findMany({
      where: { user: { username: 'master' } },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        credentialID: true,
        credentialDeviceType: true,
        credentialBackedUp: true,
        nickname: true,
        lastUsedAt: true,
        createdAt: true,
      },
    });

    return NextResponse.json(authenticators);
  } catch (error: any) {
    console.error('Error fetching passkeys:', error);
    return NextResponse.json({ error: getDatabaseErrorMessage(error) }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.username !== 'master') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, nickname } = body;

    if (!id || typeof nickname !== 'string') {
      return NextResponse.json({ error: 'ID and nickname are required' }, { status: 400 });
    }

    const updated = await prisma.authenticator.update({
      where: { id },
      data: { nickname: nickname.trim() || null },
    });

    return NextResponse.json({ success: true, authenticator: updated });
  } catch (error: any) {
    console.error('Error updating passkey nickname:', error);
    return NextResponse.json({ error: getDatabaseErrorMessage(error) }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.username !== 'master') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Passkey ID is required' }, { status: 400 });
    }

    // Protect against deleting the last remaining passkey unless explicitly requested
    const count = await prisma.authenticator.count({
      where: { user: { username: 'master' } },
    });

    if (count <= 1) {
      return NextResponse.json({
        error: 'Non puoi eliminare l\'unica Passkey registrata. Registrane prima una nuova per non perdere l\'accesso.',
      }, { status: 400 });
    }

    await prisma.authenticator.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting passkey:', error);
    return NextResponse.json({ error: getDatabaseErrorMessage(error) }, { status: 500 });
  }
}

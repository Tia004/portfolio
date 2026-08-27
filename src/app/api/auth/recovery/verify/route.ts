import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma, getDatabaseErrorMessage } from '@/lib/prisma';
import { createSession } from '@/lib/session';

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json();

    if (!code || typeof code !== 'string') {
      return NextResponse.json({ error: 'Codice di recupero richiesto' }, { status: 400 });
    }

    const cleanCode = code.trim().toUpperCase();
    const hash = crypto.createHash('sha256').update(cleanCode).digest('hex');

    // Find the unused recovery code
    const recoveryRecord = await prisma.recoveryCode.findUnique({
      where: { codeHash: hash },
    });

    if (!recoveryRecord || recoveryRecord.usedAt !== null) {
      return NextResponse.json({ error: 'Codice di recupero non valido o già utilizzato' }, { status: 401 });
    }

    // Mark as used
    await prisma.recoveryCode.update({
      where: { id: recoveryRecord.id },
      data: { usedAt: new Date() },
    });

    // Ensure master user exists
    let master = await prisma.user.findUnique({
      where: { username: 'master' },
    });

    if (!master) {
      master = await prisma.user.create({
        data: {
          id: 'master-user-id',
          username: 'master',
        },
      });
    }

    // Log the emergency login event
    try {
      await prisma.systemLog.create({
        data: {
          level: 'warn',
          source: 'auth',
          message: 'Accesso master effettuato tramite Codice di Recupero di emergenza',
          metadata: JSON.stringify({ codeId: recoveryRecord.id }),
        },
      });
    } catch {
      // ignore log failure
    }

    // Create session
    await createSession(master.id, master.username);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error verifying recovery code:', error);
    return NextResponse.json({ error: getDatabaseErrorMessage(error) }, { status: 500 });
  }
}

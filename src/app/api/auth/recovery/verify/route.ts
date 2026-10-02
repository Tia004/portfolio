import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { createSession } from '@/lib/session';
import { getClientIp, isSameOriginRequest, rateLimitResponse, takeChatRateLimit } from '@/lib/chat-security';

export async function POST(request: NextRequest) {
  try {
    if (!isSameOriginRequest(request)) return NextResponse.json({ error: 'Origine non autorizzata' }, { status: 403 });
    if (Number(request.headers.get('content-length') || 0) > 1024) return NextResponse.json({ error: 'Richiesta troppo grande' }, { status: 413 });
    const ip = getClientIp(request);
    const limit = await takeChatRateLimit(ip, ip, 'auth');
    if (!limit.ok) return rateLimitResponse(limit.retryAfter);
    const { code } = await request.json();

    if (!code || typeof code !== 'string' || code.length > 64) {
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
    const consumed = await prisma.recoveryCode.updateMany({
      where: { id: recoveryRecord.id, usedAt: null },
      data: { usedAt: new Date() },
    });
    if (consumed.count !== 1) return NextResponse.json({ error: 'Codice di recupero già utilizzato' }, { status: 401 });

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
  } catch (error: unknown) {
    console.error('Error verifying recovery code:', error);
    return NextResponse.json({ error: 'Accesso temporaneamente non disponibile' }, { status: 500 });
  }
}

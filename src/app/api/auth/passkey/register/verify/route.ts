import { NextResponse, NextRequest } from 'next/server';
import { verifyRegistrationResponse } from '@simplewebauthn/server';
import { prisma } from '@/lib/prisma';
import { getChallengeCookie, deleteChallengeCookie, createSession, getSession } from '@/lib/session';
import { getClientIp, isSameOriginRequest, rateLimitResponse, takeChatRateLimit } from '@/lib/chat-security';

function getRpID(request: NextRequest): string {
  return new URL(request.url).hostname;
}

function getExpectedOrigins(request: NextRequest): string[] {
  return [new URL(request.url).origin];
}

export async function POST(request: NextRequest) {
  try {
    if (!isSameOriginRequest(request)) return NextResponse.json({ error: 'Origine non autorizzata' }, { status: 403 });
    const ip = getClientIp(request);
    const limit = await takeChatRateLimit(ip, ip, 'auth');
    if (!limit.ok) return rateLimitResponse(limit.retryAfter);
    const authCount = await prisma.authenticator.count({
      where: { user: { username: 'master' } },
    });

    const session = await getSession();

    if (authCount > 0 && (!session || session.username !== 'master')) {
      return NextResponse.json({
        error: 'Registrazione pubblica disabilitata. Accedi prima per aggiungere nuovi dispositivi.',
      }, { status: 403 });
    }

    const body = await request.json();

    const expectedChallenge = await getChallengeCookie('reg_challenge');
    const masterUserId = await getChallengeCookie('reg_user_id');

    if (!expectedChallenge || !masterUserId) {
      return NextResponse.json({ error: 'Sessione di registrazione scaduta o non valida' }, { status: 400 });
    }

    const rpID = getRpID(request);
    const expectedOrigin = getExpectedOrigins(request);

    const verification = await verifyRegistrationResponse({
      response: body,
      expectedChallenge,
      expectedOrigin,
      expectedRPID: rpID,
      requireUserVerification: false,
    });

    const { verified, registrationInfo } = verification;

    if (!verified || !registrationInfo) {
      return NextResponse.json({ error: 'Verifica Passkey non riuscita' }, { status: 400 });
    }

    const {
      credential,
      credentialDeviceType,
      credentialBackedUp,
    } = registrationInfo;

    const { id, publicKey, counter } = credential;

    // Get or create the master user
    let user = await prisma.user.findUnique({
      where: { username: 'master' },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          id: masterUserId,
          username: 'master',
        },
      });
    }

    const nickname = body.nickname || (credentialDeviceType === 'multiDevice' ? 'iCloud / Google Passkey' : 'Dispositivo Locale');

    // Create or update the authenticator
    await prisma.authenticator.upsert({
      where: { credentialID: id },
      update: {
        credentialPublicKey: Buffer.from(publicKey),
        counter: BigInt(counter),
        credentialDeviceType,
        credentialBackedUp,
        transports: body.response?.transports?.join(',') || null,
        nickname,
        lastUsedAt: new Date(),
        userId: user.id,
      },
      create: {
        credentialID: id,
        credentialPublicKey: Buffer.from(publicKey),
        counter: BigInt(counter),
        credentialDeviceType,
        credentialBackedUp,
        transports: body.response?.transports?.join(',') || null,
        nickname,
        lastUsedAt: new Date(),
        userId: user.id,
      },
    });

    // Clear challenge cookies
    await deleteChallengeCookie('reg_challenge');
    await deleteChallengeCookie('reg_user_id');

    // Create active session cookie
    await createSession(user.id, user.username);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Error verifying registration:', error);
    return NextResponse.json({ error: 'Registrazione temporaneamente non disponibile' }, { status: 500 });
  }
}

import { NextResponse, NextRequest } from 'next/server';
import { verifyRegistrationResponse } from '@simplewebauthn/server';
import { prisma, getDatabaseErrorMessage } from '@/lib/prisma';
import { getChallengeCookie, deleteChallengeCookie, createSession, getSession } from '@/lib/session';

function getRpID(request: NextRequest): string {
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || new URL(request.url).host;
  return host.split(':')[0];
}

function getExpectedOrigins(request: NextRequest): string[] {
  const originHeader = request.headers.get('origin');
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || new URL(request.url).host;
  const proto = request.headers.get('x-forwarded-proto') || (request.url.startsWith('https') ? 'https' : 'http');
  const origins = new Set<string>();
  if (originHeader) origins.add(originHeader);
  origins.add(`${proto}://${host}`);
  origins.add('https://tiadesigns.it');
  origins.add('https://www.tiadesigns.it');
  if (process.env.NODE_ENV !== 'production') {
    origins.add('http://localhost:3000');
    origins.add('http://127.0.0.1:3000');
  }
  return Array.from(origins);
}

export async function POST(request: NextRequest) {
  try {
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
  } catch (error: any) {
    console.error('Error verifying registration:', error);
    return NextResponse.json({ error: getDatabaseErrorMessage(error) }, { status: 500 });
  }
}

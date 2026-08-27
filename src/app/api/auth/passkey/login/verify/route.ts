import { NextResponse, NextRequest } from 'next/server';
import { verifyAuthenticationResponse } from '@simplewebauthn/server';
import type { AuthenticatorTransportFuture } from '@simplewebauthn/server';
import { prisma, getDatabaseErrorMessage } from '@/lib/prisma';
import { getChallengeCookie, deleteChallengeCookie, createSession } from '@/lib/session';

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
    const body = await request.json();
    const credentialID = body.id;

    const expectedChallenge = await getChallengeCookie('login_challenge');
    if (!expectedChallenge) {
      return NextResponse.json({ error: 'Sessione di autenticazione scaduta o non valida' }, { status: 400 });
    }

    // Fetch the registered authenticator
    const authenticator = await prisma.authenticator.findUnique({
      where: { credentialID },
    });

    if (!authenticator) {
      return NextResponse.json({ error: 'Chiave Passkey non registrata' }, { status: 400 });
    }

    const rpID = getRpID(request);
    const expectedOrigin = getExpectedOrigins(request);

    const verification = await verifyAuthenticationResponse({
      response: body,
      expectedChallenge,
      expectedOrigin,
      expectedRPID: rpID,
      credential: {
        id: authenticator.credentialID,
        publicKey: new Uint8Array(authenticator.credentialPublicKey),
        counter: Number(authenticator.counter),
        transports: authenticator.transports ? (authenticator.transports.split(',') as AuthenticatorTransportFuture[]) : undefined,
      },
      requireUserVerification: false,
    });

    const { verified, authenticationInfo } = verification;

    if (!verified || !authenticationInfo) {
      return NextResponse.json({ error: 'Autenticazione Passkey non riuscita' }, { status: 400 });
    }

    // Update the counter and lastUsedAt
    await prisma.authenticator.update({
      where: { id: authenticator.id },
      data: {
        counter: BigInt(authenticationInfo.newCounter),
        lastUsedAt: new Date(),
      },
    });

    // Clear challenge cookie
    await deleteChallengeCookie('login_challenge');

    // Create session
    await createSession(authenticator.userId, 'master');

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Error verifying login:', error);
    return NextResponse.json({ error: getDatabaseErrorMessage(error) }, { status: 500 });
  }
}


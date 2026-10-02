import { NextResponse, NextRequest } from 'next/server';
import { verifyAuthenticationResponse } from '@simplewebauthn/server';
import type { AuthenticatorTransportFuture } from '@simplewebauthn/server';
import { prisma } from '@/lib/prisma';
import { getChallengeCookie, deleteChallengeCookie, createSession } from '@/lib/session';
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
    return NextResponse.json({ error: 'Accesso temporaneamente non disponibile' }, { status: 500 });
  }
}

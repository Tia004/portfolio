import { NextResponse, NextRequest } from 'next/server';
import { verifyAuthenticationResponse } from '@simplewebauthn/server';
import { prisma, getDatabaseErrorMessage } from '@/lib/prisma';
import { getChallengeCookie, deleteChallengeCookie, createSession } from '@/lib/session';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const credentialID = body.id;

    const expectedChallenge = await getChallengeCookie('login_challenge');
    if (!expectedChallenge) {
      return NextResponse.json({ error: 'Login session expired or invalid' }, { status: 400 });
    }

    // Fetch the registered authenticator
    const authenticator = await prisma.authenticator.findUnique({
      where: { credentialID },
    });

    if (!authenticator) {
      return NextResponse.json({ error: 'Authenticator key not registered' }, { status: 400 });
    }

    const url = new URL(request.url);
    const rpID = url.hostname;
    const origin = request.headers.get('origin') || url.origin;

    const verification = await verifyAuthenticationResponse({
      response: body,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      credential: {
        id: authenticator.credentialID,
        publicKey: new Uint8Array(authenticator.credentialPublicKey),
        counter: Number(authenticator.counter),
        transports: authenticator.transports ? (authenticator.transports.split(',') as any[]) : undefined,
      },
      requireUserVerification: true,
    });

    const { verified, authenticationInfo } = verification;

    if (!verified || !authenticationInfo) {
      return NextResponse.json({ error: 'Passkey authentication failed' }, { status: 400 });
    }

    // Update the counter
    await prisma.authenticator.update({
      where: { id: authenticator.id },
      data: {
        counter: BigInt(authenticationInfo.newCounter),
      },
    });

    // Clear challenge cookie
    await deleteChallengeCookie('login_challenge');

    // Create session
    await createSession(authenticator.userId, 'master');

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error verifying login:', error);
    return NextResponse.json({ error: getDatabaseErrorMessage(error) }, { status: 500 });
  }
}

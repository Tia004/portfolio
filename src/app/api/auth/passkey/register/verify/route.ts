import { NextResponse, NextRequest } from 'next/server';
import { verifyRegistrationResponse } from '@simplewebauthn/server';
import { prisma, getDatabaseErrorMessage } from '@/lib/prisma';
import { getChallengeCookie, deleteChallengeCookie, createSession } from '@/lib/session';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const expectedChallenge = await getChallengeCookie('reg_challenge');
    const masterUserId = await getChallengeCookie('reg_user_id');

    if (!expectedChallenge || !masterUserId) {
      return NextResponse.json({ error: 'Registration session expired or invalid' }, { status: 400 });
    }

    const url = new URL(request.url);
    const rpID = url.hostname;
    const origin = request.headers.get('origin') || url.origin;

    const verification = await verifyRegistrationResponse({
      response: body,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: true,
    });

    const { verified, registrationInfo } = verification;

    if (!verified || !registrationInfo) {
      return NextResponse.json({ error: 'Passkey verification failed' }, { status: 400 });
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

    // Create or update the authenticator
    await prisma.authenticator.upsert({
      where: { credentialID: id },
      update: {
        credentialPublicKey: Buffer.from(publicKey),
        counter: BigInt(counter),
        credentialDeviceType,
        credentialBackedUp,
        transports: body.response.transports?.join(',') || null,
        userId: user.id,
      },
      create: {
        credentialID: id,
        credentialPublicKey: Buffer.from(publicKey),
        counter: BigInt(counter),
        credentialDeviceType,
        credentialBackedUp,
        transports: body.response.transports?.join(',') || null,
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

import { NextResponse, NextRequest } from 'next/server';
import { generateRegistrationOptions } from '@simplewebauthn/server';
import { prisma, getDatabaseErrorMessage } from '@/lib/prisma';
import { setChallengeCookie } from '@/lib/session';

export async function POST(request: NextRequest) {
  try {
    const userCount = await prisma.user.count();
    if (userCount > 0) {
      return NextResponse.json({ error: 'Master account already initialized' }, { status: 400 });
    }

    const url = new URL(request.url);
    const rpID = url.hostname;

    // Use a fixed userID for the master user
    const masterUserId = 'master-user-id';

    const options = await generateRegistrationOptions({
      rpName: 'Tia Designs Master Portal',
      rpID,
      userID: new TextEncoder().encode(masterUserId),
      userName: 'master',
      userDisplayName: 'Master Administrator',
      attestationType: 'none',
      authenticatorSelection: {
        residentKey: 'required',
        userVerification: 'required',
      },
    });

    // Save the challenge and userID in the cookies statelessly
    await setChallengeCookie('reg_challenge', options.challenge);
    await setChallengeCookie('reg_user_id', masterUserId);

    return NextResponse.json(options);
  } catch (error: any) {
    console.error('Error generating registration options:', error);
    return NextResponse.json({ error: getDatabaseErrorMessage(error) }, { status: 500 });
  }
}

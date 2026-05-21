import { NextResponse, NextRequest } from 'next/server';
import { generateAuthenticationOptions } from '@simplewebauthn/server';
import { prisma, getDatabaseErrorMessage } from '@/lib/prisma';
import { setChallengeCookie } from '@/lib/session';

export async function POST(request: NextRequest) {
  try {
    // Fetch master user
    const user = await prisma.user.findUnique({
      where: { username: 'master' },
      include: { authenticators: true },
    });

    if (!user || user.authenticators.length === 0) {
      return NextResponse.json({ error: 'Master account not initialized' }, { status: 400 });
    }

    const url = new URL(request.url);
    const rpID = url.hostname;

    const options = await generateAuthenticationOptions({
      rpID,
      allowCredentials: user.authenticators.map((auth: any) => ({
        id: auth.credentialID,
        transports: auth.transports ? (auth.transports.split(',') as any[]) : undefined,
      })),
      userVerification: 'required',
    });

    // Save the challenge in the login_challenge cookie
    await setChallengeCookie('login_challenge', options.challenge);

    return NextResponse.json(options);
  } catch (error: any) {
    console.error('Error generating login options:', error);
    return NextResponse.json({ error: getDatabaseErrorMessage(error) }, { status: 500 });
  }
}

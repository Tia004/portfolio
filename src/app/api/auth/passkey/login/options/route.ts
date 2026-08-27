import { NextResponse, NextRequest } from 'next/server';
import { generateAuthenticationOptions } from '@simplewebauthn/server';
import type { AuthenticatorTransportFuture } from '@simplewebauthn/server';
import { prisma, getDatabaseErrorMessage } from '@/lib/prisma';
import { setChallengeCookie } from '@/lib/session';

function getRpID(request: NextRequest): string {
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || new URL(request.url).host;
  return host.split(':')[0];
}

export async function POST(request: NextRequest) {
  try {
    // Fetch master user
    const user = await prisma.user.findUnique({
      where: { username: 'master' },
      include: { authenticators: true },
    });

    if (!user || user.authenticators.length === 0) {
      return NextResponse.json({ error: 'Nessuna Passkey registrata. Effettua la prima configurazione.' }, { status: 400 });
    }

    const rpID = getRpID(request);

    const options = await generateAuthenticationOptions({
      rpID,
      allowCredentials: user.authenticators.map((auth) => ({
        id: auth.credentialID,
        transports: auth.transports ? (auth.transports.split(',') as AuthenticatorTransportFuture[]) : undefined,
      })),
      userVerification: 'preferred',
    });

    // Save the challenge in the login_challenge cookie
    await setChallengeCookie('login_challenge', options.challenge);

    return NextResponse.json(options);
  } catch (error: unknown) {
    console.error('Error generating login options:', error);
    return NextResponse.json({ error: getDatabaseErrorMessage(error) }, { status: 500 });
  }
}


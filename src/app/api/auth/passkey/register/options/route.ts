import { NextResponse, NextRequest } from 'next/server';
import { generateRegistrationOptions } from '@simplewebauthn/server';
import { prisma, getDatabaseErrorMessage } from '@/lib/prisma';
import { setChallengeCookie, getSession } from '@/lib/session';

function getRpID(request: NextRequest): string {
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || new URL(request.url).host;
  return host.split(':')[0];
}

export async function POST(request: NextRequest) {
  try {
    const authCount = await prisma.authenticator.count({
      where: { user: { username: 'master' } },
    });

    const session = await getSession();

    // Security Gate: Once initialized (at least 1 passkey exists), only an authenticated admin can register new keys
    if (authCount > 0 && (!session || session.username !== 'master')) {
      return NextResponse.json({
        error: 'Registrazione pubblica disabilitata. Accedi alla dashboard per aggiungere nuovi dispositivi.',
      }, { status: 403 });
    }

    const rpID = getRpID(request);
    const masterUserId = 'master-user-id';

    const existingUser = await prisma.user.findUnique({
      where: { username: 'master' },
      include: { authenticators: true },
    });

    const options = await generateRegistrationOptions({
      rpName: 'Tia Designs Master Portal',
      rpID,
      userID: new TextEncoder().encode(masterUserId),
      userName: 'master',
      userDisplayName: 'Master Administrator',
      attestationType: 'none',
      excludeCredentials: existingUser?.authenticators?.map((auth: any) => ({
        id: auth.credentialID,
        transports: auth.transports ? (auth.transports.split(',') as any[]) : undefined,
      })) ?? [],
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred',
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

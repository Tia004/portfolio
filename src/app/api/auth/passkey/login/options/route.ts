import { NextResponse, NextRequest } from 'next/server';
import { generateAuthenticationOptions } from '@simplewebauthn/server';
import type { AuthenticatorTransportFuture } from '@simplewebauthn/server';
import { prisma } from '@/lib/prisma';
import { setChallengeCookie } from '@/lib/session';
import { getClientIp, isSameOriginRequest, rateLimitResponse, takeChatRateLimit } from '@/lib/chat-security';

function getRpID(request: NextRequest): string {
  return new URL(request.url).hostname;
}

export async function POST(request: NextRequest) {
  try {
    if (!isSameOriginRequest(request)) return NextResponse.json({ error: 'Origine non autorizzata' }, { status: 403 });
    const ip = getClientIp(request);
    const limit = await takeChatRateLimit(ip, ip, 'auth');
    if (!limit.ok) return rateLimitResponse(limit.retryAfter);
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
    return NextResponse.json({ error: 'Accesso temporaneamente non disponibile' }, { status: 500 });
  }
}

import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const COOKIE_NAME = 'master_session';
const SECRET_KEY = new TextEncoder().encode(
  process.env.SESSION_SECRET || 'fallback-super-secret-key-at-least-32-chars-long-for-passkey-portfolio'
);

export interface SessionPayload {
  userId: string;
  username: string;
}

export async function encrypt(payload: SessionPayload) {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(SECRET_KEY);
}

export async function decrypt(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY, {
      algorithms: ['HS256'],
    });
    return payload as unknown as SessionPayload;
  } catch (error) {
    return null;
  }
}

export async function createSession(userId: string, username: string) {
  const token = await encrypt({ userId, username });
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24, // 1 day
  });
}

export async function deleteSession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return decrypt(token);
}

export async function setChallengeCookie(name: string, challenge: string) {
  const cookieStore = await cookies();
  cookieStore.set(name, challenge, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 5, // 5 minutes is plenty for WebAuthn response
  });
}

export async function getChallengeCookie(name: string): Promise<string | null> {
  const cookieStore = await cookies();
  const val = cookieStore.get(name)?.value;
  if (!val) return null;
  return val;
}

export async function deleteChallengeCookie(name: string) {
  const cookieStore = await cookies();
  cookieStore.delete(name);
}


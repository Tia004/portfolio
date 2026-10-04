import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';
import { getServerDb } from './serverDb';

export const COOKIE_NAME = 'commercial_session';
export const cookieOptions = { httpOnly: true, sameSite: 'lax' as const, secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 60 * 60 * 24 * 14 };
export const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');
export const createToken = () => randomBytes(32).toString('base64url');
export const hashPassword = (password: string) => {
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
};
export const verifyPassword = (password: string, stored: string) => {
  const [salt, expectedHex] = stored.split(':');
  if (!salt || !expectedHex) return false;
  const expected = Buffer.from(expectedHex, 'hex');
  const actual = scryptSync(password, salt, expected.length);
  return timingSafeEqual(expected, actual);
};
export async function createSession(userId: string) {
  const token = createToken();
  const db = await getServerDb();
  await db.execute({ sql: 'INSERT INTO sessions (token_hash,user_id,expires_at) VALUES (?,?,?)', args: [hashToken(token), userId, new Date(Date.now() + cookieOptions.maxAge * 1000).toISOString()] });
  return token;
}
export async function publicUser(userId: string) {
  const db = await getServerDb();
  const result = await db.execute({ sql: 'SELECT id,email,name,company,role,workspace_id,email_verified FROM users WHERE id = ?', args: [userId] });
  if (!result.rows.length) return null;
  const row = result.rows[0];
  const keys = await db.execute({ sql: 'SELECT id,name,created_at FROM passkeys WHERE user_id = ? ORDER BY created_at DESC', args: [userId] });
  return { id: String(row.id), email: String(row.email), name: String(row.name), company: String(row.company || ''), role: String(row.role || 'member'), workspaceId: String(row.workspace_id), emailVerified: Number(row.email_verified) === 1, hasPasskey: keys.rows.length > 0, passkeys: keys.rows.map((key) => ({ id: String(key.id), name: String(key.name), createdAt: String(key.created_at), rawId: String(key.id), type: 'public-key' })) };
}
export async function getSessionUser() {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;
  const db = await getServerDb();
  const result = await db.execute({ sql: 'SELECT u.id FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires_at > ? AND u.email_verified = 1', args: [hashToken(token), new Date().toISOString()] });
  if (!result.rows.length) return null;
  return publicUser(String(result.rows[0].id));
}

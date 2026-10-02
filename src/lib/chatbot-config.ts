import 'server-only';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { prisma } from '@/lib/prisma';

export const DEFAULT_NVIDIA_MODEL = 'openai/gpt-oss-20b';
export const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';

function encryptionKey(): Buffer {
  const secret = process.env.AI_KEYS_ENCRYPTION_KEY;
  if (!secret || secret.length < 32) throw new Error('Configurare AI_KEYS_ENCRYPTION_KEY (almeno 32 caratteri)');
  return createHash('sha256').update(`tia-chatbot-keys-v1:${secret}`).digest();
}

export function encryptProviderKey(value: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return ['v1', iv.toString('base64url'), cipher.getAuthTag().toString('base64url'), encrypted.toString('base64url')].join(':');
}

export function decryptProviderKey(value: string | null | undefined): string | null {
  if (!value) return null;
  const [version, iv, tag, ciphertext] = value.split(':');
  if (version !== 'v1' || !iv || !tag || !ciphertext) throw new Error('Formato chiave non valido');
  const decipher = createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(iv, 'base64url'));
  decipher.setAuthTag(Buffer.from(tag, 'base64url'));
  return Buffer.concat([decipher.update(Buffer.from(ciphertext, 'base64url')), decipher.final()]).toString('utf8');
}

export async function getChatbotConfig() {
  return prisma.chatbotConfig.findUnique({ where: { id: 'main' } });
}

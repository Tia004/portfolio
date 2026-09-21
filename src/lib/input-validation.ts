import { isInappropriateContactValue } from './chat-moderation';

const NAME_PATTERN = /^\p{L}+(?:\s+\p{L}+)*$/u;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function isValidContactName(value: string): boolean {
  const name = value.trim();
  return name.length >= 2 && name.length <= 80 && NAME_PATTERN.test(name) && !isInappropriateContactValue(name);
}

export function isValidContactEmail(value: string): boolean {
  const email = value.trim();
  return email.length <= 254 && EMAIL_PATTERN.test(email) && !isInappropriateContactValue(email);
}

export function isValidContactMessage(value: string): boolean {
  const message = value.trim();
  return message.length >= 3 && message.length <= 20_000;
}

const COMMON_TYPOS: Record<string, string> = {
  'gnail.com': 'gmail.com',
  'gmaill.com': 'gmail.com',
  'gamil.com': 'gmail.com',
  'gmali.com': 'gmail.com',
  'gmai.com': 'gmail.com',
  'gmeil.com': 'gmail.com',
  'hotmial.com': 'hotmail.com',
  'hotmial.it': 'hotmail.it',
  'hotmal.com': 'hotmail.com',
  'yaho.com': 'yahoo.com',
  'yahooo.com': 'yahoo.com',
  'yhaoo.com': 'yahoo.com',
  'outlok.com': 'outlook.com',
  'outloo.com': 'outlook.com',
  'iclud.com': 'icloud.com',
  'icoud.com': 'icloud.com',
  'libbero.it': 'libero.it',
  'liberoo.it': 'libero.it',
};

/** Suggest domain correction if the email contains a common typo. */
export function suggestEmailCorrection(email: string): string | null {
  const parts = email.trim().toLowerCase().split('@');
  if (parts.length !== 2) return null;
  const [user, domain] = parts;
  const suggestion = COMMON_TYPOS[domain];
  if (suggestion) return `${user}@${suggestion}`;
  return null;
}

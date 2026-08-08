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

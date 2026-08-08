export const CHAT_CATEGORIES = [
  'software-web',
  'design',
  'video',
  'hardware',
  'social',
  'other',
] as const;

export type ChatCategory = (typeof CHAT_CATEGORIES)[number];

export function isChatCategory(value: unknown): value is ChatCategory {
  return typeof value === 'string' && (CHAT_CATEGORIES as readonly string[]).includes(value);
}

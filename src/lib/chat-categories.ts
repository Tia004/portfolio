export const CHAT_CATEGORIES = [
  'general',
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

// Specialization options — 'general' stays the internal default (user typed
// freely without picking a bubble) but is intentionally NOT offered visually.
export const CHAT_CATEGORY_OPTIONS: { value: ChatCategory; labelKey: string; exampleKey: string; placeholderKey: string }[] = [
  { value: 'software-web', labelKey: 'chat.category_software_web', exampleKey: 'chat.example_software_web', placeholderKey: 'chat.placeholder_software_web' },
  { value: 'design', labelKey: 'chat.category_design', exampleKey: 'chat.example_design', placeholderKey: 'chat.placeholder_design' },
  { value: 'video', labelKey: 'chat.category_video', exampleKey: 'chat.example_video', placeholderKey: 'chat.placeholder_video' },
  { value: 'hardware', labelKey: 'chat.category_hardware', exampleKey: 'chat.example_hardware', placeholderKey: 'chat.placeholder_hardware' },
  { value: 'social', labelKey: 'chat.category_social', exampleKey: 'chat.example_social', placeholderKey: 'chat.placeholder_social' },
  { value: 'other', labelKey: 'chat.category_other', exampleKey: 'chat.example_other', placeholderKey: 'chat.placeholder_other' },
];

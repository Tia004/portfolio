export const BRAND_BADGE_CLASSES = [
  'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
  'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  'bg-amber-500/10 text-amber-400 border-amber-500/30',
  'bg-sky-500/10 text-sky-400 border-sky-500/30',
  'bg-violet-500/10 text-violet-400 border-violet-500/30',
  'bg-rose-500/10 text-rose-400 border-rose-500/30',
  'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
  'bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/30',
];

export function getBrandBadge(brand: string): string {
  if (!brand) return 'bg-surface-container text-on-surface-variant border-outline-variant/30';
  let hash = 0;
  const str = String(brand).toLowerCase().trim();
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
  }
  return BRAND_BADGE_CLASSES[Math.abs(hash) % BRAND_BADGE_CLASSES.length];
}

// Cal.com free-slot counter for the pricing badge.
//
// Config (server-side env only):
//   CAL_COM_API_KEY       — Cal.com API v2 token (Settings → Security → API Keys)
//   CAL_COM_EVENT_TYPE_ID — numeric event type id (preferred)
//   CAL_COM_EVENT_SLUG    — event slug, e.g. "consulenza" (used together with username)
//   CAL_COM_USERNAME      — Cal.com username, e.g. "tiadesigns"
//
// If the config is missing, getFreeSlotsCount() returns { fallback: true } so
// the client falls back to the static badge text — no crash, no visible change.

export interface SlotCountResult {
  count: number | null;
  fallback: boolean;
  updatedAt: string;
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

let cache: { count: number; fetchedAt: number } | null = null;

/** Called by the Cal.com webhook when a booking changes availability. */
export function invalidateSlotsCache(): void {
  cache = null;
}

function isConfigured(): boolean {
  return Boolean(
    process.env.CAL_COM_API_KEY &&
      (process.env.CAL_COM_EVENT_TYPE_ID ||
        (process.env.CAL_COM_EVENT_SLUG && process.env.CAL_COM_USERNAME)),
  );
}

function buildSlotsUrl(now: Date): string {
  const base = 'https://api.cal.com/v2/slots';
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const start = `${year}-${month}-01`;
  const lastDay = new Date(year, now.getMonth() + 1, 0).getDate();
  const end = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;

  const params = new URLSearchParams({ start, end, timeZone: 'Europe/Rome' });
  const eventTypeId = process.env.CAL_COM_EVENT_TYPE_ID;
  if (eventTypeId) {
    params.set('eventTypeId', eventTypeId);
  } else {
    params.set('eventTypeSlug', process.env.CAL_COM_EVENT_SLUG as string);
    params.set('username', process.env.CAL_COM_USERNAME as string);
  }
  return `${base}?${params.toString()}`;
}

function countSlots(json: unknown): number {
  const data = (json as { data?: Record<string, Array<{ start?: string } | string>> })?.data;
  if (!data) return 0;
  let count = 0;
  for (const dateKey of Object.keys(data)) {
    const slots = data[dateKey];
    if (Array.isArray(slots)) count += slots.length;
  }
  return count;
}

export async function getFreeSlotsCount(): Promise<SlotCountResult> {
  const now = new Date();
  const updatedAt = now.toISOString();

  if (!isConfigured()) {
    return { count: null, fallback: true, updatedAt };
  }

  if (cache && now.getTime() - cache.fetchedAt < CACHE_TTL_MS) {
    return {
      count: cache.count,
      fallback: false,
      updatedAt: new Date(cache.fetchedAt).toISOString(),
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(buildSlotsUrl(now), {
      headers: {
        Authorization: `Bearer ${process.env.CAL_COM_API_KEY as string}`,
        'cal-api-version': '2024-09-04',
      },
      cache: 'no-store',
      signal: controller.signal,
    });

    if (!res.ok) {
      console.error(`[cal-slots] Cal.com slots API returned ${res.status}`);
      return { count: null, fallback: true, updatedAt };
    }

    const count = countSlots(await res.json());
    cache = { count, fetchedAt: now.getTime() };
    return { count, fallback: false, updatedAt };
  } catch (error) {
    console.error('[cal-slots] slots fetch failed:', error);
    return { count: null, fallback: true, updatedAt };
  } finally {
    clearTimeout(timeout);
  }
}

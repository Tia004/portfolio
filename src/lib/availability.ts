import { prisma, getDatabaseErrorMessage } from '@/lib/prisma';

const AVAILABILITY_ID = 1;

// When Turso is unreachable the chatbot must still work — the visitor
// gets a friendly message instead of a 500. Keep the last-known state
// in process memory so the default is truthful across restarts.
let lastKnownOnline = true;

// Short-TTL cache: every chat message used to hit Turso (~400ms round-trip
// from Vercel) just to re-read a flag that changes a handful of times a day.
// Cache for 10s so the AI response starts fast while staying fresh.
const AVAILABILITY_CACHE_TTL_MS = 10_000;
let cachedAvailability: Availability | null = null;
let cacheExpiresAt = 0;

export type Availability = {
  isOnline: boolean;
  updatedAt: Date;
};

export async function getAvailability(): Promise<Availability> {
  const now = Date.now();
  if (cachedAvailability && now < cacheExpiresAt) return cachedAvailability;
  try {
    // Upsert avoids a unique-key race when several first-time visitors load the
    // widget simultaneously after a fresh deployment.
    const result = await prisma.availabilitySetting.upsert({
      where: { id: AVAILABILITY_ID },
      create: { id: AVAILABILITY_ID, isOnline: true },
      update: {},
    });
    lastKnownOnline = result.isOnline;
    cachedAvailability = result;
    cacheExpiresAt = now + AVAILABILITY_CACHE_TTL_MS;
    return result;
  } catch (error) {
    console.error('[availability] DB read failed (fallback used):', getDatabaseErrorMessage(error));
    // Cache the fallback too: during a Turso outage we must not re-attempt the
    // DB connection on every chat message — that would add ~2s per message.
    cachedAvailability = { isOnline: lastKnownOnline, updatedAt: new Date() };
    cacheExpiresAt = now + AVAILABILITY_CACHE_TTL_MS;
    return cachedAvailability;
  }
}

export async function setAvailability(isOnline: boolean): Promise<Availability> {
  lastKnownOnline = isOnline;
  // Invalidate the cache so the next read picks up the new state immediately.
  cachedAvailability = null;
  cacheExpiresAt = 0;
  try {
    return await prisma.availabilitySetting.upsert({
      where: { id: AVAILABILITY_ID },
      create: { id: AVAILABILITY_ID, isOnline },
      update: { isOnline },
    });
  } catch (error) {
    console.error('[availability] DB write failed (cache used):', getDatabaseErrorMessage(error));
    return { isOnline, updatedAt: new Date() };
  }
}

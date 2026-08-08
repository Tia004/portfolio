import { prisma, getDatabaseErrorMessage } from '@/lib/prisma';

const AVAILABILITY_ID = 1;

// When Turso is unreachable the chatbot must still work — the visitor
// gets a friendly message instead of a 500. Keep the last-known state
// in process memory so the default is truthful across restarts.
let lastKnownOnline = true;

export type Availability = {
  isOnline: boolean;
  updatedAt: Date;
};

export async function getAvailability(): Promise<Availability> {
  try {
    // Upsert avoids a unique-key race when several first-time visitors load the
    // widget simultaneously after a fresh deployment.
    const result = await prisma.availabilitySetting.upsert({
      where: { id: AVAILABILITY_ID },
      create: { id: AVAILABILITY_ID, isOnline: true },
      update: {},
    });
    lastKnownOnline = result.isOnline;
    return result;
  } catch (error) {
    console.error('[availability] DB read failed (fallback used):', getDatabaseErrorMessage(error));
    return { isOnline: lastKnownOnline, updatedAt: new Date() };
  }
}

export async function setAvailability(isOnline: boolean): Promise<Availability> {
  lastKnownOnline = isOnline;
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

// Verification: after the Turso migration, confirm Prisma can write/read
// chat messages and upsert the availability flag on the production DB.
// Usage: node scripts/verify-turso.mjs
import 'dotenv/config';
import { prisma } from '../src/lib/prisma.ts';

const TEST_SESSION = 'dee5707e-2925-4f85-b2d3-01db5990653f';

// 1. Real Prisma write+read of a chat message in the test session
try {
  const created = await prisma.chatMessage.create({
    data: {
      sessionId: TEST_SESSION,
      text: '🧪 Verifica migrazione Turso: scrittura persistente OK',
      sender: 'tia',
      timestamp: BigInt(Date.now()),
    },
  });
  console.log('✅ Prisma WRITE chatMessage OK, id =', created.id);
  const rows = await prisma.chatMessage.findMany({
    where: { sessionId: TEST_SESSION },
    orderBy: { timestamp: 'asc' },
  });
  console.log(`✅ Prisma READ chatMessage OK, ${rows.length} rows for session`);
  for (const r of rows) console.log(`   [${r.sender}] ${r.text}`);
  await prisma.chatMessage.delete({ where: { id: created.id } });
  console.log('🧹 Test row cleaned up');
} catch (err) {
  console.log('❌ Prisma chatMessage FAILED:', err.message);
}

// 2. Availability upsert (the one that caused false "DB offline" alerts)
try {
  const av = await prisma.availabilitySetting.upsert({
    where: { id: 1 },
    create: { id: 1, isOnline: true },
    update: {},
  });
  console.log('✅ Prisma availability upsert OK, isOnline =', av.isOnline);
} catch (err) {
  console.log('❌ Prisma availability FAILED:', err.message);
}

await prisma.$disconnect();

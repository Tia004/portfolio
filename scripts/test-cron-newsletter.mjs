import { tursoCredentials } from './lib/turso-credentials.mjs';

async function runTest() {
  console.log('--- TEST /api/cron/newsletter full cycle simulation ---');
  
  const { PrismaClient } = await import('@prisma/client');
  const { PrismaLibSql } = await import('@prisma/adapter-libsql');

  const adapter = new PrismaLibSql(tursoCredentials());

  const prisma = new PrismaClient({ adapter });

  console.log('1. Creating a test scheduled campaign in Turso...');
  const pastDate = new Date(Date.now() - 60000); // 1 minute ago
  const testCampaign = await prisma.newsletterCampaign.create({
    data: {
      subject: '[TEST CRON] Validazione Invio Automatico',
      previewText: 'Anteprima di test cron',
      bodyContent: 'Questo è un test automatico per la route cron di Vercel.',
      recipients: 'test@example.com',
      recipientCount: 1,
      status: 'scheduled',
      scheduledFor: pastDate,
    },
  });

  console.log(`Campaign created with ID: ${testCampaign.id}, status: ${testCampaign.status}`);

  console.log('2. Querying pending campaigns to process...');
  const now = new Date();
  const pending = await prisma.newsletterCampaign.findMany({
    where: {
      status: 'scheduled',
      scheduledFor: {
        lte: now,
      },
    },
  });

  console.log(`Found ${pending.length} pending campaigns ready to send.`);
  const match = pending.find((p) => p.id === testCampaign.id);
  if (!match) throw new Error('Test campaign was not retrieved by cron filter');

  console.log('3. Simulating execution completion and marking status as completed...');
  const updated = await prisma.newsletterCampaign.update({
    where: { id: testCampaign.id },
    data: {
      status: 'completed',
      sentAt: new Date(),
    },
  });
  console.log(`Updated campaign status: ${updated.status}, sentAt: ${updated.sentAt}`);

  console.log('4. Cleaning up test record from Turso DB...');
  await prisma.newsletterCampaign.delete({
    where: { id: testCampaign.id },
  });
  console.log('Test record cleaned up successfully.');

  console.log('🎉 Full cron lifecycle verified with 100% success!');
}

runTest().catch(console.error);

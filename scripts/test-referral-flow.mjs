import { prisma } from '../src/lib/prisma.ts';
import {
  ensureUniqueReferralCode,
  recordReferralHit,
  attributeReferralLead,
  attributeReferralConversion,
} from '../src/lib/client-referrals.ts';

async function test() {
  console.log('--- TEST REFERRAL FLOW ---');

  // 1. Generate unique code
  const code = await ensureUniqueReferralCode('Test Cliente Demo');
  console.log('1. Generated code:', code);

  // 2. Create referral
  const created = await prisma.clientReferral.create({
    data: {
      code,
      clientName: 'Mario Rossi',
      clientEmail: 'mario.demo@test.it',
      clientCompany: 'Rossi Srl',
      discountPercent: 20,
    },
  });
  console.log('2. Created referral in DB:', created.id, created.code);

  // 3. Record visit hit
  const hit = await recordReferralHit(code);
  console.log('3. Visit hit recorded:', hit);

  // 4. Attribute lead
  const leadAttributed = await attributeReferralLead(code, {
    name: 'Gianluca Bianchi',
    email: 'gianluca@azienda.it',
    service: 'Sito Web + SEO',
    source: 'ai_quote',
    notes: 'Preventivo arrivato da referral link',
  });
  console.log('4. Lead attributed. Leads count:', leadAttributed?.leadsCount);

  // 5. Attribute conversion (Deal = 1500€ -> 20% = 300€)
  const conversionAttributed = await attributeReferralConversion(code, 1500, 'Gianluca Bianchi', 'gianluca@azienda.it');
  console.log('5. Conversion attributed:', conversionAttributed?.reward, '€ (20% on 1500€)');

  // 6. Verify full record
  const check = await prisma.clientReferral.findUnique({
    where: { id: created.id },
    include: { leads: true },
  });
  console.log('6. Verification:', {
    visitsCount: check.visitsCount,
    leadsCount: check.leadsCount,
    conversionsCount: check.conversionsCount,
    totalRewardAttributed: check.totalRewardAttributed,
    leadsLogged: check.leads.length,
  });

  // 7. Cleanup test data
  await prisma.clientReferral.delete({ where: { id: created.id } });
  console.log('7. Cleanup complete ✅');
}

test().catch(console.error);

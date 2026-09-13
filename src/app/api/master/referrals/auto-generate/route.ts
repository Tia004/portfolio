import { NextRequest, NextResponse } from 'next/server';
import { prisma, getDatabaseErrorMessage } from '@/lib/prisma';
import { getSession } from '@/lib/session';
import { ensureUniqueReferralCode } from '@/lib/client-referrals';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.username !== 'master') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Fetch unique clients from Quotes
    const quotes = await prisma.quote.findMany({
      select: {
        clientName: true,
        clientEmail: true,
        clientCompany: true,
      },
    });

    // 2. Fetch unique clients from ContactMessage
    const messages = await prisma.contactMessage.findMany({
      select: {
        name: true,
        email: true,
      },
    });

    // 3. Fetch existing referrals to avoid duplicates
    const existing = await prisma.clientReferral.findMany({
      select: { clientEmail: true },
    });
    const existingEmails = new Set(existing.map((r) => r.clientEmail.toLowerCase()));

    // Whitelist / internal emails to exclude
    const ignoredEmails = new Set([
      'info@tiadesigns.it',
      'tiachinaglia@gmail.com',
      'latitiante@gmail.com',
    ]);

    const toProcess = new Map<string, { name: string; email: string; company?: string }>();

    for (const q of quotes) {
      const email = q.clientEmail.trim().toLowerCase();
      if (!existingEmails.has(email) && !ignoredEmails.has(email) && !toProcess.has(email)) {
        toProcess.set(email, {
          name: q.clientName.trim(),
          email,
          company: q.clientCompany?.trim() || undefined,
        });
      }
    }

    for (const m of messages) {
      const email = m.email.trim().toLowerCase();
      if (!existingEmails.has(email) && !ignoredEmails.has(email) && !toProcess.has(email)) {
        toProcess.set(email, {
          name: m.name.trim(),
          email,
        });
      }
    }

    let createdCount = 0;
    const createdList: any[] = [];

    for (const client of toProcess.values()) {
      const base = client.company || client.name;
      const code = await ensureUniqueReferralCode(base);

      const referral = await prisma.clientReferral.create({
        data: {
          code,
          clientName: client.name,
          clientEmail: client.email,
          clientCompany: client.company || null,
          discountPercent: 20,
          status: 'active',
          notes: 'Auto-generato dallo storico clienti',
        },
      });

      createdCount++;
      createdList.push(referral);
    }

    return NextResponse.json({
      ok: true,
      createdCount,
      createdList,
    });
  } catch (error: any) {
    console.error('Error auto-generating referrals:', error);
    return NextResponse.json({ error: getDatabaseErrorMessage(error) }, { status: 500 });
  }
}

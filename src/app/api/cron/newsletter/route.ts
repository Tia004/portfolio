import { NextRequest, NextResponse } from 'next/server';
import { prisma, getDatabaseErrorMessage } from '@/lib/prisma';
import { getSession } from '@/lib/session';
import { buildBrandedEmailHtml, sendEmail } from '@/lib/branded-email';

async function processScheduledNewsletters(req: NextRequest) {
  try {
    // 1. Security Check
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = req.headers.get('authorization');
    const xCronSecret = req.headers.get('x-cron-secret');

    const isSecretAuthorized =
      Boolean(cronSecret) &&
      (authHeader === `Bearer ${cronSecret}` || xCronSecret === cronSecret);

    const session = await getSession();
    const isMasterSession = Boolean(session && session.username === 'master');

    const isDev = process.env.NODE_ENV !== 'production';

    if (!isSecretAuthorized && !isMasterSession && !isDev) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }

    const now = new Date();

    // 2. Fetch pending scheduled campaigns
    const pendingCampaigns = await prisma.newsletterCampaign.findMany({
      where: {
        status: 'scheduled',
        scheduledFor: {
          lte: now,
        },
      },
      orderBy: {
        scheduledFor: 'asc',
      },
      take: 10,
    });

    if (pendingCampaigns.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Nessuna campagna newsletter programmata in attesa di invio.',
        processedCount: 0,
        timestamp: now.toISOString(),
      });
    }

    const results = [];

    for (const campaign of pendingCampaigns) {
      let resolvedEmails: string[] = [];
      const target = campaign.recipients;

      if (target === 'all_contacts' || target === 'all_audience') {
        const contacts = await prisma.contactMessage.findMany({ select: { email: true } });
        for (const c of contacts) {
          if (c.email?.includes('@')) resolvedEmails.push(c.email.trim().toLowerCase());
        }
      }

      if (target === 'all_leads' || target === 'all_audience') {
        const leads = await prisma.chatSessionLead.findMany({
          where: { clientEmail: { not: null } },
          select: { clientEmail: true },
        });
        for (const l of leads) {
          if (l.clientEmail?.includes('@')) resolvedEmails.push(l.clientEmail.trim().toLowerCase());
        }
      }

      if (target !== 'all_contacts' && target !== 'all_leads' && target !== 'all_audience') {
        resolvedEmails = target
          .split(/[\n,;]+/)
          .map((e) => e.trim().toLowerCase())
          .filter((e) => e.includes('@') && e.includes('.'));
      }

      // Deduplicate
      resolvedEmails = Array.from(new Set(resolvedEmails));

      let successCount = 0;
      let failCount = 0;

      if (resolvedEmails.length > 0) {
        const brandedHtml = buildBrandedEmailHtml({
          title: campaign.subject,
          bodyMarkdown: campaign.bodyContent,
          badgeText: 'Newsletter Ufficiale',
        });

        for (const email of resolvedEmails) {
          try {
            const sent = await sendEmail({
              to: email,
              subject: campaign.subject,
              html: brandedHtml,
            });
            if (sent) successCount++;
            else failCount++;
          } catch (err) {
            failCount++;
            console.error(`[CRON Newsletter] Errore invio a ${email}:`, err);
          }
        }
      }

      // Update campaign in DB
      await prisma.newsletterCampaign.update({
        where: { id: campaign.id },
        data: {
          status: 'sent',
          sentAt: new Date(),
          recipientCount: successCount,
        },
      });

      // Log system audit
      try {
        await prisma.systemLog.create({
          data: {
            source: 'cron',
            level: 'info',
            message: `Newsletter "${campaign.subject}" inviata tramite Cron automatizzato a ${successCount} destinatari (${failCount} falliti).`,
            metadata: JSON.stringify({
              campaignId: campaign.id,
              totalRecipients: resolvedEmails.length,
              successCount,
              failCount,
              scheduledFor: campaign.scheduledFor,
              sentAt: new Date(),
            }),
          },
        });
      } catch {}

      results.push({
        campaignId: campaign.id,
        subject: campaign.subject,
        recipientsTotal: resolvedEmails.length,
        sentSuccess: successCount,
        failed: failCount,
      });
    }

    return NextResponse.json({
      success: true,
      message: `Elaborate ${pendingCampaigns.length} campagne newsletter programmate.`,
      processedCount: pendingCampaigns.length,
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[CRON Newsletter] Errore esecuzione:', error);
    return NextResponse.json(
      { error: getDatabaseErrorMessage(error) },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  return processScheduledNewsletters(req);
}

export async function POST(req: NextRequest) {
  return processScheduledNewsletters(req);
}

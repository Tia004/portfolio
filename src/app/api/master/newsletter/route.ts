import { NextRequest, NextResponse } from 'next/server';
import { prisma, getDatabaseErrorMessage } from '@/lib/prisma';
import { getSession } from '@/lib/session';
import { buildBrandedEmailHtml, sendEmail } from '@/lib/branded-email';

// GET /api/master/newsletter - Fetch campaigns and audience stats
export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.username !== 'master') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const campaigns = await prisma.newsletterCampaign.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const contactMessages = await prisma.contactMessage.findMany({
      select: { email: true, name: true },
    });

    const chatLeads = await prisma.chatSessionLead.findMany({
      where: { clientEmail: { not: null } },
      select: { clientEmail: true, clientName: true },
    });

    const emailMap = new Map<string, string>();
    for (const c of contactMessages) {
      if (c.email && c.email.includes('@')) {
        emailMap.set(c.email.toLowerCase().trim(), c.name || 'Cliente');
      }
    }
    for (const l of chatLeads) {
      if (l.clientEmail && l.clientEmail.includes('@')) {
        const clean = l.clientEmail.toLowerCase().trim();
        if (!emailMap.has(clean)) {
          emailMap.set(clean, l.clientName || 'Cliente');
        }
      }
    }

    const audienceList = Array.from(emailMap.entries()).map(([email, name]) => ({ email, name }));

    return NextResponse.json({
      campaigns,
      stats: {
        totalAudience: audienceList.length,
        contactsCount: contactMessages.length,
        leadsCount: chatLeads.length,
      },
      audienceList,
    });
  } catch (error: any) {
    console.error('Error fetching newsletter data:', error);
    return NextResponse.json({ error: getDatabaseErrorMessage(error) }, { status: 500 });
  }
}

// POST /api/master/newsletter - Create, send or schedule a newsletter
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.username !== 'master') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      subject,
      previewText,
      bodyContent,
      target = 'all_contacts',
      customEmails = '',
      scheduledFor,
      sendNow = false,
      ctaText,
      ctaUrl,
    } = body;

    if (!subject || !bodyContent) {
      return NextResponse.json({ error: 'Oggetto e contenuto della newsletter sono obbligatori' }, { status: 400 });
    }

    // Resolve target audience
    let resolvedEmails: string[] = [];

    if (target === 'custom') {
      resolvedEmails = String(customEmails)
        .split(/[\n,;]+/)
        .map((e) => e.trim().toLowerCase())
        .filter((e) => e.includes('@') && e.includes('.'));
    } else {
      const emailSet = new Set<string>();

      if (target === 'all_contacts' || target === 'all_audience') {
        const contacts = await prisma.contactMessage.findMany({ select: { email: true } });
        for (const c of contacts) {
          if (c.email?.includes('@')) emailSet.add(c.email.trim().toLowerCase());
        }
      }

      if (target === 'all_leads' || target === 'all_audience') {
        const leads = await prisma.chatSessionLead.findMany({
          where: { clientEmail: { not: null } },
          select: { clientEmail: true },
        });
        for (const l of leads) {
          if (l.clientEmail?.includes('@')) emailSet.add(l.clientEmail.trim().toLowerCase());
        }
      }

      resolvedEmails = Array.from(emailSet);
    }

    const isScheduled = !sendNow && Boolean(scheduledFor);
    const campaignStatus = sendNow ? 'sent' : isScheduled ? 'scheduled' : 'draft';

    const campaign = await prisma.newsletterCampaign.create({
      data: {
        subject,
        previewText: previewText || null,
        bodyContent,
        recipients: target === 'custom' ? resolvedEmails.join(', ') : target,
        recipientCount: resolvedEmails.length,
        status: campaignStatus,
        scheduledFor: isScheduled && scheduledFor ? new Date(scheduledFor) : null,
        sentAt: sendNow ? new Date() : null,
      },
    });

    // If sendNow, broadcast emails in batch
    let successCount = 0;
    if (sendNow && resolvedEmails.length > 0) {
      const brandedHtml = buildBrandedEmailHtml({
        title: subject,
        bodyMarkdown: bodyContent,
        ctaText: ctaText || undefined,
        ctaUrl: ctaUrl || undefined,
        badgeText: 'Newsletter Ufficiale',
      });

      // Send to each recipient in background / batch
      for (const email of resolvedEmails) {
        try {
          const sent = await sendEmail({
            to: email,
            subject,
            html: brandedHtml,
          });
          if (sent) successCount++;
        } catch (e) {
          console.error(`Failed to send newsletter to ${email}:`, e);
        }
      }
    }

    return NextResponse.json({
      success: true,
      campaign,
      message: sendNow
        ? `Newsletter inviata con successo a ${successCount} su ${resolvedEmails.length} destinatari!`
        : isScheduled
        ? `Newsletter programmata per il ${new Date(scheduledFor!).toLocaleString('it-IT')}`
        : 'Bozza newsletter salvata!',
    });
  } catch (error: any) {
    console.error('Error creating newsletter:', error);
    return NextResponse.json({ error: getDatabaseErrorMessage(error) }, { status: 500 });
  }
}

// DELETE /api/master/newsletter?id=... - Delete a newsletter campaign
export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.username !== 'master') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'ID campagna mancante' }, { status: 400 });
    }

    await prisma.newsletterCampaign.delete({ where: { id } });
    return NextResponse.json({ success: true, message: 'Campagna eliminata con successo' });
  } catch (error: any) {
    console.error('Error deleting newsletter campaign:', error);
    return NextResponse.json({ error: getDatabaseErrorMessage(error) }, { status: 500 });
  }
}

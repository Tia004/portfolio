import { NextRequest, NextResponse } from 'next/server';
import { prisma, getDatabaseErrorMessage } from '@/lib/prisma';
import { getSession } from '@/lib/session';
import { buildBrandedEmailHtml, sendEmail } from '@/lib/branded-email';
import { loadCampaignAudience } from '@/lib/newsletter-audience';
import { unsubscribeFooterCopy } from '@/lib/newsletter';

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

    // Newsletter subscribers, split by status: the confirmed ones are the
    // audience the "subscribers" target means, and the opted-out ones are the
    // suppression list (they are never emailed by any target).
    const subscribers = await prisma.newsletterSubscriber.findMany({
      orderBy: { createdAt: 'desc' },
      take: 500,
      select: { id: true, email: true, name: true, status: true, locale: true, source: true, createdAt: true, confirmedAt: true, unsubscribedAt: true },
    });
    const subscriberCounts = await prisma.newsletterSubscriber.groupBy({
      by: ['status'],
      _count: { _all: true },
    });
    const statusCount = (status: string) =>
      subscriberCounts.find((row) => row.status === status)?._count._all ?? 0;

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
        subscribersConfirmed: statusCount('confirmed'),
        subscribersPending: statusCount('pending'),
        subscribersUnsubscribed: statusCount('unsubscribed'),
      },
      audienceList,
      subscribers,
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

    // Resolve the audience through the SHARED loader, so a campaign sent from
    // here reaches exactly the same addresses as the same campaign sent by the
    // cron — including the opt-out suppression, which used to exist only here.
    const audience = await loadCampaignAudience(target, target === 'custom' ? customEmails : undefined);
    const resolvedEmails = audience.emails;

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
      // The HTML is built PER RECIPIENT: a subscriber gets their own one-click
      // opt-out link (in the language they signed up in), while contacts and
      // chat leads keep the generic footer.
      const htmlFor = (email: string) => {
        const optOut = audience.unsubscribeByEmail.get(email);
        const copy = optOut ? unsubscribeFooterCopy(optOut.lang) : null;
        return buildBrandedEmailHtml({
          title: subject,
          bodyMarkdown: bodyContent,
          ctaText: ctaText || undefined,
          ctaUrl: ctaUrl || undefined,
          badgeText: 'Newsletter Ufficiale',
          // Collected in the dashboard and stored, but never actually rendered:
          // the inbox list showed the first words of the greeting instead.
          preheaderText: previewText || undefined,
          ...(optOut && copy
            ? { unsubscribeUrl: optOut.url, unsubscribeNote: copy.note, unsubscribeLinkText: copy.link }
            : {}),
        });
      };

      // Send to each recipient in background / batch
      for (const email of resolvedEmails) {
        try {
          const sent = await sendEmail({
            to: email,
            subject,
            html: htmlFor(email),
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
      suppressed: audience.suppressed,
      message: sendNow
        ? `Newsletter inviata con successo a ${successCount} su ${resolvedEmails.length} destinatari!${audience.suppressed > 0 ? ` ${audience.suppressed} disiscritti esclusi automaticamente.` : ''}`
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

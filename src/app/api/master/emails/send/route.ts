import { NextRequest, NextResponse } from 'next/server';
import { prisma, getDatabaseErrorMessage } from '@/lib/prisma';
import { getSession } from '@/lib/session';
import { buildBrandedEmailHtml, sendEmail } from '@/lib/branded-email';

// POST /api/master/emails/send - Protected
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.username !== 'master') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      to,
      recipientName,
      subject,
      title,
      bodyMarkdown,
      ctaText,
      ctaUrl,
      badgeText,
      contactMessageId,
    } = body;

    if (!to || !subject || !bodyMarkdown) {
      return NextResponse.json({ error: 'Destinatario, oggetto e contenuto del messaggio sono obbligatori' }, { status: 400 });
    }

    const brandedHtml = buildBrandedEmailHtml({
      recipientName,
      title,
      bodyMarkdown,
      ctaText,
      ctaUrl,
      badgeText,
    });

    const sent = await sendEmail({
      to,
      subject,
      html: brandedHtml,
    });

    if (!sent) {
      return NextResponse.json({ error: 'Impossibile recapitare l\'email. Verifica le credenziali SMTP / Resend in .env.' }, { status: 502 });
    }

    // If connected to a contact message, update its status and note
    if (contactMessageId) {
      try {
        const msg = await prisma.contactMessage.findUnique({ where: { id: contactMessageId } });
        if (msg) {
          const timestamp = new Date().toLocaleString('it-IT');
          const replyNote = `[Risposto via Dashboard il ${timestamp}]: ${subject}`;
          const updatedNotes = msg.notes ? `${msg.notes}\n${replyNote}` : replyNote;
          await prisma.contactMessage.update({
            where: { id: contactMessageId },
            data: {
              status: 'contacted',
              notes: updatedNotes,
            },
          });
        }
      } catch (err) {
        console.error('Failed to update contactMessage status:', err);
      }
    }

    return NextResponse.json({ success: true, message: 'Email inviata con successo nello stile branded!' });
  } catch (error: any) {
    console.error('Error sending master email:', error);
    return NextResponse.json({ error: getDatabaseErrorMessage(error) }, { status: 500 });
  }
}


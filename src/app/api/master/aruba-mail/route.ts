import { NextResponse, NextRequest } from 'next/server';
import { getSession } from '@/lib/session';
import {
  isArubaConfigured,
  fetchArubaEmails,
  updateArubaEmailFlags,
  deleteArubaEmail,
  ARUBA_EMAIL_USER,
  ARUBA_IMAP_HOST,
  ARUBA_SMTP_HOST,
} from '@/lib/aruba-mail';

// GET /api/master/aruba-mail - Fetch emails from Aruba IMAP
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.username !== 'master') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const mailbox = searchParams.get('mailbox') || 'INBOX';
    const limit = parseInt(searchParams.get('limit') || '40', 10);

    const configured = isArubaConfigured();

    if (!configured) {
      return NextResponse.json({
        configured: false,
        account: ARUBA_EMAIL_USER,
        imapHost: ARUBA_IMAP_HOST,
        smtpHost: ARUBA_SMTP_HOST,
        emails: [],
        total: 0,
        unread: 0,
      });
    }

    try {
      const data = await fetchArubaEmails(mailbox, limit);
      return NextResponse.json({
        configured: true,
        account: ARUBA_EMAIL_USER,
        imapHost: ARUBA_IMAP_HOST,
        smtpHost: ARUBA_SMTP_HOST,
        mailbox,
        emails: data.emails,
        total: data.total,
        unread: data.unread,
      });
    } catch (imapErr: any) {
      console.error('[Aruba IMAP Route] Error connecting:', imapErr);
      return NextResponse.json({
        configured: true,
        account: ARUBA_EMAIL_USER,
        error: imapErr.message || 'Errore di connessione IMAP Aruba',
        emails: [],
        total: 0,
        unread: 0,
      });
    }
  } catch (error: any) {
    console.error('Error in /api/master/aruba-mail GET:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// PATCH /api/master/aruba-mail - Update email flags (read, unread, flag, unflag)
export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.username !== 'master') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { uid, action, mailbox = 'INBOX' } = body;

    if (!uid || !action) {
      return NextResponse.json({ error: 'UID e azione obbligatori' }, { status: 400 });
    }

    const ok = await updateArubaEmailFlags(Number(uid), action, mailbox);
    return NextResponse.json({ success: ok });
  } catch (error: any) {
    console.error('Error in /api/master/aruba-mail PATCH:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE /api/master/aruba-mail - Delete email
export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.username !== 'master') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const uid = searchParams.get('uid');
    const mailbox = searchParams.get('mailbox') || 'INBOX';

    if (!uid) {
      return NextResponse.json({ error: 'UID obbligatorio' }, { status: 400 });
    }

    const ok = await deleteArubaEmail(Number(uid), mailbox);
    return NextResponse.json({ success: ok });
  } catch (error: any) {
    console.error('Error in /api/master/aruba-mail DELETE:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

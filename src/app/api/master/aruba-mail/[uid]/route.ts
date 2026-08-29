import { NextResponse, NextRequest } from 'next/server';
import { getSession } from '@/lib/session';
import { fetchArubaEmailDetail } from '@/lib/aruba-mail';

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ uid: string }> }
) {
  try {
    const session = await getSession();
    if (!session || session.username !== 'master') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const params = await props.params;
    const uid = parseInt(params.uid, 10);
    const { searchParams } = new URL(request.url);
    const mailbox = searchParams.get('mailbox') || 'INBOX';

    if (isNaN(uid)) {
      return NextResponse.json({ error: 'UID non valido' }, { status: 400 });
    }

    const email = await fetchArubaEmailDetail(uid, mailbox);
    if (!email) {
      return NextResponse.json({ error: 'Email non trovata' }, { status: 404 });
    }

    return NextResponse.json({ email });
  } catch (error: any) {
    console.error('Error in /api/master/aruba-mail/[uid]:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

import { NextResponse, NextRequest } from 'next/server';
import { getSession } from '@/lib/session';
import { sendArubaEmail, isArubaConfigured } from '@/lib/aruba-mail';

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.username !== 'master') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isArubaConfigured()) {
      return NextResponse.json(
        { error: 'Credenziali Aruba Mail non configurate. Aggiungi ARUBA_EMAIL_PASSWORD in .env / Vercel.' },
        { status: 400 }
      );
    }

    const contentType = request.headers.get('content-type') || '';

    let to: string = '';
    let subject: string = '';
    let html: string = '';
    let cc: string | undefined;
    let bcc: string | undefined;
    let attachments: { filename: string; content?: Buffer; contentType?: string }[] = [];

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      to = (formData.get('to') as string) || '';
      subject = (formData.get('subject') as string) || '';
      html = (formData.get('html') as string) || '';
      cc = (formData.get('cc') as string) || undefined;
      bcc = (formData.get('bcc') as string) || undefined;

      const files = formData.getAll('attachments') as File[];
      for (const file of files) {
        if (file && file.size > 0) {
          const buffer = Buffer.from(await file.arrayBuffer());
          attachments.push({
            filename: file.name,
            content: buffer,
            contentType: file.type || 'application/octet-stream',
          });
        }
      }
    } else {
      const body = await request.json();
      to = body.to || '';
      subject = body.subject || '';
      html = body.html || '';
      cc = body.cc;
      bcc = body.bcc;
      if (Array.isArray(body.attachments)) {
        attachments = body.attachments.map((att: any) => ({
          filename: att.filename,
          content: att.dataBase64 ? Buffer.from(att.dataBase64, 'base64') : undefined,
          contentType: att.contentType,
        }));
      }
    }

    if (!to.trim() || !subject.trim() || !html.trim()) {
      return NextResponse.json({ error: 'Destinatario, oggetto e corpo messaggio sono obbligatori' }, { status: 400 });
    }

    const result = await sendArubaEmail({
      to: to.split(',').map((s) => s.trim()),
      subject: subject.trim(),
      html,
      cc: cc ? cc.split(',').map((s) => s.trim()) : undefined,
      bcc: bcc ? bcc.split(',').map((s) => s.trim()) : undefined,
      attachments,
    });

    return NextResponse.json({ success: true, messageId: result.messageId });
  } catch (error: any) {
    console.error('Error in /api/master/aruba-mail/send:', error);
    return NextResponse.json({ error: error.message || 'Errore durante l\'invio dell\'email' }, { status: 500 });
  }
}

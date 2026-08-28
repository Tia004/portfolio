import { NextRequest, NextResponse } from 'next/server';
import { prisma, getDatabaseErrorMessage } from '@/lib/prisma';
import { getSession } from '@/lib/session';

export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.username !== 'master') {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }

    const templates = await prisma.customEmailTemplate.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ templates });
  } catch (error) {
    return NextResponse.json(
      { error: getDatabaseErrorMessage(error) },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.username !== 'master') {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }

    const body = await req.json();
    const { name, icon, badge, title, subject, body: templateBody, ctaText, ctaUrl } = body;

    if (!name || !title || !subject || !templateBody) {
      return NextResponse.json(
        { error: 'Nome, Titolo, Oggetto e Corpo del template sono obbligatori' },
        { status: 400 }
      );
    }

    const template = await prisma.customEmailTemplate.create({
      data: {
        name: name.trim(),
        icon: (icon || '✉️').trim(),
        badge: (badge || 'Tia Designs').trim(),
        title: title.trim(),
        subject: subject.trim(),
        body: templateBody.trim(),
        ctaText: ctaText?.trim() || null,
        ctaUrl: ctaUrl?.trim() || null,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Template salvato nel database con successo!',
      template,
    });
  } catch (error) {
    return NextResponse.json(
      { error: getDatabaseErrorMessage(error) },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.username !== 'master') {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID template mancante' }, { status: 400 });
    }

    await prisma.customEmailTemplate.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Template eliminato con successo.',
    });
  } catch (error) {
    return NextResponse.json(
      { error: getDatabaseErrorMessage(error) },
      { status: 500 }
    );
  }
}

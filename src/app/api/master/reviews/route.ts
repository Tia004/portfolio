import { NextRequest, NextResponse } from 'next/server';
import { prisma, getDatabaseErrorMessage } from '@/lib/prisma';
import { getSession } from '@/lib/session';

export async function GET() {
  try {
    const reviews = await prisma.clientReview.findMany({
      orderBy: { order: 'asc' },
    });
    return NextResponse.json(reviews);
  } catch (error: any) {
    console.error('Error fetching reviews:', error);
    return NextResponse.json({ error: getDatabaseErrorMessage(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.username !== 'master') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { author, role, company, quoteIt, quoteEn, quoteEs, rating, avatarUrl, order, isApproved } = body;

    if (!author || !role || !quoteIt) {
      return NextResponse.json({ error: 'Autore, Ruolo e Testimonianza (Italiano) sono obbligatori' }, { status: 400 });
    }

    const created = await prisma.clientReview.create({
      data: {
        author,
        role,
        company: company || null,
        quoteIt,
        quoteEn: quoteEn || null,
        quoteEs: quoteEs || null,
        rating: typeof rating === 'number' ? rating : 5,
        avatarUrl: avatarUrl || null,
        order: typeof order === 'number' ? order : 0,
        isApproved: typeof isApproved === 'boolean' ? isApproved : true,
      },
    });

    return NextResponse.json(created);
  } catch (error: any) {
    console.error('Error creating review:', error);
    return NextResponse.json({ error: getDatabaseErrorMessage(error) }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.username !== 'master') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, ...data } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const updated = await prisma.clientReview.update({
      where: { id },
      data,
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('Error updating review:', error);
    return NextResponse.json({ error: getDatabaseErrorMessage(error) }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.username !== 'master') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    await prisma.clientReview.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting review:', error);
    return NextResponse.json({ error: getDatabaseErrorMessage(error) }, { status: 500 });
  }
}

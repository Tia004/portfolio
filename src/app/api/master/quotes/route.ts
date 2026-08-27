import { NextRequest, NextResponse } from 'next/server';
import { prisma, getDatabaseErrorMessage } from '@/lib/prisma';
import { getSession } from '@/lib/session';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.username !== 'master') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const status = searchParams.get('status');

    const where: any = {};
    if (status && status !== 'all') {
      where.status = status;
    }
    if (search) {
      where.OR = [
        { quoteNumber: { contains: search } },
        { clientName: { contains: search } },
        { clientEmail: { contains: search } },
        { clientCompany: { contains: search } },
      ];
    }

    const quotes = await prisma.quote.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return NextResponse.json(quotes);
  } catch (error: any) {
    console.error('Error fetching quotes:', error);
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
    const {
      quoteNumber,
      date,
      validity,
      timeline,
      clientName,
      clientCompany,
      clientEmail,
      clientPhone,
      clientAddress,
      clientVat,
      itemsJson,
      discount,
      taxRegime,
      paymentTerms,
      iban,
      notes,
      subtotal,
      total,
      signatureData,
      status,
    } = body;

    if (!quoteNumber || !clientName || !clientEmail || !itemsJson) {
      return NextResponse.json({ error: 'Numero preventivo, nome cliente, email e voci sono obbligatori' }, { status: 400 });
    }

    // Upsert by quoteNumber so user can save updates easily
    const quote = await prisma.quote.upsert({
      where: { quoteNumber },
      create: {
        quoteNumber,
        date: date || new Date().toISOString().split('T')[0],
        validity: validity || '30 giorni',
        timeline: timeline || '2-3 settimane lavorative',
        clientName,
        clientCompany: clientCompany || null,
        clientEmail,
        clientPhone: clientPhone || null,
        clientAddress: clientAddress || null,
        clientVat: clientVat || null,
        itemsJson: typeof itemsJson === 'string' ? itemsJson : JSON.stringify(itemsJson),
        discount: typeof discount === 'number' ? discount : 0,
        taxRegime: taxRegime || 'forfettario',
        paymentTerms: paymentTerms || '50% acconto all\'avvio, 50% a saldo dopo il collaudo',
        iban: iban || '',
        notes: notes || null,
        subtotal: typeof subtotal === 'number' ? subtotal : 0,
        total: typeof total === 'number' ? total : 0,
        signatureData: signatureData || null,
        status: status || 'draft',
      },
      update: {
        date,
        validity,
        timeline,
        clientName,
        clientCompany: clientCompany || null,
        clientEmail,
        clientPhone: clientPhone || null,
        clientAddress: clientAddress || null,
        clientVat: clientVat || null,
        itemsJson: typeof itemsJson === 'string' ? itemsJson : JSON.stringify(itemsJson),
        discount: typeof discount === 'number' ? discount : 0,
        taxRegime: taxRegime || 'forfettario',
        paymentTerms: paymentTerms || '',
        iban: iban || '',
        notes: notes || null,
        subtotal: typeof subtotal === 'number' ? subtotal : 0,
        total: typeof total === 'number' ? total : 0,
        signatureData: signatureData || null,
        status: status || 'draft',
      },
    });

    return NextResponse.json(quote);
  } catch (error: any) {
    console.error('Error saving quote:', error);
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
      return NextResponse.json({ error: 'Quote ID is required' }, { status: 400 });
    }

    const updated = await prisma.quote.update({
      where: { id },
      data,
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('Error updating quote:', error);
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
      return NextResponse.json({ error: 'Quote ID is required' }, { status: 400 });
    }

    await prisma.quote.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting quote:', error);
    return NextResponse.json({ error: getDatabaseErrorMessage(error) }, { status: 500 });
  }
}

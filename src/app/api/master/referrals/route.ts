import { NextRequest, NextResponse } from 'next/server';
import { prisma, getDatabaseErrorMessage } from '@/lib/prisma';
import { getSession } from '@/lib/session';
import { ensureUniqueReferralCode, slugifyReferralCode } from '@/lib/client-referrals';

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.username !== 'master') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const referrals = await prisma.clientReferral.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        leads: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    return NextResponse.json({ ok: true, referrals });
  } catch (error: any) {
    console.error('Error fetching referrals:', error);
    return NextResponse.json({ error: getDatabaseErrorMessage(error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.username !== 'master') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { clientName, clientEmail, clientCompany, customCode, discountPercent, notes } = body;

    if (!clientName || !clientEmail) {
      return NextResponse.json(
        { error: 'Nome cliente ed email sono obbligatori' },
        { status: 400 }
      );
    }

    // Check if client email already has a referral code
    const existing = await prisma.clientReferral.findFirst({
      where: { clientEmail: clientEmail.trim().toLowerCase() },
    });

    if (existing) {
      return NextResponse.json(
        {
          error: `Questo cliente ha già un codice referral attivo: ${existing.code}`,
          referral: existing,
        },
        { status: 409 }
      );
    }

    // Generate or sanitize code
    const baseCode = customCode?.trim() || clientCompany?.trim() || clientName.trim();
    const code = await ensureUniqueReferralCode(baseCode);

    const referral = await prisma.clientReferral.create({
      data: {
        code,
        clientName: clientName.trim(),
        clientEmail: clientEmail.trim().toLowerCase(),
        clientCompany: clientCompany?.trim() || null,
        discountPercent: typeof discountPercent === 'number' ? discountPercent : 20,
        notes: notes?.trim() || null,
        status: 'active',
      },
    });

    return NextResponse.json({ ok: true, referral });
  } catch (error: any) {
    console.error('Error creating referral:', error);
    return NextResponse.json({ error: getDatabaseErrorMessage(error) }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.username !== 'master') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { id, code, discountPercent, status, notes, manualDealReward } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID referral mancante' }, { status: 400 });
    }

    const updateData: any = {};
    if (typeof status === 'string') updateData.status = status;
    if (typeof discountPercent === 'number') updateData.discountPercent = discountPercent;
    if (typeof notes === 'string') updateData.notes = notes;

    if (code) {
      const uniqueCode = await ensureUniqueReferralCode(code, id);
      updateData.code = uniqueCode;
    }

    if (typeof manualDealReward === 'number' && manualDealReward > 0) {
      updateData.totalRewardAttributed = { increment: manualDealReward };
      updateData.conversionsCount = { increment: 1 };
    }

    const updated = await prisma.clientReferral.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ ok: true, referral: updated });
  } catch (error: any) {
    console.error('Error updating referral:', error);
    return NextResponse.json({ error: getDatabaseErrorMessage(error) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.username !== 'master') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID mancante' }, { status: 400 });
    }

    await prisma.clientReferral.delete({
      where: { id },
    });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('Error deleting referral:', error);
    return NextResponse.json({ error: getDatabaseErrorMessage(error) }, { status: 500 });
  }
}

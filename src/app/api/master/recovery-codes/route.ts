import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma, getDatabaseErrorMessage } from '@/lib/prisma';
import { getSession } from '@/lib/session';

function generateRandomCode(): string {
  return crypto.randomBytes(4).toString('hex').toUpperCase(); // e.g. "A1B2C3D4"
}

export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.username !== 'master') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const availableCodesCount = await prisma.recoveryCode.count({
      where: { usedAt: null },
    });

    return NextResponse.json({ count: availableCodesCount });
  } catch (error: any) {
    return NextResponse.json({ error: getDatabaseErrorMessage(error) }, { status: 500 });
  }
}

export async function POST() {
  try {
    const session = await getSession();
    if (!session || session.username !== 'master') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Delete existing recovery codes to generate a fresh set
    await prisma.recoveryCode.deleteMany();

    const plainCodes: string[] = [];
    const createData: { codeHash: string }[] = [];

    for (let i = 0; i < 5; i++) {
      const code = `${generateRandomCode()}-${generateRandomCode()}`;
      plainCodes.push(code);
      const hash = crypto.createHash('sha256').update(code).digest('hex');
      createData.push({ codeHash: hash });
    }

    await prisma.recoveryCode.createMany({
      data: createData,
    });

    return NextResponse.json({
      success: true,
      codes: plainCodes,
      message: 'Salva questi codici in un luogo sicuro. Non verranno più mostrati.',
    });
  } catch (error: any) {
    console.error('Error generating recovery codes:', error);
    return NextResponse.json({ error: getDatabaseErrorMessage(error) }, { status: 500 });
  }
}

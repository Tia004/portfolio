import { NextResponse, NextRequest } from 'next/server';
import { prisma, getDatabaseErrorMessage } from '@/lib/prisma';
import { getSession } from '@/lib/session';

// PUT /api/projects/reorder - Protected: Batch update projects order
export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.username !== 'master') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { items } = body as { items: Array<{ id: string; order: number }> };

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Array of items with id and order is required' }, { status: 400 });
    }

    // Update each project's order in parallel
    await Promise.all(
      items.map((item) =>
        prisma.project.update({
          where: { id: item.id },
          data: { order: item.order },
        })
      )
    );

    const updatedProjects = await prisma.project.findMany({
      orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
    });

    return NextResponse.json({ success: true, projects: updatedProjects });
  } catch (error: any) {
    console.error('Error reordering projects:', error);
    return NextResponse.json({ error: getDatabaseErrorMessage(error) }, { status: 500 });
  }
}

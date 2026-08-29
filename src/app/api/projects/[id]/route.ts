import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';

type RouteParams = {
  params: Promise<{ id: string }>;
};

// PUT /api/projects/[id] - Protected: Update a project
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const {
      title,
      titleEn,
      titleEs,
      description,
      descriptionEn,
      descriptionEs,
      longDescription,
      thumbnail,
      projectUrl,
      githubUrl,
      tags,
      category,
      featured,
      order,
      gallery,
      pdfUrl,
    } = body;

    const existingProject = await prisma.project.findUnique({
      where: { id },
    });

    if (!existingProject) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const finalTitle = title !== undefined ? title : existingProject.title;
    const finalDesc = description !== undefined ? description : existingProject.description;
    const finalLongDesc = longDescription !== undefined ? longDescription : existingProject.longDescription;

    let finalTitleEn = titleEn !== undefined ? titleEn : (existingProject as any).titleEn;
    let finalTitleEs = titleEs !== undefined ? titleEs : (existingProject as any).titleEs;
    let finalDescEn = descriptionEn !== undefined ? descriptionEn : (existingProject as any).descriptionEn;
    let finalDescEs = descriptionEs !== undefined ? descriptionEs : (existingProject as any).descriptionEs;

    // If title or description changed and translations are not explicitly passed, auto-translate
    if ((title !== undefined && title !== existingProject.title && titleEn === undefined) ||
        (description !== undefined && description !== existingProject.description && descriptionEn === undefined)) {
      try {
        const { autoTranslateProject } = await import('@/lib/auto-translate');
        const auto = await autoTranslateProject({
          title: finalTitle,
          description: finalDesc,
          longDescription: finalLongDesc,
        });
        if (titleEn === undefined) {
          finalTitleEn = auto.titleEn;
          finalTitleEs = auto.titleEs;
        }
        if (descriptionEn === undefined) {
          finalDescEn = auto.descriptionEn;
          finalDescEs = auto.descriptionEs;
        }
      } catch (err) {
        console.warn('[Projects API] Auto-translate update fallback:', err);
      }
    }

    const updatedProject = await prisma.project.update({
      where: { id },
      data: {
        title: finalTitle,
        titleEn: finalTitleEn || null,
        titleEs: finalTitleEs || null,
        description: finalDesc,
        descriptionEn: finalDescEn || null,
        descriptionEs: finalDescEs || null,
        longDescription: finalLongDesc || null,
        thumbnail: thumbnail !== undefined ? thumbnail : existingProject.thumbnail,
        projectUrl: projectUrl !== undefined ? projectUrl : existingProject.projectUrl,
        githubUrl: githubUrl !== undefined ? githubUrl : existingProject.githubUrl,
        tags: tags !== undefined ? tags : existingProject.tags,
        category: category !== undefined ? category : existingProject.category,
        featured: featured !== undefined ? featured : existingProject.featured,
        order: typeof order === 'number' ? order : existingProject.order,
        gallery: gallery !== undefined ? (typeof gallery === 'string' ? gallery : JSON.stringify(gallery)) : existingProject.gallery,
        pdfUrl: pdfUrl !== undefined ? pdfUrl : existingProject.pdfUrl,
      },
    });

    return NextResponse.json(updatedProject);
  } catch (error: any) {
    console.error('Error updating project:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE /api/projects/[id] - Protected: Delete a project
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const existingProject = await prisma.project.findUnique({
      where: { id },
    });

    if (!existingProject) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    await prisma.project.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting project:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

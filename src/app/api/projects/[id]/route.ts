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
    const { title, description, longDescription, thumbnail, projectUrl, githubUrl, tags, featured, order } = body;

    const existingProject = await prisma.project.findUnique({
      where: { id },
    });

    if (!existingProject) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const updatedProject = await prisma.project.update({
      where: { id },
      data: {
        title: title !== undefined ? title : existingProject.title,
        description: description !== undefined ? description : existingProject.description,
        longDescription: longDescription !== undefined ? longDescription : existingProject.longDescription,
        thumbnail: thumbnail !== undefined ? thumbnail : existingProject.thumbnail,
        projectUrl: projectUrl !== undefined ? projectUrl : existingProject.projectUrl,
        githubUrl: githubUrl !== undefined ? githubUrl : existingProject.githubUrl,
        tags: tags !== undefined ? tags : existingProject.tags,
        featured: featured !== undefined ? featured : existingProject.featured,
        order: typeof order === 'number' ? order : existingProject.order,
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

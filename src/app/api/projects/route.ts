import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';

// GET /api/projects - Public: Fetch all projects
export async function GET() {
  try {
    const projects = await prisma.project.findMany({
      orderBy: [
        { order: 'asc' },
        { createdAt: 'desc' },
      ],
    });
    return NextResponse.json(projects);
  } catch (error: any) {
    console.error('Error fetching projects:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST /api/projects - Protected: Create a new project
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { title, description, longDescription, thumbnail, projectUrl, githubUrl, tags, featured, order } = body;

    if (!title || !description || !thumbnail) {
      return NextResponse.json({ error: 'Title, description, and thumbnail are required' }, { status: 400 });
    }

    const project = await prisma.project.create({
      data: {
        title,
        description,
        longDescription: longDescription || null,
        thumbnail,
        projectUrl: projectUrl || null,
        githubUrl: githubUrl || null,
        tags: tags || '',
        featured: featured || false,
        order: typeof order === 'number' ? order : 0,
      },
    });

    return NextResponse.json(project, { status: 201 });
  } catch (error: any) {
    console.error('Error creating project:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

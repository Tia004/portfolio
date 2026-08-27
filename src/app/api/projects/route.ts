import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';

export async function GET() {
  try {
    let count = await prisma.project.count();
    if (count === 0) {
      const defaultProjects = [
        {
          title: 'GSA Hotels',
          description: 'Prototipo di sito luxury per struttura ricettiva di alto livello. Design raffinato, animazioni fluide e sistema di prenotazione interattivo.',
          longDescription: 'Prototipo di sito luxury per struttura ricettiva di alto livello con sistema di prenotazione interattivo e animazioni fluide.',
          thumbnail: '/uploads/gsahotels.png',
          projectUrl: 'https://gsa-hotels-demo.vercel.app/',
          tags: 'Next.js, Tailwind, Animazioni',
          featured: true,
          order: 1,
        },
        {
          title: 'Vergilius Nectar',
          description: 'Landing page per brand emergente. Visual identity curata, storytelling visivo d\'impatto e performance ottimizzate.',
          longDescription: 'Landing page per brand emergente di bevande naturali.',
          thumbnail: '/uploads/vergiliusnectar.png',
          projectUrl: 'https://vergiliusnectar-github-io.vercel.app/',
          tags: 'React, Branding, UI Design',
          featured: true,
          order: 2,
        },
        {
          title: 'Studio Ing. Moretti',
          description: 'Sito professionale per studio di ingegneria. Design pulito, ottimizzato SEO e performance al top. Online e operativo.',
          longDescription: 'Sito aziendale e portfolio per studio di ingegneria civile e strutturale.',
          thumbnail: '/uploads/studioingmoretti.png',
          projectUrl: 'https://www.studioingmoretti.it/',
          tags: 'Next.js, SEO, Sito Professionale',
          featured: true,
          order: 3,
        },
        {
          title: 'PCS Mantova',
          description: 'Sito istituzionale per azienda del territorio mantovano. Struttura moderna, navigazione intuitiva e immagine coordinata.',
          longDescription: 'Sito istituzionale e catalogo servizi per azienda informatica di Mantova.',
          thumbnail: '/uploads/pcsmantova.png',
          projectUrl: 'https://pcsmantova-github-io.vercel.app/',
          tags: 'Next.js, Design, Sviluppo',
          featured: true,
          order: 4,
        },
        {
          title: 'Canapa Store',
          description: 'Concept store per prodotti naturali. Esperienza d\'acquisto fluida con design minimal, palette terrosa e attenzione al dettaglio.',
          longDescription: 'E-commerce concept store per prodotti naturali biologici.',
          thumbnail: '/uploads/canapastore.png',
          projectUrl: 'https://canapa-store.vercel.app/',
          tags: 'Next.js, E-commerce, UI Design',
          featured: true,
          order: 5,
        },
        {
          title: 'Pigg',
          description: 'Cortometraggio realizzato per l\'Accademia di Belle Arti: la storia di un ragazzo bullizzato che si rimette in piedi da solo dopo che gli è stato affibbiato un nome che non gli appartiene.',
          longDescription: 'Cortometraggio drammatico d\'autore, regia e montaggio.',
          thumbnail: '/uploads/pigg-cover.png',
          projectUrl: 'https://youtu.be/rc6GzCBa2LY',
          tags: 'Cortometraggio, Montaggio, Color Grading',
          featured: true,
          order: 6,
        },
      ];

      for (const p of defaultProjects) {
        await prisma.project.create({ data: p });
      }
    }

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

import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';

export async function GET() {
  try {
    const defaultProjects = [
      {
        title: 'GSA Hotels',
        description: 'Prototipo di sito luxury per struttura ricettiva di alto livello. Design raffinato, animazioni fluide e sistema di prenotazione interattivo.',
        longDescription: 'Prototipo di sito luxury per struttura ricettiva di alto livello con sistema di prenotazione interattivo e animazioni fluide.',
        thumbnail: '/uploads/gsahotels.webp',
        projectUrl: 'https://gsa-hotels-demo.vercel.app/',
        tags: 'Next.js, Tailwind, Animazioni',
        category: 'Sviluppo',
        featured: true,
        order: 1,
      },
      {
        title: 'Vergilius Nectar',
        description: 'Landing page per brand emergente. Visual identity curata, storytelling visivo d\'impatto e performance ottimizzate.',
        longDescription: 'Landing page per brand emergente di bevande naturali.',
        thumbnail: '/uploads/vergiliusnectar.webp',
        projectUrl: 'https://vergiliusnectar-github-io.vercel.app/',
        tags: 'React, Branding, UI Design',
        category: 'Sviluppo',
        featured: true,
        order: 2,
      },
      {
        title: 'Studio Ing. Moretti',
        description: 'Sito professionale per studio di ingegneria. Design pulito, ottimizzato SEO e performance al top. Online e operativo.',
        longDescription: 'Sito aziendale e portfolio per studio di ingegneria civile e strutturale.',
        thumbnail: '/uploads/studioingmoretti.webp',
        projectUrl: 'https://www.studioingmoretti.it/',
        tags: 'Next.js, SEO, Sito Professionale',
        category: 'Sviluppo',
        featured: true,
        order: 3,
      },
      {
        title: 'PCS Mantova',
        description: 'Sito istituzionale per azienda del territorio mantovano. Struttura moderna, navigazione intuitiva e immagine coordinata.',
        longDescription: 'Sito istituzionale e catalogo servizi per azienda informatica di Mantova.',
        thumbnail: '/uploads/pcsmantova.webp',
        projectUrl: 'https://pcsmantova-github-io.vercel.app/',
        tags: 'Next.js, Design, Sviluppo',
        category: 'Sviluppo',
        featured: true,
        order: 4,
      },
      {
        title: 'Canapa Store',
        description: 'Concept store per prodotti naturali. Esperienza d\'acquisto fluida con design minimal, palette terrosa e attenzione al dettaglio.',
        longDescription: 'E-commerce concept store per prodotti naturali biologici.',
        thumbnail: '/uploads/canapastore.webp',
        projectUrl: 'https://canapa-store.vercel.app/',
        tags: 'Next.js, E-commerce, UI Design',
        category: 'Sviluppo',
        featured: true,
        order: 5,
      },
      {
        title: 'Pigg',
        description: 'Cortometraggio realizzato per l\'Accademia di Belle Arti: la storia di un ragazzo bullizzato che si rimette in piedi da solo dopo che gli è stato affibbiato un nome che non gli appartiene.',
        longDescription: 'Cortometraggio drammatico d\'autore, regia e montaggio.',
        thumbnail: '/uploads/pigg-cover.webp',
        projectUrl: 'https://youtu.be/rc6GzCBa2LY',
        tags: 'Cortometraggio, Montaggio, Color Grading',
        category: 'Video',
        featured: true,
        order: 6,
      },
      {
        title: 'Flussi di Coscienza',
        description: 'Copertina e impaginazione editoriale per saggio contemporaneo.',
        longDescription: 'Progetto di visual identity e copertina editoriale.',
        thumbnail: '/uploads/design-works/Misti/CopertinaFlussiDiCoscienza-OUS.webp',
        projectUrl: '',
        tags: 'Design, Editoriale, Grafica',
        category: 'Design',
        featured: false,
        order: 7,
      },
      {
        title: 'Introspection',
        description: 'Poster artistico concettuale sul tema dell\'introspezione e della psiche.',
        longDescription: 'Poster e opera grafica su stampa Fine Art.',
        thumbnail: '/uploads/design-works/Misti/IntrospectionPoster.webp',
        projectUrl: '',
        tags: 'Poster, Fine Art, Grafica',
        category: 'Design',
        featured: false,
        order: 8,
      },
      {
        title: 'Obi-Wan Kenobi',
        description: 'Poster celebrativo per la serie sci-fi con composizione tipografica e visual storytelling.',
        longDescription: 'Poster tribute in stile cinematico.',
        thumbnail: '/uploads/design-works/Misti/ObiWanPoster.webp',
        projectUrl: '',
        tags: 'Poster, Fan Art, Compositing',
        category: 'Design',
        featured: false,
        order: 9,
      },
      {
        title: 'Trovare le parole',
        description: 'Visual storytelling e grafica di sensibilizzazione sociale.',
        longDescription: 'Progetto grafico per campagna di sensibilizzazione.',
        thumbnail: '/uploads/design-works/Misti/TrovareLeParolePerRaccontareUnaViolenzaFisica.webp',
        projectUrl: '',
        tags: 'Branding, Social Awareness, Grafica',
        category: 'Design',
        featured: false,
        order: 10,
      },
      {
        title: 'Vergilius Nectar Poster',
        description: 'Poster pubblicitario per brand di bevande naturali.',
        longDescription: 'Materiale promozionale e cartellonistica pubblicitaria.',
        thumbnail: '/uploads/design-works/Misti/VergiliusNectarPoster.webp',
        projectUrl: '',
        tags: 'Pubblicità, Packaging, Branding',
        category: 'Design',
        featured: false,
        order: 11,
      },
      {
        title: 'Design Editoriale — Vol. 1',
        description: 'Impaginazione e layout tipografico per catalogo e pubblicazioni artistiche.',
        longDescription: 'Progetto editoriale e impaginato artistico.',
        thumbnail: '/uploads/design-works/Misti/IMG_20251017_201424_889.webp',
        projectUrl: '',
        tags: 'Editorial, Tipografia, Layout',
        category: 'Design',
        featured: false,
        order: 12,
      },
      {
        title: 'Design Editoriale — Vol. 2',
        description: 'Catalogo fotografico e studi tipografici con griglie modulari svizzere.',
        longDescription: 'Design editoriale d\'avanguardia.',
        thumbnail: '/uploads/design-works/Misti/IMG_20251017_201938_166.webp',
        projectUrl: '',
        tags: 'Editorial, Griglie, Fotografia',
        category: 'Design',
        featured: false,
        order: 13,
      },
      {
        title: 'Design Editoriale — Vol. 2B',
        description: 'Volume fotografico artistico con finiture e contrasti monocromatici.',
        longDescription: 'Impaginato d\'autore a tiratura limitata.',
        thumbnail: '/uploads/design-works/Misti/IMG_20251017_202553_172.webp',
        projectUrl: '',
        tags: 'Editorial, Monocromatico, Tipografia',
        category: 'Design',
        featured: false,
        order: 14,
      },
      {
        title: 'Design Editoriale — Vol. 3',
        description: 'Impaginato editoriale sperimentale con accostamenti cromatici audaci.',
        longDescription: 'Pubblicazione d\'arte e sperimentazione visiva.',
        thumbnail: '/uploads/design-works/Misti/IMG_20251017_203329_129.webp',
        projectUrl: '',
        tags: 'Editorial, Sperimentale, Arte',
        category: 'Design',
        featured: false,
        order: 15,
      },
      {
        title: 'Collage Digitale Astratto',
        description: 'Composizione artistica contemporanea con tecniche miste digitali.',
        longDescription: 'Opera grafica digitale a tecnica mista.',
        thumbnail: '/uploads/design-works/Misti/IMG_20251017_202838_852.webp',
        projectUrl: '',
        tags: 'Collage, Arte Digitale, Astratto',
        category: 'Design',
        featured: false,
        order: 16,
      },
      {
        title: 'DestTime — Shaman King',
        description: 'Campagna social e caroselli informativi dedicati alla cultura anime e manga.',
        longDescription: 'Contenuti social e caroselli per community digitale.',
        thumbnail: '/uploads/design-works/DestTime Post about Shaman King/LaCalmaELaPazienza_PrimaSlide_Finale.webp',
        projectUrl: '',
        tags: 'Social Media, Caroselli, Graphic Design',
        category: 'Social',
        featured: false,
        order: 17,
      },
      {
        title: 'DestTime — My Hero Academia',
        description: 'Set di grafiche per post Instagram ad alto coinvolgimento visivo.',
        longDescription: 'Social media kit e carosello a 9 slide.',
        thumbnail: '/uploads/design-works/DestTime Post about MHA/MHA_Post_1.webp',
        projectUrl: '',
        tags: 'Social Media, Instagram, Grafica',
        category: 'Social',
        featured: false,
        order: 18,
      },
      {
        title: 'DestTime — Spider-Man',
        description: 'Post social dedicati al franchise con stile grafico dinamico e accattivante.',
        longDescription: 'Design per canali social e storytelling per immagini.',
        thumbnail: '/uploads/design-works/DestTime Post about Spiderman/Spiderman-EffettoNostalgia_PrimaSlide-Rivisitata.webp',
        projectUrl: '',
        tags: 'Social Media, Storytelling, Design',
        category: 'Social',
        featured: false,
        order: 19,
      },
      {
        title: 'DestTime — Stories Social',
        description: 'Format verticale per Instagram Stories e podcast release.',
        longDescription: 'Template e grafiche verticali per Spotify e Apple Podcast.',
        thumbnail: '/uploads/design-works/DestTime Stories about their social contacts/Storia_Social_Spotify_Podcast.webp',
        projectUrl: '',
        tags: 'Stories, 9:16, Podcast, Social',
        category: 'Social',
        featured: false,
        order: 20,
      },
    ];

    for (const p of defaultProjects) {
      const existing = await prisma.project.findFirst({ where: { title: p.title } });
      if (!existing) {
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
    const { title, description, longDescription, thumbnail, projectUrl, githubUrl, tags, category, featured, order } = body;

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
        category: category || 'Sviluppo',
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

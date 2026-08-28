import fs from 'fs';
import path from 'path';

// Parse .env
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const idx = trimmed.indexOf('=');
      const key = trimmed.slice(0, idx).trim();
      let val = trimmed.slice(idx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      process.env[key] = val;
    }
  }
}

async function main() {
  const { PrismaClient } = await import('@prisma/client');
  const { PrismaLibSql } = await import('@prisma/adapter-libsql');

  const adapter = new PrismaLibSql({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  const prisma = new PrismaClient({ adapter });

  console.log('--- Syncing Projects in Turso DB ---');

  const canonicalProjects = [
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
      gallery: null,
      pdfUrl: null,
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
      gallery: null,
      pdfUrl: null,
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
      gallery: null,
      pdfUrl: null,
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
      gallery: null,
      pdfUrl: null,
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
      gallery: null,
      pdfUrl: null,
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
      gallery: null,
      pdfUrl: null,
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
      gallery: JSON.stringify(['/uploads/design-works/Misti/CopertinaFlussiDiCoscienza-OUS.webp']),
      pdfUrl: null,
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
      gallery: JSON.stringify(['/uploads/design-works/Misti/IntrospectionPoster.webp']),
      pdfUrl: null,
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
      gallery: JSON.stringify(['/uploads/design-works/Misti/ObiWanPoster.webp']),
      pdfUrl: null,
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
      gallery: JSON.stringify(['/uploads/design-works/Misti/TrovareLeParolePerRaccontareUnaViolenzaFisica.webp']),
      pdfUrl: null,
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
      gallery: JSON.stringify(['/uploads/design-works/Misti/VergiliusNectarPoster.webp']),
      pdfUrl: null,
    },
    {
      title: 'Design Editoriale — Vol. 1',
      description: 'Impaginazione e layout tipografico per catalogo e pubblicazioni artistiche.',
      longDescription: 'Progetto editoriale e impaginato artistico con 12 composizioni.',
      thumbnail: '/uploads/design-works/Misti/IMG_20251017_201424_889.webp',
      projectUrl: '',
      tags: 'Editorial, Tipografia, Layout',
      category: 'Design',
      featured: false,
      order: 12,
      gallery: JSON.stringify([
        '/uploads/design-works/Misti/IMG_20251017_201424_889.webp',
        '/uploads/design-works/Misti/IMG_20251017_201427_806.webp',
        '/uploads/design-works/Misti/IMG_20251017_201445_008.webp',
        '/uploads/design-works/Misti/IMG_20251017_201501_982.webp',
        '/uploads/design-works/Misti/IMG_20251017_201503_944.webp',
        '/uploads/design-works/Misti/IMG_20251017_201510_743.webp',
        '/uploads/design-works/Misti/IMG_20251017_201511_187.webp',
        '/uploads/design-works/Misti/IMG_20251017_201517_956.webp',
        '/uploads/design-works/Misti/IMG_20251017_201521_619.webp',
        '/uploads/design-works/Misti/IMG_20251017_201523_019.webp',
        '/uploads/design-works/Misti/IMG_20251017_201524_835.webp',
        '/uploads/design-works/Misti/IMG_20251017_201747_039.webp',
      ]),
      pdfUrl: null,
    },
    {
      title: 'Design Editoriale — Vol. 2',
      description: 'Catalogo fotografico e studi tipografici con griglie modulari svizzere.',
      longDescription: 'Design editoriale d\'avanguardia e mockup di brand identity.',
      thumbnail: '/uploads/design-works/Misti/IMG_20251017_201938_166.webp',
      projectUrl: '',
      tags: 'Editorial, Griglie, Fotografia',
      category: 'Design',
      featured: false,
      order: 13,
      gallery: JSON.stringify([
        '/uploads/design-works/Misti/IMG_20251017_201938_166.webp',
        '/uploads/design-works/Misti/IMG_20251017_202112_932.webp',
        '/uploads/design-works/Misti/IMG_20251017_202156_558.webp',
        '/uploads/design-works/Misti/IMG_20251017_202157_678.webp',
      ]),
      pdfUrl: null,
    },
    {
      title: 'Design Editoriale — Vol. 2B',
      description: 'Volume fotografico artistico con finiture e contrasti monocromatici.',
      longDescription: 'Impaginato d\'autore a tiratura limitata, poster e grafiche social per iPalBoyTV.',
      thumbnail: '/uploads/design-works/Misti/IMG_20251017_202553_172.webp',
      projectUrl: '',
      tags: 'Editorial, Monocromatico, Tipografia',
      category: 'Design',
      featured: false,
      order: 14,
      gallery: JSON.stringify([
        '/uploads/design-works/Misti/IMG_20251017_202553_172.webp',
        '/uploads/design-works/Misti/IMG_20251017_202635_900.webp',
        '/uploads/design-works/Misti/IMG_20251017_202648_672.webp',
        '/uploads/design-works/Misti/IMG_20251017_202731_403.webp',
      ]),
      pdfUrl: null,
    },
    {
      title: 'Design Editoriale — Vol. 3',
      description: 'Impaginato editoriale sperimentale con accostamenti cromatici audaci.',
      longDescription: 'Pubblicazione d\'arte e sperimentazione visiva, brochure e flyer.',
      thumbnail: '/uploads/design-works/Misti/IMG_20251017_203329_129.webp',
      projectUrl: '',
      tags: 'Editorial, Sperimentale, Arte',
      category: 'Design',
      featured: false,
      order: 15,
      gallery: JSON.stringify([
        '/uploads/design-works/Misti/IMG_20251017_203329_129.webp',
        '/uploads/design-works/Misti/IMG_203335_448.webp',
        '/uploads/design-works/Misti/IMG_20251017_203516_990.webp',
        '/uploads/design-works/Misti/IMG_20251017_203518_207.webp',
        '/uploads/design-works/Misti/IMG_20251017_203520_468.webp',
        '/uploads/design-works/Misti/IMG_20251017_203524_068.webp',
      ]),
      pdfUrl: null,
    },
    {
      title: 'Collage Digitale Astratto',
      description: 'Composizione artistica contemporanea con tecniche miste digitali.',
      longDescription: 'Opera grafica digitale a tecnica mista con texture stratificate.',
      thumbnail: '/uploads/design-works/Misti/IMG_20251017_202838_852.webp',
      projectUrl: '',
      tags: 'Collage, Arte Digitale, Astratto',
      category: 'Design',
      featured: false,
      order: 16,
      gallery: JSON.stringify(['/uploads/design-works/Misti/IMG_20251017_202838_852.webp']),
      pdfUrl: null,
    },
    {
      title: 'DestTime — Shaman King',
      description: 'Campagna social e caroselli informativi dedicati alla cultura anime e manga.',
      longDescription: 'Contenuti social e caroselli a 7 slide per community digitale.',
      thumbnail: '/uploads/design-works/DestTime Post about Shaman King/LaCalmaELaPazienza_PrimaSlide_Finale.webp',
      projectUrl: '',
      tags: 'Social Media, Caroselli, Graphic Design',
      category: 'Social',
      featured: false,
      order: 17,
      gallery: JSON.stringify([
        '/uploads/design-works/DestTime Post about Shaman King/LaCalmaELaPazienza_PrimaSlide_Finale.webp',
        '/uploads/design-works/DestTime Post about Shaman King/LaCalmaELaPazienza_SecondaSlide.webp',
        '/uploads/design-works/DestTime Post about Shaman King/LaCalmaELaPazienza_TerzaSlide.webp',
        '/uploads/design-works/DestTime Post about Shaman King/LaCalmaELaPazienza_QuartaSlide.webp',
        '/uploads/design-works/DestTime Post about Shaman King/LaCalmaELaPazienza_QuintaSlide.webp',
        '/uploads/design-works/DestTime Post about Shaman King/LaCalmaELaPazienza_SestaSlide.webp',
        '/uploads/design-works/DestTime Post about Shaman King/LaCalmaELaPazienza_SettimaSlide_Alt_Bold.webp',
      ]),
      pdfUrl: null,
    },
    {
      title: 'DestTime — My Hero Academia',
      description: 'Set di grafiche per post Instagram ad alto coinvolgimento visivo.',
      longDescription: 'Social media kit e carosello a 9 slide narrative.',
      thumbnail: '/uploads/design-works/DestTime Post about MHA/MHA_Post_1.webp',
      projectUrl: '',
      tags: 'Social Media, Instagram, Grafica',
      category: 'Social',
      featured: false,
      order: 18,
      gallery: JSON.stringify([
        '/uploads/design-works/DestTime Post about MHA/MHA_Post_1.webp',
        '/uploads/design-works/DestTime Post about MHA/MHA_Post_2.webp',
        '/uploads/design-works/DestTime Post about MHA/MHA_Post_3.webp',
        '/uploads/design-works/DestTime Post about MHA/MHA_Post_4.webp',
        '/uploads/design-works/DestTime Post about MHA/MHA_Post_5.webp',
        '/uploads/design-works/DestTime Post about MHA/MHA_Post_6.webp',
        '/uploads/design-works/DestTime Post about MHA/MHA_Post_7.webp',
        '/uploads/design-works/DestTime Post about MHA/MHA_Post_8.webp',
        '/uploads/design-works/DestTime Post about MHA/MHA_Post_9.webp',
      ]),
      pdfUrl: null,
    },
    {
      title: 'DestTime — Spider-Man',
      description: 'Post social dedicati al franchise con stile grafico dinamico e accattivante.',
      longDescription: 'Design per canali social e storytelling per immagini su 7 slide.',
      thumbnail: '/uploads/design-works/DestTime Post about Spiderman/Spiderman-EffettoNostalgia_PrimaSlide-Rivisitata.webp',
      projectUrl: '',
      tags: 'Social Media, Storytelling, Design',
      category: 'Social',
      featured: false,
      order: 19,
      gallery: JSON.stringify([
        '/uploads/design-works/DestTime Post about Spiderman/Spiderman-EffettoNostalgia_PrimaSlide-Rivisitata.webp',
        '/uploads/design-works/DestTime Post about Spiderman/Spiderman-EffettoNostalgia_SecondaSlide.webp',
        '/uploads/design-works/DestTime Post about Spiderman/Spiderman-EffettoNostalgia_TerzaSlide.webp',
        '/uploads/design-works/DestTime Post about Spiderman/Spiderman-EffettoNostalgia_QuartaSlide.webp',
        '/uploads/design-works/DestTime Post about Spiderman/Spiderman-EffettoNostalgia_QuintaSlide.webp',
        '/uploads/design-works/DestTime Post about Spiderman/Spiderman-EffettoNostalgia_SestaSlide.webp',
        '/uploads/design-works/DestTime Post about Spiderman/Spiderman-EffettoNostalgia_SettimaSlide.webp',
      ]),
      pdfUrl: null,
    },
    {
      title: 'DestTime — Stories Social',
      description: 'Format verticale per Instagram Stories e podcast release.',
      longDescription: 'Template e grafiche verticali 9:16 per Spotify, YouTube e Apple Podcast.',
      thumbnail: '/uploads/design-works/DestTime Stories about their social contacts/Storia_Social_Spotify_Podcast.webp',
      projectUrl: '',
      tags: 'Stories, 9:16, Podcast, Social',
      category: 'Social',
      featured: false,
      order: 20,
      gallery: JSON.stringify([
        '/uploads/design-works/DestTime Stories about their social contacts/Storia_Social_Spotify_Podcast.webp',
        '/uploads/design-works/DestTime Stories about their social contacts/Storia_Social_Facebook.webp',
        '/uploads/design-works/DestTime Stories about their social contacts/Storia_Social_Apple_Podcast.webp',
        '/uploads/design-works/DestTime Stories about their social contacts/Storia_Social_Youtube.webp',
        '/uploads/design-works/DestTime Stories about their social contacts/Storia_Social_Blog.webp',
        '/uploads/design-works/DestTime Stories about their social contacts/Storia_Social_Tiktok.webp',
        '/uploads/design-works/DestTime Stories about their social contacts/Storia_Social_Telegram.webp',
      ]),
      pdfUrl: null,
    },
    {
      title: 'Progetti di UI',
      description: 'Portfolio PDF con progetti di UI/UX design: WCM (WeCanMake) e materiali per l\'Istituto Fermi. Raccolta di design editoriali, branding e interfacce.',
      longDescription: 'Portfolio completo in formato PDF con progetti di UI/UX, brand identity e prototipazione per WCM.',
      thumbnail: '/uploads/design-works/Misti/CopertinaFlussiDiCoscienza-OUS.webp',
      projectUrl: '',
      tags: 'Design, UI/UX, PDF, WCM',
      category: 'Design',
      featured: false,
      order: 21,
      gallery: null,
      pdfUrl: '/uploads/design-works/Misti/WCM.pdf',
    },
  ];

  for (const p of canonicalProjects) {
    const existing = await prisma.project.findFirst({ where: { title: p.title } });
    if (existing) {
      await prisma.project.update({
        where: { id: existing.id },
        data: {
          description: p.description,
          longDescription: p.longDescription,
          thumbnail: p.thumbnail,
          projectUrl: p.projectUrl,
          tags: p.tags,
          category: p.category,
          featured: p.featured,
          order: p.order,
          gallery: p.gallery,
          pdfUrl: p.pdfUrl,
        },
      });
      console.log(`Updated project [${p.order}] "${p.title}"`);
    } else {
      await prisma.project.create({
        data: p,
      });
      console.log(`Created project [${p.order}] "${p.title}"`);
    }
  }

  const all = await prisma.project.findMany({ orderBy: { order: 'asc' } });
  console.log(`✅ Total projects synchronized in Turso DB: ${all.length}`);
}

main().catch(console.error);

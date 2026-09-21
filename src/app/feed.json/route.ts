import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const revalidate = 3600;

interface FeedProjectItem {
  id: string;
  title: string;
  description: string;
  url: string;
  image?: string;
  tags: string[];
  date_published: string;
}

const DEFAULT_PROJECTS: FeedProjectItem[] = [
  {
    id: 'gsa-hotels',
    title: 'GSA Hotels',
    description: 'Prototipo di sito luxury per struttura ricettiva di alto livello. Design raffinato, animazioni fluide e sistema di prenotazione interattivo.',
    url: 'https://gsa-hotels-demo.vercel.app/',
    image: 'https://tiadesigns.it/uploads/gsahotels.webp',
    tags: ['Next.js', 'Tailwind', 'Luxury', 'Booking'],
    date_published: '2026-03-01T00:00:00Z',
  },
  {
    id: 'vergilius-nectar',
    title: 'Vergilius Nectar',
    description: 'Landing page per brand emergente. Visual identity curata, storytelling visivo d\'impatto e performance ottimizzate.',
    url: 'https://vergiliusnectar-github-io.vercel.app/',
    image: 'https://tiadesigns.it/uploads/vergiliusnectar.webp',
    tags: ['React', 'Branding', 'UI Design'],
    date_published: '2026-02-15T00:00:00Z',
  },
  {
    id: 'studio-ing-moretti',
    title: 'Studio Ing. Moretti',
    description: 'Sito professionale per studio di ingegneria. Design pulito, ottimizzato SEO e performance al top. Online e operativo.',
    url: 'https://www.studioingmoretti.it/',
    image: 'https://tiadesigns.it/uploads/studioingmoretti.webp',
    tags: ['Next.js', 'SEO', 'Sito Professionale'],
    date_published: '2026-01-20T00:00:00Z',
  },
  {
    id: 'pcs-mantova',
    title: 'PCS Mantova',
    description: 'Sito istituzionale per azienda del territorio mantovano. Struttura moderna, navigazione intuitiva e immagine coordinata.',
    url: 'https://pcsmantova-github-io.vercel.app/',
    image: 'https://tiadesigns.it/uploads/pcsmantova.webp',
    tags: ['Next.js', 'Design', 'Sviluppo'],
    date_published: '2026-01-10T00:00:00Z',
  },
  {
    id: 'canapa-store',
    title: 'Canapa Store',
    description: 'Piattaforma e-commerce per negozio specializzato. Catalogo prodotti, carrello e checkout interattivo.',
    url: 'https://tiadesigns.it/#progetti',
    image: 'https://tiadesigns.it/uploads/canapastore.webp',
    tags: ['Next.js', 'E-commerce', 'UI/UX'],
    date_published: '2025-12-05T00:00:00Z',
  },
];

export async function GET() {
  let items = DEFAULT_PROJECTS;
  try {
    const dbProjects = await prisma.project.findMany({
      orderBy: { order: 'asc' },
    });
    if (dbProjects && dbProjects.length > 0) {
      items = dbProjects.map((p) => ({
        id: p.id || p.title.toLowerCase().replace(/\s+/g, '-'),
        title: p.title,
        description: p.description || p.longDescription || '',
        url: p.projectUrl || 'https://tiadesigns.it/#progetti',
        image: p.thumbnail ? (p.thumbnail.startsWith('http') ? p.thumbnail : `https://tiadesigns.it${p.thumbnail}`) : undefined,
        tags: p.tags ? p.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
        date_published: p.createdAt ? p.createdAt.toISOString() : new Date().toISOString(),
      }));
    }
  } catch {
    // Fallback to DEFAULT_PROJECTS
  }

  const siteUrl = 'https://tiadesigns.it';

  const feed = {
    version: 'https://jsonfeed.org/version/1.1',
    title: 'Tia Designs — Portfolio & Lavori',
    home_page_url: siteUrl,
    feed_url: `${siteUrl}/feed.json`,
    description: 'Progetti recenti, lavori e produzioni digitali di Mattia Chinaglia (Tia Designs): sviluppo web, UI/UX, video making e automazioni AI.',
    user_comment: 'Questo feed è generato automaticamente da Tia Designs. Usalo con il tuo aggregatore preferito o newsletter automatica.',
    favicon: `${siteUrl}/favicon.ico`,
    authors: [
      {
        name: 'Mattia Chinaglia',
        url: siteUrl,
      },
    ],
    items: items.map((item) => ({
      id: item.id,
      url: item.url,
      title: item.title,
      content_text: item.description,
      summary: item.description,
      image: item.image,
      date_published: item.date_published,
      tags: item.tags,
    })),
  };

  return NextResponse.json(feed, {
    headers: {
      'Content-Type': 'application/feed+json; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}

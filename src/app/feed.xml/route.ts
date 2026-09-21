import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const revalidate = 3600;

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

const DEFAULT_PROJECTS = [
  {
    title: 'GSA Hotels',
    description: 'Prototipo di sito luxury per struttura ricettiva di alto livello. Design raffinato, animazioni fluide e sistema di prenotazione interattivo.',
    url: 'https://gsa-hotels-demo.vercel.app/',
    category: 'Sviluppo Web',
    date: new Date('2026-03-01T00:00:00Z'),
  },
  {
    title: 'Vergilius Nectar',
    description: 'Landing page per brand emergente. Visual identity curata, storytelling visivo d\'impatto e performance ottimizzate.',
    url: 'https://vergiliusnectar-github-io.vercel.app/',
    category: 'Branding & Web',
    date: new Date('2026-02-15T00:00:00Z'),
  },
  {
    title: 'Studio Ing. Moretti',
    description: 'Sito professionale per studio di ingegneria. Design pulito, ottimizzato SEO e performance al top. Online e operativo.',
    url: 'https://www.studioingmoretti.it/',
    category: 'Sito Professionale',
    date: new Date('2026-01-20T00:00:00Z'),
  },
  {
    title: 'PCS Mantova',
    description: 'Sito istituzionale per azienda del territorio mantovano. Struttura moderna, navigazione intuitiva e immagine coordinata.',
    url: 'https://pcsmantova-github-io.vercel.app/',
    category: 'Sviluppo Web',
    date: new Date('2026-01-10T00:00:00Z'),
  },
  {
    title: 'Canapa Store',
    description: 'Piattaforma e-commerce per negozio specializzato. Catalogo prodotti, carrello e checkout interattivo.',
    url: 'https://tiadesigns.it/#progetti',
    category: 'E-commerce',
    date: new Date('2025-12-05T00:00:00Z'),
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
        title: p.title,
        description: p.description || p.longDescription || '',
        url: p.projectUrl || `https://tiadesigns.it/#progetti`,
        category: p.category || 'Portfolio',
        date: p.createdAt || new Date(),
      }));
    }
  } catch {
    // Fallback to DEFAULT_PROJECTS
  }

  const siteUrl = 'https://tiadesigns.it';
  const now = new Date().toUTCString();

  const xmlItems = items
    .map(
      (item) => `    <item>
      <title>${escapeXml(item.title)}</title>
      <link>${escapeXml(item.url)}</link>
      <guid isPermaLink="false">${escapeXml(item.title.toLowerCase().replace(/\s+/g, '-'))}</guid>
      <description>${escapeXml(item.description)}</description>
      <category>${escapeXml(item.category)}</category>
      <pubDate>${item.date.toUTCString()}</pubDate>
    </item>`,
    )
    .join('\n');

  const rssXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Tia Designs — Portfolio &amp; Lavori</title>
    <link>${siteUrl}</link>
    <description>Progetti recenti, lavori e produzioni digitali di Mattia Chinaglia (Tia Designs): sviluppo web, UI/UX, video making e automazioni AI.</description>
    <language>it-IT</language>
    <lastBuildDate>${now}</lastBuildDate>
    <atom:link href="${siteUrl}/feed.xml" rel="self" type="application/rss+xml"/>
${xmlItems}
  </channel>
</rss>`;

  return new NextResponse(rssXml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}

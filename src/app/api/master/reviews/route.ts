import { NextRequest, NextResponse } from 'next/server';
import { prisma, getDatabaseErrorMessage } from '@/lib/prisma';
import { getSession } from '@/lib/session';

export async function GET() {
  try {
    const count = await prisma.clientReview.count();
    if (count === 0) {
      const defaultReviews = [
        { author: 'Laura Bertoni', role: 'PCS Mantova', company: 'PCS Mantova', companyLogo: '/uploads/pcsmantova.png', showLogo: true, quoteIt: 'Il nuovo sito di PCS Mantova è moderno, veloce e semplicissimo da navigare. Tia ha curato ogni dettaglio e ha valorizzato al meglio la nostra immagine. Collaborazione impeccabile.', rating: 5, order: 1 },
        { author: 'DestTime', role: 'Content Creator', company: 'DestTime Channel', companyLogo: null, showLogo: false, quoteIt: 'Tia ha trasformato la nostra pagina Instagram con post sempre curati e coerenti con il brand. La qualità grafica si vede, e i risultati pure. Super consigliato.', rating: 5, order: 2 },
        { author: 'Gianluca Rigodanza', role: 'iPalBoyTV — YouTuber', company: 'iPalBoyTV', companyLogo: null, showLogo: false, quoteIt: 'Le copertine che Tia ha realizzato per il mio canale (Design Editoriale Vol. 2B) sono di un livello altissimo. Ha capito esattamente cosa volevo comunicare e lo ha trasformato in un\'immagine che mi rappresenta. Un vero professionista.', rating: 5, order: 3 },
        { author: 'Ous', role: 'Artista musicale', company: 'OUS Records', companyLogo: null, showLogo: false, quoteIt: 'La copertina del mio pezzo ha superato ogni aspettativa. Tia ha colto l\'essenza della musica e l\'ha resa immagine, potente e memorabile. Lavoro straordinario.', rating: 5, order: 4 },
        { author: 'Stefano Golisano', role: 'GSA Hotels', company: 'GSA Hotels Group', companyLogo: '/uploads/gsahotels.png', showLogo: true, quoteIt: 'Il sito di GSA Hotels è elegante e di grande impatto, proprio come volevamo per la nostra struttura. Animazioni fluide e un\'attenzione maniacale ai dettagli. Esperienza impeccabile.', rating: 5, order: 5 },
        { author: 'Vergilius Nectar', role: 'Brand', company: 'Vergilius Nectar', companyLogo: '/uploads/vergiliusnectar.png', showLogo: true, quoteIt: 'Sito e grafiche coordinati alla perfezione: Tia ha costruito un\'identità visiva completa e coerente che ci rappresenta davvero. Comunicazione chiara e risultati oltre le aspettative.', rating: 5, order: 6 },
        { author: 'Fiera Millenaria di Gonzaga', role: 'Evento & Comunicazione', company: 'Fiera Millenaria', companyLogo: null, showLogo: false, quoteIt: 'Post e grafiche curatissimi che hanno dato grande visibilità alla Fiera. Tia unisce creatività e puntualità, con uno stile sempre in linea con la tradizione dell\'evento. Ottimo lavoro.', rating: 5, order: 7 },
        { author: 'Davide Moretti', role: 'Ingegnere', company: 'Studio Ing. Moretti', companyLogo: '/uploads/studioingmoretti.png', showLogo: true, quoteIt: 'Il mio sito da ingegnere è pulito, professionale e perfettamente ottimizzato per i motori di ricerca. Tia ha saputo tradurre il mio lavoro in un progetto raffinato e funzionale. Non potrei essere più soddisfatto.', rating: 5, order: 8 },
      ];

      for (const r of defaultReviews) {
        await prisma.clientReview.create({
          data: {
            author: r.author,
            role: r.role,
            company: r.company,
            companyLogo: r.companyLogo,
            showLogo: r.showLogo,
            quoteIt: r.quoteIt,
            rating: r.rating,
            order: r.order,
            isApproved: true,
          },
        });
      }
    }

    const reviews = await prisma.clientReview.findMany({
      orderBy: { order: 'asc' },
    });
    return NextResponse.json(reviews);
  } catch (error: any) {
    console.error('Error fetching reviews:', error);
    return NextResponse.json({ error: getDatabaseErrorMessage(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.username !== 'master') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { author, role, company, companyLogo, showLogo, quoteIt, quoteEn, quoteEs, rating, avatarUrl, order, isApproved } = body;

    if (!author || !role || !quoteIt) {
      return NextResponse.json({ error: 'Autore, Ruolo e Testimonianza (Italiano) sono obbligatori' }, { status: 400 });
    }

    const created = await prisma.clientReview.create({
      data: {
        author,
        role,
        company: company || null,
        companyLogo: companyLogo || null,
        showLogo: typeof showLogo === 'boolean' ? showLogo : true,
        quoteIt,
        quoteEn: quoteEn || null,
        quoteEs: quoteEs || null,
        rating: typeof rating === 'number' ? rating : 5,
        avatarUrl: avatarUrl || null,
        order: typeof order === 'number' ? order : 0,
        isApproved: typeof isApproved === 'boolean' ? isApproved : true,
      },
    });

    return NextResponse.json(created);
  } catch (error: any) {
    console.error('Error creating review:', error);
    return NextResponse.json({ error: getDatabaseErrorMessage(error) }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.username !== 'master') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, ...data } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const updated = await prisma.clientReview.update({
      where: { id },
      data,
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('Error updating review:', error);
    return NextResponse.json({ error: getDatabaseErrorMessage(error) }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.username !== 'master') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    await prisma.clientReview.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting review:', error);
    return NextResponse.json({ error: getDatabaseErrorMessage(error) }, { status: 500 });
  }
}

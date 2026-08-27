import { NextRequest, NextResponse } from 'next/server';
import { prisma, getDatabaseErrorMessage } from '@/lib/prisma';
import { getSession } from '@/lib/session';

export async function GET() {
  try {
    const count = await prisma.faqItem.count();
    if (count === 0) {
      const itFaqs = [
        { q: 'Il preventivo è gratuito?', a: 'Sì, il preventivo è completamente gratuito e senza impegno. Basta descrivere il progetto nel chatbot o nel form di contatto: riceverai un\'analisi dettagliata con costi e tempistiche, senza alcun obbligo.', cat: 'general' },
        { q: 'Ci sono costi ricorrenti nascosti?', a: 'No, nessun costo nascosto. Per siti e app i costi ricorrenti si limitano a dominio e hosting, che ti spiego in anticipo e che puoi gestire tu o affidare a me. Qualsiasi altra voce è sempre concordata prima di iniziare.', cat: 'pricing' },
        { q: 'Quali sono le tempistiche?', a: 'Dipende dal progetto: un sito vetrina richiede 2-3 settimane, una piattaforma web 4-6, un\'app mobile 4-8. Dopo il briefing iniziale ricevi sempre una timeline precisa, con milestone chiare a ogni fase.', cat: 'general' },
        { q: 'Come funziona il processo di lavoro, dall\'idea alla consegna?', a: 'Il processo si divide in 6 fasi: consulenza gratuita, analisi e preventivo, design e prototipo, sviluppo, test e revisioni, consegna e lancio. Massima trasparenza in ogni step.', cat: 'process' },
        { q: 'Chi detiene la proprietà del progetto e ricevo i file sorgente?', a: 'A saldo avvenuto la proprietà è tua: ricevi tutti i file sorgente (codice, progetti Figma, asset) e puoi portare il progetto dove preferisci, senza vincoli.', cat: 'legal' },
        { q: 'Firmi un accordo di riservatezza (NDA)?', a: 'Sì, firmo NDA senza problemi. La tua idea e i tuoi dati restano riservati e posso lavorare sia da remoto che di persona.', cat: 'legal' },
        { q: 'Offri supporto post-lancio e manutenzione?', a: 'Sì. Ogni progetto include una garanzia post-consegna e propongo pacchetti di manutenzione mensile per tenere sito, app o software aggiornato, sicuro e performante nel tempo.', cat: 'support' },
        { q: 'Quante revisioni sono incluse?', a: 'Il numero di revisioni viene stabilito in fase di preventivo in base al progetto. Per i video le revisioni sono illimitate fino all\'ok finale; per design e sviluppo si concordano round di revisione chiari.', cat: 'process' },
        { q: 'Usi template preimpostati o tutto su misura?', a: 'Nessun template e nessun compromesso. Ogni progetto è disegnato e sviluppato da zero con tecnologie moderne, con approccio mobile-first: perfetto su smartphone, tablet e desktop.', cat: 'quality' },
        { q: 'Ti occupi di SEO e velocità (Core Web Vitals)?', a: 'Sì, ogni sito è ottimizzato per i motori di ricerca: struttura semantica, Core Web Vitals, meta tag, performance e best practice SEO on-page.', cat: 'tech' },
        { q: 'Posso gestire i contenuti del sito in autonomia?', a: 'Sì, posso integrare un CMS o un pannello admin personalizzato per aggiornare testi, immagini e prodotti in totale autonomia, senza toccare il codice.', cat: 'tech' },
        { q: 'Posso affidarti anche dominio e hosting?', a: 'Certo. Mi occupo di acquisto del dominio, configurazione dell\'hosting e messa online del progetto, oppure ti guido passo passo se preferisci gestirli tu.', cat: 'tech' },
        { q: 'Posso richiedere solo il design senza lo sviluppo web?', a: 'Assolutamente sì. Posso occuparmi solo di UI/UX, brand identity e prototipazione (ad esempio su Figma), e poi passare i file al team che preferisci.', cat: 'design' },
        { q: 'Che tipo di video realizzi?', a: 'Video aziendali, spot pubblicitari, reel e short per i social, showreel e cortometraggi. Curo l\'intera produzione o solo la post-produzione: montaggio, color grading, motion graphics, sound design e VFX.', cat: 'video' },
        { q: 'Gestisci anche i miei social media?', a: 'Sì, creo post, carousel, stories e thumbnail in linea con la tua identità e i tuoi obiettivi, con piani editoriali personalizzati e pacchetti mensili.', cat: 'social' },
        { q: 'Cosa sono le automazioni con AI (n8n, chatbot, agenti)?', a: 'Sono sistemi che automatizzano i processi ripetitivi della tua azienda: chatbot che rispondono ai clienti, integrazioni tra app e agenti AI che gestiscono dati e report. Meno lavoro manuale, più efficienza.', cat: 'ai' },
        { q: 'Cosa ti serve da me per iniziare il progetto?', a: 'Un briefing: l\'idea generale, i contenuti o i materiali che hai (testi, immagini, logo), eventuali riferimenti che ti piacciono e gli obiettivi che vuoi raggiungere. Se non hai nulla di pronto, ti aiuto io a definire tutto.', cat: 'process' },
        { q: 'Il preventivo è a prezzo fisso? E se lo scope cambia a metà?', a: 'Sì, il preventivo è a prezzo fisso per lo scope concordato. Se i requisiti cambiano a metà progetto, ne parliamo subito e ti propongo un aggiornamento trasparente prima di procedere.', cat: 'pricing' },
        { q: 'Quanto dura la garanzia post-consegna e cosa copre?', a: 'Ogni progetto include un periodo di garanzia post-consegna che copre bug e correzioni dello scope consegnato. La durata esatta è indicata nel preventivo; per il supporto continuativo ci sono i pacchetti mensili.', cat: 'support' },
        { q: 'Offri un pacchetto "tutto incluso"?', a: 'Sì, creo pacchetti completi che uniscono brand identity, sito web, video e gestione social con un unico referente. Chiedi un preventivo personalizzato dal form di contatto o dal chatbot.', cat: 'pricing' },
      ];

      for (let i = 0; i < itFaqs.length; i++) {
        await prisma.faqItem.create({
          data: {
            questionIt: itFaqs[i].q,
            answerIt: itFaqs[i].a,
            category: itFaqs[i].cat,
            order: i + 1,
            isPublished: true,
          },
        });
      }
    }

    const faqs = await prisma.faqItem.findMany({
      orderBy: { order: 'asc' },
    });
    return NextResponse.json(faqs);
  } catch (error: any) {
    console.error('Error fetching FAQs:', error);
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
    const { questionIt, questionEn, questionEs, answerIt, answerEn, answerEs, category, order, isPublished } = body;

    if (!questionIt || !answerIt) {
      return NextResponse.json({ error: 'Domanda e Risposta (Italiano) sono obbligatorie' }, { status: 400 });
    }

    const created = await prisma.faqItem.create({
      data: {
        questionIt,
        questionEn: questionEn || null,
        questionEs: questionEs || null,
        answerIt,
        answerEn: answerEn || null,
        answerEs: answerEs || null,
        category: category || 'general',
        order: typeof order === 'number' ? order : 0,
        isPublished: typeof isPublished === 'boolean' ? isPublished : true,
      },
    });

    return NextResponse.json(created);
  } catch (error: any) {
    console.error('Error creating FAQ:', error);
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

    const updated = await prisma.faqItem.update({
      where: { id },
      data,
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('Error updating FAQ:', error);
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

    await prisma.faqItem.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting FAQ:', error);
    return NextResponse.json({ error: getDatabaseErrorMessage(error) }, { status: 500 });
  }
}

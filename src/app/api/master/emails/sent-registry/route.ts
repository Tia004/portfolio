import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';
import { isDuplicationExempt, getSentEmailSet } from '@/lib/email-dedup';

// Known initial 55 contacts sent before the hotspot disconnection
const INITIAL_SENT_CONTACTS = [
  { email: 'info@mantovamotorgiardino.it', company: 'Mantova Motor Giardino' },
  { email: 'info@hydroplants.it', company: 'Hydroplants' },
  { email: 'giovanisnc@libero.it', company: 'Falegnameria Giovani' },
  { email: 'info@inteext.it', company: 'Ristrutturazioni Roma – Inteext' },
  { email: 'info.festoro@gmail.com', company: 'Festoro Catering' },
  { email: 'affumico@gmail.com', company: 'Affumicatura' },
  { email: 'agriandrea92@gmail.com', company: 'Azienda Agricola Andrea' },
  { email: 'info@daligabue.it', company: 'Ristorante Da Ligabue' },
  { email: 'francorossibologna@hotmail.it', company: 'Ristorante Franco Rossi' },
  { email: 'agriturismoscannaporco@gmail.com', company: 'Agriturismo Scannaporco' },
  { email: 'info@goodvibes.cloud', company: 'Good Vibes' },
  { email: 'info@il-noce.it', company: 'Falegnameria Il Noce' },
  { email: 'info@ts-serramenti.it', company: 'TS Serramenti' },
  { email: 'info@roma-ristrutturazione.it', company: 'Roma Ristrutturazione' },
  { email: 'info@habitat.roma.it', company: 'Habitat Roma' },
  { email: 'info@mm-arredamenti.it', company: 'MM Arredamenti' },
  { email: 'stylarredo.sg@gmail.com', company: 'Stylarredo' },
  { email: 'info@bergamaschiserramenti.it', company: 'Bergamaschi Serramenti' },
  { email: 'info@milanoserramenti.net', company: 'Milano Serramenti' },
  { email: 'info@nericatering.it', company: 'Neri Catering' },
  { email: 'info@rinascitanettuno.it', company: 'Rinascita Nettuno' },
  { email: 'info@bolognaserramenti.it', company: 'Bologna Serramenti' },
  { email: 'info@pancaldiserramenti.com', company: 'Pancaldi Serramenti' },
  { email: 'info@finestrissima.it', company: 'Finestrissima' },
  { email: 'info@smartsystemsimpianti.it', company: 'Smart Systems Impianti' },
  { email: 'info@falegnameriapirondini.com', company: 'Falegnameria Pirondini' },
  { email: 'info@mirtillocatering.com', company: 'Mirtillo Catering' },
  { email: 'info@traslochicannone.com', company: 'Traslochi Cannone' },
  { email: 'info@dagaserramenti.it', company: 'Daga Serramenti' },
  { email: 'info@asserramentisrl.it', company: 'AS Serramenti' },
  { email: 'serramenti@budani.it', company: 'Budani Serramenti' },
  { email: 'agriturismo.corte.vignola@gmail.com', company: 'Agriturismo Corte Vignola' },
  { email: 'info@stefra.it', company: 'Stefra' },
  { email: 'agriturismoalbana@gmail.com', company: 'Agriturismo Albana' },
  { email: 'aziendaagricolacasavilli@hotmail.it', company: 'Azienda Agricola Casavilli' },
  { email: 'info@lezrent.com', company: 'Lez Rent' },
  { email: 'commerciale@rentaltime.it', company: 'Rental Time' },
  { email: 'info@viss.it', company: 'VISS' },
  { email: 'ronchigiardini@gmail.com', company: 'Ronchi Giardini' },
  { email: 'info@lafalegnameriarampini.it', company: 'La Falegnameria Rampini' },
  { email: 'info@quadraserramenti.com', company: 'Quadra Serramenti' },
  { email: 'info@agriturismo-sangirolamo.it', company: 'Agriturismo San Girolamo' },
  { email: 'catering@farsiprossimo.it', company: 'Catering Farsi Prossimo' },
  { email: 'info@milanoserramenti.it', company: 'Milano Serramenti' },
  { email: 'amm.pirontifalegnameria@gmail.com', company: 'Pironti Falegnameria' },
  { email: 'info@falegnameriaprando.it', company: 'Falegnameria Prando' },
  { email: 'aj.falegnameria84@gmail.com', company: 'AJ Falegnameria' },
  { email: 'hello@arbaro.it', company: 'Arbaro' },
  { email: 'space.party@yahoo.it', company: 'Space Party' },
  { email: 'info@stepaparinos.com', company: 'Stepaparinos' },
  { email: 'traslochicaracciolo@gmail.com', company: 'Traslochi Caracciolo' },
  { email: 'request@magevents.it', company: 'Mag Events' },
  { email: 'cobi@cobimeccanica.it', company: 'Cobi Meccanica' },
  { email: 'info@prometeomeccanica.it', company: 'Prometeo Meccanica' },
  { email: 'info@omfsrl.com', company: 'OMF' },
];

// GET /api/master/emails/sent-registry - Protected
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.username !== 'master') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Auto-seed initial 55 contacts if table is empty
    const count = await prisma.sentEmailLog.count();
    if (count === 0) {
      for (const item of INITIAL_SENT_CONTACTS) {
        await prisma.sentEmailLog.create({
          data: {
            email: item.email.toLowerCase().trim(),
            company: item.company,
            source: 'initial_campaign_seed',
          },
        }).catch(() => {});
      }
    }

    const sentEmailSet = await getSentEmailSet();
    const sentEmails = Array.from(sentEmailSet);

    // Fetch recent 50 logs for display
    const recentLogs = await prisma.sentEmailLog.findMany({
      orderBy: { sentAt: 'desc' },
      take: 100,
    });

    return NextResponse.json({
      success: true,
      totalCount: sentEmails.length,
      sentEmails,
      recentLogs,
      exemptEmails: ['info@tiadesigns.it', 'tiachinaglia@gmail.com', 'latitiante@gmail.com'],
    });
  } catch (error: any) {
    console.error('Error fetching sent email registry:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE /api/master/emails/sent-registry - Protected (Remove an email to allow re-contacting)
export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.username !== 'master') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email')?.toLowerCase().trim();

    if (!email) {
      return NextResponse.json({ error: 'Email parameter required' }, { status: 400 });
    }

    await prisma.sentEmailLog.deleteMany({
      where: { email },
    });

    return NextResponse.json({ success: true, message: `Email ${email} rimossa dallo storico.` });
  } catch (error: any) {
    console.error('Error deleting email from registry:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

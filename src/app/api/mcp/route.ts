import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { getServerDb } from '@/lib/crm/serverDb';
import { italianDateKey } from '@/lib/crm/date';

async function getDB() {
  const owner = process.env.MCP_OWNER_USER_ID || 'master';
  const db = await getServerDb();
  const result = await db.execute({ sql: 'SELECT payload,revision FROM crm_data WHERE user_id = ?', args: [owner] });
  const data = result.rows.length ? JSON.parse(String(result.rows[0].payload)) : { opportunities: [], tasks: [], brands: [], salesReps: [] };
  Object.defineProperty(data, '_revision', { value: result.rows.length ? Number(result.rows[0].revision) : 0 });
  return data;
}

async function saveDB(data: any) {
  const db = await getServerDb();
  const revision = data._revision;
  const payload = JSON.stringify(data);
  const updated = await db.execute({ sql: 'UPDATE crm_data SET payload = ?, updated_at = ?, revision = revision + 1 WHERE user_id = ? AND revision = ?', args: [payload, new Date().toISOString(), process.env.MCP_OWNER_USER_ID || 'master', revision] });
  if (!updated.rowsAffected && revision === 0) {
    const inserted = await db.execute({ sql: 'INSERT OR IGNORE INTO crm_data(user_id,payload,updated_at,revision) VALUES (?,?,?,1)', args: [process.env.MCP_OWNER_USER_ID || 'master', payload, new Date().toISOString()] });
    if (inserted.rowsAffected) return;
  }
  if (!updated.rowsAffected) throw new Error('Archivio modificato da un’altra sessione. Riprova.');
}

export async function GET() {
  // Returns server manifest and tools list
  return NextResponse.json({
    name: 'hub-commerciale-mcp-http',
    version: '1.0.0',
    status: process.env.MCP_API_TOKEN && process.env.MCP_OWNER_USER_ID ? 'configured' : 'not_configured',
    tools: [
      'get_commercial_kpis',
      'list_opportunities',
      'create_opportunity',
    ],
  });
}

export async function POST(req: Request) {
  try {
    const configuredToken = process.env.MCP_API_TOKEN;
    if (!configuredToken || !process.env.MCP_OWNER_USER_ID) return NextResponse.json({ success: false, error: 'MCP HTTP non configurato.' }, { status: 503 });
    const suppliedToken = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || '';
    const expected = Buffer.from(configuredToken);
    const actual = Buffer.from(suppliedToken);
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return NextResponse.json({ success: false, error: 'Non autorizzato.' }, { status: 401 });
    const body = await req.json();
    const { action, params } = body;
    const db = await getDB();
    const today = italianDateKey();

    switch (action) {
      case 'get_commercial_kpis': {
        const deals = db.opportunities || [];
        const sold = deals
          .filter((d: any) => d.stage === 'Venduta')
          .reduce((sum: number, d: any) => sum + (d.valueType === 'Mensile' ? d.value * 12 : d.value), 0);
        const openDeals = deals.filter((d: any) => !['Venduta', 'Persa', 'Stand-by'].includes(d.stage));
        const pipeline = openDeals.reduce((sum: number, d: any) => sum + (d.valueType === 'Mensile' ? d.value * 12 : d.value), 0);

        return NextResponse.json({
          success: true,
          data: {
            venduto: sold,
            pipeline,
            trattativeAperte: openDeals.length,
            appuntamenti: (db.tasks || []).filter((t: any) => t.type === 'appuntamento').length,
          },
        });
      }

      case 'list_opportunities': {
        return NextResponse.json({
          success: true,
          data: db.opportunities || [],
        });
      }

      case 'create_opportunity': {
        if (!params || !String(params.name || '').trim() || !String(params.company || '').trim() || !String(params.salesRep || '').trim() || !String(params.nextActionWhat || '').trim() || !/^\d{4}-\d{2}-\d{2}$/.test(String(params.nextActionWhen || '')) || !Number.isFinite(Number(params.value)) || Number(params.value) < 0) return NextResponse.json({ success: false, error: 'Nome, azienda, responsabile, valore e prossima azione sono obbligatori.' }, { status: 400 });
        const chosenBrand = params.brand ? String(params.brand).trim() : (db.brands && db.brands[0]) || 'Generale';
        const brandPrefix = chosenBrand.replace(/[^a-zA-Z0-9]/g, '').slice(0, 2).toUpperCase() || 'OP';
        const id = `${brandPrefix}-${crypto.randomUUID().slice(0, 8)}`;
        const newDeal = {
          id,
          name: String(params.name).trim(),
          company: String(params.company).trim(),
          brand: chosenBrand,
          service: params.service || 'Consulenza',
          value: Number(params.value),
          valueType: params.valueType || 'One Shot',
          salesRep: String(params.salesRep).trim(),
          leadSource: 'MCP HTTP Inbound',
          entryDate: today,
          stage: 'Nuovo lead',
          nextAction: {
            what: String(params.nextActionWhat).trim(),
            who: String(params.salesRep).trim(),
            when: params.nextActionWhen,
            type: 'chiamata',
            priority: 'Alta',
            completed: false,
          },
          history: [],
        };
        db.opportunities.unshift(newDeal);
        db.tasks ||= [];
        db.tasks.unshift({ id: `tsk-${crypto.randomUUID()}`, dealId: id, dealTitle: `${newDeal.company} - ${newDeal.name}`, title: newDeal.nextAction.what, client: newDeal.name, brand: newDeal.brand, assignedTo: newDeal.salesRep, type: 'chiamata', priority: 'Alta', date: newDeal.nextAction.when, time: '10:00', status: 'Da fare' });
        await saveDB(db);
        return NextResponse.json({ success: true, deal: newDeal });
      }

      default:
        return NextResponse.json({ success: false, error: `Azione ${action} non supportata.` }, { status: 400 });
    }
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

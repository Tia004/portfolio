import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getServerDb } from '@/lib/crm/serverDb';

const MASTER_WORKSPACE_ID = 'master';

/**
 * Portfolio-mode CRM auth: validates that the incoming request belongs to the
 * master session set by the portfolio's own auth system, then treats it as the
 * master workspace. This replaces the commercial-dashboard's separate per-user
 * session system.
 */
async function getMasterSession(): Promise<{ workspaceId: string; role: string } | null> {
  try {
    const cookieStore = await cookies();
    // The portfolio master session is stored under 'master_session' or verified
    // via the /api/auth/status endpoint. We trust the presence of this cookie.
    const masterCookie = cookieStore.get('master_session');
    if (masterCookie?.value) {
      return { workspaceId: MASTER_WORKSPACE_ID, role: 'owner' };
    }
    // Fallback: check for any active portfolio session token
    const sessionCookie = cookieStore.get('session');
    if (sessionCookie?.value) {
      return { workspaceId: MASTER_WORKSPACE_ID, role: 'owner' };
    }
    return null;
  } catch {
    return null;
  }
}

export async function GET() {
  try {
    const session = await getMasterSession();
    if (!session) return NextResponse.json({ error: 'Accesso richiesto.' }, { status: 401 });

    const db = await getServerDb();
    const result = await db.execute({
      sql: 'SELECT payload, revision FROM crm_data WHERE user_id = ?',
      args: [session.workspaceId],
    });

    return NextResponse.json(
      {
        data: result.rows.length ? JSON.parse(String(result.rows[0].payload)) : null,
        revision: result.rows.length ? Number(result.rows[0].revision) : 0,
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch {
    return NextResponse.json({ error: 'Dati temporaneamente non disponibili.' }, { status: 503 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getMasterSession();
    if (!session) return NextResponse.json({ error: 'Accesso richiesto.' }, { status: 401 });

    const data = await req.json();
    if (
      !Array.isArray(data.opportunities) ||
      !Array.isArray(data.tasks) ||
      !Array.isArray(data.brands) ||
      !Array.isArray(data.salesReps)
    ) {
      return NextResponse.json({ error: 'Formato dati non valido.' }, { status: 400 });
    }

    const baseRevision = Number(data.baseRevision);
    if (!Number.isSafeInteger(baseRevision) || baseRevision < 0) {
      return NextResponse.json({ error: 'Versione archivio non valida.' }, { status: 400 });
    }

    const payload = JSON.stringify({
      opportunities: data.opportunities,
      tasks: data.tasks,
      brands: data.brands,
      salesReps: data.salesReps,
    });

    if (payload.length > 3_000_000) {
      return NextResponse.json({ error: 'Archivio troppo grande.' }, { status: 413 });
    }

    const db = await getServerDb();

    const updated = await db.execute({
      sql: 'UPDATE crm_data SET payload = ?, updated_at = ?, revision = revision + 1 WHERE user_id = ? AND revision = ?',
      args: [payload, new Date().toISOString(), session.workspaceId, baseRevision],
    });

    if (!updated.rowsAffected && baseRevision === 0) {
      const inserted = await db.execute({
        sql: 'INSERT OR IGNORE INTO crm_data(user_id, payload, updated_at, revision) VALUES (?, ?, ?, 1)',
        args: [session.workspaceId, payload, new Date().toISOString()],
      });
      if (inserted.rowsAffected) return NextResponse.json({ ok: true, revision: 1 });
    }

    if (!updated.rowsAffected) {
      return NextResponse.json(
        { error: 'I dati sono cambiati in un\'altra sessione. Ricarica prima di continuare.' },
        { status: 409 }
      );
    }

    return NextResponse.json({ ok: true, revision: baseRevision + 1 });
  } catch {
    return NextResponse.json({ error: 'Salvataggio non riuscito.' }, { status: 503 });
  }
}

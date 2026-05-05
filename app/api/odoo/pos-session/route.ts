import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';

const ODOO_URL = process.env.NEXT_PUBLIC_ODOO_URL || 'http://localhost:8069';

async function odooRPC(params: any, sessionId: string) {
  const res = await fetch(`${ODOO_URL}/web/dataset/call_kw`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: `session_id=${sessionId}` },
    body: JSON.stringify({ jsonrpc: '2.0', method: 'call', params, id: Date.now() }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.data?.message || data.error.message || 'Odoo error');
  return data.result;
}

// GET: check for active POS session; if none, return available configs
export async function GET(request: NextRequest) {
  try {
    const sessionId = request.nextUrl.searchParams.get('session_id') || '';
    if (!sessionId) return NextResponse.json({ error: 'Missing session_id' }, { status: 400 });

    // Validate auth session
    const res = await fetch(`${ODOO_URL}/web/session/get_session_info`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: `session_id=${sessionId}` },
      body: JSON.stringify({ jsonrpc: '2.0', method: 'call', params: {}, id: 1 }),
    });
    const authData = await res.json();
    const uid = authData.result?.uid;
    if (!uid) return NextResponse.json({ error: 'Invalid session' }, { status: 401 });

    // Search for open session (by this user first, then any)
    let sessions = await odooRPC({
      model: 'pos.session', method: 'search_read',
      args: [[['state', 'in', ['opening_control', 'opened']], ['user_id', '=', uid]]],
      kwargs: { fields: ['id', 'name', 'config_id', 'start_at'], limit: 1 },
    }, sessionId);

    if (!sessions?.length) {
      sessions = await odooRPC({
        model: 'pos.session', method: 'search_read',
        args: [[['state', 'in', ['opening_control', 'opened']]]],
        kwargs: { fields: ['id', 'name', 'config_id', 'start_at'], limit: 1 },
      }, sessionId);
    }

    if (sessions?.length) {
      const s = sessions[0];
      return NextResponse.json({
        hasActiveSession: true,
        session: {
          id: s.id,
          name: s.name,
          configName: Array.isArray(s.config_id) ? s.config_id[1] : '',
          startedAt: s.start_at,
        },
      });
    }

    // No active session — return available POS configs
    const configs = await odooRPC({
      model: 'pos.config', method: 'search_read',
      args: [[['active', '=', true]]],
      kwargs: { fields: ['id', 'name'], limit: 20 },
    }, sessionId);

    return NextResponse.json({ hasActiveSession: false, session: null, configs: configs || [] });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// POST { configId }: open a POS session (or reuse existing one)
export async function POST(request: NextRequest) {
  try {
    const sessionId = request.nextUrl.searchParams.get('session_id') || '';
    const { configId } = await request.json();
    if (!sessionId || !configId) return NextResponse.json({ error: 'Missing params' }, { status: 400 });

    // Step 1: Check if a session is already open/opening for this config — reuse it
    const existingSessions = await odooRPC({
      model: 'pos.session', method: 'search_read',
      args: [[['config_id', '=', configId], ['state', 'in', ['opening_control', 'opened']]]],
      kwargs: { fields: ['id', 'name', 'state', 'config_id'], limit: 1 },
    }, sessionId);

    if (existingSessions?.length) {
      const s = existingSessions[0];
      // If in opening_control state, try to move it to opened
      if (s.state === 'opening_control') {
        try {
          await odooRPC({
            model: 'pos.session', method: 'action_pos_session_open',
            args: [[s.id]], kwargs: {},
          }, sessionId);
        } catch {
          // Already opened or transition not needed — ignore
        }
      }
      return NextResponse.json({ success: true, session: { id: s.id, name: s.name } });
    }

    // Step 2: No existing session — try to open one
    try {
      await odooRPC({ model: 'pos.config', method: 'open_session_cb', args: [[configId]], kwargs: {} }, sessionId);
    } catch (openErr: any) {
      // If open_session_cb fails, try manual creation
      try {
        const newId = await odooRPC({
          model: 'pos.session', method: 'create',
          args: [{ config_id: configId }], kwargs: {},
        }, sessionId);
        await odooRPC({
          model: 'pos.session', method: 'action_pos_session_open',
          args: [[newId]], kwargs: {},
        }, sessionId);
      } catch {
        // Neither worked — return the original error from Odoo
        return NextResponse.json({ error: openErr.message }, { status: 500 });
      }
    }

    // Step 3: Return the newly opened session
    const sessions = await odooRPC({
      model: 'pos.session', method: 'search_read',
      args: [[['config_id', '=', configId], ['state', 'in', ['opening_control', 'opened']]]],
      kwargs: { fields: ['id', 'name', 'config_id'], limit: 1 },
    }, sessionId);

    if (!sessions?.length) return NextResponse.json({ error: 'Session ouverte mais introuvable.' }, { status: 500 });

    return NextResponse.json({
      success: true,
      session: { id: sessions[0].id, name: sessions[0].name },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

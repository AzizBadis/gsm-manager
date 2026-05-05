import { NextRequest, NextResponse } from 'next/server';

const ODOO_URL = process.env.NEXT_PUBLIC_ODOO_URL || 'http://localhost:8069';

async function odooRPC(endpoint: string, params: any, sessionId: string) {
  const payload = {
    jsonrpc: '2.0',
    method: 'call',
    params,
    id: Math.floor(Math.random() * 1000000000),
  };

  const response = await fetch(`${ODOO_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: `session_id=${sessionId}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) throw new Error(`Odoo returned ${response.status}`);
  const data = await response.json();
  if (data.error) throw new Error(data.error.data?.message || data.error.message || 'Odoo RPC Error');
  return data.result;
}

/**
 * GET /api/odoo/session?session_id=<id>
 *   → validates session (basic info)
 * GET /api/odoo/session?session_id=<id>&summary=true
 *   → returns POS session summary for closure modal
 */
export async function GET(request: NextRequest) {
  try {
    const sessionId = request.nextUrl.searchParams.get('session_id');
    const wantSummary = request.nextUrl.searchParams.get('summary') === 'true';

    if (!sessionId) {
      return NextResponse.json({ valid: false, error: 'Missing session_id' }, { status: 400 });
    }

    // Always get basic session info first
    const sessionInfo = await odooRPC('/web/session/get_session_info', {}, sessionId);

    if (!sessionInfo || sessionInfo.uid === false || !sessionInfo.uid) {
      return NextResponse.json({ valid: false });
    }

    if (!wantSummary) {
      let companyName = 'COMPANY';
      const companyId = sessionInfo.company_id || (sessionInfo.user_companies ? sessionInfo.user_companies.current_company : null);
      if (sessionInfo.user_companies) {
        if (typeof sessionInfo.user_companies.current_company === 'number') {
          const cId = sessionInfo.user_companies.current_company;
          if (sessionInfo.user_companies.allowed_companies?.[cId]) {
            companyName = sessionInfo.user_companies.allowed_companies[cId].name;
          }
        } else if (Array.isArray(sessionInfo.user_companies.current_company)) {
          companyName = sessionInfo.user_companies.current_company[1];
        }
      } else if (sessionInfo.company_name) {
        companyName = sessionInfo.company_name;
      }

      return NextResponse.json({
        valid: true,
        uid: sessionInfo.uid,
        name: sessionInfo.name || sessionInfo.partner_display_name || '',
        username: sessionInfo.username || '',
        company_id: companyId,
        company_name: companyName,
      });
    }

    // Fetch POS session summary for closure — find ANY open/opening session
    const sessions = await odooRPC(
      '/web/dataset/call_kw',
      {
        model: 'pos.session',
        method: 'search_read',
        args: [[['state', 'in', ['opening_control', 'opened']]]],
        kwargs: {
          fields: ['id', 'name', 'user_id', 'start_at', 'cash_register_balance_start', 'cash_register_balance_end', 'total_payments_amount'],
          limit: 1,
        },
      },
      sessionId
    );

    if (!sessions || sessions.length === 0) {
      return NextResponse.json({ valid: true, no_active_pos_session: true });
    }

    const session = sessions[0];

    // Fetch payments breakdown by method
    const payments = await odooRPC(
      '/web/dataset/call_kw',
      {
        model: 'pos.payment',
        method: 'read_group',
        args: [[['session_id', '=', session.id]]],
        kwargs: {
          fields: ['amount', 'payment_method_id'],
          groupby: ['payment_method_id'],
        },
      },
      sessionId
    );

    const paymentBreakdown = (payments || []).map((p: any) => ({
      method: p.payment_method_id[1],
      amount: p.amount,
      methodId: p.payment_method_id[0],
    }));

    // Expected cash = opening balance + sum of cash payments
    const cashMethodPayments = paymentBreakdown
      .filter((p: any) => p.method.toLowerCase().includes('espèces') || p.method.toLowerCase().includes('cash'))
      .reduce((acc: number, p: any) => acc + p.amount, 0);

    const expectedCash =
      session.cash_register_balance_end !== undefined && session.cash_register_balance_end !== false
        ? session.cash_register_balance_end
        : session.cash_register_balance_start + cashMethodPayments;

    return NextResponse.json({
      valid: true,
      summary: {
        id: session.id,
        name: session.name,
        cashierName: Array.isArray(session.user_id) ? session.user_id[1] : null,
        opened_at: session.start_at,
        opening_balance: session.cash_register_balance_start || 0,
        total_payments: session.total_payments_amount || 0,
        expected_cash: expectedCash,
        payments: paymentBreakdown,
      },
    });
  } catch (error: any) {
    console.error('Session GET error:', error);
    return NextResponse.json({ valid: false, error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/odoo/session?session_id=<id>
 * Body: { closingBalance: number }
 * Closes the open POS session in Odoo.
 */
export async function POST(request: NextRequest) {
  try {
    const sessionId = request.nextUrl.searchParams.get('session_id');
    const { closingBalance } = await request.json();

    if (!sessionId) {
      return NextResponse.json({ error: 'Missing session_id' }, { status: 400 });
    }

    const sessionInfo = await odooRPC('/web/session/get_session_info', {}, sessionId);
    if (!sessionInfo || !sessionInfo.uid) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    // 1. Find ANY open/opening POS session (manager can close any cashier session)
    const sessions = await odooRPC(
      '/web/dataset/call_kw',
      {
        model: 'pos.session',
        method: 'search_read',
        args: [[['state', 'in', ['opening_control', 'opened']]]],
        kwargs: { fields: ['id'], limit: 1 },
      },
      sessionId
    );

    if (!sessions || sessions.length === 0) {
      return NextResponse.json({ error: 'No open POS session found' }, { status: 400 });
    }

    const posSessionId = sessions[0].id;

    // 2. Set the real closing balance
    await odooRPC(
      '/web/dataset/call_kw',
      {
        model: 'pos.session',
        method: 'write',
        args: [[posSessionId], { cash_register_balance_end_real: parseFloat(closingBalance) || 0 }],
        kwargs: {},
      },
      sessionId
    );

    // 3. Move to closing control
    await odooRPC(
      '/web/dataset/call_kw',
      {
        model: 'pos.session',
        method: 'action_pos_session_closing_control',
        args: [[posSessionId]],
        kwargs: {},
      },
      sessionId
    );

    // 4. Validate and close
    await odooRPC(
      '/web/dataset/call_kw',
      {
        model: 'pos.session',
        method: 'action_pos_session_validate',
        args: [[posSessionId]],
        kwargs: {},
      },
      sessionId
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Session closure error:', error);
    return NextResponse.json({ error: error.message || 'Failed to close session' }, { status: 500 });
  }
}

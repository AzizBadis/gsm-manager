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
  if (data.error) {
    throw new Error(data.error.data?.message || data.error.message || 'Odoo RPC Error');
  }
  return data.result;
}

async function fetchAllOrders(domain: any[], sessionId: string) {
  const batchSize = 1000;
  const allOrders: any[] = [];
  let offset = 0;

  while (true) {
    const batch = await odooRPC(
      '/web/dataset/call_kw',
      {
        model: 'pos.order',
        method: 'search_read',
        args: [domain],
        kwargs: {
          fields: ['id', 'name', 'pos_reference', 'partner_id', 'date_order', 'amount_total', 'state', 'account_move', 'user_id'],
          order: 'date_order desc',
          limit: batchSize,
          offset,
        },
      },
      sessionId
    );

    if (!Array.isArray(batch) || batch.length === 0) {
      break;
    }

    allOrders.push(...batch);

    if (batch.length < batchSize) {
      break;
    }

    offset += batchSize;
  }

  return allOrders;
}

export async function GET(request: NextRequest) {
  try {
    const sessionId = request.nextUrl.searchParams.get('session_id');
    if (!sessionId) return NextResponse.json({ error: 'Missing session_id' }, { status: 401 });

    const startDate = request.nextUrl.searchParams.get('start_date');
    const endDate = request.nextUrl.searchParams.get('end_date');
    const search = request.nextUrl.searchParams.get('search');
    const userId = request.nextUrl.searchParams.get('user_id');

    const domain: any[] = [];

    if (startDate) domain.push(['date_order', '>=', startDate + ' 00:00:00']);
    if (endDate) domain.push(['date_order', '<=', endDate + ' 23:59:59']);
    if (search) {
      domain.push(['|', ['pos_reference', 'ilike', search], ['name', 'ilike', search]]);
    }
    if (userId) {
      domain.push(['user_id', '=', parseInt(userId)]);
    }

    const orders = await fetchAllOrders(domain, sessionId);

    return NextResponse.json({ success: true, orders: orders || [], total: orders?.length || 0 });
  } catch (error: any) {
    console.error('Orders GET error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch orders' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const sessionId = request.nextUrl.searchParams.get('session_id');
    if (!sessionId) {
      return NextResponse.json({ error: 'Missing session_id parameter' }, { status: 401 });
    }

    const { cart, total, tax, subtotal, customer, uid, paymentMethodId: reqPaymentMethodId } = await request.json();

    // ── 1. Find an open POS session ──────────────────────────────────────────
    const sessions = await odooRPC(
      '/web/dataset/call_kw',
      {
        model: 'pos.session',
        method: 'search_read',
        args: [[['state', 'in', ['opening_control', 'opened']]]],
        kwargs: { fields: ['id', 'config_id'], limit: 1 },
      },
      sessionId
    );

    if (!sessions || sessions.length === 0) {
      return NextResponse.json(
        { error: 'Aucune session POS ouverte. Veuillez ouvrir une session dans Odoo.' },
        { status: 400 }
      );
    }

    const posSessionId: number = sessions[0].id;

    // ── 2. Use the provided payment method id ────────────────────────────────
    let paymentMethodId: number | false = reqPaymentMethodId ? parseInt(reqPaymentMethodId, 10) : false;

    // Fallback: pick any available payment method if none provided
    if (!paymentMethodId) {
      const any = await odooRPC(
        '/web/dataset/call_kw',
        {
          model:  'pos.payment.method',
          method: 'search_read',
          args:   [[]],
          kwargs: { fields: ['id'], limit: 1 },
        },
        sessionId
      );
      if (any?.length > 0) paymentMethodId = any[0].id;
    }

    // ── 3. Build order lines ─────────────────────────────────────────────────
    const orderLines = cart.map((item: any) => {
      const priceUnit = item.product.price;
      const qty       = item.quantity;
      const totalBeforeDiscount = priceUnit * qty;
      const discAmt   = item.discountAmount || 0;
      
      // Odoo expects a percentage in the 'discount' field
      const discountPercent = totalBeforeDiscount > 0 ? (discAmt / totalBeforeDiscount) * 100 : 0;
      const lineTotal = totalBeforeDiscount - discAmt;

      // Add IMEI to the line description if present
      const lineName = item.imei ? `${item.product.name} (IMEI: ${item.imei})` : item.product.name;

      return [
        0,
        0,
        {
          product_id:          parseInt(item.product.id),
          qty,
          price_unit:          priceUnit,
          discount:            discountPercent,
          name:                lineName,
          price_subtotal:      lineTotal,
          price_subtotal_incl: lineTotal,
          tax_ids:             [[6, false, []]],
        },
      ];
    });

    // ── 4. Create pos.order (bypasses create_from_ui entirely) ───────────────
    const orderId: number = await odooRPC(
      '/web/dataset/call_kw',
      {
        model:  'pos.order',
        method: 'create',
        args: [
          {
            session_id:    posSessionId,
            partner_id:    customer?.id || false,
            user_id:       uid ? parseInt(uid) : false,
            amount_paid:   total,
            amount_tax:    tax,
            amount_total:  total,
            amount_return: 0,
            lines:         orderLines,
          },
        ],
        kwargs: {},
      },
      sessionId
    );

    // ── 5. Record the payment ────────────────────────────────────────────────
    if (paymentMethodId) {
      await odooRPC(
        '/web/dataset/call_kw',
        {
          model:  'pos.payment',
          method: 'create',
          args: [
            {
              pos_order_id:      orderId,
              payment_method_id: paymentMethodId,
              amount:            total,
            },
          ],
          kwargs: {},
        },
        sessionId
      );
    }

    // ── 6. Finalise: mark order as paid ──────────────────────────────────────
    await odooRPC(
      '/web/dataset/call_kw',
      {
        model:  'pos.order',
        method: 'action_pos_order_paid',
        args:   [[orderId]],
        kwargs: {},
      },
      sessionId
    );

    // ── 7. Create official Odoo accounting invoice (account.move) ─────────────
    let invoiceNumber: string | null = null;
    try {
      await odooRPC(
        '/web/dataset/call_kw',
        {
          model:  'pos.order',
          method: 'action_pos_order_invoice',
          args:   [[orderId]],
          kwargs: {},
        },
        sessionId
      );

      const [orderWithInvoice] = await odooRPC(
        '/web/dataset/call_kw',
        {
          model:  'pos.order',
          method: 'read',
          args:   [[orderId]],
          kwargs: { fields: ['account_move'] },
        },
        sessionId
      );

      const accountMoveRaw = orderWithInvoice?.account_move;
      const invoiceId: number | null = Array.isArray(accountMoveRaw)
        ? accountMoveRaw[0]
        : (typeof accountMoveRaw === 'number' ? accountMoveRaw : null);

      if (invoiceId) {
        const [invoiceData] = await odooRPC(
          '/web/dataset/call_kw',
          {
            model:  'account.move',
            method: 'read',
            args:   [[invoiceId]],
            kwargs: { fields: ['name'] },
          },
          sessionId
        );
        invoiceNumber = invoiceData?.name || null;
      }
    } catch (invoiceErr: any) {
      console.warn('Could not create Odoo accounting invoice:', invoiceErr.message);
    }

    const [orderInfo] = await odooRPC(
      '/web/dataset/call_kw',
      {
        model:  'pos.order',
        method: 'read',
        args:   [[orderId]],
        kwargs: { fields: ['name', 'pos_reference'] },
      },
      sessionId
    );

    return NextResponse.json({
      success: true,
      order: {
        id:            orderId,
        name:          orderInfo?.name          || `Order-${orderId}`,
        reference:     orderInfo?.pos_reference || orderInfo?.name || `Order-${orderId}`,
        invoiceNumber: invoiceNumber,
      },
    });
  } catch (error: any) {
    console.error('Order creation proxy error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create order in Odoo' },
      { status: 500 }
    );
  }
}


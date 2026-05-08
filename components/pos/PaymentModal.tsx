'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { PaymentMethods, OdooPaymentMethod } from './PaymentMethods';
import { CashPayment } from './CashPayment';
import { CardPayment } from './CardPayment';
import { CartItem } from '@/lib/pos/types';
import { recordAuditLog } from '@/lib/audit';
import { Printer, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PaymentModalProps {
  open: boolean;
  subtotal: number;
  tax: number;
  total: number;
  cart: CartItem[];
  customer: any | null;
  sessionId: string | null;
  uid: string | number | null;
  actorName?: string | null;
  onClose: () => void;
  onPaymentComplete: (cartSnapshot: CartItem[], total: number) => void;
}

export function PaymentModal({
  open,
  subtotal,
  tax,
  total,
  cart,
  customer,
  sessionId,
  uid,
  actorName,
  onClose,
  onPaymentComplete,
}: PaymentModalProps) {
  const [paymentMethod, setPaymentMethod] = useState<OdooPaymentMethod | null>(null);
  const [methods, setMethods] = useState<OdooPaymentMethod[]>([]);
  const [loadingMethods, setLoadingMethods] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [pendingMethod, setPendingMethod] = useState<{ id: number; name: string, change?: number } | null>(null);
  const [wantsInvoice, setWantsInvoice] = useState(true);
  const [receiptData, setReceiptData] = useState<{
    cartSnapshot: CartItem[];
    subtotal: number;
    tax: number;
    total: number;
    method: string;
    change?: number;
    timestamp: Date;
    orderReference?: string;  // POS order name (e.g. Order 00001)
    invoiceNumber?: string;   // Odoo accounting invoice (e.g. FINV/2026/00001)
  } | null>(null);

  useEffect(() => {
    if (open && sessionId) {
      setLoadingMethods(true);
      fetch(`/api/odoo/payment-methods?session_id=${sessionId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.methods) setMethods(data.methods);
        })
        .catch((err) => console.error(err))
        .finally(() => setLoadingMethods(false));
    } else {
      setPaymentMethod(null);
      setPaymentError(null);
    }
  }, [open, sessionId]);

  const handlePaymentComplete = async (methodId: number, methodName: string, change?: number) => {
    setIsProcessing(true);
    setPaymentError(null);
    setPendingMethod({ id: methodId, name: methodName, change });
    try {
      const response = await fetch(`/api/odoo/orders?session_id=${sessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cart, total, tax, subtotal, customer, uid, paymentMethodId: methodId, wantsInvoice,
        }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to create order');
      }

      // Record audit log for manager
      const invoiceRef = data.order?.invoiceNumber || data.order?.reference || data.order?.name || 'Facture POS';
      const customerName = customer?.name || 'Client comptoir';
      await recordAuditLog({
        action: 'created',
        entityType: 'invoice',
        entityName: invoiceRef,
        actor: actorName,
        details: `${customerName} - ${total.toFixed(2)} DT`,
      });

      setReceiptData({
        cartSnapshot: [...cart],
        subtotal,
        tax,
        total,
        method: methodName,
        change,
        timestamp: new Date(),
        orderReference:  data.order?.reference || data.order?.name,
        invoiceNumber:   data.order?.invoiceNumber || null,
      });
      setPendingMethod(null);
    } catch (err: any) {
      setPaymentError(err.message || 'Payment failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRetry = () => {
    if (pendingMethod) {
      handlePaymentComplete(pendingMethod.id, pendingMethod.name, pendingMethod.change);
    }
  };

  const handleDone = () => {
    if (receiptData) {
      onPaymentComplete(receiptData.cartSnapshot, receiptData.total);
    }
    setPaymentMethod(null);
    setReceiptData(null);
    onClose();
  };

  const handlePrintReceipt = () => {
    if (!receiptData) return;

    const storeName = process.env.NEXT_PUBLIC_STORE_NAME || 'GSM Store';
    const storeAddress = process.env.NEXT_PUBLIC_STORE_ADDRESS || '';
    const storePhone = process.env.NEXT_PUBLIC_STORE_PHONE || '';
    const storeTaxId = process.env.NEXT_PUBLIC_STORE_TAX_ID || '';
    const storeWebsite = process.env.NEXT_PUBLIC_STORE_WEBSITE || '';
    const storeEmail = process.env.NEXT_PUBLIC_STORE_EMAIL || '';
    const logoLetters = storeName.substring(0, 2).toUpperCase();

    const dateStr    = receiptData.timestamp.toLocaleDateString('fr-FR');
    // Prefer the official Odoo accounting invoice number; fall back to POS reference
    const orderRef    = receiptData.invoiceNumber || receiptData.orderReference || `FAC-${Date.now()}`;
    const posRef      = receiptData.orderReference || '';
    const isOdooInvoice = !!receiptData.invoiceNumber;

    const taxRate = 8; // percent shown on each line

    const itemRows = receiptData.cartSnapshot.map((item) => {
      const originalTotal = item.product.price * item.quantity;
      const lineTotal = item.discount
        ? originalTotal * (1 - item.discount / 100)
        : originalTotal;
      const discountNote = item.discount ? ` <span style="color:#e53e3e;font-size:9px">(-${item.discount}%)</span>` : '';
      return `
        <tr>
          <td>${item.product.name}${discountNote}</td>
          <td>${item.quantity.toFixed(2).replace('.', ',')} Unité(s)</td>
          <td>${item.product.price.toFixed(2)}</td>
          <td>${taxRate}%</td>
          <td>${lineTotal.toFixed(2)} DT</td>
        </tr>`;
    }).join('');

    const receiptSubtotal = receiptData.cartSnapshot.reduce((acc, item) => {
      const lineTotal = item.product.price * item.quantity;
      return acc + (item.discount ? lineTotal * (1 - item.discount / 100) : lineTotal);
    }, 0);

    const receiptHtml = `
      <!DOCTYPE html>
      <html lang="fr">
      <head>
        <title>Facture - ${orderRef}</title>
        <meta charset="UTF-8"/>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Inter', Arial, sans-serif;
            font-size: 11px;
            color: #111;
            padding: 32px 44px;
            max-width: 820px;
            margin: 0 auto;
            background: #fff;
          }

          /* ── Header ────────────────────────────────── */
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 36px;
          }
          .logo-block { display: flex; flex-direction: column; gap: 6px; }
          .logo-circle {
            width: 54px; height: 54px;
            background: #1d4ed8;
            color: #fff;
            border-radius: 10px;
            display: flex; align-items: center; justify-content: center;
            font-size: 20px; font-weight: 700;
            margin-bottom: 6px;
          }
          .store-name  { font-weight: 700; font-size: 13px; }
          .store-meta  { color: #555; line-height: 1.7; font-size: 10.5px; margin-top: 4px; }
          .customer-block { text-align: right; }
          .customer-name  { font-weight: 700; font-size: 13px; margin-bottom: 4px; }
          .customer-meta  { color: #555; font-size: 10.5px; line-height: 1.7; }

          /* ── Invoice title ──────────────────────────── */
          .invoice-title {
            font-size: 26px;
            font-weight: 700;
            color: #1d4ed8;
            margin-bottom: 18px;
            letter-spacing: -0.5px;
          }
          .divider-line { border: none; border-top: 1.5px solid #e2e8f0; margin: 0 0 16px; }

          /* ── Meta row ───────────────────────────────── */
          .meta-row { display: flex; gap: 48px; margin-bottom: 28px; }
          .meta-col label { display: block; color: #888; font-size: 10px; margin-bottom: 3px; }
          .meta-col span  { font-weight: 600; font-size: 11px; }

          /* ── Table ──────────────────────────────────── */
          table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
          thead tr { border-bottom: 2px solid #111; }
          th {
            padding: 9px 6px;
            font-size: 10px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.4px;
            color: #333;
            text-align: right;
          }
          th:first-child { text-align: left; }
          tbody tr:nth-child(even) { background: #f8fafc; }
          td {
            padding: 8px 6px;
            font-size: 10.5px;
            text-align: right;
            border-bottom: 1px solid #eef0f3;
            color: #222;
          }
          td:first-child { text-align: left; max-width: 320px; line-height: 1.4; }

          /* ── Totals ─────────────────────────────────── */
          .totals-wrapper { display: flex; justify-content: flex-end; margin-bottom: 32px; }
          .totals-box { width: 280px; }
          .totals-row {
            display: flex;
            justify-content: space-between;
            padding: 5px 0;
            font-size: 11px;
            border-bottom: 1px solid #eef0f3;
          }
          .totals-row.grand {
            font-weight: 700;
            font-size: 14px;
            border-bottom: none;
            border-top: 2px solid #111;
            padding-top: 10px;
            margin-top: 4px;
          }
          .totals-row.payment-method {
            color: #555;
            font-size: 10px;
            border-bottom: none;
            padding-top: 8px;
          }
          ${receiptData.change !== undefined && receiptData.change > 0 ? `
          .totals-row.change { color: #16a34a; font-weight: 600; border-bottom: none; }` : ''}

          /* ── Footer ─────────────────────────────────── */
          .footer {
            border-top: 1px solid #dde1e7;
            padding-top: 12px;
            text-align: center;
            font-size: 9.5px;
            color: #666;
            line-height: 1.9;
          }
          .footer strong { color: #333; }

          @media print {
            body { padding: 20px 30px; }
            @page { size: A4; margin: 12mm; }
          }
        </style>
      </head>
      <body>

        <!-- ── Header ── -->
        <div class="header">
          <div class="logo-block">
            <div class="logo-circle">${logoLetters}</div>
            <div class="store-name">${storeName}</div>
            <div class="store-meta">
              ${storeAddress.split(',').join('<br/>')}
              ${storePhone ? '<br/>Tel: ' + storePhone : ''}
            </div>
          </div>
          ${customer ? `
          <div class="customer-block">
            <div class="customer-name">${customer.name}</div>
            <div class="customer-meta">
              ${customer.phone ? customer.phone + '<br/>' : ''}
              ${customer.email ? customer.email + '<br/>' : ''}
              ${customer.vat ? 'N° TVA: ' + customer.vat : ''}
            </div>
          </div>` : ''}
        </div>

        <!-- ── Title ── -->
        <div class="invoice-title">${isOdooInvoice ? 'Facture' : 'Reçu'} ${orderRef}</div>
        ${isOdooInvoice && posRef ? `<div style="font-size:10px;color:#888;margin-top:-12px;margin-bottom:18px;">Réf. POS : ${posRef}</div>` : ''}
        <hr class="divider-line"/>

        <!-- ── Meta row ── -->
        <div class="meta-row">
          <div class="meta-col">
            <label>Date de la facture :</label>
            <span>${dateStr}</span>
          </div>
          <div class="meta-col">
            <label>Date d'échéance :</label>
            <span>${dateStr}</span>
          </div>
          <div class="meta-col">
            <label>Mode de paiement :</label>
            <span>${receiptData.method === 'cash' ? 'Espèces' : 'Carte bancaire'}</span>
          </div>
        </div>

        <!-- ── Items table ── -->
        <table>
          <thead>
            <tr>
              <th>Description</th>
              <th>Quantité</th>
              <th>Prix unitaire</th>
              <th>Taxes</th>
              <th>Montant</th>
            </tr>
          </thead>
          <tbody>
            ${itemRows}
          </tbody>
        </table>

        <!-- ── Totals ── -->
        <div class="totals-wrapper">
          <div class="totals-box">
            <div class="totals-row">
              <span>Sous-total HT</span>
              <span>${receiptSubtotal.toFixed(2)} DT</span>
            </div>
            <div class="totals-row">
              <span>TVA (${taxRate}%)</span>
              <span>${receiptData.tax.toFixed(2)} DT</span>
            </div>
            <div class="totals-row grand">
              <span>TOTAL TTC</span>
              <span>${receiptData.total.toFixed(2)} DT</span>
            </div>
            ${receiptData.change !== undefined && receiptData.change > 0 ? `
            <div class="totals-row change">
              <span>Monnaie rendue</span>
              <span>${receiptData.change.toFixed(2)} DT</span>
            </div>` : ''}
          </div>
        </div>

        <!-- ── Footer ── -->
        <div class="footer">
          ${storeWebsite ? `<strong>${storeWebsite}</strong><br/>` : ''}
          <strong>${storeName}</strong>
          ${storeAddress ? ' — ' + storeAddress : ''}
          ${storePhone ? ' — Tel: ' + storePhone : ''}
          ${storeEmail ? ' — Email: ' + storeEmail : ''}
          ${storeTaxId ? '<br/>' + storeTaxId : ''}
        </div>

      </body>
      </html>
    `;

    const iframe = document.createElement('iframe');
    // Important: Do not use display: none, otherwise Firefox/Chrome will ignore print()
    iframe.style.position = 'absolute';
    iframe.style.width = '0px';
    iframe.style.height = '0px';
    iframe.style.border = 'none';
    iframe.style.left = '-9999px';
    document.body.appendChild(iframe);
    
    if (iframe.contentWindow) {
      iframe.contentWindow.document.open();
      iframe.contentWindow.document.write(receiptHtml);
      iframe.contentWindow.document.close();
      iframe.contentWindow.focus();
      
      // Delay printing slightly to ensure styles/fonts are loaded
      setTimeout(() => {
        iframe.contentWindow?.print();
        setTimeout(() => {
          document.body.removeChild(iframe);
        }, 1000);
      }, 500);
    } else {
      // Fallback
      document.body.removeChild(iframe);
      window.print();
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => { if (!receiptData) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-2xl">Payment</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* ── Processing Screen ── */}
          {isProcessing ? (
            <div className="flex flex-col items-center justify-center p-8 gap-4">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              <p className="text-lg font-medium text-foreground">Processing Payment...</p>
              <p className="text-sm text-muted-foreground text-center">
                Please wait while we confirm the order with Odoo.
              </p>
            </div>

          ) : paymentError ? (
            /* ── Error Screen ── */
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="rounded-full bg-red-100 dark:bg-red-950/40 p-3">
                <AlertCircle className="h-10 w-10 text-red-500" />
              </div>
              <h3 className="text-lg font-bold text-foreground">Payment Failed</h3>
              <div className="w-full rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20 px-4 py-3 text-sm text-red-700 dark:text-red-400 text-center leading-relaxed">
                {paymentError}
              </div>
              <div className="flex gap-3 w-full mt-1">
                <Button
                  variant="outline"
                  onClick={() => {
                    setPaymentError(null);
                    setPendingMethod(null);
                    setPaymentMethod(null);
                  }}
                  className="flex-1 h-11"
                >
                  Go Back
                </Button>
                <Button
                  onClick={handleRetry}
                  className="flex-1 h-11 gap-2 bg-primary"
                >
                  <RefreshCw className="h-4 w-4" />
                  Retry
                </Button>
              </div>
            </div>

          ) : receiptData ? (
            /* ── Receipt / Success Screen ── */
            <div className="flex flex-col items-center gap-4 py-4">
              <CheckCircle2 className="h-14 w-14 text-green-500" />
              <h3 className="text-xl font-bold text-foreground">Payment Complete!</h3>

              {/* Mini receipt preview */}
              <div className="w-full rounded-xl border border-border bg-secondary/50 p-4 space-y-2 text-sm overflow-y-auto max-h-[40vh]">
                <div className="text-center border-b pb-2 mb-2 space-y-0.5">
                  <div className="font-semibold text-base">
                    {receiptData.invoiceNumber || receiptData.orderReference || 'Receipt'}
                  </div>
                  {receiptData.invoiceNumber && (
                    <div className="text-[10px] text-emerald-600 font-medium">✓ Facture Odoo enregistrée</div>
                  )}
                  {receiptData.invoiceNumber && receiptData.orderReference && (
                    <div className="text-[10px] text-muted-foreground">Réf. POS: {receiptData.orderReference}</div>
                  )}
                </div>
                {receiptData.cartSnapshot.map((item) => {
                  const originalLineTotal = item.product.price * item.quantity;
                  const lineTotal = item.discount
                    ? originalLineTotal * (1 - item.discount / 100)
                    : originalLineTotal;
                  return (
                    <div key={item.product.id} className="flex justify-between">
                      <span className="text-muted-foreground truncate max-w-[180px]">
                        {item.product.name}{' '}
                        <span className="text-xs">x{item.quantity}</span>
                        {item.discount ? (
                          <span className="text-[10px] ml-1 text-emerald-500">
                            (-{item.discount}%)
                          </span>
                        ) : null}
                      </span>
                      <span className="font-medium">{lineTotal.toFixed(2)} DT</span>
                    </div>
                  );
                })}
                <div className="border-t border-border pt-2 flex justify-between font-bold text-base">
                  <span>Total</span>
                  <span>{receiptData.total.toFixed(2)} DT</span>
                </div>
                {receiptData.change !== undefined && receiptData.change > 0 && (
                  <div className="flex justify-between text-green-600 font-medium">
                    <span>Change</span>
                    <span>{receiptData.change.toFixed(2)} DT</span>
                  </div>
                )}
                <div className="flex justify-between text-xs text-muted-foreground pt-1">
                  <span>{receiptData.method.toUpperCase()}</span>
                  <span>{receiptData.timestamp.toLocaleTimeString()}</span>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-3 w-full mt-4">
                <Button
                  id="btn-print-receipt"
                  onClick={handlePrintReceipt}
                  className="flex-1 h-12 gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-base shadow-md"
                >
                  <Printer className="h-5 w-5" />
                  Imprimer Facture
                </Button>
                <Button
                  id="btn-done-payment"
                  variant="outline"
                  onClick={handleDone}
                  className="flex-base h-12 px-8 font-semibold"
                >
                  Done
                </Button>
              </div>
            </div>

          ) : paymentMethod === null ? (
            /* ── Method Selection ── */
            <>
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-2">Total Amount</p>
                <p className="text-4xl font-bold text-accent">
                  {total.toFixed(2)} DT
                </p>
              </div>
              <PaymentMethods
                methods={methods}
                isLoading={loadingMethods}
                onMethodSelect={(method) => setPaymentMethod(method)}
              />
              <div className="mt-4 border-t pt-4">
                <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/30 border-2 border-dashed border-border hover:border-primary transition-colors">
                  <div className="flex items-center gap-3">
                    <Printer className={`h-4 w-4 ${wantsInvoice ? 'text-primary' : 'text-muted-foreground'}`} />
                    <p className="text-sm font-bold">Créer Facture Odoo</p>
                  </div>
                  <button
                    onClick={() => setWantsInvoice(!wantsInvoice)}
                    className={`relative inline-flex h-6 w-10 items-center rounded-full transition-colors ${wantsInvoice ? 'bg-primary' : 'bg-muted'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${wantsInvoice ? 'translate-x-5' : 'translate-x-1'}`} />
                  </button>
                </div>
              </div>
            </>

          ) : paymentMethod.isCash ? (
            /* ── Cash Payment ── */
            <CashPayment
              total={total}
              onPaymentComplete={(change) => handlePaymentComplete(paymentMethod.id, paymentMethod.name, change)}
              onBack={() => setPaymentMethod(null)}
            />
          ) : (
            /* ── Card/Other Payment ── */
            <CardPayment
              total={total}
              paymentMethodName={paymentMethod.name}
              onPaymentComplete={() => handlePaymentComplete(paymentMethod.id, paymentMethod.name)}
              onBack={() => setPaymentMethod(null)}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
  const [pendingMethod, setPendingMethod] = useState<{ id: number; name: string; change?: number } | null>(null);
  const [wantsInvoice, setWantsInvoice] = useState(true);
  const [receiptData, setReceiptData] = useState<{
    cartSnapshot: CartItem[];
    subtotal: number;
    tax: number;
    total: number;
    method: string;
    change?: number;
    timestamp: Date;
    orderReference?: string;
    invoiceNumber?: string;
  } | null>(null);

  useEffect(() => {
    if (open && sessionId) {
      setLoadingMethods(true);
      fetch(`/api/odoo/payment-methods?session_id=${sessionId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.methods && data.methods.length > 0) {
            setMethods(data.methods);
          } else {
            setMethods([]);
          }
        })
        .catch((err) => console.error(err))
        .finally(() => setLoadingMethods(false));
    } else {
      setPaymentMethod(null);
      setPaymentError(null);
      setReceiptData(null);
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
          cart,
          total,
          tax,
          subtotal,
          customer,
          uid,
          paymentMethodId: methodId,
          wantsInvoice,
        }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to create order');
      }

      // Audit log (manager-specific)
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
        orderReference: data.order?.reference || data.order?.name,
        invoiceNumber: data.order?.invoiceNumber || null,
      });
      setPendingMethod(null);
    } catch (err: any) {
      setPaymentError(err.message || 'Payment failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Auto-print ticket when receipt arrives
  useEffect(() => {
    if (receiptData) {
      const timer = setTimeout(() => {
        handlePrintTicket();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [receiptData]);

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

  /* ── Print helpers ─────────────────────────────────────────────────────── */

  const printHtml = (html: string) => {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.width = '0px';
    iframe.style.height = '0px';
    iframe.style.border = 'none';
    iframe.style.left = '-9999px';
    document.body.appendChild(iframe);
    if (iframe.contentWindow) {
      iframe.contentWindow.document.open();
      iframe.contentWindow.document.write(html);
      iframe.contentWindow.document.close();
      iframe.contentWindow.focus();
      setTimeout(() => {
        iframe.contentWindow?.print();
        setTimeout(() => document.body.removeChild(iframe), 1000);
      }, 500);
    }
  };

  const handlePrintFacture = () => {
    if (!receiptData) return;
    const storeName = process.env.NEXT_PUBLIC_STORE_NAME || 'GSM Store';
    const storeAddress = process.env.NEXT_PUBLIC_STORE_ADDRESS || '';
    const logoLetters = storeName.substring(0, 2).toUpperCase();
    const dateStr = receiptData.timestamp.toLocaleDateString('fr-FR');
    const orderRef = receiptData.invoiceNumber || receiptData.orderReference || `FAC-${Date.now()}`;
    const isOdooInvoice = !!receiptData.invoiceNumber;
    const taxRate = 8;

    const itemRows = receiptData.cartSnapshot.map((item) => {
      const originalTotal = item.product.price * item.quantity;
      const lineTotal = item.discount ? originalTotal * (1 - item.discount / 100) : originalTotal;
      const discountAmount = originalTotal - lineTotal;
      const discountNote = discountAmount > 0 ? ` <span style="color:#e53e3e;font-size:9px">(-${discountAmount.toFixed(2)} DT)</span>` : '';
      return `<tr>
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

    printHtml(`<!DOCTYPE html><html lang="fr"><head><title>Facture - ${orderRef}</title><meta charset="UTF-8"/>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Inter', Arial, sans-serif; font-size: 11px; color: #111; padding: 32px 44px; max-width: 820px; margin: 0 auto; background: #fff; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 36px; }
        .logo-block { display: flex; flex-direction: column; gap: 6px; }
        .logo-circle { width: 54px; height: 54px; background: #1d4ed8; color: #fff; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: 700; margin-bottom: 6px; }
        .store-name { font-weight: 700; font-size: 13px; }
        .store-meta { color: #555; line-height: 1.7; font-size: 10.5px; margin-top: 4px; }
        .customer-block { text-align: right; }
        .customer-name { font-weight: 700; font-size: 13px; margin-bottom: 4px; }
        .invoice-title { font-size: 26px; font-weight: 700; color: #1d4ed8; margin-bottom: 18px; letter-spacing: -0.5px; }
        .divider-line { border: none; border-top: 1.5px solid #e2e8f0; margin: 0 0 16px; }
        .meta-row { display: flex; gap: 48px; margin-bottom: 28px; }
        .meta-col label { display: block; color: #888; font-size: 10px; margin-bottom: 3px; }
        .meta-col span { font-weight: 600; font-size: 11px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
        thead tr { border-bottom: 2px solid #111; }
        th { padding: 9px 6px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.4px; color: #333; text-align: right; }
        th:first-child { text-align: left; }
        tbody tr:nth-child(even) { background: #f8fafc; }
        td { padding: 8px 6px; font-size: 10.5px; text-align: right; border-bottom: 1px solid #eef0f3; color: #222; }
        td:first-child { text-align: left; max-width: 320px; line-height: 1.4; }
        .totals-wrapper { display: flex; justify-content: flex-end; margin-bottom: 32px; }
        .totals-box { width: 280px; }
        .totals-row { display: flex; justify-content: space-between; padding: 5px 0; font-size: 11px; border-bottom: 1px solid #eef0f3; }
        .totals-row.grand { font-weight: 700; font-size: 14px; border-bottom: none; border-top: 2px solid #111; padding-top: 10px; margin-top: 4px; }
        .footer { border-top: 1px solid #dde1e7; padding-top: 12px; text-align: center; font-size: 9.5px; color: #666; line-height: 1.9; }
        @media print { body { padding: 20px 30px; } @page { size: A4; margin: 12mm; } }
      </style></head><body>
      <div class="header">
        <div class="logo-block">
          <div class="logo-circle">${logoLetters}</div>
          <div class="store-name">${storeName}</div>
          <div class="store-meta">${storeAddress}</div>
        </div>
        ${customer ? `<div class="customer-block"><div class="customer-name">${customer.name}</div></div>` : ''}
      </div>
      <div class="invoice-title">${isOdooInvoice ? 'Facture' : 'Reçu'} ${orderRef}</div>
      <hr class="divider-line"/>
      <div class="meta-row">
        <div class="meta-col"><label>Date:</label><span>${dateStr}</span></div>
        <div class="meta-col"><label>Mode:</label><span>${receiptData.method}</span></div>
      </div>
      <table>
        <thead><tr><th>Description</th><th>Quantité</th><th>Prix</th><th>Tva</th><th>Montant</th></tr></thead>
        <tbody>${itemRows}</tbody>
      </table>
      <div class="totals-wrapper"><div class="totals-box">
        <div class="totals-row"><span>Total HT</span><span>${receiptSubtotal.toFixed(2)} DT</span></div>
        <div class="totals-row grand"><span>TOTAL TTC</span><span>${receiptData.total.toFixed(2)} DT</span></div>
      </div></div>
      <div class="footer">${storeName}</div>
    </body></html>`);
  };

  const handlePrintTicket = () => {
    if (!receiptData) return;
    const storeName = process.env.NEXT_PUBLIC_STORE_NAME || 'GSM Store';
    const storeAddress = process.env.NEXT_PUBLIC_STORE_ADDRESS || '';
    const dateStr = receiptData.timestamp.toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
    const orderRef = receiptData.orderReference || `REF-${Date.now()}`;

    const itemRows = receiptData.cartSnapshot.map((item) => {
      const originalTotal = item.product.price * item.quantity;
      const lineTotal = item.discount ? originalTotal * (1 - item.discount / 100) : originalTotal;
      const discountAmount = originalTotal - lineTotal;
      return `<div class="ticket-row"><span class="item-name">${item.product.name}</span><span>${lineTotal.toFixed(2)}</span></div>
        <div class="ticket-row-meta"><span>${item.quantity.toFixed(0)} x ${item.product.price.toFixed(2)} ${discountAmount > 0 ? `(-${discountAmount.toFixed(2)} DT)` : ''}</span></div>`;
    }).join('');

    printHtml(`<!DOCTYPE html><html lang="fr"><head><title>Ticket - ${orderRef}</title><meta charset="UTF-8"/>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Courier New', Courier, monospace; font-size: 13px; width: 80mm; padding: 5mm; background: #fff; color: #000; }
        .center { text-align: center; }
        .bold { font-weight: bold; }
        .header { margin-bottom: 5mm; }
        .store-name { font-size: 16px; margin-bottom: 1mm; text-transform: uppercase; }
        .divider { border-top: 1px dashed #000; margin: 3mm 0; }
        .ticket-row { display: flex; justify-content: space-between; margin-top: 2mm; }
        .ticket-row-meta { font-size: 11px; margin-bottom: 1mm; }
        .totals { margin-top: 4mm; }
        .totals-row { display: flex; justify-content: space-between; font-size: 14px; margin-top: 1mm; }
        .footer { margin-top: 8mm; font-size: 11px; }
        @media print { body { width: 80mm; padding: 2mm; } @page { margin: 0; size: 80mm auto; } }
      </style></head><body>
      <div class="header center">
        <div class="store-name bold">${storeName}</div>
        <div>${storeAddress}</div>
        <div class="divider"></div>
        <div>TICKET DE CAISSE</div>
        <div class="bold">${orderRef}</div>
        <div>${dateStr}</div>
        <div>Mode: ${receiptData.method}</div>
      </div>
      <div class="divider"></div>
      <div class="items">${itemRows}</div>
      <div class="divider"></div>
      <div class="totals">
        <div class="totals-row bold"><span>TOTAL</span><span>${receiptData.total.toFixed(2)} DT</span></div>
        ${receiptData.change ? `<div class="totals-row"><span>RENDU</span><span>${receiptData.change.toFixed(2)} DT</span></div>` : ''}
      </div>
      <div class="footer center">
        <div>Merci de votre visite !</div>
        <div>À bientôt</div>
        <div style="margin-top: 3mm; font-size: 10px;">${orderRef}</div>
      </div>
    </body></html>`);
  };

  /* ── Render ─────────────────────────────────────────────────────────────── */

  return (
    <Dialog open={open} onOpenChange={() => { if (!receiptData) onClose(); }}>
      <DialogContent className="max-w-[95vw] lg:max-w-5xl h-[85vh] p-0 overflow-hidden border-none bg-background shadow-2xl rounded-3xl">
        <div className="flex flex-col md:flex-row h-full">

          {/* Left panel — cart summary */}
          <div className="w-full md:w-80 bg-secondary/30 p-6 border-r border-border flex flex-col">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">Résumé</h3>
            <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-2">
              {cart.map((item) => (
                <div key={item.product.id} className="flex justify-between items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.product.name}</p>
                    <p className="text-xs text-muted-foreground">x{item.quantity}</p>
                  </div>
                  <span className="text-sm font-semibold">{(item.product.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="mt-auto pt-6 border-t border-border space-y-3">
              <div className="flex justify-between items-center pt-2 mt-2">
                <span className="text-base font-bold">Total</span>
                <span className="text-2xl font-black text-primary">{total.toFixed(2)} DT</span>
              </div>
            </div>
          </div>

          {/* Right panel — payment flow */}
          <div className="flex-1 p-8 flex flex-col bg-card">
            <DialogHeader className="mb-8">
              <DialogTitle className="text-3xl font-black tracking-tight flex items-center gap-3">
                <CheckCircle2 className="h-8 w-8 text-primary" /> Paiement
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Finalisez votre transaction en choisissant un mode de paiement.
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 min-h-0">
              {isProcessing ? (
                <div className="flex flex-col items-center justify-center h-full gap-6">
                  <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                  <p className="text-xl font-bold">Synchronisation Odoo...</p>
                </div>

              ) : paymentError ? (
                <div className="flex flex-col items-center justify-center h-full gap-6">
                  <AlertCircle className="h-12 w-12 text-red-500" />
                  <h3 className="text-xl font-bold">Erreur de Paiement</h3>
                  <p className="text-sm text-red-700 text-center">{paymentError}</p>
                  <div className="flex gap-3">
                    <Button variant="outline" onClick={() => { setPaymentError(null); setPendingMethod(null); setPaymentMethod(null); }}>
                      Retour
                    </Button>
                    <Button onClick={handleRetry} className="gap-2">
                      <RefreshCw className="h-4 w-4" /> Réessayer
                    </Button>
                  </div>
                </div>

              ) : receiptData ? (
                <div className="flex flex-col h-full gap-6">
                  <div className="bg-emerald-50 rounded-2xl p-6 border border-emerald-100 flex items-center gap-4">
                    <CheckCircle2 className="h-7 w-7 text-emerald-500" />
                    <div>
                      <h4 className="text-lg font-bold">Paiement Réussi !</h4>
                      <p className="text-sm">{receiptData.invoiceNumber || receiptData.orderReference}</p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-3 mt-auto">
                    <div className="flex gap-4">
                      <Button onClick={handlePrintFacture} className="flex-1 h-14 bg-blue-600 hover:bg-blue-700 text-white font-black flex items-center gap-2">
                        <Printer className="h-5 w-5" /> IMPRIMER FACTURE
                      </Button>
                      <Button onClick={handlePrintTicket} className="flex-1 h-14 bg-slate-800 hover:bg-slate-900 text-white font-black flex items-center gap-2">
                        <Printer className="h-5 w-5" /> IMPRIMER TICKET
                      </Button>
                    </div>
                    <Button variant="outline" onClick={handleDone} className="w-full h-14 font-black">FERMER</Button>
                  </div>
                </div>

              ) : paymentMethod === null ? (
                <div className="flex flex-col h-full">
                  <PaymentMethods
                    methods={methods}
                    isLoading={loadingMethods}
                    onMethodSelect={(method) => setPaymentMethod(method)}
                  />
                  <div className="mt-auto border-t pt-8">
                    <div className="flex items-center justify-between p-4 rounded-2xl bg-secondary/30 border-2 border-dashed border-border hover:border-primary transition-colors">
                      <div className="flex items-center gap-4">
                        <Printer className={`h-5 w-5 ${wantsInvoice ? 'text-primary' : 'text-muted-foreground'}`} />
                        <div><p className="font-bold">Facture Client Odoo</p></div>
                      </div>
                      <button
                        onClick={() => setWantsInvoice(!wantsInvoice)}
                        className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${wantsInvoice ? 'bg-primary' : 'bg-muted'}`}
                      >
                        <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${wantsInvoice ? 'translate-x-6' : 'translate-x-1'}`} />
                      </button>
                    </div>
                  </div>
                </div>

              ) : paymentMethod.isCash ? (
                <CashPayment
                  total={total}
                  onPaymentComplete={(change) => handlePaymentComplete(paymentMethod.id, paymentMethod.name, change)}
                  onBack={() => setPaymentMethod(null)}
                />
              ) : (
                <CardPayment
                  total={total}
                  paymentMethodName={paymentMethod.name}
                  onPaymentComplete={() => handlePaymentComplete(paymentMethod.id, paymentMethod.name)}
                  onBack={() => setPaymentMethod(null)}
                />
              )}
            </div>
          </div>

        </div>
      </DialogContent>
    </Dialog>
  );
}

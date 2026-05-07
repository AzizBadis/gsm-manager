'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Calculator,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Wallet,
  TrendingUp,
  History,
  Printer
} from 'lucide-react';

interface ClosureSummary {
  id: number;
  name: string;
  cashierName?: string;
  opened_at: string;
  opening_balance: number;
  total_payments: number;
  expected_cash: number;
  payments: Array<{
    method: string;
    amount: number;
    methodId: number;
  }>;
}

interface ClosureModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  sessionId: string | null;
}

export function ClosureModal({ open, onClose, onSuccess, sessionId }: ClosureModalProps) {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<ClosureSummary | null>(null);
  const [realCash, setRealCash] = useState<string>('');
  const [isClosing, setIsClosing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDone, setIsDone] = useState(false);

  useEffect(() => {
    if (open && sessionId) {
      fetchSummary();
    } else {
      setSummary(null);
      setRealCash('');
      setError(null);
    }
  }, [open, sessionId]);

  const fetchSummary = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/odoo/session?session_id=${sessionId}&summary=true`);
      const data = await res.json();
      if (data.summary) {
        setSummary(data.summary);
        setRealCash('');
      } else if (data.no_active_pos_session) {
        setError('Aucune session POS ouverte trouvée dans Odoo. Assurez-vous qu\'une session caissier est active.');
      } else {
        setError(data.error || 'Impossible de récupérer le résumé de la session.');
      }
    } catch {
      setError('Erreur de connexion lors de la récupération du résumé.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!summary || isClosing) return;
    setIsClosing(true);
    try {
      const res = await fetch(`/api/odoo/session?session_id=${sessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ closingBalance: parseFloat(realCash) || 0 }),
      });
      const data = await res.json();
      if (data.success) {
        handlePrintClosure();
        setIsDone(true);
      } else {
        setError(data.error || 'Erreur lors de la clôture de la session.');
      }
    } catch {
      setError('Erreur réseau lors de la clôture.');
    } finally {
      setIsClosing(false);
    }
  };


  const handlePrintClosure = () => {
    if (!summary) return;

    const storeName = process.env.NEXT_PUBLIC_STORE_NAME || 'GSM Store';
    const storeAddress = process.env.NEXT_PUBLIC_STORE_ADDRESS || '';
    const dateStr = new Date().toLocaleString('fr-FR');
    
    const paymentRows = summary.payments.map(p => `
      <div class="ticket-row">
        <span>${p.method}</span>
        <span>${p.amount.toFixed(2)} DT</span>
      </div>
    `).join('');

    const ticketHtml = `
      <!DOCTYPE html>
      <html lang="fr">
      <head>
        <title>Clôture - ${summary.name}</title>
        <meta charset="UTF-8"/>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Courier New', Courier, monospace;
            font-size: 13px;
            width: 80mm;
            padding: 5mm;
            background: #fff;
            color: #000;
          }
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
          @media print {
            body { width: 80mm; padding: 2mm; }
            @page { margin: 0; size: 80mm auto; }
          }
        </style>
      </head>
      <body>
        <div class="header center">
          <div class="store-name bold">${storeName}</div>
          <div>${storeAddress}</div>
          <div class="divider"></div>
          <div class="bold">RAPPORT DE CLÔTURE</div>
          <div class="bold">${summary.name}</div>
          ${summary.cashierName ? `<div>Caissier: ${summary.cashierName}</div>` : ''}
          <div>Le: ${dateStr}</div>
        </div>
        
        <div class="divider"></div>
        <div class="ticket-row">
          <span>Début session</span>
          <span>${summary.opening_balance.toFixed(2)} DT</span>
        </div>
        <div class="ticket-row">
          <span>Ventes totales</span>
          <span>${summary.total_payments.toFixed(2)} DT</span>
        </div>
        
        <div class="divider"></div>
        <div class="bold">DÉTAIL PAIEMENTS:</div>
        ${paymentRows}
        
        <div class="divider"></div>
        <div class="ticket-row bold">
          <span>ESPÈCES RÉELLES</span>
          <span>${realCashValue.toFixed(2)} DT</span>
        </div>
        <div class="ticket-row">
          <span>Attendu (Espèces)</span>
          <span>${expectedCash.toFixed(2)} DT</span>
        </div>
        <div class="ticket-row bold">
          <span>DIFFÉRENCE</span>
          <span>${difference >= 0 ? '+' : ''}${difference.toFixed(2)} DT</span>
        </div>
        
        <div class="divider"></div>
        <div class="footer center">
          <div>Clôture effectuée avec succès</div>
          <div style="margin-top: 3mm; font-size: 10px;">ID: ${summary.id}</div>
        </div>
      </body>
      </html>
    `;

    printHtml(ticketHtml);
  };

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


  const expectedCash = summary?.expected_cash || 0;
  const realCashValue = parseFloat(realCash) || 0;
  const difference = realCashValue - expectedCash;

  return (
    <Dialog open={open} onOpenChange={(val) => { if (!val && !isClosing) onClose(); }}>
      <DialogContent className="max-w-2xl gap-0 p-0 overflow-hidden border-none bg-background shadow-2xl rounded-3xl">
        <DialogHeader className="p-8 bg-slate-900 text-white">
          <div className="flex items-center gap-4 mb-2">
            <div className="p-3 bg-blue-500/20 rounded-2xl">
              <Calculator className="h-6 w-6 text-blue-400" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-black tracking-tight uppercase">Clôture de Caisse</DialogTitle>
              <DialogDescription className="text-slate-400 font-medium">
                {summary?.cashierName
                  ? `Session de : ${summary.cashierName} · ${summary.name}`
                  : 'Vérification des fonds et fermeture de la session Odoo'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="p-8 space-y-8 overflow-y-auto max-h-[60vh]">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Calcul des totaux...</p>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-100 p-6 rounded-2xl flex items-center gap-4 text-red-900">
              <AlertTriangle className="h-6 w-6 flex-shrink-0" />
              <p className="font-bold">{error}</p>
            </div>
          ) : summary && (
            <div className="space-y-6">
              {!isDone ? (
                <div className="p-8 bg-slate-50 rounded-3xl border border-slate-200 shadow-inner">
                  <div>
                    <label className="text-sm font-black uppercase tracking-widest text-slate-500 block mb-4 text-center">
                      Saisir les espèces réelles en caisse
                    </label>
                    <div className="relative max-w-sm mx-auto">
                      <Input
                        type="number"
                        step="0.01"
                        value={realCash}
                        onChange={(e) => setRealCash(e.target.value)}
                        className="h-20 text-4xl font-black px-6 text-center rounded-2xl border-2 focus-visible:ring-primary focus-visible:border-primary transition-all shadow-sm"
                        placeholder="0.00"
                        autoFocus
                      />
                      <div className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xl">DT</div>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="bg-emerald-50 border border-emerald-200 p-6 rounded-3xl flex items-center gap-4 text-emerald-900">
                    <CheckCircle2 className="h-8 w-8 text-emerald-600" />
                    <div>
                      <h3 className="text-lg font-black uppercase tracking-tight">Session Clôturée avec Succès</h3>
                      <p className="text-sm font-medium opacity-80">Le rapport a été envoyé à l'imprimante.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-secondary/30 p-5 rounded-2xl border border-border">
                      <div className="flex items-center gap-2 mb-2 text-muted-foreground">
                        <History className="h-4 w-4" />
                        <span className="text-xs font-bold uppercase tracking-wider">Début session</span>
                      </div>
                      <p className="text-xl font-black">{summary.opening_balance.toFixed(2)} DT</p>
                    </div>
                    <div className="bg-primary/5 p-5 rounded-2xl border border-primary/10">
                      <div className="flex items-center gap-2 mb-2 text-primary">
                        <TrendingUp className="h-4 w-4" />
                        <span className="text-xs font-bold uppercase tracking-wider">Ventes Totales</span>
                      </div>
                      <p className="text-xl font-black text-primary">{summary.total_payments.toFixed(2)} DT</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                      <Wallet className="h-4 w-4" /> Détail des encaissements
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                      {summary.payments.map((p, idx) => (
                        <div key={idx} className="flex justify-between items-center p-3 bg-card border border-border rounded-xl">
                          <span className="text-xs font-bold">{p.method}</span>
                          <span className="text-sm font-black">{p.amount.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-6 bg-slate-900 text-white rounded-3xl space-y-4 shadow-xl">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold uppercase opacity-60">Espèces Réelles</span>
                      <span className="text-2xl font-black">{realCashValue.toFixed(2)} DT</span>
                    </div>
                    <div className="flex justify-between items-center opacity-60 border-t border-white/10 pt-4">
                      <span className="text-xs font-bold uppercase">Attendu</span>
                      <span className="text-lg font-black">{expectedCash.toFixed(2)} DT</span>
                    </div>
                    <div className={`flex justify-between items-center pt-4 border-t border-white/10 ${difference === 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                      <span className="text-xs font-bold uppercase">Différence</span>
                      <span className="text-2xl font-black">
                        {difference >= 0 ? '+' : ''}{difference.toFixed(2)} DT
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="p-8 bg-slate-50 border-t border-border gap-3 sm:justify-between items-center">
          {!isDone ? (
            <>
              <Button
                variant="ghost"
                onClick={onClose}
                disabled={isClosing}
                className="font-bold uppercase tracking-wider text-muted-foreground hover:bg-slate-200"
              >
                Annuler
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={loading || !!error || isClosing || !realCash}
                className="h-14 px-10 bg-slate-900 hover:bg-slate-800 text-white font-black uppercase tracking-widest rounded-xl shadow-xl shadow-slate-900/10 flex items-center gap-3 transition-transform active:scale-95"
              >
                {isClosing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Printer className="h-5 w-5 text-emerald-400" />}
                Valider et Imprimer
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={handlePrintClosure}
                className="h-14 px-6 font-bold uppercase tracking-wider flex items-center gap-2 border-2"
              >
                <Printer className="h-5 w-5" /> Ré-imprimer
              </Button>
              <Button
                onClick={onSuccess}
                className="h-14 px-10 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest rounded-xl shadow-xl shadow-blue-900/10 flex items-center gap-3 transition-transform active:scale-95"
              >
                Fermer et Déconnexion <CheckCircle2 className="h-5 w-5" />
              </Button>
            </>
          )}
        </DialogFooter>

      </DialogContent>
    </Dialog>
  );
}

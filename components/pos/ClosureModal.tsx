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
  Info,
  Printer,
  X,
  ArrowRight
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ClosureSummary {
  id: number;
  name: string;
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
  const { toast } = useToast();

  useEffect(() => {
    if (open && sessionId) {
      fetchSummary();
    } else {
      setSummary(null);
      setRealCash('');
      setError(null);
      setIsDone(false);
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
        setError("Aucune session POS active trouvée.");
      } else {
        setError(data.error || "Erreur de récupération du résumé.");
      }
    } catch (err) {
      setError("Erreur de connexion.");
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
        toast({ description: "Session clôturée avec succès." });
      } else {
        toast({ variant: "destructive", description: data.error || "Erreur de clôture." });
      }
    } catch (err) {
      toast({ variant: "destructive", description: "Erreur réseau." });
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

    const expectedCash = summary?.expected_cash || 0;
    const realCashValue = parseFloat(realCash) || 0;
    const difference = realCashValue - expectedCash;

    const ticketHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Clôture - ${summary.name}</title>
        <meta charset="UTF-8"/>
        <style>
          body { font-family: 'Courier New', Courier, monospace; font-size: 13px; width: 80mm; padding: 5mm; }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .header { margin-bottom: 5mm; }
          .divider { border-top: 1px dashed #000; margin: 3mm 0; }
          .ticket-row { display: flex; justify-content: space-between; margin-top: 2mm; }
          @media print { body { width: 80mm; padding: 2mm; } @page { margin: 0; size: 80mm auto; } }
        </style>
      </head>
      <body>
        <div class="header center">
          <div class="bold" style="font-size: 16px;">${storeName}</div>
          <div>${storeAddress}</div>
          <div class="divider"></div>
          <div class="bold">RAPPORT DE CLÔTURE</div>
          <div class="bold">${summary.name}</div>
          <div>Le: ${dateStr}</div>
        </div>
        <div class="divider"></div>
        <div class="ticket-row"><span>Ouverture</span><span>${summary.opening_balance.toFixed(2)} DT</span></div>
        <div class="ticket-row"><span>Total Ventes</span><span>${summary.total_payments.toFixed(2)} DT</span></div>
        <div class="divider"></div>
        <div class="bold">DÉTAIL PAIEMENTS:</div>
        ${paymentRows}
        <div class="divider"></div>
        <div class="ticket-row bold"><span>ESPÈCES RÉELLES</span><span>${realCashValue.toFixed(2)} DT</span></div>
        <div class="ticket-row"><span>Attendu</span><span>${expectedCash.toFixed(2)} DT</span></div>
        <div class="ticket-row bold"><span>DIFFÉRENCE</span><span>${difference >= 0 ? '+' : ''}${difference.toFixed(2)} DT</span></div>
        <div class="divider"></div>
        <div class="footer center"><div>Clôture effectuée</div><div style="margin-top: 3mm; font-size: 10px;">ID: ${summary.id}</div></div>
      </body>
      </html>
    `;

    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute'; iframe.style.width = '0px'; iframe.style.height = '0px'; iframe.style.border = 'none'; iframe.style.left = '-9999px';
    document.body.appendChild(iframe);
    if (iframe.contentWindow) {
      iframe.contentWindow.document.open(); iframe.contentWindow.document.write(ticketHtml); iframe.contentWindow.document.close();
      iframe.contentWindow.focus();
      setTimeout(() => { iframe.contentWindow?.print(); setTimeout(() => document.body.removeChild(iframe), 1000); }, 500);
    }
  };

  const expectedCash = summary?.expected_cash || 0;
  const realCashValue = parseFloat(realCash) || 0;
  const difference = realCashValue - expectedCash;

  return (
    <Dialog open={open} onOpenChange={(val) => { if (!val && !isClosing) onClose(); }}>
      <DialogContent className="max-w-xl gap-0 p-0 overflow-hidden border border-border bg-white dark:bg-zinc-900 rounded-lg shadow-xl">
        {/* Clean Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-slate-50/50 dark:bg-zinc-800/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Calculator className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <DialogTitle className="text-sm font-bold text-foreground uppercase tracking-tight">Fin de Session</DialogTitle>
              <DialogDescription className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Clôture et vérification des fonds</DialogDescription>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-200 dark:hover:bg-zinc-700 rounded-full transition-colors"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto max-h-[70vh] custom-scrollbar">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Calcul des totaux...</p>
            </div>
          ) : error ? (
            <div className="bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 p-4 rounded-lg flex items-center gap-3 text-red-700 dark:text-red-400">
              <AlertTriangle className="h-5 w-5 flex-shrink-0" />
              <p className="text-sm font-medium">{error}</p>
            </div>
          ) : summary && (
            <div className="space-y-6">
              {!isDone ? (
                <div className="space-y-4">
                  <div className="p-6 bg-slate-50 dark:bg-zinc-800/50 rounded-lg border border-border">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block mb-4 text-center">
                      Saisir le total espèces en caisse
                    </label>
                    <div className="relative max-w-[240px] mx-auto">
                      <Input
                        type="number"
                        step="0.01"
                        value={realCash}
                        onChange={(e) => setRealCash(e.target.value)}
                        className="h-16 text-3xl font-bold px-4 text-center rounded-lg border-border focus-visible:ring-blue-500 transition-all bg-white dark:bg-zinc-900"
                        placeholder="0.00"
                        autoFocus
                      />
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-sm">DT</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-50 dark:bg-zinc-800/30 rounded-lg border border-border">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Total Ventes</p>
                      <p className="text-lg font-bold">{summary.total_payments.toFixed(2)} DT</p>
                    </div>
                    <div className="p-4 bg-slate-50 dark:bg-zinc-800/30 rounded-lg border border-border">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Attendu (Espèces)</p>
                      <p className="text-lg font-bold">{expectedCash.toFixed(2)} DT</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/20 p-5 rounded-lg flex items-center gap-4 text-emerald-800 dark:text-emerald-400">
                    <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                    <div>
                      <h3 className="text-sm font-bold uppercase tracking-tight">Session Clôturée</h3>
                      <p className="text-[10px] font-medium opacity-80">Rapport de clôture prêt pour impression.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-4 bg-slate-50 dark:bg-zinc-800/30 rounded-lg border border-border">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Espèces Réelles</p>
                      <p className="text-lg font-bold">{realCashValue.toFixed(2)} DT</p>
                    </div>
                    <div className="p-4 bg-slate-50 dark:bg-zinc-800/30 rounded-lg border border-border">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Différence</p>
                      <p className={`text-lg font-bold ${difference === 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {difference >= 0 ? '+' : ''}{difference.toFixed(2)} DT
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                      <Wallet className="h-3 w-3" /> Modes de règlement
                    </h4>
                    <div className="grid grid-cols-1 gap-1">
                      {summary.payments.map((p, idx) => (
                        <div key={idx} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-zinc-800/30 border border-border rounded-lg">
                          <span className="text-xs font-medium">{p.method}</span>
                          <span className="text-xs font-bold">{p.amount.toFixed(2)} DT</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="p-4 border-t border-border bg-slate-50/50 dark:bg-zinc-800/30 flex justify-end gap-3">
          {!isDone ? (
            <>
              <Button 
                variant="outline" 
                onClick={onClose} 
                disabled={isClosing}
                className="text-xs font-bold uppercase tracking-wider h-10 border-border"
              >
                Annuler
              </Button>
              <Button 
                onClick={handleConfirm} 
                disabled={loading || !!error || isClosing || !realCash}
                className="h-10 px-8 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-widest rounded-lg shadow-md flex items-center gap-2 transition-all active:scale-95"
              >
                {isClosing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
                Clôturer & Imprimer
              </Button>
            </>
          ) : (
            <>
              <Button 
                variant="outline" 
                onClick={handlePrintClosure}
                className="text-xs font-bold uppercase tracking-wider h-10 border-border flex items-center gap-2"
              >
                <Printer className="h-4 w-4" /> Ré-imprimer
              </Button>
              <Button 
                onClick={onSuccess} 
                className="h-10 px-8 bg-slate-900 dark:bg-blue-600 text-white font-bold text-xs uppercase tracking-widest rounded-lg flex items-center gap-2"
              >
                Terminer <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

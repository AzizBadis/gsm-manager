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
        setRealCash(data.summary.expected_cash.toFixed(2));
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
        onSuccess();
      } else {
        setError(data.error || 'Erreur lors de la clôture de la session.');
      }
    } catch {
      setError('Erreur réseau lors de la clôture.');
    } finally {
      setIsClosing(false);
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
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-secondary/30 p-5 rounded-2xl border border-border">
                  <div className="flex items-center gap-2 mb-2 text-muted-foreground">
                    <History className="h-4 w-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">Début de session</span>
                  </div>
                  <p className="text-xl font-black">{summary.opening_balance.toFixed(2)} DT</p>
                  <p className="text-[10px] text-muted-foreground mt-1">{new Date(summary.opened_at).toLocaleString()}</p>
                </div>
                <div className="bg-primary/5 p-5 rounded-2xl border border-primary/10">
                  <div className="flex items-center gap-2 mb-2 text-primary">
                    <TrendingUp className="h-4 w-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">Ventes Totales</span>
                  </div>
                  <p className="text-xl font-black text-primary">{summary.total_payments.toFixed(2)} DT</p>
                  <p className="text-[10px] text-muted-foreground mt-1">Tous modes de paiement</p>
                </div>
              </div>

              {summary.payments.length > 0 && (
                <div className="space-y-4">
                  <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                    <Wallet className="h-4 w-4" /> Détail des encaissements
                  </h4>
                  <div className="space-y-2">
                    {summary.payments.map((p, idx) => (
                      <div key={idx} className="flex justify-between items-center p-4 bg-card border border-border rounded-xl">
                        <span className="font-bold">{p.method}</span>
                        <span className="font-black">{p.amount.toFixed(2)} DT</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 space-y-6">
                <div>
                  <label className="text-xs font-black uppercase tracking-widest text-slate-500 block mb-3">
                    Espèces réelles en caisse
                  </label>
                  <div className="relative">
                    <Input
                      type="number"
                      step="0.01"
                      value={realCash}
                      onChange={(e) => setRealCash(e.target.value)}
                      className="h-16 text-3xl font-black px-6 rounded-xl border-2 focus-visible:ring-primary focus-visible:border-primary transition-all"
                      placeholder="0.00"
                    />
                    <div className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 font-bold">DT</div>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-4 border-t border-slate-200">
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase">Attendu (Espèces)</p>
                    <p className="text-lg font-black">{expectedCash.toFixed(2)} DT</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-slate-500 uppercase">Différence</p>
                    <p className={`text-lg font-black ${difference === 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {difference >= 0 ? '+' : ''}{difference.toFixed(2)} DT
                    </p>
                  </div>
                </div>

                {Math.abs(difference) > 0.01 && (
                  <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-800 leading-relaxed font-medium">
                      Un écart de caisse est détecté. Vérifiez vos espèces avant de finaliser.
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <DialogFooter className="p-8 bg-slate-50 border-t border-border gap-3 sm:justify-between items-center">
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
            disabled={loading || !!error || isClosing}
            className="h-14 px-10 bg-slate-900 hover:bg-slate-800 text-white font-black uppercase tracking-widest rounded-xl shadow-xl shadow-slate-900/10 flex items-center gap-3 transition-transform active:scale-95"
          >
            {isClosing ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="h-5 w-5 text-emerald-400" />}
            Confirmer la clôture
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

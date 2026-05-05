'use client';

import { useState, useEffect, useCallback } from 'react';
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
  Search,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  RotateCcw,
  ChevronLeft,
  Package,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface OrderLine {
  id: number;
  productId: number;
  productName: string;
  qty: number;
  price: number;
  discount: number;
  total: number;
}

interface PastOrder {
  id: number;
  name: string;
  reference: string;
  date: string;
  total: number;
  partner: string | null;
  lines: OrderLine[];
}

interface SelectedLine {
  lineId: number;
  productId: number;
  productName: string;
  qty: number;
  price: number;
  discount: number;
}

interface RefundModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
  sessionId: string | null;
  uid: number | null;
}

export function RefundModal({ open, onClose, onSuccess, sessionId, uid }: RefundModalProps) {
  const [step, setStep] = useState<'search' | 'select'>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [orders, setOrders] = useState<PastOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<PastOrder | null>(null);
  const [selectedLines, setSelectedLines] = useState<Map<number, SelectedLine>>(new Map());
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setStep('search');
      setSearchQuery('');
      setOrders([]);
      setSelectedOrder(null);
      setSelectedLines(new Map());
      setError(null);
    }
  }, [open]);

  const handleSearch = useCallback(async () => {
    if (!sessionId) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ session_id: sessionId });
      if (searchQuery.trim()) params.set('search', searchQuery.trim());
      const res = await fetch(`/api/odoo/refund?${params}`);
      const data = await res.json();
      if (data.success) {
        setOrders(data.orders);
        if (data.orders.length === 0) setError('Aucune commande trouvée.');
      } else {
        setError(data.error || 'Erreur lors de la recherche.');
      }
    } catch {
      setError('Erreur de connexion.');
    } finally {
      setLoading(false);
    }
  }, [sessionId, searchQuery]);

  // Auto-search on open
  useEffect(() => {
    if (open && sessionId) {
      handleSearch();
    }
  }, [open, sessionId]);

  const handleSelectOrder = (order: PastOrder) => {
    setSelectedOrder(order);
    // Pre-select all lines
    const map = new Map<number, SelectedLine>();
    for (const line of order.lines) {
      map.set(line.id, {
        lineId: line.id,
        productId: line.productId,
        productName: line.productName,
        qty: line.qty,
        price: line.price,
        discount: line.discount,
      });
    }
    setSelectedLines(map);
    setStep('select');
  };

  const toggleLine = (line: OrderLine) => {
    setSelectedLines((prev) => {
      const next = new Map(prev);
      if (next.has(line.id)) {
        next.delete(line.id);
      } else {
        next.set(line.id, {
          lineId: line.id,
          productId: line.productId,
          productName: line.productName,
          qty: line.qty,
          price: line.price,
          discount: line.discount,
        });
      }
      return next;
    });
  };

  const updateQty = (lineId: number, qty: number) => {
    setSelectedLines((prev) => {
      const next = new Map(prev);
      const line = next.get(lineId);
      if (line) {
        next.set(lineId, { ...line, qty: Math.max(1, qty) });
      }
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!selectedOrder || selectedLines.size === 0 || !sessionId) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/odoo/refund?session_id=${sessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originalOrderId: selectedOrder.id,
          lines: Array.from(selectedLines.values()),
          uid,
        }),
      });
      const data = await res.json();
      if (data.success) {
        onSuccess(`Retour créé : ${data.refund.reference} — ${Math.abs(data.refund.total).toFixed(2)} DT`);
        onClose();
      } else {
        setError(data.error || 'Erreur lors de la création du retour.');
      }
    } catch {
      setError('Erreur réseau.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const refundTotal = Array.from(selectedLines.values()).reduce((sum, l) => {
    return sum + l.price * l.qty * (1 - (l.discount || 0) / 100);
  }, 0);

  return (
    <Dialog open={open} onOpenChange={(val) => { if (!val && !isSubmitting) onClose(); }}>
      <DialogContent className="max-w-2xl gap-0 p-0 overflow-hidden border-none bg-background shadow-2xl rounded-3xl">
        <DialogHeader className="p-8 bg-slate-900 text-white">
          <div className="flex items-center gap-4 mb-2">
            <div className="p-3 bg-red-500/20 rounded-2xl">
              <RotateCcw className="h-6 w-6 text-red-400" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-black tracking-tight uppercase">Retour / Remboursement</DialogTitle>
              <DialogDescription className="text-slate-400 font-medium">
                Recherchez une commande passée et sélectionnez les articles à retourner
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6 space-y-4 overflow-y-auto max-h-[65vh]">
          {step === 'search' && (
            <>
              {/* Search bar */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Référence ou numéro de commande..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    className="pl-10 h-12 text-base rounded-xl border-2 focus-visible:ring-primary focus-visible:border-primary"
                  />
                </div>
                <Button
                  onClick={handleSearch}
                  disabled={loading}
                  className="h-12 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                </Button>
              </div>

              {error && (
                <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-100 rounded-xl text-red-800">
                  <AlertTriangle className="h-5 w-5 flex-shrink-0" />
                  <p className="text-sm font-medium">{error}</p>
                </div>
              )}

              {loading ? (
                <div className="flex flex-col items-center justify-center py-10 gap-3">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Recherche en cours...</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {orders.map((order) => (
                    <button
                      key={order.id}
                      onClick={() => handleSelectOrder(order)}
                      className="w-full flex items-center justify-between p-4 rounded-xl border border-border bg-card hover:bg-secondary/30 transition-colors text-left group"
                    >
                      <div>
                        <p className="font-black text-sm">{order.reference}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {new Date(order.date).toLocaleString()} {order.partner ? `· ${order.partner}` : ''}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">{order.lines.length} article(s)</p>
                      </div>
                      <div className="text-right">
                        <p className="font-black text-blue-600 text-base">{order.total.toFixed(2)} DT</p>
                        <p className="text-xs text-primary mt-1 opacity-0 group-hover:opacity-100 transition-opacity font-bold">
                          Sélectionner →
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          {step === 'select' && selectedOrder && (
            <>
              <button
                onClick={() => setStep('search')}
                className="flex items-center gap-1.5 text-sm font-bold text-muted-foreground hover:text-foreground transition-colors mb-2"
              >
                <ChevronLeft className="h-4 w-4" /> Retour à la recherche
              </button>

              <div className="p-4 bg-secondary/20 rounded-xl border border-border mb-2">
                <p className="font-black">{selectedOrder.reference}</p>
                <p className="text-xs text-muted-foreground">{new Date(selectedOrder.date).toLocaleString()}</p>
              </div>

              <p className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Package className="h-4 w-4" /> Articles à retourner
              </p>

              {error && (
                <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-100 rounded-xl text-red-800">
                  <AlertTriangle className="h-5 w-5 flex-shrink-0" />
                  <p className="text-sm font-medium">{error}</p>
                </div>
              )}

              <div className="space-y-2">
                {selectedOrder.lines.map((line) => {
                  const isSelected = selectedLines.has(line.id);
                  const selLine = selectedLines.get(line.id);
                  return (
                    <div
                      key={line.id}
                      className={cn(
                        'flex items-center gap-3 p-4 rounded-xl border transition-all',
                        isSelected
                          ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-500/20'
                          : 'bg-card border-border hover:bg-secondary/20 cursor-pointer'
                      )}
                      onClick={() => toggleLine(line)}
                    >
                      <div className={cn('w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0', isSelected ? 'border-white bg-white/20' : 'border-border')}>
                        {isSelected && <CheckCircle2 className="h-4 w-4 text-white" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm truncate">{line.productName}</p>
                        <p className={cn('text-xs', isSelected ? 'text-blue-100' : 'text-muted-foreground')}>
                          {line.price.toFixed(2)} DT × {line.qty}
                          {line.discount ? ` (-${line.discount}%)` : ''}
                        </p>
                      </div>
                      {isSelected && (
                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <button
                            className="w-7 h-7 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center text-white font-black text-lg transition-colors"
                            onClick={() => updateQty(line.id, (selLine?.qty || 1) - 1)}
                          >
                            −
                          </button>
                          <span className="w-8 text-center font-black text-white">{selLine?.qty || 1}</span>
                          <button
                            className="w-7 h-7 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center text-white font-black text-lg transition-colors"
                            onClick={() => updateQty(line.id, (selLine?.qty || 1) + 1)}
                            disabled={(selLine?.qty || 0) >= line.qty}
                          >
                            +
                          </button>
                        </div>
                      )}
                      <span className={cn('font-black text-sm ml-2', isSelected ? 'text-white' : 'text-foreground')}>
                        {line.total.toFixed(2)} DT
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-between items-center p-4 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-sm font-bold text-slate-600 uppercase tracking-wide">Total à rembourser</span>
                <span className="text-xl font-black text-red-600">−{refundTotal.toFixed(2)} DT</span>
              </div>
            </>
          )}
        </div>

        <DialogFooter className="p-6 bg-slate-50 border-t border-border gap-3 sm:justify-between items-center">
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={isSubmitting}
            className="font-bold uppercase tracking-wider text-muted-foreground hover:bg-slate-200"
          >
            Annuler
          </Button>
          {step === 'select' && (
            <Button
              onClick={handleSubmit}
              disabled={selectedLines.size === 0 || isSubmitting}
              className="h-14 px-10 bg-red-600 hover:bg-red-700 text-white font-black uppercase tracking-widest rounded-xl shadow-xl shadow-red-600/20 flex items-center gap-3 transition-transform active:scale-95"
            >
              {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <RotateCcw className="h-5 w-5" />}
              Confirmer le retour ({selectedLines.size} article{selectedLines.size > 1 ? 's' : ''})
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

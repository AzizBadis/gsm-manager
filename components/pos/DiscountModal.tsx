'use client';

import { useState, useEffect, useCallback } from 'react';
import { Percent, X, AlertTriangle, CheckCircle2, Loader2, ShieldAlert } from 'lucide-react';
import { CartItem } from '@/lib/pos/types';
import { useAuth } from '@/hooks/useAuth';

interface DiscountModalProps {
  open: boolean;
  onClose: () => void;
  cart: CartItem[];
  onApplyDiscount: (productId: string, discountPercentage: number) => void;
}

type ValidationState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'valid'; maxDiscount: number }
  | { status: 'invalid'; reason: string; maxDiscount?: number }
  | { status: 'warning'; message: string };

export function DiscountModal({ open, onClose, cart, onApplyDiscount }: DiscountModalProps) {
  const { sessionId } = useAuth();
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [discountValue, setDiscountValue] = useState<string>('');
  const [validation, setValidation] = useState<ValidationState>({ status: 'idle' });

  // Reset on open/close
  useEffect(() => {
    if (!open) {
      setSelectedProductId(null);
      setDiscountValue('');
      setValidation({ status: 'idle' });
    }
  }, [open]);

  const selectedItem = cart.find((i) => i.product.id === selectedProductId);

  const validateDiscount = useCallback(
    async (productId: string | null, discount: string) => {
      const val = parseFloat(discount);
      if (!productId || isNaN(val) || val < 0) {
        setValidation({ status: 'idle' });
        return;
      }

      const item = cart.find((i) => i.product.id === productId);
      if (!item) return;

      setValidation({ status: 'loading' });

      try {
        const res = await fetch(`/api/odoo/discount?session_id=${sessionId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            productOdooId: item.product.odooId,
            salePrice: item.product.price,
            discount: val,
          }),
        });
        const data = await res.json();

        if (data.valid) {
          if (data.warning) {
            setValidation({ status: 'warning', message: data.warning });
          } else {
            setValidation({ status: 'valid', maxDiscount: data.maxDiscount });
          }
        } else {
          setValidation({ status: 'invalid', reason: data.reason, maxDiscount: data.maxDiscount });
        }
      } catch {
        setValidation({ status: 'warning', message: 'Odoo unreachable — discount applied without server validation.' });
      }
    },
    [sessionId, cart]
  );

  // Debounced validation when discount or product changes
  useEffect(() => {
    if (!discountValue || !selectedProductId) {
      setValidation({ status: 'idle' });
      return;
    }
    const timer = setTimeout(() => {
      validateDiscount(selectedProductId, discountValue);
    }, 450);
    return () => clearTimeout(timer);
  }, [discountValue, selectedProductId, validateDiscount]);

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    if (validation.status === 'invalid') return;
    const val = parseFloat(discountValue);
    if (!isNaN(val) && val >= 0 && val <= 100 && selectedProductId) {
      onApplyDiscount(selectedProductId, val);
      setDiscountValue('');
      setSelectedProductId(null);
      setValidation({ status: 'idle' });
      onClose();
    }
  };

  const handleUseMax = () => {
    if (validation.status === 'invalid' && validation.maxDiscount !== undefined) {
      setDiscountValue(String(validation.maxDiscount));
    }
  };

  if (!open) return null;

  const canApply =
    selectedProductId &&
    discountValue &&
    !isNaN(parseFloat(discountValue)) &&
    parseFloat(discountValue) >= 0 &&
    validation.status !== 'invalid' &&
    validation.status !== 'loading';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-background shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b p-4 bg-primary/5">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Percent className="h-5 w-5 text-primary" />
            Apply Discount
          </h2>
          <button
            onClick={onClose}
            className="rounded-full p-2 hover:bg-black/5 transition-colors"
          >
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        <div className="p-4 bg-muted/20">
          <form onSubmit={handleApply} className="space-y-4">
            {/* Product selector */}
            <div>
              <label className="block text-sm font-medium mb-1">Select Item *</label>
              <select
                value={selectedProductId || ''}
                onChange={(e) => {
                  setSelectedProductId(e.target.value);
                  setDiscountValue('');
                  setValidation({ status: 'idle' });
                }}
                className="w-full rounded-xl border bg-background px-4 py-3 shadow-sm outline-none focus:ring-2 focus:ring-primary/20"
                required
              >
                <option value="" disabled>-- Select an item --</option>
                {cart.map((item) => (
                  <option key={item.product.id} value={item.product.id}>
                    {item.product.name} — {item.product.price.toFixed(2)} DT (Qty: {item.quantity})
                    {item.discount ? ` [${item.discount}% applied]` : ''}
                  </option>
                ))}
              </select>

              {/* Current discount badge */}
              {selectedItem?.discount ? (
                <p className="text-xs text-emerald-600 mt-1 font-medium">
                  ✓ Current discount: {selectedItem.discount}% — entering a new value will replace it.
                </p>
              ) : null}
            </div>

            {/* Discount input */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium">Discount % *</label>
                <span className="text-xs text-muted-foreground">Max allowed: 30%</span>
              </div>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  className="w-full rounded-xl border bg-background px-4 py-3 shadow-sm outline-none focus:ring-2 focus:ring-primary/20 text-lg pr-12 transition-all"
                  placeholder="e.g. 10"
                  required
                  disabled={!selectedProductId}
                />
                <Percent className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              </div>

              {/* Quick presets */}
              <div className="flex gap-2 mt-2">
                {[5, 10, 15, 20, 25, 30].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    disabled={!selectedProductId}
                    onClick={() => setDiscountValue(String(pct))}
                    className="flex-1 rounded-lg border bg-background py-1.5 text-xs font-medium hover:bg-primary hover:text-primary-foreground transition-colors disabled:opacity-40"
                  >
                    {pct}%
                  </button>
                ))}
              </div>
            </div>

            {/* Validation feedback */}
            {selectedItem && discountValue && (
              <div className={`rounded-xl p-3 text-sm flex items-start gap-2 transition-all ${
                validation.status === 'loading'
                  ? 'bg-muted text-muted-foreground'
                  : validation.status === 'valid'
                  ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                  : validation.status === 'invalid'
                  ? 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800'
                  : 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
              }`}>
                {validation.status === 'loading' && <Loader2 className="h-4 w-4 animate-spin shrink-0 mt-0.5" />}
                {validation.status === 'valid' && <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />}
                {validation.status === 'invalid' && <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />}
                {validation.status === 'warning' && <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />}

                <div className="flex-1">
                  {validation.status === 'loading' && <span>Validating against Odoo rules...</span>}
                  {validation.status === 'valid' && (
                    <span>
                      ✓ Valid — New price:{' '}
                      <strong>
                        {(selectedItem.product.price * (1 - parseFloat(discountValue) / 100)).toFixed(2)} DT
                      </strong>
                    </span>
                  )}
                  {validation.status === 'invalid' && (
                    <div>
                      <p>{validation.reason}</p>
                      {validation.maxDiscount !== undefined && (
                        <button
                          type="button"
                          onClick={handleUseMax}
                          className="mt-1 text-xs underline font-semibold"
                        >
                          Use max allowed ({validation.maxDiscount}%) instead
                        </button>
                      )}
                    </div>
                  )}
                  {validation.status === 'warning' && <span>{validation.message}</span>}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-xl border bg-background py-3 font-medium hover:bg-muted/50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!canApply}
                className="flex-1 rounded-xl bg-primary py-3 font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {validation.status === 'loading' ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> Validating...
                  </span>
                ) : 'Apply Discount'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { Smartphone, X } from 'lucide-react';
import { CartItem } from '@/lib/pos/types';

interface ImeiModalProps {
  open: boolean;
  onClose: () => void;
  cart: CartItem[];
  onApplyImei: (productId: string, imei: string) => void;
}

export function ImeiModal({ open, onClose, cart, onApplyImei }: ImeiModalProps) {
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [imeiValue, setImeiValue] = useState<string>('');

  useEffect(() => {
    if (!open) {
      setSelectedProductId(null);
      setImeiValue('');
    }
  }, [open]);

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedProductId) {
      onApplyImei(selectedProductId, imeiValue);
      setImeiValue('');
      setSelectedProductId(null);
      onClose();
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-background shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b p-4 bg-primary/5">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-primary" />
            Saisir l'IMEI
          </h2>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-black/5 transition-colors">
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        <div className="p-4 bg-muted/20">
          <form onSubmit={handleApply} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Sélectionner un Article *</label>
              <select
                value={selectedProductId || ''}
                onChange={(e) => setSelectedProductId(e.target.value)}
                className="w-full rounded-xl border bg-background px-4 py-3 shadow-sm outline-none focus:ring-2 focus:ring-primary/20"
                required
              >
                <option value="" disabled>-- Choisir un article --</option>
                {cart.map((item) => (
                  <option key={item.product.id} value={item.product.id}>
                    {item.product.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Numéro IMEI *</label>
              <input
                type="text"
                value={imeiValue}
                onChange={(e) => setImeiValue(e.target.value)}
                className="w-full rounded-xl border bg-background px-4 py-3 shadow-sm outline-none focus:ring-2 focus:ring-primary/20 text-lg transition-all"
                placeholder="Entrez le code IMEI..."
                required
                autoFocus
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={onClose}
                className="flex-1 rounded-xl border bg-background py-3 font-medium hover:bg-muted/50 transition-colors">
                Annuler
              </button>
              <button type="submit" disabled={!selectedProductId || !imeiValue}
                className="flex-1 rounded-xl bg-primary py-3 font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50">
                Appliquer
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

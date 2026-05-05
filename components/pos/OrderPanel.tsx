'use client';

import { CartItem as CartItemType } from '@/lib/pos/types';
import { CartItem } from './CartItem';
import { PayButton } from './PayButton';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';

interface OrderPanelProps {
  items: CartItemType[];
  total: number;
  onQuantityChange: (productId: string, quantity: number) => void;
  onRemoveItem: (productId: string) => void;
  onPayClick: () => void;
  onConfirmArticles: () => void;
  onBackToEdit: () => void;
  onSelectItem: (productId: string | null) => void;
  onQtySelectItem: (productId: string) => void;
  onPriceSelectItem: (productId: string) => void;
  selectedProductId: string | null;
  mode: 'edit' | 'confirm';
}

export function OrderPanel({
  items,
  total,
  onQuantityChange,
  onRemoveItem,
  onPayClick,
  onConfirmArticles,
  onBackToEdit,
  onSelectItem,
  onQtySelectItem,
  onPriceSelectItem,
  selectedProductId,
  mode,
}: OrderPanelProps) {
  return (
    <div className="flex w-full flex-col border border-border shadow-2xl rounded-3xl bg-card overflow-hidden h-full">
      {/* Header Compact */}
      <div className="flex-shrink-0 border-b border-border px-4 py-3 bg-secondary/20 flex items-center justify-between">
        {mode === 'confirm' ? (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={onBackToEdit}
              className="h-8 w-8 rounded-full hover:bg-background/80"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <h2 className="text-sm font-black tracking-widest text-blue-600 uppercase italic leading-none">VALIDATION</h2>
          </div>
        ) : (
          <h2 className="text-sm font-black tracking-widest text-muted-foreground uppercase italic leading-none">PANIER ({items.length})</h2>
        )}
      </div>

      {/* Cart Items - Always Scrollable */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-1.5 px-3 py-3">
        {items.length === 0 ? (
          <p className="text-center text-xs text-muted-foreground py-4">
            Panier vide
          </p>
        ) : (
          items.map((item) => (
            <CartItem
              key={item.product.id}
              item={item}
              isSelected={selectedProductId === item.product.id}
              onClick={() => onSelectItem(item.product.id)}
              onQtyClick={() => onQtySelectItem(item.product.id)}
              onPriceClick={() => onPriceSelectItem(item.product.id)}
              onQuantityChange={(qty) =>
                onQuantityChange(item.product.id, qty)
              }
              onRemove={() => onRemoveItem(item.product.id)}
            />
          ))
        )}
      </div>

      {/* Summary Compact */}
      <div className="flex-shrink-0 border-t border-border px-4 py-3 bg-secondary/5 space-y-2">
        <div className="flex justify-between items-center bg-white/50 dark:bg-black/20 rounded-xl px-4 py-2 border border-border/50">
           <span className="text-[10px] font-black uppercase text-muted-foreground">Total à payer</span>
           <span className="text-xl font-black text-blue-600 tabular-nums">{total.toFixed(2)} DT</span>
        </div>

        {mode === 'edit' ? (
          <Button
            onClick={onConfirmArticles}
            disabled={items.length === 0}
            className="h-12 w-full bg-blue-600 hover:bg-blue-700 text-white text-base font-black shadow-lg active:scale-[0.98] transition-all uppercase italic tracking-tighter rounded-xl"
          >
            CONFIRMER MA SELECTION
          </Button>
        ) : (
          <PayButton
            total={total}
            disabled={items.length === 0}
            onClick={onPayClick}
          />
        )}
      </div>
    </div>
  );
}

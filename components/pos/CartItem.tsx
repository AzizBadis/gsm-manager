'use client';

import { CartItem as CartItemType } from '@/lib/pos/types';
import { Button } from '@/components/ui/button';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CartItemProps {
  item: CartItemType;
  onQuantityChange: (quantity: number) => void;
  onRemove: () => void;
  onClick?: () => void;
  onQtyClick?: () => void;
  onPriceClick?: () => void;
  isSelected?: boolean;
}

export function CartItem({
  item,
  onQuantityChange,
  onRemove,
  onClick,
  onQtyClick,
  onPriceClick,
  isSelected = false,
}: CartItemProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "flex items-center justify-between gap-2 rounded-xl px-4 py-3 transition-all cursor-pointer group",
        isSelected
          ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20 ring-2 ring-blue-400/50"
          : "bg-secondary/40 hover:bg-secondary/60 text-foreground"
      )}
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground truncate">
          {item.product.name}
        </p>
        <p className="text-xs text-muted-foreground flex gap-1 items-center">
          <span
            onClick={(e) => { e.stopPropagation(); onPriceClick?.(); }}
            className="hover:underline cursor-pointer"
          >
            {item.product.price.toFixed(2)} DT
          </span>
          x
          <span
            onClick={(e) => { e.stopPropagation(); onQtyClick?.(); }}
            className="font-bold text-foreground px-1 bg-secondary/80 rounded hover:bg-primary/20 transition-colors cursor-pointer"
          >
            {item.quantity}
          </span>
          {item.discount ? (
            <span className={cn(
              "font-medium",
              isSelected ? "text-blue-100" : "text-emerald-500"
            )}>
               (-{item.discount}%)
            </span>
          ) : null}
        </p>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          onClick={() => onQuantityChange(item.quantity - 1)}
        >
          <Minus className="h-3 w-3" />
        </Button>
        <span className="w-6 text-center text-xs font-bold text-foreground">
          {item.quantity}
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          onClick={() => onQuantityChange(item.quantity + 1)}
        >
          <Plus className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-8 w-8 p-0",
            isSelected ? "text-white hover:bg-white/20" : "text-destructive hover:text-destructive hover:bg-destructive/10"
          )}
          onClick={onRemove}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

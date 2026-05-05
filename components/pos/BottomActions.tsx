'use client';

import { Button } from '@/components/ui/button';
import { Percent, User, Trash2, RotateCcw, Calculator } from 'lucide-react';

interface BottomActionsProps {
  onCustomer: () => void;
  onDiscount: () => void;
  onRetour: () => void;
  onClosure: () => void;
  onClear: () => void;
  disabled?: boolean;
  customer?: any | null;
}

export function BottomActions({
  onCustomer,
  onDiscount,
  onRetour,
  onClosure,
  onClear,
  disabled = false,
  customer = null,
}: BottomActionsProps) {
  return (
    <div className="flex gap-2 border-t border-border bg-card px-4 py-3">
      <Button
        onClick={onCustomer}
        variant="outline"
        className="flex-1 h-11 text-sm truncate"
        disabled={disabled && !customer}
      >
        <User className="mr-1.5 h-4 w-4" />
        {customer?.name || 'Client'}
      </Button>
      <Button
        onClick={onDiscount}
        variant="outline"
        className="flex-1 h-11 text-sm"
        disabled={disabled}
      >
        <Percent className="mr-1.5 h-4 w-4" />
        Remise
      </Button>
      <Button
        onClick={onRetour}
        variant="outline"
        className="flex-1 h-11 text-sm text-amber-600 border-amber-200 hover:bg-amber-50 hover:text-amber-700"
      >
        <RotateCcw className="mr-1.5 h-4 w-4" />
        Retour
      </Button>
      <Button
        onClick={onClosure}
        variant="outline"
        className="flex-1 h-11 text-sm text-slate-700 border-slate-300 hover:bg-slate-100"
      >
        <Calculator className="mr-1.5 h-4 w-4" />
        Clôture
      </Button>
      <Button
        onClick={onClear}
        variant="destructive"
        className="flex-1 h-11 text-sm"
        disabled={disabled}
      >
        <Trash2 className="mr-1.5 h-4 w-4" />
        Vider
      </Button>
    </div>
  );
}

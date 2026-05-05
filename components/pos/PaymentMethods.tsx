'use client';

import { Button } from '@/components/ui/button';
import { Banknote, CreditCard, Loader2 } from 'lucide-react';

export interface OdooPaymentMethod {
  id: number;
  name: string;
  isCash: boolean;
}

interface PaymentMethodsProps {
  methods: OdooPaymentMethod[];
  isLoading: boolean;
  onMethodSelect: (method: OdooPaymentMethod) => void;
}

export function PaymentMethods({ methods, isLoading, onMethodSelect }: PaymentMethodsProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-muted-foreground gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p>Loading payment methods from Odoo...</p>
      </div>
    );
  }

  if (methods.length === 0) {
    return (
      <div className="text-center p-6 text-red-500 bg-red-50 dark:bg-red-950/20 rounded-xl border border-red-200 dark:border-red-800">
        No payment methods found for this POS session. Please configure them in Odoo.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      {methods.map((method) => {
        const Icon = method.isCash ? Banknote : CreditCard;
        return (
          <Button
            key={method.id}
            onClick={() => onMethodSelect(method)}
            variant="outline"
            className="h-24 flex-col text-base px-2 text-center whitespace-normal leading-tight"
          >
            <Icon className="mb-2 h-8 w-8 shrink-0" />
            <span className="line-clamp-2">{method.name}</span>
          </Button>
        );
      })}
    </div>
  );
}

'use client';

import { Button } from '@/components/ui/button';
import { CreditCard, ArrowLeft } from 'lucide-react';

interface CardPaymentProps {
  total: number;
  paymentMethodName: string;
  onPaymentComplete: () => void;
  onBack: () => void;
}

export function CardPayment({ total, paymentMethodName, onPaymentComplete, onBack }: CardPaymentProps) {
  return (
    <div className="space-y-6">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to payment methods
      </button>

      <div className="text-center py-4">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
          <CreditCard className="w-8 h-8 text-primary" />
        </div>
        <h4 className="text-lg font-medium text-foreground mb-1">
          {paymentMethodName}
        </h4>
        <p className="text-sm text-muted-foreground">
          Please process the payment on the payment terminal.
        </p>
      </div>

      <div className="bg-secondary/50 rounded-xl p-4">
        <div className="flex justify-between items-center">
          <span className="font-medium text-muted-foreground">Amount to pay</span>
          <span className="text-xl font-bold">{total.toFixed(2)} DT</span>
        </div>
      </div>

      <Button
        id="card-confirm-btn"
        onClick={onPaymentComplete}
        className="w-full h-12 text-base font-semibold"
      >
        Validate Payment
      </Button>
    </div>
  );
}

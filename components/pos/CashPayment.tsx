'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft } from 'lucide-react';

interface CashPaymentProps {
  total: number;
  onPaymentComplete: (change: number) => void;
  onBack: () => void;
}

export function CashPayment({ total, onPaymentComplete, onBack }: CashPaymentProps) {
  const [amount, setAmount] = useState<string>('');

  const amountNum = parseFloat(amount) || 0;
  const change = Math.max(0, amountNum - total);
  const isValid = amountNum >= total;

  return (
    <div className="space-y-4">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to payment methods
      </button>

      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          Cash Amount
        </label>
        <Input
          id="cash-amount-input"
          type="number"
          min="0"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Enter amount"
          className="text-lg h-12"
          autoFocus
        />
      </div>

      <div className="grid grid-cols-3 gap-2">
        {[500, 1000, 2000].map((preset) => (
          <Button
            key={preset}
            variant="outline"
            onClick={() => setAmount(preset.toString())}
            className="h-10 text-xs"
          >
            {preset} DT
          </Button>
        ))}
      </div>

      <div className="bg-secondary rounded-lg p-4 space-y-2">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Total</span>
          <span className="font-semibold">{total.toFixed(2)} DT</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Paid</span>
          <span className="font-semibold">{amountNum.toFixed(2)} DT</span>
        </div>
        <div className="border-t border-border pt-2 flex justify-between">
          <span className="font-bold">Change</span>
            <span className={`text-lg font-bold ${change > 0 ? 'text-green-500' : 'text-destructive'}`}>
              {change.toFixed(2)} DT
            </span>
        </div>
      </div>

      <Button
        id="cash-confirm-btn"
        onClick={() => onPaymentComplete(change)}
        disabled={!isValid}
        className="w-full h-12 text-base"
      >
        Confirm Payment
      </Button>
    </div>
  );
}

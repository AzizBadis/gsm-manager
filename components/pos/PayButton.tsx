'use client';

import { Button } from '@/components/ui/button';
import { CreditCard } from 'lucide-react';

interface PayButtonProps {
  total: number;
  disabled?: boolean;
  onClick: () => void;
}

export function PayButton({ total, disabled = false, onClick }: PayButtonProps) {
  return (
    <Button
      onClick={onClick}
      disabled={disabled}
      className="h-12 w-full bg-accent text-accent-foreground hover:bg-accent/90 text-base font-bold"
    >
      <CreditCard className="mr-2 h-5 w-5" />
      Pay {total.toFixed(2)} DT
    </Button>
  );
}

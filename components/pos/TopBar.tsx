'use client';

import { Clock, LogOut, Package, Users, FileText, Eye, ReceiptText } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface TopBarProps {
  companyName?: string;
  cashierName?: string;
  onLogout?: () => void;
}

export function TopBar({ companyName = 'COMPANY', cashierName = 'Cashier', onLogout }: TopBarProps) {
  const [time, setTime] = useState<string>('');
  const router = useRouter();

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex h-16 items-center justify-between border-b border-border bg-card px-6">
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-bold text-foreground">{companyName}</h1>
      </div>

      <div className="flex items-center gap-4">
        {/* Navigation links */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push('/products')}
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            title="Manage Products"
          >
            <Package className="h-4 w-4" />
            <span className="hidden sm:inline">Products</span>
          </button>
          <button
            onClick={() => router.push('/cashiers')}
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            title="Manage Cashiers"
          >
            <Clock className="h-4 w-4" />
            <span className="hidden sm:inline">Caissier</span>
          </button>
          <button
            onClick={() => router.push('/customers')}
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            title="Manage Clients"
          >
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Clients</span>
          </button>
          <button
            onClick={() => router.push('/invoices')}
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            title="Manage Invoices"
          >
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Factures</span>
          </button>
          <button
            onClick={() => router.push('/logs')}
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            title="View Activity Logs"
          >
            <Eye className="h-4 w-4" />
            <span className="hidden sm:inline">Logs</span>
          </button>
          <button
            onClick={() => router.push('/closures')}
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            title="Cloture de caisse"
          >
            <ReceiptText className="h-4 w-4" />
            <span className="hidden sm:inline">Cloture</span>
          </button>
        </div>

        <div className="h-6 w-px bg-border" />

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Cashier</span>
          <span className="text-sm font-semibold text-foreground">{cashierName}</span>
        </div>
        <div className="h-6 w-px bg-border" />
        <div className="flex items-center gap-2 text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span className="text-sm font-semibold">{time}</span>
        </div>
        {onLogout && (
          <>
            <div className="h-6 w-px bg-border" />
            <button
              onClick={onLogout}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
}


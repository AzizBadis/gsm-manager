'use client';

import { Clock, LogOut, Package, Lock, ArrowRightLeft, Users, FileText, Eye, ReceiptText } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface TopBarProps {
  cashierName?: string;
  onLogout?: () => void;
  onClosure?: () => void;
  onExpenses?: () => void;
}

export function TopBar({ cashierName = 'Cashier', onLogout, onClosure, onExpenses }: TopBarProps) {
  const [time, setTime] = useState<string>('');
  const router = useRouter();

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex h-16 items-center justify-between border-b border-border bg-card px-6">
      <div className="flex items-center gap-4">
        <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-blue-600 text-white font-black text-xl shadow-lg shadow-blue-500/20">G</div>
        <div>
          <h1 className="text-lg font-black tracking-tighter leading-none italic uppercase">GSM Store</h1>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Manager Links */}
        <button
          onClick={() => router.push('/products')}
          className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-bold text-muted-foreground hover:bg-muted hover:text-foreground transition-colors uppercase tracking-tighter"
          title="Articles"
        >
          <Package className="h-3.5 w-3.5" />
          <span className="hidden xl:inline">Articles</span>
        </button>

        <button
          onClick={() => router.push('/cashiers')}
          className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-bold text-muted-foreground hover:bg-muted hover:text-foreground transition-colors uppercase tracking-tighter"
          title="Caissiers"
        >
          <Clock className="h-3.5 w-3.5" />
          <span className="hidden xl:inline">Caissiers</span>
        </button>

        <button
          onClick={() => router.push('/customers')}
          className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-bold text-muted-foreground hover:bg-muted hover:text-foreground transition-colors uppercase tracking-tighter"
          title="Clients"
        >
          <Users className="h-3.5 w-3.5" />
          <span className="hidden xl:inline">Clients</span>
        </button>

        <button
          onClick={() => router.push('/invoices')}
          className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-bold text-muted-foreground hover:bg-muted hover:text-foreground transition-colors uppercase tracking-tighter"
          title="Factures"
        >
          <FileText className="h-3.5 w-3.5" />
          <span className="hidden xl:inline">Factures</span>
        </button>

        <button
          onClick={() => router.push('/logs')}
          className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-bold text-muted-foreground hover:bg-muted hover:text-foreground transition-colors uppercase tracking-tighter"
          title="Logs"
        >
          <Eye className="h-3.5 w-3.5" />
          <span className="hidden xl:inline">Logs</span>
        </button>

        <button
          onClick={() => router.push('/closures')}
          className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-bold text-muted-foreground hover:bg-muted hover:text-foreground transition-colors uppercase tracking-tighter"
          title="Historique Clôtures"
        >
          <ReceiptText className="h-3.5 w-3.5" />
          <span className="hidden xl:inline">Historique</span>
        </button>

        <div className="h-6 w-px bg-border mx-1" />

        {/* POS Actions */}
        {onExpenses && (
          <button
            onClick={onExpenses}
            className="flex items-center gap-1.5 rounded-lg border border-orange-100 bg-orange-50/50 px-3 py-1.5 text-xs font-bold text-orange-600 hover:bg-orange-100 transition-colors uppercase tracking-tighter"
            title="Mouvements"
          >
            <ArrowRightLeft className="h-3.5 w-3.5" />
            <span className="hidden xl:inline">Mouvements</span>
          </button>
        )}

        {onClosure && (
          <button
            onClick={onClosure}
            className="flex items-center gap-1.5 rounded-lg border border-blue-100 bg-blue-50/50 px-3 py-1.5 text-xs font-bold text-blue-600 hover:bg-blue-100 transition-colors uppercase tracking-tighter"
            title="Clôture"
          >
            <Lock className="h-3.5 w-3.5" />
            <span className="hidden xl:inline">Clôture</span>
          </button>
        )}

        <div className="h-6 w-px bg-border mx-1" />

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground font-medium">Caissier</span>
          <span className="text-xs font-black text-foreground">{cashierName}</span>
        </div>
        <div className="h-6 w-px bg-border mx-1" />
        <div className="flex items-center gap-2 text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          <span className="text-xs font-bold">{time}</span>
        </div>
        {onLogout && (
          <>
            <div className="h-6 w-px bg-border mx-1" />
            <button
              onClick={onLogout}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors uppercase"
              title="Sign out"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden lg:inline">Quitter</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
}

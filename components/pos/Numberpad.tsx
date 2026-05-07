'use client';

import { ArrowLeft, Percent, Package, Banknote } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type PadMode = 'qty' | 'disc';

interface NumberpadProps {
  onNumber: (digit: string) => void;
  onBackspace: () => void;
  onClear: () => void;
  onSubmit: () => void;
  activeMode: PadMode;
  onModeChange: (mode: PadMode) => void;
  value: string;
}

export function Numberpad({
  onNumber,
  onBackspace,
  onClear,
  onSubmit,
  activeMode,
  onModeChange,
  value,
}: NumberpadProps) {
  const modes: { id: PadMode; label: string; icon: any }[] = [
    { id: 'qty', label: 'Qté', icon: Package },
    { id: 'disc', label: 'Rem. DT', icon: Banknote },
  ];

  return (
    <div className="flex gap-2 rounded-xl bg-card p-2 shadow-xl border border-border/50 select-none">
      {/* Mode Sidebar - Ultra Compact */}
      <div className="flex flex-col gap-1 w-14">
        {modes.map((mode) => (
          <button
            key={mode.id}
            onClick={() => onModeChange(mode.id)}
            className={cn(
              "flex flex-col items-center justify-center gap-1 h-11 rounded-lg border transition-all duration-200",
              activeMode === mode.id
                ? "bg-blue-600 border-blue-500 text-white shadow shadow-blue-500/20"
                : "bg-secondary/40 border-transparent text-muted-foreground hover:bg-secondary/60"
            )}
          >
            <mode.icon className="h-4 w-4" />
            <span className="text-[8px] font-black uppercase tracking-tighter">{mode.label}</span>
          </button>
        ))}
      </div>

      {/* Main Pad Area */}
      <div className="flex-1 flex flex-col gap-1.5">
        {/* Compact Display Row */}
        <div className="flex items-center gap-2 rounded-lg bg-secondary/80 px-2.5 py-1.5 border border-border/30">
          <div className="flex-1 text-right">
            <span className="text-xl font-black tabular-nums">{value || '0'}</span>
            <span className="text-[10px] ml-1 font-bold opacity-50 uppercase">{activeMode}</span>
          </div>
        </div>

        {/* Numbers Grid - Ultra Compact */}
        <div className="grid grid-cols-3 gap-1">
          {['7', '8', '9', '4', '5', '6', '1', '2', '3', '0', '.', 'back'].map((key) => {
            if (key === 'back') {
              return (
                <Button
                  key={key}
                  variant="secondary"
                  onClick={onBackspace}
                  className="h-10 rounded-lg p-0"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              );
            }
            return (
              <Button
                key={key}
                variant="outline"
                onClick={() => onNumber(key)}
                className="h-10 text-sm font-black rounded-lg border border-border/30"
              >
                {key}
              </Button>
            );
          })}
        </div>

        {/* Footer Actions */}
        <div className="grid grid-cols-2 gap-1">
          <Button
            variant="outline"
            onClick={onClear}
            className="h-9 gap-1 rounded-lg border font-bold text-[10px] uppercase"
          >
            Vider
          </Button>
          <Button
            onClick={onSubmit}
            className="h-9 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-black text-xs shadow shadow-blue-500/20 active:scale-[0.98] transition-all uppercase"
          >
            ENTRER
          </Button>
        </div>
      </div>
    </div>
  );
}

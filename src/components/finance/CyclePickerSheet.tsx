import React from 'react';
import { X, Check, Calendar } from 'lucide-react';
import { CycleRange } from '../../services/moneyDerivedStats';

interface CyclePickerSheetProps {
  isOpen: boolean;
  onClose: () => void;
  cycles: CycleRange[];
  selectedOffset: number;
  onSelectCycle: (offset: number) => void;
  currencyLabel?: string;
}

export const CyclePickerSheet: React.FC<CyclePickerSheetProps> = ({
  isOpen,
  onClose,
  cycles,
  selectedOffset,
  onSelectCycle,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60  animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="cycle-picker-title"
    >
      <div
        className="w-full max-w-md max-h-[82vh] flex flex-col rounded-t-[28px] sm:rounded-[24px] bg-[var(--surface-card,rgba(15,23,42,0.85))] border border-[var(--hairline,rgba(255,255,255,0.12))]  shadow-2xl overflow-hidden animate-slide-up"
        onClick={e => e.stopPropagation()}
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)' }}
      >
        {/* Header Handle for mobile */}
        <div className="w-full flex items-center justify-center pt-2.5 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--hairline,rgba(255,255,255,0.08))]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-[rgb(var(--accent-rgb)/.15)] text-[var(--accent-light)] border border-[rgb(var(--accent-rgb)/.3)]">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h3 id="cycle-picker-title" className="text-[16px] font-medium text-[var(--text-1)]">
                Budget cycle
              </h3>
              <p className="text-[12px] text-[var(--text-3)]">
                Select a period to view historical spending
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full flex items-center justify-center text-[var(--text-2)] hover:text-[var(--text-1)] bg-white/5 hover:bg-white/10 transition-colors tap-target min-h-[44px] min-w-[44px]"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Cycle List */}
        <div className="overflow-y-auto px-4 py-3 space-y-2 max-h-[60vh]">
          {cycles.map(cycle => {
            const isSelected = cycle.offset === selectedOffset;

            return (
              <button
                key={cycle.offset}
                onClick={() => {
                  onSelectCycle(cycle.offset);
                  onClose();
                }}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all tap-target min-h-[50px] border ${
                  isSelected
                    ? 'bg-[rgb(var(--accent-rgb)/.16)] border-[rgb(var(--accent-rgb)/.45)] shadow-[0_0_16px_rgb(var(--accent-rgb)/.2)] text-[var(--text-1)]'
                    : 'bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.07] text-[var(--text-2)]'
                }`}
              >
                <div className="flex flex-col text-start">
                  <div className="flex items-center gap-2">
                    <span className={`text-[14px] font-medium ${isSelected ? 'text-[var(--text-1)] font-semibold' : 'text-[var(--text-1)]'}`}>
                      {cycle.label}
                    </span>
                    {cycle.isCurrent && (
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-[rgb(var(--accent-rgb)/.22)] text-[var(--accent-light)] border border-[rgb(var(--accent-rgb)/.35)]">
                        Current
                      </span>
                    )}
                  </div>
                  <span className="text-[12px] text-[var(--text-3)] mt-0.5">
                    {cycle.startDate} → {cycle.endDate} ({cycle.daysInCycle} days)
                  </span>
                </div>

                <div className="flex items-center ms-3">
                  {isSelected ? (
                    <div className="w-7 h-7 rounded-full flex items-center justify-center bg-[var(--accent)] text-[var(--on-accent,#0B0F17)] shadow-[0_0_10px_rgb(var(--accent-rgb)/.6)]">
                      <Check className="w-4 h-4 stroke-[2.5]" />
                    </div>
                  ) : (
                    <div className="w-7 h-7 rounded-full border border-white/20" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

import React, { useState, useMemo } from 'react';
import { 
  Calculator, 
  X, 
  CheckCircle2, 
  AlertTriangle, 
  AlertCircle, 
  Info, 
  ArrowRight,
  TrendingDown,
  DollarSign,
  Plus
} from 'lucide-react';
import { ForecastService } from '../../services/forecastService';
import { formatCurrency, db, getTodayLocalDate } from '../../services/storage';
import { AffordabilityCheckResult } from '../../types';

interface AffordabilityCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRecordExpense?: (name: string, amountMajor: number) => void;
}

export const AffordabilityCalculatorModal: React.FC<AffordabilityCalculatorModalProps> = ({
  isOpen,
  onClose,
  onRecordExpense,
}) => {
  const state = db.getState();
  const currency = state.settings.currency_label || 'DA';

  const [itemName, setItemName] = useState('');
  const [amountInput, setAmountInput] = useState<string>('5000');

  const amountNumber = parseFloat(amountInput) || 0;

  // Real-time calculation
  const result: AffordabilityCheckResult | null = useMemo(() => {
    if (amountNumber <= 0) return null;
    return ForecastService.checkPurchaseAffordability({
      name: itemName.trim() || 'Planned Item',
      amountMajor: amountNumber,
    });
  }, [itemName, amountNumber]);

  if (!isOpen) return null;

  const handleNudge = (delta: number) => {
    setAmountInput(prev => {
      const cur = parseFloat(prev) || 0;
      return String(Math.max(0, cur + delta));
    });
  };

  const handleRecord = () => {
    if (amountNumber <= 0) return;
    if (onRecordExpense) {
      onRecordExpense(itemName.trim() || 'Simulated Purchase', amountNumber);
    }
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in"
    >
      <div className="w-full max-w-md bg-[var(--color-surface)] border border-[var(--color-border)] rounded-3xl p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto no-scrollbar">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[var(--color-text-primary)]">
                Can I Afford This?
              </h2>
              <p className="text-xs text-[var(--color-text-secondary)]">
                Simulate purchase impact on monthly cash flow
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-2 rounded-xl text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-subtle)] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Inputs */}
        <div className="space-y-3.5">
          <div>
            <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">
              Item or Service Name (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. New Running Shoes, Flight Ticket, Car Part"
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[var(--color-surface-subtle)] border border-[var(--color-border)] rounded-xl text-xs font-semibold text-[var(--color-text-primary)] focus:outline-none focus:border-cyan-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">
              Estimated Price ({currency})
            </label>
            <div className="relative flex items-center">
              <input
                type="number"
                min="0"
                step="500"
                value={amountInput}
                onChange={(e) => setAmountInput(e.target.value)}
                className="w-full px-4 py-3 bg-[var(--color-surface-subtle)] border border-[var(--color-border)] rounded-xl text-lg font-mono font-bold text-[var(--color-text-primary)] focus:outline-none focus:border-cyan-500 transition-colors"
              />
              <span className="absolute right-4 text-xs font-semibold text-[var(--color-text-secondary)]">
                {currency}
              </span>
            </div>
          </div>

          {/* Quick Increment Buttons */}
          <div>
            <div className="text-[10px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-1.5">
              Quick Preset Nudges
            </div>
            <div className="grid grid-cols-5 gap-1.5">
              {[1000, 2500, 5000, 10000, 25000].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => handleNudge(val)}
                  className="py-1.5 px-1 rounded-lg bg-[var(--color-surface-subtle)] hover:bg-cyan-500/10 border border-[var(--color-border)] hover:border-cyan-500/30 text-[11px] font-mono font-medium text-[var(--color-text-primary)] hover:text-cyan-400 transition-all text-center"
                >
                  +{val >= 1000 ? `${val / 1000}k` : val}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Real-Time Simulation Result */}
        {result && (
          <div className="space-y-3 pt-1 animate-fade-in">
            {/* Verdict Banner */}
            <div
              className={`p-3.5 rounded-2xl border text-xs space-y-2 ${
                result.verdict === 'comfortable'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : result.verdict === 'possible_caution'
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
              }`}
            >
              <div className="flex items-center gap-2 font-bold text-sm">
                {result.verdict === 'comfortable' ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : result.verdict === 'possible_caution' ? (
                  <AlertTriangle className="w-5 h-5" />
                ) : (
                  <AlertCircle className="w-5 h-5" />
                )}
                <span>{result.title}</span>
              </div>
              <p className="text-xs text-[var(--color-text-primary)] leading-relaxed font-normal">
                {result.explanation}
              </p>
            </div>

            {/* Financial Math Breakdown */}
            <div className="p-3.5 rounded-2xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-[var(--color-text-secondary)]">Available Liquid Cash:</span>
                <span className="font-mono font-semibold text-[var(--color-text-primary)]">
                  {formatCurrency(result.currentAvailableMinor, currency)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[var(--color-text-secondary)]">Committed Bills & Variable Burn:</span>
                <span className="font-mono font-semibold text-rose-400">
                  -{formatCurrency(result.upcomingCommitmentsMinor, currency)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[var(--color-text-secondary)]">Simulated Purchase:</span>
                <span className="font-mono font-semibold text-amber-400">
                  -{formatCurrency(result.purchasePriceMinor, currency)}
                </span>
              </div>
              <div className="border-t border-[var(--color-border)] pt-2 flex justify-between items-center font-bold">
                <span className="text-[var(--color-text-primary)]">Projected Month-End Balance:</span>
                <span
                  className={`font-mono text-sm ${
                    result.projectedBalanceAfterMinor >= 0
                      ? 'text-cyan-400'
                      : 'text-rose-400'
                  }`}
                >
                  {formatCurrency(result.projectedBalanceAfterMinor, currency)}
                </span>
              </div>
            </div>

            {/* Savings Impact Note */}
            <div className="p-2.5 rounded-xl bg-white/[0.03] border border-[var(--color-border)] flex items-start gap-2 text-xs text-[var(--color-text-secondary)]">
              <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <span>{result.impactOnSavingsGoal}</span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 px-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] text-xs font-semibold text-[var(--color-text-primary)] hover:bg-[var(--color-surface)] transition-all"
          >
            Done
          </button>
          {result && onRecordExpense && (
            <button
              type="button"
              onClick={handleRecord}
              className="flex-1 py-2.5 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Record as Expense</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

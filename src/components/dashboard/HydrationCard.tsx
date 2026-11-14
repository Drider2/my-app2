import React, { useState } from 'react';
import { Droplet, Plus, Minus, RotateCcw, Check, Sparkles, Sliders } from 'lucide-react';
import { HydrationService } from '../../services/hydrationService';

interface HydrationCardProps {
  onRefresh?: () => void;
  onToast?: (msg: string) => void;
}

export const HydrationCard: React.FC<HydrationCardProps> = ({ onRefresh, onToast }) => {
  const intake = HydrationService.getTodayIntake();
  const [isEditingTarget, setIsEditingTarget] = useState(false);

  const handleAdd = (ml: number) => {
    const res = HydrationService.addWater(ml);
    if (onToast) onToast(res.message);
    if (onRefresh) onRefresh();
  };

  const handleRemove = (ml: number) => {
    const res = HydrationService.removeWater(ml);
    if (onToast) onToast(res.message);
    if (onRefresh) onRefresh();
  };

  const handleSetTarget = (targetMl: number) => {
    HydrationService.setDailyTarget(targetMl);
    setIsEditingTarget(false);
    if (onToast) onToast(`✓ Daily water target set to ${(targetMl / 1000).toFixed(1)}L`);
    if (onRefresh) onRefresh();
  };

  return (
    <div className="p-4 sm:p-5 rounded-3xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
            <Droplet className="w-4.5 h-4.5 fill-sky-400/30" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[var(--color-text-primary)]">
              Daily Hydration
            </h3>
            <p className="text-[11px] text-[var(--color-text-secondary)]">
              {intake.isMet ? '🎉 Daily goal met!' : `${(intake.remainingMl / 1000).toFixed(1)}L remaining to goal`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setIsEditingTarget(!isEditingTarget)}
            className="px-2.5 py-1 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] text-[11px] font-semibold text-[var(--color-text-secondary)] hover:text-sky-400 transition-colors"
            title="Adjust Daily Water Target"
          >
            Goal: {(intake.targetMl / 1000).toFixed(1)}L
          </button>
        </div>
      </div>

      {/* Target Selector Drawer (when opened) */}
      {isEditingTarget && (
        <div className="p-3 rounded-2xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] space-y-2 animate-fade-in">
          <span className="text-[11px] font-semibold text-[var(--color-text-secondary)]">
            Choose Daily Hydration Goal:
          </span>
          <div className="grid grid-cols-4 gap-1.5">
            {[2000, 2500, 3000, 3500].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => handleSetTarget(t)}
                className={`py-1.5 text-xs font-mono font-bold rounded-xl border transition-all ${
                  intake.targetMl === t
                    ? 'bg-sky-500 text-slate-950 border-sky-400'
                    : 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-primary)] hover:border-sky-500/40'
                }`}
              >
                {(t / 1000).toFixed(1)}L
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Progress Bar & Amount Stats */}
      <div className="space-y-2">
        <div className="flex items-baseline justify-between">
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-mono font-extrabold text-[var(--color-text-primary)]">
              {(intake.amountMl / 1000).toFixed(2)}
            </span>
            <span className="text-xs font-semibold text-[var(--color-text-secondary)]">
              / {(intake.targetMl / 1000).toFixed(1)} L
            </span>
          </div>
          <span
            className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full border ${
              intake.isMet
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                : 'bg-sky-500/15 border-sky-500/40 text-sky-400'
            }`}
          >
            {intake.percentage}%
          </span>
        </div>

        {/* Progress Track */}
        <div className="w-full h-3 rounded-full bg-[var(--color-surface-subtle)] border border-[var(--color-border)] overflow-hidden p-0.5">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              intake.isMet ? 'bg-emerald-400' : 'bg-sky-400'
            }`}
            style={{ width: `${Math.min(100, intake.percentage)}%` }}
          />
        </div>
      </div>

      {/* Quick Intake Log Pills */}
      <div className="flex items-center gap-1.5 pt-1">
        {[
          { label: '+250ml', ml: 250, desc: 'Glass' },
          { label: '+500ml', ml: 500, desc: 'Bottle' },
          { label: '+750ml', ml: 750, desc: 'Large' },
        ].map((btn) => (
          <button
            key={btn.ml}
            type="button"
            onClick={() => handleAdd(btn.ml)}
            className="flex-1 py-2 px-1 rounded-xl bg-[var(--color-surface-subtle)] hover:bg-sky-500/10 border border-[var(--color-border)] hover:border-sky-500/40 flex flex-col items-center justify-center transition-all tap-feedback cursor-pointer group"
          >
            <span className="text-xs font-mono font-bold text-[var(--color-text-primary)] group-hover:text-sky-400">
              {btn.label}
            </span>
            <span className="text-[10px] text-[var(--color-text-secondary)]">
              {btn.desc}
            </span>
          </button>
        ))}

        {/* Undo button */}
        {intake.amountMl > 0 && (
          <button
            type="button"
            onClick={() => handleRemove(250)}
            className="py-2 px-2.5 rounded-xl bg-[var(--color-surface-subtle)] hover:bg-rose-500/10 border border-[var(--color-border)] hover:border-rose-500/30 text-[var(--color-text-secondary)] hover:text-rose-400 flex flex-col items-center justify-center transition-all tap-feedback"
            title="Undo 250ml"
          >
            <Minus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span className="text-[9px] font-mono">250</span>
          </button>
        )}
      </div>
    </div>
  );
};

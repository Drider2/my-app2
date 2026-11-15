import React, { useState, useMemo } from 'react';
import { X, Calculator, Dumbbell, Award, Percent, Layers } from 'lucide-react';
import { useTranslation } from '../../services/i18n';

interface OneRepMaxModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultUnit?: 'kg' | 'lb';
}

interface PercentageRow {
  percentage: number;
  weight: number;
  repsRange: string;
  intensityLabel: string;
}

export const OneRepMaxModal: React.FC<OneRepMaxModalProps> = ({
  isOpen,
  onClose,
  defaultUnit = 'kg'
}) => {
  const { t } = useTranslation();
  const [weight, setWeight] = useState<string>('80');
  const [reps, setReps] = useState<string>('5');
  const [unit, setUnit] = useState<'kg' | 'lb'>(defaultUnit);
  const [barWeight, setBarWeight] = useState<number>(defaultUnit === 'kg' ? 20 : 45);
  const [selectedPercentage, setSelectedPercentage] = useState<number>(100);

  const numWeight = parseFloat(weight) || 0;
  const numReps = Math.min(15, Math.max(1, parseInt(reps) || 1));

  // Formulas
  const epley1RM = useMemo(() => {
    if (numWeight <= 0 || numReps <= 0) return 0;
    if (numReps === 1) return numWeight;
    // Epley formula: w * (1 + r / 30)
    return Math.round(numWeight * (1 + numReps / 30) * 10) / 10;
  }, [numWeight, numReps]);

  const brzycki1RM = useMemo(() => {
    if (numWeight <= 0 || numReps <= 0) return 0;
    if (numReps === 1) return numWeight;
    if (numReps >= 37) return 0;
    // Brzycki formula: w * 36 / (37 - r)
    return Math.round((numWeight * 36 / (37 - numReps)) * 10) / 10;
  }, [numWeight, numReps]);

  const lombardi1RM = useMemo(() => {
    if (numWeight <= 0 || numReps <= 0) return 0;
    if (numReps === 1) return numWeight;
    // Lombardi formula: w * (r ^ 0.10)
    return Math.round(numWeight * Math.pow(numReps, 0.10) * 10) / 10;
  }, [numWeight, numReps]);

  // Percentage breakdown table based on standard Epley
  const percentages: PercentageRow[] = useMemo(() => {
    const base = epley1RM;
    const brackets = [
      { pct: 100, reps: '1', label: 'Max Effort' },
      { pct: 95, reps: '2', label: 'Heavy Strength' },
      { pct: 90, reps: '3-4', label: 'Strength' },
      { pct: 85, reps: '5-6', label: 'Power & Strength' },
      { pct: 80, reps: '7-8', label: 'Hypertrophy' },
      { pct: 75, reps: '9-10', label: 'Hypertrophy' },
      { pct: 70, reps: '11-12', label: 'Endurance / Volume' },
      { pct: 65, reps: '13-15', label: 'Warmup / Conditioning' },
    ];

    return brackets.map(b => ({
      percentage: b.pct,
      weight: Math.round((base * (b.pct / 100)) * 2) / 2, // Round to nearest 0.5kg/lb
      repsRange: b.reps,
      intensityLabel: b.label
    }));
  }, [epley1RM]);

  // Barbell plate calculator for target weight
  const targetPlateWeight = useMemo(() => {
    const row = percentages.find(p => p.percentage === selectedPercentage);
    return row ? row.weight : epley1RM;
  }, [percentages, selectedPercentage, epley1RM]);

  const plateBreakdown = useMemo(() => {
    if (targetPlateWeight <= barWeight) return { perSide: [], remainder: 0 };
    const weightToDistribute = (targetPlateWeight - barWeight) / 2;
    const availablePlates = unit === 'kg' 
      ? [25, 20, 15, 10, 5, 2.5, 1.25]
      : [45, 35, 25, 10, 5, 2.5];

    const resultPlates: { plate: number; count: number }[] = [];
    let rem = weightToDistribute;

    for (const p of availablePlates) {
      if (rem >= p) {
        const count = Math.floor(rem / p);
        resultPlates.push({ plate: p, count });
        rem = rem % p;
      }
    }

    return {
      perSide: resultPlates,
      remainder: Math.round(rem * 2 * 10) / 10
    };
  }, [targetPlateWeight, barWeight, unit]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75  animate-in fade-in duration-200">
      <div 
        className="w-full max-w-lg bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="1rm-calc-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Calculator size={20} />
            </div>
            <div>
              <h2 id="1rm-calc-title" className="text-lg font-bold text-[var(--color-text-primary)]">
                {t('gym.1rmCalculator', '1RM & Training Zones Calculator')}
              </h2>
              <p className="text-xs text-[var(--color-text-muted)]">
                {t('gym.1rmSubtitle', 'Epley formula & barbell plate breakdown')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)] transition-colors"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-5 overflow-y-auto space-y-5">
          {/* Inputs Row */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">
                {t('gym.weightLifted', 'Weight Lifted')}
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.5"
                  min="1"
                  value={weight}
                  onChange={e => setWeight(e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl text-sm font-semibold text-[var(--color-text-primary)] focus:outline-none focus:border-cyan-500 pr-10"
                />
                <span className="absolute right-3 top-2.5 text-xs text-[var(--color-text-muted)] uppercase">
                  {unit}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">
                {t('gym.repsCompleted', 'Reps Completed')}
              </label>
              <input
                type="number"
                min="1"
                max="15"
                value={reps}
                onChange={e => setReps(e.target.value)}
                className="w-full px-3 py-2 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl text-sm font-semibold text-[var(--color-text-primary)] focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">
                {t('gym.unitBarbell', 'Unit & Bar')}
              </label>
              <div className="flex rounded-xl overflow-hidden border border-[var(--color-border)]">
                <button
                  type="button"
                  onClick={() => { setUnit('kg'); setBarWeight(20); }}
                  className={`flex-1 py-2 text-xs font-semibold transition-colors ${
                    unit === 'kg' ? 'bg-cyan-500/20 text-cyan-400' : 'bg-[var(--color-bg)] text-[var(--color-text-secondary)]'
                  }`}
                >
                  KG
                </button>
                <button
                  type="button"
                  onClick={() => { setUnit('lb'); setBarWeight(45); }}
                  className={`flex-1 py-2 text-xs font-semibold transition-colors ${
                    unit === 'lb' ? 'bg-cyan-500/20 text-cyan-400' : 'bg-[var(--color-bg)] text-[var(--color-text-secondary)]'
                  }`}
                >
                  LB
                </button>
              </div>
            </div>
          </div>

          {/* Headline 1RM Hero Card */}
          <div className="card-clean p-4 rounded-xl border border-cyan-500/30 bg-gradient-to-br from-cyan-500/5 via-[var(--color-surface)] to-[var(--color-bg)]">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs uppercase tracking-wider font-semibold text-cyan-400">
                  {t('gym.estimated1RM', 'Estimated One Rep Max')}
                </span>
                <div className="text-3xl font-black tracking-tight text-[var(--color-text-primary)] mt-1">
                  {epley1RM} <span className="text-base font-medium text-[var(--color-text-muted)]">{unit}</span>
                </div>
                <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                  {numWeight} {unit} × {numReps} {numReps === 1 ? 'rep' : 'reps'} (Epley Formula)
                </p>
              </div>
              <div className="flex flex-col items-end gap-1 text-right">
                <div className="text-xs text-[var(--color-text-muted)]">
                  Brzycki: <span className="font-semibold text-[var(--color-text-primary)]">{brzycki1RM} {unit}</span>
                </div>
                <div className="text-xs text-[var(--color-text-muted)]">
                  Lombardi: <span className="font-semibold text-[var(--color-text-primary)]">{lombardi1RM} {unit}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Barbell Plate Loading Calculator */}
          <div className="card-clean p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers size={16} className="text-cyan-400" />
                <span className="text-xs font-bold text-[var(--color-text-primary)]">
                  {t('gym.plateBreakdown', 'Barbell Plate Breakdown')} ({selectedPercentage}%)
                </span>
              </div>
              <span className="text-xs text-cyan-400 font-semibold">
                {targetPlateWeight} {unit} total
              </span>
            </div>

            {targetPlateWeight < barWeight ? (
              <div className="text-xs text-[var(--color-text-muted)] italic">
                Weight is below empty bar ({barWeight} {unit}).
              </div>
            ) : plateBreakdown.perSide.length === 0 ? (
              <div className="text-xs text-[var(--color-text-secondary)]">
                Empty {barWeight} {unit} barbell only (no plates needed).
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-[var(--color-text-muted)]">Each side of bar:</span>
                  {plateBreakdown.perSide.map((item, idx) => (
                    <span 
                      key={idx}
                      className="px-2.5 py-1 rounded-lg bg-[var(--color-bg)] border border-cyan-500/20 text-xs font-bold text-[var(--color-text-primary)] shadow-sm"
                    >
                      {item.count} × {item.plate} {unit}
                    </span>
                  ))}
                </div>
                <p className="text-[11px] text-[var(--color-text-muted)]">
                  Standard {barWeight} {unit} barbell + plates on both sides.
                  {plateBreakdown.remainder > 0 && ` Remainder: ${plateBreakdown.remainder} ${unit}.`}
                </p>
              </div>
            )}
          </div>

          {/* Training Percentage Zones Table */}
          <div className="card-clean p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Percent size={16} className="text-cyan-400" />
                <span className="text-xs font-bold text-[var(--color-text-primary)]">
                  {t('gym.trainingZones', 'Training Percentage Zones')}
                </span>
              </div>
              <span className="text-xs text-[var(--color-text-muted)]">
                Tap row to inspect plates
              </span>
            </div>

            <div className="divide-y divide-[var(--color-border)] text-xs">
              {percentages.map(row => {
                const isSelected = selectedPercentage === row.percentage;
                return (
                  <button
                    key={row.percentage}
                    type="button"
                    onClick={() => setSelectedPercentage(row.percentage)}
                    className={`w-full py-2.5 px-2 flex items-center justify-between rounded-lg transition-colors text-left ${
                      isSelected ? 'bg-cyan-500/10 text-cyan-400 font-bold' : 'hover:bg-[var(--color-bg)] text-[var(--color-text-secondary)]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className={`w-10 font-bold ${isSelected ? 'text-cyan-400' : 'text-[var(--color-text-primary)]'}`}>
                        {row.percentage}%
                      </span>
                      <span className="text-[var(--color-text-primary)] font-semibold">
                        {row.weight} {unit}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-right">
                      <span className="text-[var(--color-text-muted)] font-mono">
                        {row.repsRange} {row.repsRange === '1' ? 'rep' : 'reps'}
                      </span>
                      <span className="text-[11px] text-[var(--color-text-muted)] hidden sm:inline">
                        {row.intensityLabel}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[var(--color-border)] bg-[var(--color-bg)] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-xs rounded-xl shadow transition-colors"
          >
            {t('common.done', 'Done')}
          </button>
        </div>
      </div>
    </div>
  );
};

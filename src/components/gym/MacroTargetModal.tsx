import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  Flame, 
  X, 
  Check, 
  Copy, 
  Download, 
  Activity, 
  Dumbbell, 
  Sparkles, 
  UtensilsCrossed, 
  ChevronRight, 
  Info, 
  Scale, 
  Target,
  FileText
} from 'lucide-react';
import { 
  MacroService, 
  FitnessGoal, 
  ActivityLevel, 
  BiologicalSex, 
  MacroTargetResult 
} from '../../services/macroService';
import { getTodayLocalDate } from '../../services/storage';

interface MacroTargetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefresh?: () => void;
  onShowToast?: (msg: string) => void;
}

export const MacroTargetModal: React.FC<MacroTargetModalProps> = ({
  isOpen,
  onClose,
  onRefresh,
  onShowToast,
}) => {
  const [weightKg, setWeightKg] = useState<number>(() => MacroService.getLatestBodyweightKg());
  const [heightCm, setHeightCm] = useState<number>(178);
  const [age, setAge] = useState<number>(26);
  const [sex, setSex] = useState<BiologicalSex>('male');
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>('moderate');
  const [goal, setGoal] = useState<FitnessGoal>('lean_bulk');

  // Re-sync latest weight when opened
  useEffect(() => {
    if (isOpen) {
      setWeightKg(MacroService.getLatestBodyweightKg());
    }
  }, [isOpen]);

  const result: MacroTargetResult = useMemo(() => {
    return MacroService.calculateMacros({
      weightKg: Math.max(35, weightKg || 78),
      heightCm: Math.max(120, heightCm || 178),
      age: Math.max(14, age || 26),
      sex,
      activityLevel,
      goal,
    });
  }, [weightKg, heightCm, age, sex, activityLevel, goal]);

  if (!isOpen) return null;

  const handleExportMd = () => {
    const md = MacroService.exportNutritionPlanMd(result);
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `nutrition_plan_${getTodayLocalDate()}.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    if (onShowToast) onShowToast('✓ Nutrition plan exported as Markdown');
  };

  const handleExportCsv = () => {
    const csv = MacroService.exportMacroCsv(result);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `macro_targets_${getTodayLocalDate()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    if (onShowToast) onShowToast('✓ Macro breakdown exported as CSV');
  };

  const handleCopySummary = () => {
    const text = `🔥 Daily Nutrition & Macro Target (${getTodayLocalDate()}):\n` +
      `• Target Calories: ${result.targetKcal.toLocaleString()} kcal / day (${result.calorieDeltaKcal >= 0 ? '+' : ''}${result.calorieDeltaKcal} kcal)\n` +
      `• TDEE Maintenance: ${result.tdeeKcal.toLocaleString()} kcal | BMR: ${result.bmrKcal.toLocaleString()} kcal\n` +
      `• Protein (2.2g/kg): ${result.proteinGrams}g (${result.proteinKcal} kcal • ${result.proteinPercent}%)\n` +
      `• Carbohydrates: ${result.carbGrams}g (${result.carbKcal} kcal • ${result.carbPercent}%)\n` +
      `• Fats (0.9g/kg): ${result.fatGrams}g (${result.fatKcal} kcal • ${result.fatPercent}%)\n` +
      `Goal: ${MacroService.GOALS[result.goal].label} for ${result.weightKg} kg`;

    navigator.clipboard.writeText(text);
    if (onShowToast) onShowToast('📋 Macro targets copied to clipboard!');
  };

  const modalContent = (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/80  animate-in fade-in duration-200">
      <div 
        className="w-full max-w-2xl bg-[var(--color-surface)] border border-[var(--color-border)] rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[var(--color-border)] bg-[var(--color-surface)]/90 ">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-500/15 text-orange-400 flex items-center justify-center shrink-0 border border-orange-500/30 shadow-sm">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[var(--color-text-primary)] flex items-center gap-2">
                <span>Bodyweight Macros & TDEE Desk</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-300 font-mono font-bold border border-orange-500/30">
                  {result.targetKcal.toLocaleString()} kcal
                </span>
              </h2>
              <p className="text-xs text-[var(--color-text-secondary)]">
                Scientifically calibrated metabolic expenditure & personalized macro split
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleCopySummary}
              className="p-2 rounded-xl text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-subtle)] transition-colors"
              title="Copy summary"
            >
              <Copy className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-subtle)] transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 3-Gauge Executive Suite */}
        <div className="p-4 sm:p-5 border-b border-[var(--color-border)] bg-[var(--color-surface-subtle)]">
          <div className="grid grid-cols-3 gap-2.5">
            <div className="p-3 rounded-2xl bg-[var(--color-surface)] border border-orange-500/30 text-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-orange-400 block mb-0.5">
                Target Calories
              </span>
              <span className="text-base sm:text-lg font-black text-orange-400 font-mono">
                {result.targetKcal.toLocaleString()} <span className="text-[10px] font-normal text-[var(--color-text-muted)]">kcal</span>
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] text-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)] block mb-0.5">
                TDEE Maintenance
              </span>
              <span className="text-base sm:text-lg font-black text-cyan-400 font-mono">
                {result.tdeeKcal.toLocaleString()} <span className="text-[10px] font-normal text-[var(--color-text-muted)]">kcal</span>
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] text-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)] block mb-0.5">
                BMR Baseline
              </span>
              <span className="text-base sm:text-lg font-black text-[var(--color-text-primary)] font-mono">
                {result.bmrKcal.toLocaleString()} <span className="text-[10px] font-normal text-[var(--color-text-muted)]">kcal</span>
              </span>
            </div>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* Biometrics Settings Form */}
          <div className="p-4 rounded-2xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] space-y-3">
            <span className="text-xs font-bold text-[var(--color-text-primary)] flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Scale className="w-4 h-4 text-cyan-400" />
                <span>Biometrics & Body Composition</span>
              </span>
              <span className="text-[11px] text-[var(--color-text-muted)]">
                Weight synced from latest entry
              </span>
            </span>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-[var(--color-text-secondary)]">Weight (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={weightKg}
                  onChange={e => setWeightKg(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-xs text-[var(--color-text-primary)] font-mono font-bold focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-[var(--color-text-secondary)]">Height (cm)</label>
                <input
                  type="number"
                  required
                  value={heightCm}
                  onChange={e => setHeightCm(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-xs text-[var(--color-text-primary)] font-mono font-bold focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-[var(--color-text-secondary)]">Age</label>
                <input
                  type="number"
                  required
                  value={age}
                  onChange={e => setAge(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-xs text-[var(--color-text-primary)] font-mono font-bold focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-[var(--color-text-secondary)]">Sex</label>
                <div className="grid grid-cols-2 gap-1 h-[38px]">
                  <button
                    type="button"
                    onClick={() => setSex('male')}
                    className={`rounded-xl text-xs font-bold border transition-all ${
                      sex === 'male'
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-sm'
                        : 'bg-[var(--color-surface)] text-[var(--color-text-secondary)] border-[var(--color-border)]'
                    }`}
                  >
                    Male
                  </button>
                  <button
                    type="button"
                    onClick={() => setSex('female')}
                    className={`rounded-xl text-xs font-bold border transition-all ${
                      sex === 'female'
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-sm'
                        : 'bg-[var(--color-surface)] text-[var(--color-text-secondary)] border-[var(--color-border)]'
                    }`}
                  >
                    Female
                  </button>
                </div>
              </div>
            </div>

            {/* Activity Level Selector */}
            <div className="space-y-1 pt-1">
              <label className="text-[11px] font-semibold text-[var(--color-text-secondary)]">Activity Level & Gym Frequency</label>
              <select
                value={activityLevel}
                onChange={e => setActivityLevel(e.target.value as ActivityLevel)}
                className="w-full px-3 py-2 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-xs text-[var(--color-text-primary)] focus:outline-none focus:border-orange-500 font-semibold"
              >
                {Object.values(MacroService.ACTIVITY_LEVELS).map(act => (
                  <option key={act.id} value={act.id}>
                    {act.label} — {act.description}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Fitness Goal Selector Carousel */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-[var(--color-text-primary)] uppercase tracking-wider block px-1">
              Select Primary Fitness Goal
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {Object.values(MacroService.GOALS).map(g => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setGoal(g.id)}
                  className={`p-3 rounded-2xl border text-left transition-all ${
                    goal === g.id
                      ? 'bg-orange-500/20 text-orange-200 border-orange-500/40 shadow-sm'
                      : 'bg-[var(--color-surface-subtle)] text-[var(--color-text-secondary)] border-[var(--color-border)] hover:text-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold">{g.badge}</span>
                    <span className="text-[10px] font-mono font-bold text-orange-400">
                      {g.deltaKcal >= 0 ? `+${g.deltaKcal}` : g.deltaKcal} kcal
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--color-text-muted)] line-clamp-2">
                    {g.description}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* 3 Interactive Macro Cards */}
          <div className="space-y-3">
            <span className="text-xs font-bold text-[var(--color-text-primary)] uppercase tracking-wider block px-1">
              Personalized Daily Macronutrient Split
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Protein */}
              <div className="p-4 rounded-2xl bg-[var(--color-surface-subtle)] border border-cyan-500/30 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-cyan-400">Protein (2.2g/kg)</span>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                    {result.proteinPercent}%
                  </span>
                </div>

                <div className="font-mono text-2xl font-black text-[var(--color-text-primary)]">
                  {result.proteinGrams} <span className="text-xs font-normal text-[var(--color-text-muted)]">grams</span>
                </div>
                <div className="text-[11px] text-[var(--color-text-secondary)]">
                  {result.proteinKcal} kcal • Muscle repair & MPS
                </div>

                <div className="pt-1.5 border-t border-[var(--color-border)] space-y-1">
                  <span className="text-[10px] font-bold text-[var(--color-text-muted)] block uppercase">Top Sources</span>
                  <div className="flex flex-wrap gap-1">
                    {['Chicken', 'Eggs', 'Whey', 'Tuna', 'Beef'].map(f => (
                      <span key={f} className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-surface)] text-cyan-300 border border-[var(--color-border)]">
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Carbohydrates */}
              <div className="p-4 rounded-2xl bg-[var(--color-surface-subtle)] border border-amber-500/30 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-400">Carbohydrates</span>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                    {result.carbPercent}%
                  </span>
                </div>

                <div className="font-mono text-2xl font-black text-[var(--color-text-primary)]">
                  {result.carbGrams} <span className="text-xs font-normal text-[var(--color-text-muted)]">grams</span>
                </div>
                <div className="text-[11px] text-[var(--color-text-secondary)]">
                  {result.carbKcal} kcal • Training fuel & glycogen
                </div>

                <div className="pt-1.5 border-t border-[var(--color-border)] space-y-1">
                  <span className="text-[10px] font-bold text-[var(--color-text-muted)] block uppercase">Top Sources</span>
                  <div className="flex flex-wrap gap-1">
                    {['Oats', 'Rice', 'Potatoes', 'Bananas', 'Pasta'].map(f => (
                      <span key={f} className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-surface)] text-amber-300 border border-[var(--color-border)]">
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Fats */}
              <div className="p-4 rounded-2xl bg-[var(--color-surface-subtle)] border border-emerald-500/30 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-400">Healthy Fats (0.9g/kg)</span>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                    {result.fatPercent}%
                  </span>
                </div>

                <div className="font-mono text-2xl font-black text-[var(--color-text-primary)]">
                  {result.fatGrams} <span className="text-xs font-normal text-[var(--color-text-muted)]">grams</span>
                </div>
                <div className="text-[11px] text-[var(--color-text-secondary)]">
                  {result.fatKcal} kcal • Hormones & joint health
                </div>

                <div className="pt-1.5 border-t border-[var(--color-border)] space-y-1">
                  <span className="text-[10px] font-bold text-[var(--color-text-muted)] block uppercase">Top Sources</span>
                  <div className="flex flex-wrap gap-1">
                    {['Olive oil', 'Almonds', 'Avocado', 'Peanut butter'].map(f => (
                      <span key={f} className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-surface)] text-emerald-300 border border-[var(--color-border)]">
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer with Exports */}
        <div className="p-4 sm:p-5 border-t border-[var(--color-border)] bg-[var(--color-surface)] flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs text-[var(--color-text-muted)] hidden sm:inline">
            Mifflin-St Jeor formula calibrated for natural lifting athletes
          </span>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleExportMd}
              className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl bg-[var(--color-surface-subtle)] hover:bg-[var(--color-surface)] border border-[var(--color-border)] text-xs font-semibold text-[var(--color-text-primary)] flex items-center justify-center gap-1.5 transition-all tap-feedback"
            >
              <FileText className="w-4 h-4 text-orange-400" />
              <span>Nutrition Plan (.MD)</span>
            </button>

            <button
              type="button"
              onClick={handleExportCsv}
              className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl bg-[var(--color-surface-subtle)] hover:bg-[var(--color-surface)] border border-[var(--color-border)] text-xs font-semibold text-[var(--color-text-primary)] flex items-center justify-center gap-1.5 transition-all tap-feedback"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
};

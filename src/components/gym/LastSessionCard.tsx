import React, { useState } from 'react';
import { Dumbbell, ChevronDown, TrendingUp, X } from 'lucide-react';
import { GlassCard, AccentChip } from '../glass';
import { ExerciseSessionComparison, formatWeight } from '../../services/gymDerivedStats';
import { Exercise } from '../../types';
import { useTranslation } from '../../services/i18n';

interface LastSessionCardProps {
  comparison: ExerciseSessionComparison | null;
  allExercises: Exercise[];
  onSelectExercise: (exerciseId: string, exerciseName: string) => void;
  weightUnit?: 'kg' | 'lb';
  className?: string;
}

export const LastSessionCard: React.FC<LastSessionCardProps> = ({
  comparison,
  allExercises,
  onSelectExercise,
  weightUnit = 'kg',
  className = '',
}) => {
  const { t } = useTranslation();
  const [isSwitcherOpen, setIsSwitcherOpen] = useState(false);

  if (!comparison) return null;

  return (
    <>
      <GlassCard className={`space-y-4 p-4 sm:p-5 ${className}`}>
        {/* Header Row */}
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setIsSwitcherOpen(true)}
            className="flex items-center gap-3 min-w-0 text-start tap-feedback group"
            aria-label={`${t('gym.switchExercise', 'Switch exercise')}: ${comparison.exerciseName}`}
          >
            <div className="w-10 h-10 rounded-[12px] bg-white/[0.05] border border-[var(--color-border)] flex items-center justify-center shrink-0 group-hover:border-[var(--accent)] transition-colors">
              <Dumbbell className="w-5 h-5 text-[var(--accent-light)]" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 className="text-[15px] font-medium text-[var(--text-1)] truncate group-hover:text-[var(--accent-light)] transition-colors">
                  {comparison.exerciseName}
                </h3>
                <ChevronDown className="w-3.5 h-3.5 text-[var(--text-3)] shrink-0" />
              </div>
              <p className="text-[12px] text-[var(--text-3)] truncate">
                {t('gym.lastSession', 'Last session')} · {comparison.currentDate}
              </p>
            </div>
          </button>

          {comparison.increased && (
            <AccentChip className="text-[11px] py-0.5 px-2.5 shrink-0">
              {t('gym.increasedBadge', 'Increased')}
            </AccentChip>
          )}
        </div>

        {/* Set Comparison Table */}
        <div className="rounded-[16px] bg-white/[0.03] border border-white/[0.08] overflow-hidden">
          <table className="w-full text-start border-collapse">
            <thead>
              <tr className="border-b border-white/[0.06] text-[12px] text-[var(--text-3)]">
                <th className="py-2.5 px-3.5 text-start font-medium">{t('gym.setCol', 'Set')}</th>
                <th className="py-2.5 px-3.5 text-center font-medium">{t('gym.previousCol', 'Previous')}</th>
                <th className="py-2.5 px-3.5 text-end font-medium">{t('gym.nowCol', 'Now')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04] text-[13px]">
              {comparison.comparisonRows.map((row) => (
                <tr key={row.setIndex} className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-2.5 px-3.5 text-start font-medium text-[var(--text-3)] text-[12px]">
                    #{row.setIndex}
                  </td>
                  <td className="py-2.5 px-3.5 text-center text-[var(--text-2)] font-normal">
                    {row.previous
                      ? `${row.previous.weight > 0 ? formatWeight(row.previous.weight, weightUnit, true) : 'BW'} × ${row.previous.reps}`
                      : '—'}
                  </td>
                  <td className="py-2.5 px-3.5 text-end font-medium text-[var(--accent-light)]">
                    {row.current
                      ? `${row.current.weight > 0 ? formatWeight(row.current.weight, weightUnit, true) : 'BW'} × ${row.current.reps}`
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer Insight / Progression Note */}
        {comparison.increased && comparison.e1RMChangePercent > 0 ? (
          <div className="flex items-center gap-2 text-[12px] text-[var(--accent-light)] font-medium pt-0.5">
            <TrendingUp className="w-4 h-4 shrink-0 stroke-[2.5]" />
            <span>
              {t('gym.e1rmUp', 'Estimated one-rep max is up {pct}%').replace(
                '{pct}',
                String(comparison.e1RMChangePercent)
              )}
            </span>
          </div>
        ) : !comparison.hasComparison ? (
          <p className="text-[12px] text-[var(--text-3)] pt-0.5">
            {t('gym.firstSessionPrompt', 'Do this exercise again to see your progress')}
          </p>
        ) : null}
      </GlassCard>

      {/* Glass Bottom Sheet Exercise Switcher Modal */}
      {isSwitcherOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60  animate-fade-in p-2 sm:p-4"
          onClick={() => setIsSwitcherOpen(false)}
        >
          <div 
            className="w-full max-w-md bg-[var(--color-card)] border border-[var(--color-border)] rounded-2xl shadow-sm rounded-3xl p-5 border border-[var(--color-border)] space-y-3 max-h-[75vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
              <h4 className="text-[15px] font-medium text-[var(--text-1)]">
                {t('gym.selectExercise', 'Select exercise')}
              </h4>
              <button
                type="button"
                onClick={() => setIsSwitcherOpen(false)}
                className="p-1 rounded-lg text-[var(--text-3)] hover:text-[var(--text-1)] tap-feedback"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto no-scrollbar space-y-1.5 flex-1 pr-1">
              {allExercises.map((ex) => {
                const isCurrent = ex.name === comparison.exerciseName;
                return (
                  <button
                    key={ex.id}
                    type="button"
                    onClick={() => {
                      onSelectExercise(ex.id, ex.name);
                      setIsSwitcherOpen(false);
                    }}
                    className={`w-full p-3 rounded-2xl border text-start flex items-center justify-between tap-feedback transition-all ${
                      isCurrent
                        ? 'bg-[rgb(var(--accent-rgb)/0.15)] border-[rgb(var(--accent-rgb)/0.4)] text-[var(--accent-light)]'
                        : 'bg-white/[0.03] border-white/[0.06] text-[var(--text-1)] hover:bg-white/[0.06]'
                    }`}
                  >
                    <span className="text-[14px] font-medium truncate">{ex.name}</span>
                    <span className="text-[11px] text-[var(--text-3)] capitalize ms-2 shrink-0">
                      {ex.category}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default LastSessionCard;

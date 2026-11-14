import React from 'react';
import { BedDouble, Moon, Sparkles, Plus, Clock, ChevronRight } from 'lucide-react';
import { SleepService } from '../../services/sleepService';
import { getTodayLocalDate } from '../../services/storage';

interface SleepRecoveryCardProps {
  onOpenModal: () => void;
  className?: string;
}

export const SleepRecoveryCard: React.FC<SleepRecoveryCardProps> = ({
  onOpenModal,
  className = '',
}) => {
  const stats = SleepService.getSleepStats(7);
  const today = getTodayLocalDate();
  const todayEntry = stats.recentEntries.find(s => s.local_date === today);

  return (
    <div className={`p-4 rounded-3xl bg-[var(--surface)] border border-[var(--hairline)] hover:border-indigo-500/30 transition-all space-y-3 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-500/15 text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-500/30 shadow-sm">
            <BedDouble className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-[var(--text-1)] flex items-center gap-1.5">
              <span>Sleep & Recovery</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                {stats.averageHours > 0 ? `${stats.averageHours}h avg` : '7d Tracker'}
              </span>
            </h3>
            <span className="text-[10px] text-[var(--text-3)] block">
              {stats.sleepDebtHours <= 0 
                ? 'Nervous system restored • 8h target met' 
                : `${stats.sleepDebtHours}h sleep debt this week`}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenModal}
          className="px-3 py-1.5 rounded-xl bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 text-xs font-bold flex items-center gap-1.5 border border-indigo-500/30 transition-all tap-feedback"
          aria-label="Open Sleep & Recovery Optimizer"
        >
          {todayEntry ? (
            <span>Manage Rest</span>
          ) : (
            <>
              <Plus className="w-3.5 h-3.5" />
              <span>Log Sleep</span>
            </>
          )}
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Today's Sleep Status / Prompt */}
      {todayEntry ? (
        <div className="p-2.5 rounded-xl bg-[var(--surface-muted)] border border-[var(--hairline)] flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Moon className="w-3.5 h-3.5 text-indigo-400" />
            <span className="font-mono text-[var(--text-1)] font-semibold">
              {todayEntry.bedtime} → {todayEntry.wake_time}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-indigo-300">
              {SleepService.formatMinutesToHours(todayEntry.duration_minutes)}
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-semibold">
              {SleepService.getQualityInfo(todayEntry.quality_score).icon} {SleepService.getQualityInfo(todayEntry.quality_score).label}
            </span>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between text-xs text-[var(--text-3)] bg-[var(--surface-muted)]/60 px-3 py-2 rounded-xl border border-[var(--hairline)]">
          <span>Log last night's bedtime & wake up to calibrate training recovery</span>
          <span className="font-mono text-[10px] text-indigo-400 font-bold">8.0h Target</span>
        </div>
      )}
    </div>
  );
};

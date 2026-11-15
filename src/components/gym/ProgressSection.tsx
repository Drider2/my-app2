import React from 'react';
import { 
  ChevronRight, 
  Activity, 
  Dumbbell, 
  Clock, 
  Trophy, 
  ArrowUpRight, 
  ArrowDownRight 
} from 'lucide-react';
import { GlassTile, AccentChip } from '../ui';
import { 
  StatRange, 
  RangeDerivedStats, 
  DeltaChipInfo,
  formatDuration 
} from '../../services/gymDerivedStats';
import { useCountUp, useCountUpValue } from '../../services/motion';
import { useTranslation } from '../../services/i18n';

interface ProgressSectionProps {
  selectedRange: StatRange;
  onRangeChange: (range: StatRange) => void;
  stats: RangeDerivedStats;
  onViewLog: () => void;
  className?: string;
}

export const ProgressSection: React.FC<ProgressSectionProps> = ({
  selectedRange,
  onRangeChange,
  stats,
  onViewLog,
  className = '',
}) => {
  const { t } = useTranslation();

  // 900ms kinetic count-up rolling numbers
  const animatedVolume = useCountUp(stats.volume.value, { duration: 900 });
  const animatedWorkouts = useCountUp(stats.workoutCount.value, { duration: 900 });
  const animatedRecords = useCountUp(stats.records.value, { duration: 900 });
  const animatedMinutes = useCountUpValue(stats.totalTime.value, { duration: 900 });
  const animatedTimeFormatted = formatDuration(animatedMinutes);

  const ranges: { key: StatRange; label: string }[] = [
    { key: 'week', label: t('gym.periodWeek', 'Week') },
    { key: 'month', label: t('gym.periodMonth', 'Month') },
    { key: 'year', label: t('gym.periodYear', 'Year') },
    { key: 'all', label: t('gym.periodAll', 'All') },
  ];

  const renderDeltaChip = (delta: DeltaChipInfo | null) => {
    if (!delta || selectedRange === 'all') return null;

    if (delta.type === 'new') {
      return (
        <AccentChip className="text-[11px] py-0.5 px-2 font-medium">
          {t('gym.newBadge', 'New')}
        </AccentChip>
      );
    }

    if (delta.isPositive) {
      return (
        <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-medium text-[var(--accent-light)] bg-[rgb(var(--accent-rgb)/0.14)] border border-[rgb(var(--accent-rgb)/0.35)] shadow-[0_0_12px_rgb(var(--accent-rgb)/0.25)] select-none">
          <ArrowUpRight className="w-3 h-3 stroke-[2.5]" />
          <span>{delta.label}</span>
        </span>
      );
    }

    // Negative change: neutral white-tinted chip with down arrow (NO RED)
    return (
      <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-medium text-white/80 bg-white/10 border border-white/15 select-none">
        <ArrowDownRight className="w-3 h-3 stroke-[2.5]" />
        <span>{delta.label}</span>
      </span>
    );
  };

  return (
    <section className={`space-y-3.5 ${className}`} aria-label="Gym Progress Section">
      {/* Header Row: Title & View Log */}
      <div className="flex items-center justify-between">
        <h2 className="text-[16px] font-medium text-[var(--text-1)] tracking-tight">
          {t('gym.progressTitle', 'Progress')}
        </h2>
        <button
          type="button"
          onClick={onViewLog}
          className="inline-flex items-center gap-0.5 text-[12px] font-medium text-[var(--text-2)] hover:text-[var(--text-1)] min-h-[44px] min-w-[44px] justify-end tap-feedback focus:outline-none focus-visible:underline transition-colors"
          aria-label={t('gym.viewLog', 'View log')}
        >
          <span>{t('gym.viewLog', 'View log')}</span>
          <ChevronRight className="w-3.5 h-3.5 rtl:rotate-180" />
        </button>
      </div>

      {/* Segmented Control Track */}
      <div 
        role="tablist" 
        aria-label="Stats range filter"
        className="w-full bg-white/[0.04] border border-white/10 rounded-[16px] p-1 grid grid-cols-4 gap-1 select-none"
      >
        {ranges.map((r) => {
          const isActive = selectedRange === r.key;
          return (
            <button
              key={r.key}
              role="tab"
              aria-selected={isActive}
              type="button"
              onClick={() => onRangeChange(r.key)}
              className={`min-h-[40px] rounded-[12px] text-[13px] font-medium transition-all duration-150 flex items-center justify-center tap-feedback focus:outline-none ${
                isActive
                  ? 'bg-[rgb(var(--accent-rgb)/0.2)] text-[var(--accent-light)] border border-[rgb(var(--accent-rgb)/0.45)] shadow-[0_0_12px_rgb(var(--accent-rgb)/0.3)]'
                  : 'text-[var(--text-2)] hover:text-[var(--text-1)] hover:bg-white/[0.03] border border-transparent'
              }`}
            >
              {r.label}
            </button>
          );
        })}
      </div>

      {/* 2x2 Grid of Progress Metric Tiles */}
      <div className="grid grid-cols-2 gap-2.5">
        {/* Tile 1: Volume */}
        <GlassTile className="rounded-[18px] p-3.5 flex flex-col justify-between min-h-[104px] space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[var(--text-3)]">
              <Activity className="w-3.5 h-3.5 text-[var(--accent-light)]" />
              <span className="text-[12px] font-medium">{t('gym.volumeLabel', 'Volume')}</span>
            </div>
            {renderDeltaChip(stats.volume.delta)}
          </div>
          <div className="flex items-baseline gap-1">
            <span 
              className="text-[24px] font-medium text-[var(--text-1)] tracking-tight leading-none"
              style={{ textShadow: '0 0 16px rgb(var(--accent-rgb) / 0.55)' }}
            >
              {animatedVolume}
            </span>
            <span className="text-[12px] text-[var(--text-2)] font-normal">
              {stats.volume.unit}
            </span>
          </div>
        </GlassTile>

        {/* Tile 2: Workouts */}
        <GlassTile className="rounded-[18px] p-3.5 flex flex-col justify-between min-h-[104px] space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[var(--text-3)]">
              <Dumbbell className="w-3.5 h-3.5 text-[var(--accent-light)]" />
              <span className="text-[12px] font-medium">{t('gym.workoutsLabel', 'Workouts')}</span>
            </div>
            {renderDeltaChip(stats.workoutCount.delta)}
          </div>
          <div className="flex items-baseline gap-1">
            <span 
              className="text-[24px] font-medium text-[var(--text-1)] tracking-tight leading-none"
              style={{ textShadow: '0 0 16px rgb(var(--accent-rgb) / 0.55)' }}
            >
              {animatedWorkouts}
            </span>
          </div>
        </GlassTile>

        {/* Tile 3: Total Time */}
        <GlassTile className="rounded-[18px] p-3.5 flex flex-col justify-between min-h-[104px] space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[var(--text-3)]">
              <Clock className="w-3.5 h-3.5 text-[var(--accent-light)]" />
              <span className="text-[12px] font-medium">{t('gym.totalTimeLabel', 'Total time')}</span>
            </div>
            {renderDeltaChip(stats.totalTime.delta)}
          </div>
          <div className="flex items-baseline gap-1">
            <span 
              className="text-[24px] font-medium text-[var(--text-1)] tracking-tight leading-none"
              style={{ textShadow: '0 0 16px rgb(var(--accent-rgb) / 0.55)' }}
            >
              {animatedTimeFormatted}
            </span>
          </div>
        </GlassTile>

        {/* Tile 4: Records */}
        <GlassTile className="rounded-[18px] p-3.5 flex flex-col justify-between min-h-[104px] space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[var(--text-3)]">
              <Trophy className="w-3.5 h-3.5 text-[var(--accent-light)]" />
              <span className="text-[12px] font-medium">{t('gym.recordsLabel', 'Records')}</span>
            </div>
            {renderDeltaChip(stats.records.delta)}
          </div>
          <div className="flex items-baseline gap-1">
            <span 
              className="text-[24px] font-medium text-[var(--text-1)] tracking-tight leading-none"
              style={{ textShadow: '0 0 16px rgb(var(--accent-rgb) / 0.55)' }}
            >
              {animatedRecords}
            </span>
          </div>
        </GlassTile>
      </div>
    </section>
  );
};

export default ProgressSection;

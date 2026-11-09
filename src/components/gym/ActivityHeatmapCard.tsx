import React, { useState } from 'react';
import { GlassCard } from '../glass';
import { HeatmapCell } from '../../services/gymDerivedStats';
import { useTranslation } from '../../services/i18n';

interface ActivityHeatmapCardProps {
  grid: HeatmapCell[][];
  monthLabels: { label: string; weekIndex: number }[];
  totalWorkouts: number;
  weightUnit?: 'kg' | 'lb';
  onCellClick?: (cell: HeatmapCell) => void;
  className?: string;
}

export const ActivityHeatmapCard: React.FC<ActivityHeatmapCardProps> = ({
  grid,
  monthLabels,
  totalWorkouts,
  weightUnit = 'kg',
  onCellClick,
  className = '',
}) => {
  const { t, isRtl } = useTranslation();
  const [selectedCell, setSelectedCell] = useState<HeatmapCell | null>(null);

  // Approximate number of months covered by 18 weeks (~4 months)
  const monthsCovered = 4;

  const getCellBgClass = (level: 0 | 1 | 2 | 3 | 4) => {
    switch (level) {
      case 1:
        return 'bg-[rgb(var(--accent-rgb)/0.28)] border-[rgb(var(--accent-rgb)/0.35)]';
      case 2:
        return 'bg-[rgb(var(--accent-rgb)/0.50)] border-[rgb(var(--accent-rgb)/0.6)]';
      case 3:
        return 'bg-[rgb(var(--accent-rgb)/0.75)] border-[rgb(var(--accent-rgb)/0.85)]';
      case 4:
        return 'bg-[var(--accent)] border-[var(--accent-light)] shadow-[0_0_8px_rgb(var(--accent-rgb)/0.8)]';
      case 0:
      default:
        return 'bg-white/[0.07] border-white/[0.05]';
    }
  };

  const handleCellClick = (cell: HeatmapCell) => {
    setSelectedCell(cell);
    if (onCellClick) onCellClick(cell);
  };

  return (
    <GlassCard className={`space-y-4 p-4 sm:p-5 ${className}`}>
      {/* Title & Subtitle */}
      <div>
        <h2 className="text-[16px] font-medium text-[var(--text-1)] tracking-tight">
          {t('gym.activityTitle', 'Activity')}
        </h2>
        <p className="text-[12px] text-[var(--text-2)] mt-0.5">
          {t('gym.activitySubtitle', '{count} workouts in the last {months} months')
            .replace('{count}', String(totalWorkouts))
            .replace('{months}', String(monthsCovered))}
        </p>
      </div>

      {/* Selected Cell Tooltip Banner */}
      {selectedCell && (
        <div className="p-2.5 rounded-xl bg-white/[0.06] border border-white/10 flex items-center justify-between text-[12px] animate-fade-in">
          <div>
            <span className="font-medium text-[var(--text-1)]">{selectedCell.dateStr}</span>
            <span className="text-[var(--text-3)] mx-1.5">·</span>
            <span className="text-[var(--text-2)]">
              {selectedCell.workoutName || (selectedCell.sessionCount > 0 ? t('common.completed', 'Completed') : t('gym.noWorkoutDay', 'No workout'))}
            </span>
          </div>
          {selectedCell.volumeKg > 0 && (
            <span className="font-medium text-[var(--accent-light)]">
              {selectedCell.volumeKg.toLocaleString()} {weightUnit}
            </span>
          )}
        </div>
      )}

      {/* Heatmap Grid (Scrollable horizontally on smaller screens) */}
      <div className="overflow-x-auto no-scrollbar pb-1">
        <div className="min-w-fit flex flex-col gap-1.5">
          {/* Columns of 7 Days */}
          <div className="flex gap-[3px] items-center" role="grid" aria-label="18-week workout activity heatmap">
            {grid.map((weekCol, colIdx) => (
              <div 
                key={colIdx} 
                className="flex flex-col gap-[3px] animate-heatmap-col" 
                style={{ animationDelay: `${colIdx * 25}ms` }}
                role="row"
              >
                {weekCol.map((cell) => {
                  const isSelected = selectedCell?.dateStr === cell.dateStr;
                  return (
                    <button
                      key={cell.dateStr}
                      type="button"
                      role="gridcell"
                      aria-label={`${cell.dateStr}: ${cell.sessionCount} workouts, level ${cell.level}`}
                      onClick={() => handleCellClick(cell)}
                      className={`w-[13px] h-[13px] sm:w-[14px] sm:h-[14px] rounded-[3px] border transition-transform duration-100 ${getCellBgClass(
                        cell.level
                      )} ${
                        isSelected
                          ? 'ring-2 ring-white scale-125 z-10'
                          : 'hover:scale-110 active:scale-95'
                      }`}
                    />
                  );
                })}
              </div>
            ))}
          </div>

          {/* Month Labels Axis */}
          <div className="relative h-4 mt-1">
            {monthLabels.map((m, idx) => {
              // 13px cell + 3px gap = 16px per column
              const leftOffset = m.weekIndex * 16;
              return (
                <span
                  key={idx}
                  className="absolute text-[11px] text-[var(--text-3)] font-medium select-none"
                  style={{
                    [isRtl ? 'right' : 'left']: `${leftOffset}px`,
                  }}
                >
                  {m.label}
                </span>
              );
            })}
          </div>
        </div>
      </div>

      {/* Legend Row: Less [5 swatches] More */}
      <div className="flex items-center justify-end gap-2 text-[12px] text-[var(--text-3)] pt-1 select-none">
        <span>{t('gym.less', 'Less')}</span>
        <div className="flex gap-[3px] items-center">
          <div className="w-[11px] h-[11px] rounded-[2px] bg-white/[0.07] border border-white/[0.05]" />
          <div className="w-[11px] h-[11px] rounded-[2px] bg-[rgb(var(--accent-rgb)/0.28)] border border-[rgb(var(--accent-rgb)/0.35)]" />
          <div className="w-[11px] h-[11px] rounded-[2px] bg-[rgb(var(--accent-rgb)/0.50)] border border-[rgb(var(--accent-rgb)/0.6)]" />
          <div className="w-[11px] h-[11px] rounded-[2px] bg-[rgb(var(--accent-rgb)/0.75)] border border-[rgb(var(--accent-rgb)/0.85)]" />
          <div className="w-[11px] h-[11px] rounded-[2px] bg-[var(--accent)] border border-[var(--accent-light)] shadow-[0_0_6px_rgb(var(--accent-rgb)/0.7)]" />
        </div>
        <span>{t('gym.more', 'More')}</span>
      </div>
    </GlassCard>
  );
};

export default ActivityHeatmapCard;

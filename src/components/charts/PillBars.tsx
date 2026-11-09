import React from 'react';

export interface PillBarItem {
  label: string; // e.g. "M", "T", "W"
  value: number;
  max?: number;
  isToday?: boolean;
  isGoalMet?: boolean;
  formattedValue?: string;
}

export interface PillBarsProps {
  days: PillBarItem[];
  targetAverage?: number;
  targetLabel?: string;
  height?: number; // max height 72px default
  className?: string;
}

const PillBarsComponent: React.FC<PillBarsProps> = ({
  days,
  targetAverage,
  targetLabel,
  height = 72,
  className = '',
}) => {
  const maxVal = Math.max(
    1,
    targetAverage || 0,
    ...days.map(d => Math.max(d.value, d.max || 0))
  );

  // Position of target dotted line
  const targetPct = targetAverage !== undefined ? (targetAverage / maxVal) * 100 : null;

  return (
    <div className={`w-full space-y-2 select-none ${className}`}>
      {/* Target indicator banner if provided */}
      {targetAverage !== undefined && (
        <div className="flex items-center justify-between text-[12px] text-[var(--text-2)] px-1">
          <span>{targetLabel || 'Weekly goal / average'}</span>
          <span className="font-medium text-[var(--accent-light)] tabular-nums">
            {targetAverage}
          </span>
        </div>
      )}

      {/* Bars Canvas */}
      <div className="relative w-full px-1" style={{ height: height + 16 }}>
        {/* Dotted horizontal goal line across the chart at target height */}
        {targetPct !== null && targetPct > 0 && targetPct <= 100 && (
          <div
            className="absolute left-1 right-1 pointer-events-none z-10"
            style={{
              bottom: `${(targetPct / 100) * height + 4}px`,
              borderBottom: '1px dashed rgba(255, 255, 255, 0.25)',
            }}
          />
        )}

        {/* 7 Rounded Vertical Pills */}
        <div className="w-full h-full flex items-end justify-between gap-1.5 sm:gap-2">
          {days.map((item, idx) => {
            const pct = Math.max(0, Math.min(100, (item.value / maxVal) * 100));
            const isToday = item.isToday;
            const isGoalMet = item.isGoalMet || (targetAverage !== undefined && item.value >= targetAverage);

            return (
              <div
                key={item.label || idx}
                className="flex-1 flex flex-col items-center h-full justify-end group relative"
                aria-label={`${item.label}: ${item.formattedValue || item.value}`}
              >
                {/* Tiny 6px accent dot above the bar if goal met */}
                <div className="h-3 flex items-center justify-center mb-1">
                  {isGoalMet && (
                    <div
                      className="w-1.5 h-1.5 rounded-full"
                      style={{
                        backgroundColor: 'var(--accent)',
                        boxShadow: '0 0 6px rgb(var(--accent-rgb) / 0.6)',
                      }}
                    />
                  )}
                </div>

                {/* Pill Track and Bar (Width 24px, max height 72px, radius 12px) */}
                <div
                  className="w-full max-w-[24px] flex items-end overflow-hidden relative rounded-[12px] transition-all"
                  style={{
                    height: `${height}px`,
                    backgroundColor: 'var(--track)',
                    border: isToday ? '1px solid rgb(var(--accent-rgb) / 0.45)' : '1px solid rgba(255, 255, 255, 0.05)',
                    boxShadow: isToday ? '0 0 12px rgb(var(--accent-rgb) / 0.50)' : 'none',
                  }}
                >
                  <div
                    className="w-full rounded-t-[12px] transition-all duration-700 ease-out"
                    style={{
                      height: `${pct}%`,
                      backgroundColor: 'var(--accent)',
                      transitionDelay: `${idx * 60}ms`,
                    }}
                  />
                </div>

                {/* Day Label below: 12px, today in var(--accent-light) weight 500 */}
                <span
                  className="text-[12px] mt-1.5 transition-colors select-none"
                  style={{
                    color: isToday ? 'var(--accent-light)' : 'var(--text-2)',
                    fontWeight: isToday ? 500 : 400,
                  }}
                >
                  {item.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export const PillBars = React.memo(PillBarsComponent);
export default PillBars;

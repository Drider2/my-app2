import React from 'react';

export interface WeeklyDayData {
  day: string; // 'M', 'T', 'W', etc. or 'Mon', 'Tue'
  value: number; // Completion score or duration
  max?: number;
  status?: 'done' | 'pending' | 'missed' | 'rest';
  label?: string; // e.g. "Upper Body", "5/5 Prayers"
  active?: boolean;
}

export interface WeeklyActivityChartProps {
  days: WeeklyDayData[];
  height?: number;
  activeColor?: string;
  defaultColor?: string;
  className?: string;
}

export const WeeklyActivityChart: React.FC<WeeklyActivityChartProps> = ({
  days,
  height = 90,
  activeColor = 'var(--color-accent)',
  defaultColor = 'var(--color-surface)',
  className = '',
}) => {
  const maxVal = Math.max(1, ...days.map(d => Math.max(d.value, d.max || 1)));

  return (
    <div className={`w-full flex flex-col gap-2 ${className}`}>
      <div 
        className="w-full flex items-end justify-between gap-2 px-1"
        style={{ height }}
      >
        {days.map((item, idx) => {
          const heightPct = Math.max(8, Math.min(100, (item.value / maxVal) * 100));
          const isDone = item.status === 'done' || item.value > 0;
          const barColor = item.active 
            ? 'var(--color-highlight)' 
            : isDone 
            ? activeColor 
            : defaultColor;

          return (
            <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group">
              {/* Optional top status marker */}
              <div className="mb-1">
                {item.status === 'done' && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-positive)] block" />
                )}
                {item.status === 'missed' && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-negative)] block" />
                )}
                {item.status === 'pending' && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-warning)] block" />
                )}
                {(!item.status || item.status === 'rest') && (
                  <span className="w-1.5 h-1.5 rounded-full bg-transparent block" />
                )}
              </div>

              {/* Bar track */}
              <div className="w-full max-w-[20px] h-full flex items-end bg-[var(--color-surface)] rounded-t-lg overflow-hidden border border-[var(--color-border)] p-0.5">
                <div
                  className="w-full rounded-t-md transition-all duration-400 ease-out"
                  style={{
                    height: `${heightPct}%`,
                    backgroundColor: barColor,
                  }}
                  title={item.label || `${item.day}: ${item.value}`}
                />
              </div>

              {/* Day letter */}
              <span className={`text-xs mt-1.5 font-bold ${
                item.active ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-text-secondary)]'
              }`}>
                {item.day}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

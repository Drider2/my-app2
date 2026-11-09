import React, { useState } from 'react';

export interface BarItem {
  label: string;
  value: number;
  target?: number;
  color?: string;
  active?: boolean;
  formattedValue?: string;
}

export interface VerticalBarChartProps {
  bars: BarItem[];
  height?: number;
  defaultColor?: string;
  activeColor?: string;
  showValues?: boolean;
  yAxisLabel?: string;
  className?: string;
}

export const VerticalBarChart: React.FC<VerticalBarChartProps> = ({
  bars,
  height = 120,
  defaultColor = 'var(--color-surface)',
  activeColor = 'var(--color-accent)',
  showValues = true,
  yAxisLabel,
  className = '',
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const maxValue = Math.max(1, ...bars.map(b => Math.max(b.value, b.target || 0)));

  return (
    <div className={`w-full flex flex-col ${className}`}>
      {yAxisLabel && (
        <span className="text-xs font-semibold text-[var(--color-text-secondary)] mb-1">
          {yAxisLabel}
        </span>
      )}

      {/* Bar visual container */}
      <div 
        className="w-full flex items-end justify-between gap-1.5 sm:gap-2 pt-4 px-1"
        style={{ height }}
      >
        {bars.map((bar, idx) => {
          const heightPct = Math.max(4, Math.min(100, (bar.value / maxValue) * 100));
          const isHovered = hoveredIdx === idx;
          const isSelected = bar.active || isHovered;
          const barColor = isSelected 
            ? (bar.color || activeColor) 
            : defaultColor;

          return (
            <div
              key={idx}
              className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer"
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
              onClick={() => setHoveredIdx(idx)}
            >
              {/* Value label on hover or if showValues */}
              {showValues && (
                <span className={`text-xs font-bold mb-1 transition-opacity ${
                  isSelected ? 'text-[var(--color-text-primary)] opacity-100' : 'text-[var(--color-text-muted)] opacity-60'
                }`}>
                  {bar.formattedValue || bar.value}
                </span>
              )}

              {/* Bar track container */}
              <div className="w-full max-w-[28px] h-full flex items-end bg-[var(--color-surface)] rounded-t-xl overflow-hidden p-0.5 border border-[var(--color-border)]">
                <div
                  className="w-full rounded-t-lg transition-all duration-500 ease-out"
                  style={{
                    height: `${heightPct}%`,
                    backgroundColor: barColor,
                  }}
                />
              </div>

              {/* Day / Period label */}
              <span className={`text-xs mt-1.5 transition-colors font-medium truncate max-w-full text-center ${
                isSelected ? 'font-bold text-[var(--color-text-primary)]' : 'text-[var(--color-text-secondary)]'
              }`}>
                {bar.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

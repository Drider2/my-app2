import React from 'react';

export interface DonutSegment {
  id?: string;
  label: string;
  value: number;
  color: string;
  formattedValue?: string;
}

export interface DonutChartProps {
  segments: DonutSegment[];
  size?: number;
  thickness?: number;
  centerValue?: string;
  centerLabel?: string;
  showLegend?: boolean;
  className?: string;
}

export const DonutChart: React.FC<DonutChartProps> = ({
  segments,
  size = 130,
  thickness = 12,
  centerValue,
  centerLabel,
  showLegend = true,
  className = '',
}) => {
  const total = segments.reduce((sum, s) => sum + Math.max(0, s.value), 0);
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;

  let accumulatedPercent = 0;

  return (
    <div className={`flex flex-col items-center gap-3 ${className}`}>
      <div 
        className="relative shrink-0 flex items-center justify-center"
        style={{ width: size, height: size }}
      >
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="rotate-[-90deg] overflow-visible"
        >
          {/* Base Track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="var(--color-border)"
            strokeWidth={thickness}
            fill="none"
          />

          {/* Slices */}
          {total > 0 && segments.map((seg, idx) => {
            const safeVal = Math.max(0, seg.value);
            const ratio = safeVal / total;
            const strokeDasharray = `${ratio * circumference} ${circumference}`;
            const strokeDashoffset = -accumulatedPercent * circumference;
            accumulatedPercent += ratio;

            return (
              <circle
                key={seg.id || `${seg.label}-${idx}`}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke={seg.color}
                strokeWidth={thickness}
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                fill="none"
                style={{
                  transition: 'stroke-dasharray 0.6s ease, stroke-dashoffset 0.6s ease',
                }}
              />
            );
          })}
        </svg>

        {/* Center Readout */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-1 pointer-events-none">
          {centerValue && (
            <span className="text-sm font-extrabold tracking-tight text-[var(--color-text-primary)]">
              {centerValue}
            </span>
          )}
          {centerLabel && (
            <span className="text-xs font-semibold text-[var(--color-text-secondary)]">
              {centerLabel}
            </span>
          )}
        </div>
      </div>

      {/* Legend */}
      {showLegend && segments.length > 0 && (
        <div className="w-full grid grid-cols-2 gap-x-3 gap-y-1.5 text-left pt-1 border-t border-[var(--color-border)]">
          {segments.map((seg, idx) => {
            const percent = total > 0 ? Math.round((Math.max(0, seg.value) / total) * 100) : 0;
            return (
              <div key={idx} className="flex items-center justify-between text-xs min-w-0">
                <div className="flex items-center gap-1.5 min-w-0 pe-1">
                  <span 
                    className="w-2 h-2 rounded-full shrink-0" 
                    style={{ backgroundColor: seg.color }} 
                  />
                  <span className="text-xs font-medium text-[var(--color-text-secondary)] truncate">
                    {seg.label}
                  </span>
                </div>
                <span className="text-xs font-bold text-[var(--color-text-primary)] shrink-0">
                  {seg.formattedValue || `${percent}%`}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

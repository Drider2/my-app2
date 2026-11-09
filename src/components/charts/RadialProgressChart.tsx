import React from 'react';

export interface RadialRing {
  label: string;
  value: number;
  max: number;
  color: string;
  formattedValue?: string;
}

export interface RadialProgressChartProps {
  rings: RadialRing[];
  size?: number;
  strokeWidth?: number;
  gap?: number;
  centerContent?: React.ReactNode;
  showLegend?: boolean;
  className?: string;
}

export const RadialProgressChart: React.FC<RadialProgressChartProps> = ({
  rings,
  size = 140,
  strokeWidth = 8,
  gap = 4,
  centerContent,
  showLegend = true,
  className = '',
}) => {
  const center = size / 2;

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
          {rings.map((ring, idx) => {
            const radius = center - strokeWidth / 2 - idx * (strokeWidth + gap);
            if (radius <= 0) return null;
            const circumference = 2 * Math.PI * radius;
            const safeMax = ring.max > 0 ? ring.max : 1;
            const clamped = Math.max(0, Math.min(ring.value, safeMax));
            const dashoffset = circumference - (clamped / safeMax) * circumference;

            return (
              <g key={idx}>
                {/* Track */}
                <circle
                  cx={center}
                  cy={center}
                  r={radius}
                  stroke="var(--color-border)"
                  strokeWidth={strokeWidth}
                  fill="none"
                  strokeLinecap="round"
                />
                {/* Fill */}
                <circle
                  cx={center}
                  cy={center}
                  r={radius}
                  stroke={ring.color}
                  strokeWidth={strokeWidth}
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={dashoffset}
                  style={{
                    transition: 'stroke-dashoffset 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
                  }}
                />
              </g>
            );
          })}
        </svg>

        {/* Center Slot */}
        {centerContent && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            {centerContent}
          </div>
        )}
      </div>

      {/* Optional Legend */}
      {showLegend && rings.length > 0 && (
        <div className="w-full space-y-1.5 pt-1 border-t border-[var(--color-border)]">
          {rings.map((ring, idx) => {
            const pct = ring.max > 0 ? Math.round((Math.max(0, ring.value) / ring.max) * 100) : 0;
            return (
              <div key={idx} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span 
                    className="w-2.5 h-2.5 rounded-full shrink-0" 
                    style={{ backgroundColor: ring.color }} 
                  />
                  <span className="text-xs font-medium text-[var(--color-text-secondary)] truncate">
                    {ring.label}
                  </span>
                </div>
                <span className="text-xs font-bold text-[var(--color-text-primary)] shrink-0">
                  {ring.formattedValue || `${ring.value}/${ring.max} (${pct}%)`}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

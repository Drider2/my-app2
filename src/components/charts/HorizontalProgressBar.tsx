import React from 'react';

export interface HorizontalProgressBarProps {
  value: number;
  max: number;
  height?: number;
  color?: string;
  trackColor?: string;
  threshold?: number;
  labelLeft?: string;
  labelRight?: string;
  subLabel?: string;
  showLabels?: boolean;
  className?: string;
}

export const HorizontalProgressBar: React.FC<HorizontalProgressBarProps> = ({
  value,
  max,
  height = 8,
  color = 'var(--color-accent)',
  trackColor = 'var(--color-surface)',
  threshold,
  labelLeft,
  labelRight,
  subLabel,
  showLabels = true,
  className = '',
}) => {
  const safeMax = max > 0 ? max : 1;
  const clampedValue = Math.max(0, Math.min(value, safeMax));
  const percentage = Math.round((clampedValue / safeMax) * 100);

  const thresholdPct = threshold !== undefined 
    ? Math.max(0, Math.min(100, Math.round((threshold / safeMax) * 100))) 
    : null;

  return (
    <div className={`w-full flex flex-col gap-1.5 ${className}`}>
      {showLabels && (labelLeft || labelRight) && (
        <div className="flex items-center justify-between text-xs">
          {labelLeft && (
            <span className="font-semibold text-[var(--color-text-secondary)]">
              {labelLeft}
            </span>
          )}
          {labelRight && (
            <span className="font-bold text-[var(--color-text-primary)]">
              {labelRight}
            </span>
          )}
        </div>
      )}

      {/* Progress track */}
      <div 
        className="w-full rounded-full overflow-hidden relative border border-[var(--color-border)] p-0.5"
        style={{ height: height + 2, backgroundColor: trackColor }}
      >
        {/* Fill bar */}
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{
            width: `${percentage}%`,
            backgroundColor: color,
          }}
        />

        {/* Threshold marker needle */}
        {thresholdPct !== null && (
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-[var(--color-warning)] shadow-sm z-10"
            style={{ left: `${thresholdPct}%` }}
            title={`Threshold: ${threshold}`}
          />
        )}
      </div>

      {subLabel && (
        <span className="text-xs text-[var(--color-text-muted)] text-right">
          {subLabel}
        </span>
      )}
    </div>
  );
};

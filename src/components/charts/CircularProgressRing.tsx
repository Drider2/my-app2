import React from 'react';

export interface CircularProgressRingProps {
  value: number;
  max: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  trackColor?: string;
  centerContent?: React.ReactNode;
  showValueText?: boolean;
  valueSuffix?: string;
  className?: string;
}

export const CircularProgressRing: React.FC<CircularProgressRingProps> = ({
  value,
  max,
  size = 96,
  strokeWidth = 7,
  color = 'var(--color-accent)',
  trackColor = 'var(--color-border)',
  centerContent,
  showValueText = true,
  valueSuffix = '',
  className = '',
}) => {
  const safeMax = max > 0 ? max : 1;
  const clampedValue = Math.max(0, Math.min(value, safeMax));
  const percentage = Math.round((clampedValue / safeMax) * 100);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (clampedValue / safeMax) * circumference;

  return (
    <div 
      className={`relative inline-flex items-center justify-center shrink-0 ${className}`}
      style={{ width: size, height: size }}
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="rotate-[-90deg] overflow-visible"
      >
        {/* Track circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
        />
        {/* Animated fill arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          style={{
            transition: 'stroke-dashoffset 0.6s cubic-bezier(0.16, 1, 0.3, 1), stroke 0.3s ease',
          }}
        />
      </svg>

      {/* Center content slot */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-1">
        {centerContent ? (
          centerContent
        ) : showValueText ? (
          <div>
            <span className="text-sm sm:text-base font-extrabold tracking-tight text-[var(--color-text-primary)]">
              {value}
              {valueSuffix && <span className="text-xs font-semibold text-[var(--color-text-secondary)]">{valueSuffix}</span>}
            </span>
            <span className="block text-xs font-semibold text-[var(--color-text-muted)]">
              {percentage}%
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
};

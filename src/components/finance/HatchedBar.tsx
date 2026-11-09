import React from 'react';

interface HatchedBarProps {
  percentage: number; // 0..100
  height?: number; // default 16
  className?: string;
  isOverLimit?: boolean;
  glow?: boolean;
}

export const HatchedBar: React.FC<HatchedBarProps> = ({
  percentage,
  height = 16,
  className = '',
  isOverLimit = false,
  glow = true,
}) => {
  const clamped = Math.max(0, Math.min(100, isNaN(percentage) ? 0 : percentage));

  return (
    <div
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      className={`relative w-full rounded-full overflow-hidden ${className}`}
      style={{
        height: `${height}px`,
        background: 'repeating-linear-gradient(135deg, rgba(255,255,255,0.2) 0 3px, rgba(255,255,255,0.04) 3px 7px)',
      }}
    >
      <div
        className="h-full rounded-full transition-all duration-700 ease-out origin-start"
        style={{
          width: `${clamped}%`,
          background: isOverLimit
            ? '#FFFFFF'
            : 'linear-gradient(90deg, var(--accent), var(--accent-light))',
          boxShadow: isOverLimit
            ? '0 0 14px rgba(255,255,255,0.8)'
            : glow
            ? '0 0 14px rgb(var(--accent-rgb)/.6)'
            : undefined,
        }}
      />
    </div>
  );
};

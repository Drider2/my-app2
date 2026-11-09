import React from 'react';
import { Flame, Award, ShieldCheck, Zap } from 'lucide-react';

export type MilestoneBadgeType = 'prayer-streak' | 'perfect-day' | 'savings-hit' | 'workout-streak';

export interface StreakMilestoneBadgeProps {
  type: MilestoneBadgeType;
  title: string;
  subtitle: string;
  value?: string | number;
  className?: string;
}

export const StreakMilestoneBadge: React.FC<StreakMilestoneBadgeProps> = ({
  type,
  title,
  subtitle,
  value,
  className = '',
}) => {
  const renderIcon = () => {
    switch (type) {
      case 'prayer-streak':
        return <ShieldCheck className="w-5 h-5 text-[var(--accent-light)]" />;
      case 'perfect-day':
        return <Award className="w-5 h-5 text-[var(--accent-light)]" />;
      case 'workout-streak':
        return <Flame className="w-5 h-5 text-[var(--accent-light)]" />;
      case 'savings-hit':
        return <Zap className="w-5 h-5 text-[var(--accent-light)]" />;
      default:
        return <Award className="w-5 h-5 text-[var(--accent-light)]" />;
    }
  };

  return (
    <div
      className={`bg-[var(--color-card)] border border-[var(--color-border)] rounded-2xl shadow-sm p-3 flex items-center gap-3.5 select-none animate-enter ${className}`}
    >
      {/* Hexagonal Badge Icon */}
      <div className="relative w-12 h-12 flex items-center justify-center shrink-0">
        <svg viewBox="0 0 48 48" className="w-full h-full overflow-visible">
          {/* Hexagon Path */}
          <polygon
            points="24,3 45,15 45,39 24,47 3,39 3,15"
            fill="rgba(255, 255, 255, 0.05)"
            stroke="rgb(var(--accent-rgb) / 0.5)"
            strokeWidth="2"
            strokeLinejoin="round"
            style={{
              filter: 'drop-shadow(0 0 8px rgb(var(--accent-rgb) / 0.35))',
            }}
          />
        </svg>

        {/* Center Emblem Icon */}
        <div className="absolute inset-0 flex items-center justify-center animate-pop">
          {renderIcon()}
        </div>
      </div>

      {/* Description Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-1">
          <h4 className="text-[14px] font-medium text-[var(--text-1)] truncate">
            {title}
          </h4>
          {value !== undefined && (
            <span className="accent-chip text-[11px] py-0.5 px-2 shrink-0 tabular-nums">
              {value}
            </span>
          )}
        </div>
        <p className="text-[12px] text-[var(--text-2)] mt-0.5 truncate">
          {subtitle}
        </p>
      </div>
    </div>
  );
};

export default StreakMilestoneBadge;

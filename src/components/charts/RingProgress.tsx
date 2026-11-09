import React from 'react';
import { useTranslation } from '../../services/i18n';
import { AlertCircle } from 'lucide-react';

export interface RingProgressProps {
  value: number;
  max: number;
  variant?: 'hero' | 'mini' | 'custom';
  size?: number;
  strokeWidth?: number;
  icon?: React.ReactNode;
  label?: string;
  sublabel?: string;
  color?: string;
  trackColor?: string;
  pulseOnMax?: boolean;
  className?: string;
  isOverLimit?: boolean;
}

const RingProgressComponent: React.FC<RingProgressProps> = ({
  value,
  max,
  variant = 'hero',
  size: customSize,
  strokeWidth: customStrokeWidth,
  icon,
  label,
  sublabel,
  color = 'var(--accent)',
  trackColor = 'var(--track)',
  pulseOnMax = true,
  className = '',
  isOverLimit = false,
}) => {
  const { isRtl } = useTranslation();

  // Preset geometry according to specs
  let size = customSize || (variant === 'mini' ? 46 : 92);
  let strokeWidth = customStrokeWidth || (variant === 'mini' ? 4 : 7);

  const safeMax = max > 0 ? max : 1;
  const isOver = isOverLimit || value > safeMax;
  const clamped = Math.max(0, Math.min(value, safeMax));
  const ratio = isOver ? 1 : clamped / safeMax;
  const isComplete = clamped >= safeMax;

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - ratio * circumference;
  const center = size / 2;

  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 select-none ${
        isComplete && pulseOnMax && !isOver ? 'animate-pulse-glow' : ''
      } ${className}`}
      style={{ width: size, height: size }}
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-label={label || `${Math.round(ratio * 100)}%`}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="overflow-visible"
        style={{
          transform: isRtl ? 'rotate(-90deg) scaleY(-1)' : 'rotate(-90deg)',
          transformOrigin: '50% 50%',
        }}
      >
        {/* Background track */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={trackColor}
          strokeWidth={strokeWidth}
        />

        {/* Progress stroke */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={isOver ? '#FFFFFF' : color}
          strokeWidth={strokeWidth}
          strokeLinecap={isOver ? 'butt' : 'round'}
          strokeDasharray={isOver ? '3 3' : circumference}
          strokeDashoffset={isOver ? 0 : offset}
          style={{
            filter: isOver
              ? 'drop-shadow(0 0 8px rgba(255, 255, 255, 0.6))'
              : 'drop-shadow(0 0 10px rgb(var(--accent-rgb) / 0.55))',
            transition: 'stroke-dashoffset 1100ms cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        />
      </svg>

      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-0.5 pointer-events-none">
        {isOver ? (
          <div className="flex flex-col items-center justify-center text-white">
            <AlertCircle className={variant === 'mini' ? 'w-3.5 h-3.5' : 'w-5 h-5'} />
            {variant !== 'mini' && (
              <span className="text-[11px] font-medium leading-tight mt-0.5 text-white/80">!</span>
            )}
          </div>
        ) : (
          <>
            {icon && (
              <div 
                className="text-[var(--accent-light)] flex items-center justify-center"
                style={{ fontSize: variant === 'mini' ? '14px' : '18px' }}
              >
                {icon}
              </div>
            )}
            {label && (
              <span 
                className={`font-medium leading-none text-[var(--text-1)] tabular-nums ${
                  variant === 'mini' ? 'text-xs' : 'text-[22px]'
                }`}
                style={variant !== 'mini' ? { textShadow: '0 0 14px rgb(var(--accent-rgb) / 0.35)' } : undefined}
              >
                {label}
              </span>
            )}
            {sublabel && variant !== 'mini' && (
              <span className="text-[11px] font-normal text-[var(--text-2)] mt-0.5 leading-none">
                {sublabel}
              </span>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export const RingProgress = React.memo(RingProgressComponent);
export default RingProgress;

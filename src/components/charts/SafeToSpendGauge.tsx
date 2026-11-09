import React from 'react';
import { useTranslation } from '../../services/i18n';
import { AlertCircle } from 'lucide-react';

export interface SafeToSpendGaugeProps {
  spentMinor: number;
  budgetMinor: number;
  currencyLabel: string;
  size?: number;
  className?: string;
  label?: string;
}

const SafeToSpendGaugeComponent: React.FC<SafeToSpendGaugeProps> = ({
  spentMinor,
  budgetMinor,
  currencyLabel,
  className = '',
  label,
}) => {
  const { isRtl, t } = useTranslation();

  const safeBudget = budgetMinor > 0 ? budgetMinor : 1;
  const safeSpent = Math.max(0, spentMinor);
  const isOverBudget = safeSpent > safeBudget;
  const remainingMinor = Math.max(0, safeBudget - safeSpent);

  // Ratio spent: from 0 (nothing spent, full remaining) to 1 (all spent)
  const ratioSpent = isOverBudget ? 1 : Math.min(1, safeSpent / safeBudget);

  // Geometry: radius 60px, cx=70, cy=70, stroke-width 8px
  const radius = 60;
  const cx = 70;
  const cy = 70;
  const strokeWidth = 8;
  const arcLength = Math.PI * radius; // 188.495px
  const strokeOffset = arcLength - ratioSpent * arcLength;

  // Tip position (starts at 180 deg (left), moves to 0 deg (right))
  const angle = Math.PI - ratioSpent * Math.PI;
  const tipX = cx + radius * Math.cos(angle);
  const tipY = cy - radius * Math.sin(angle);

  const formatAmount = (minor: number) => {
    return Math.round(minor / 100).toLocaleString();
  };

  return (
    <div className={`relative flex flex-col items-center select-none ${className}`}>
      <svg
        width="140"
        height="85"
        viewBox="0 0 140 85"
        className="overflow-visible"
        style={{
          transform: isRtl ? 'scaleX(-1)' : 'none',
        }}
        role="meter"
        aria-valuenow={spentMinor}
        aria-valuemin={0}
        aria-valuemax={budgetMinor}
      >
        {/* Track arc (180deg to 0deg) */}
        <path
          d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
          fill="none"
          stroke="var(--track)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />

        {/* Fill arc */}
        <path
          d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
          fill="none"
          stroke={isOverBudget ? '#FFFFFF' : 'var(--accent)'}
          strokeWidth={strokeWidth}
          strokeLinecap={isOverBudget ? 'butt' : 'round'}
          strokeDasharray={isOverBudget ? '3 3' : arcLength}
          strokeDashoffset={isOverBudget ? 0 : strokeOffset}
          style={{
            filter: isOverBudget
              ? 'drop-shadow(0 0 8px rgba(255, 255, 255, 0.6))'
              : 'drop-shadow(0 0 10px rgb(var(--accent-rgb) / 0.55))',
            transition: 'stroke-dashoffset 900ms cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        />

        {/* Glowing Tip Pointer */}
        {!isOverBudget && (
          <circle
            cx={tipX}
            cy={tipY}
            r="5"
            fill="#FFFFFF"
            style={{
              filter: 'drop-shadow(0 0 8px rgb(var(--accent-rgb)))',
              transition: 'cx 900ms cubic-bezier(0.16, 1, 0.3, 1), cy 900ms cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          />
        )}
      </svg>

      {/* Center text */}
      <div className="text-center -mt-7 space-y-1">
        {isOverBudget ? (
          <div className="flex flex-col items-center">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium text-white bg-white/10 border border-white/25 shadow-[0_0_12px_rgba(255,255,255,0.3)] mb-1">
              <AlertCircle className="w-3.5 h-3.5 text-white" />
              <span>{t('finance.overBudget', 'Over budget')}</span>
            </div>
            <span className="text-2xl font-medium text-white tabular-nums">
              {formatAmount(safeSpent - safeBudget)} {currencyLabel}
            </span>
            <span className="text-[12px] text-white/70">
              {t('finance.exceededBy', 'exceeded amount')}
            </span>
          </div>
        ) : (
          <>
            <span className="text-[12px] text-[var(--text-2)] block font-normal">
              {label || t('finance.safeToSpendToday', 'Safe to spend today')}
            </span>
            <span 
              className="text-2xl font-medium text-[var(--text-1)] tabular-nums block"
              style={{ textShadow: '0 0 18px rgb(var(--accent-rgb) / 0.35)' }}
            >
              {formatAmount(remainingMinor)} <span className="text-sm font-normal text-[var(--text-2)]">{currencyLabel}</span>
            </span>
          </>
        )}
      </div>
    </div>
  );
};

export const SafeToSpendGauge = React.memo(SafeToSpendGaugeComponent);
export default SafeToSpendGauge;

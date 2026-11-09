import React from 'react';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { useTranslation } from '../../services/i18n';

export interface TrendCompareProps {
  priorLabel: string;
  priorValue: number;
  currentLabel: string;
  currentValue: number;
  unit?: string;
  isPositiveGood?: boolean; // For spending, negative delta is good; for savings/workouts, positive delta is good
  valueFormatter?: (v: number) => string;
  className?: string;
}

export const TrendCompare: React.FC<TrendCompareProps> = ({
  priorLabel,
  priorValue,
  currentLabel,
  currentValue,
  unit = '',
  isPositiveGood = false,
  valueFormatter,
  className = '',
}) => {
  const { t } = useTranslation();

  const maxVal = Math.max(1, priorValue, currentValue);
  const priorPct = Math.max(8, (priorValue / maxVal) * 100);
  const currentPct = Math.max(8, (currentValue / maxVal) * 100);

  const delta = currentValue - priorValue;
  const deltaPct = priorValue > 0 ? ((delta / priorValue) * 100).toFixed(0) : '0';

  const isGood = isPositiveGood ? delta > 0 : delta < 0;
  const isNeutral = delta === 0;

  const format = (v: number) => {
    if (valueFormatter) return valueFormatter(v);
    return `${v.toLocaleString()}${unit ? ` ${unit}` : ''}`;
  };

  return (
    <div className={`space-y-3 select-none ${className}`}>
      {/* Header with Delta Chip */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[12px] text-[var(--text-2)] block">{t('common.trend', 'Trend comparison')}</span>
          <span 
            className="text-[28px] font-medium text-[var(--text-1)] tabular-nums"
            style={{ textShadow: '0 0 14px rgb(var(--accent-rgb) / 0.25)' }}
          >
            {format(currentValue)}
          </span>
        </div>

        {/* Delta Chip (AccentChip if good, white-tinted chip if over/bad - NEVER red) */}
        <div
          className={`flex items-center gap-1 px-3 py-1 rounded-full text-[12px] font-medium ${
            isNeutral
              ? 'bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg text-[var(--color-text-secondary)] text-[var(--text-2)]'
              : isGood
              ? 'accent-chip'
              : 'text-white bg-[var(--color-surface)] border border-white/25 shadow-[0_0_10px_rgba(255,255,255,0.25)]'
          }`}
        >
          {delta > 0 ? (
            <ArrowUpRight className="w-3.5 h-3.5 stroke-[2.5]" />
          ) : delta < 0 ? (
            <ArrowDownRight className="w-3.5 h-3.5 stroke-[2.5]" />
          ) : (
            <Minus className="w-3.5 h-3.5" />
          )}
          <span className="tabular-nums">
            {delta > 0 ? '+' : ''}{deltaPct}% vs previous
          </span>
        </div>
      </div>

      {/* Comparative Vertical Bars (Gray old bar vs colored recent bar) */}
      <div className="flex items-end gap-3 h-24 pt-2 px-1">
        {/* Prior Period Bar (Gray) */}
        <div className="flex-1 flex flex-col items-center h-full justify-end">
          <span className="text-[11px] text-[var(--text-3)] mb-1 tabular-nums">
            {format(priorValue)}
          </span>
          <div className="w-full max-w-[28px] h-full flex items-end bg-[var(--track)] rounded-t-[12px] overflow-hidden">
            <div
              className="w-full rounded-t-[12px] transition-all duration-700 ease-out"
              style={{
                height: `${priorPct}%`,
                backgroundColor: 'rgba(255, 255, 255, 0.20)',
              }}
            />
          </div>
          <span className="text-[12px] text-[var(--text-2)] mt-1.5 truncate max-w-full">
            {priorLabel}
          </span>
        </div>

        {/* Current Period Bar (Glowing Accent) */}
        <div className="flex-1 flex flex-col items-center h-full justify-end">
          <span className="text-[11px] text-[var(--accent-light)] mb-1 font-medium tabular-nums">
            {format(currentValue)}
          </span>
          <div 
            className="w-full max-w-[28px] h-full flex items-end bg-[var(--track)] rounded-t-[12px] overflow-hidden"
            style={{
              border: '1px solid rgb(var(--accent-rgb) / 0.45)',
              boxShadow: '0 0 12px rgb(var(--accent-rgb) / 0.40)',
            }}
          >
            <div
              className="w-full rounded-t-[12px] transition-all duration-700 ease-out"
              style={{
                height: `${currentPct}%`,
                backgroundColor: 'var(--accent)',
              }}
            />
          </div>
          <span className="text-[12px] text-[var(--accent-light)] font-medium mt-1.5 truncate max-w-full">
            {currentLabel}
          </span>
        </div>
      </div>
    </div>
  );
};

export default TrendCompare;

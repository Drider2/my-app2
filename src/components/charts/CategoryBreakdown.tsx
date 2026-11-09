import React from 'react';
import { useTranslation } from '../../services/i18n';

export interface CategoryItem {
  id: string;
  name: string;
  amountMinor: number;
  percentage: number; // 0 to 100
}

export interface CategoryBreakdownProps {
  categories: CategoryItem[];
  totalMinor: number;
  currencyLabel: string;
  className?: string;
}

export const CategoryBreakdown: React.FC<CategoryBreakdownProps> = ({
  categories,
  totalMinor,
  currencyLabel,
  className = '',
}) => {
  const { t } = useTranslation();

  // One glowing accent color palette with subtle opacity steps
  const segmentOpacities = [
    'var(--accent)',
    'rgb(var(--accent-rgb) / 0.70)',
    'rgb(var(--accent-rgb) / 0.45)',
    'rgb(var(--accent-rgb) / 0.25)',
    'rgba(255, 255, 255, 0.20)',
  ];

  const formatAmount = (minor: number) => {
    return Math.round(minor / 100).toLocaleString();
  };

  if (!categories || categories.length === 0) {
    return (
      <div className="py-6 text-center text-[12px] text-[var(--text-3)]">
        {t('finance.noCategories', 'No expense categories recorded this period')}
      </div>
    );
  }

  return (
    <div className={`space-y-3.5 select-none ${className}`}>
      {/* Horizontal Stacked Pill Bar */}
      <div className="w-full h-3 rounded-full bg-[var(--track)] overflow-hidden flex border border-white/10">
        {categories.map((cat, idx) => {
          const color = segmentOpacities[idx % segmentOpacities.length];
          const pct = Math.max(1, cat.percentage);

          return (
            <div
              key={cat.id}
              className="h-full transition-all duration-700 ease-out"
              style={{
                width: `${pct}%`,
                backgroundColor: color,
              }}
              title={`${cat.name}: ${cat.percentage}%`}
            />
          );
        })}
      </div>

      {/* Legend & Breakdown List */}
      <div className="space-y-1.5 pt-1">
        {categories.slice(0, 5).map((cat, idx) => {
          const color = segmentOpacities[idx % segmentOpacities.length];

          return (
            <div
              key={cat.id}
              className="flex items-center justify-between py-1.5 px-2 rounded-[12px] hover:bg-white/[0.04] transition-colors"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span 
                  className="w-2.5 h-2.5 rounded-full shrink-0" 
                  style={{ backgroundColor: color }}
                />
                <span className="text-[12px] text-[var(--text-1)] font-medium truncate">
                  {cat.name}
                </span>
              </div>

              <div className="flex items-center gap-2.5 shrink-0 ms-2">
                <span className="text-[12px] text-[var(--text-2)] tabular-nums">
                  {formatAmount(cat.amountMinor)} {currencyLabel}
                </span>
                <span className="text-[12px] font-medium text-[var(--text-1)] tabular-nums w-10 text-end">
                  {cat.percentage.toFixed(0)}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CategoryBreakdown;

import React from 'react';

export interface ComparisonCategory {
  name: string;
  planned: number;
  actual: number;
  plannedColor?: string;
  actualColor?: string;
  formattedPlanned?: string;
  formattedActual?: string;
}

export interface ComparisonBarChartProps {
  categories: ComparisonCategory[];
  plannedLabel?: string;
  actualLabel?: string;
  currencySymbol?: string;
  className?: string;
}

export const ComparisonBarChart: React.FC<ComparisonBarChartProps> = ({
  categories,
  plannedLabel = 'Budget',
  actualLabel = 'Actual',
  currencySymbol = '',
  className = '',
}) => {
  return (
    <div className={`w-full flex flex-col gap-3.5 ${className}`}>
      {/* Chart Legend */}
      <div className="flex items-center justify-end gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-[var(--color-surface)] border border-[var(--color-border)]" />
          <span className="text-[var(--color-text-secondary)] font-medium">{plannedLabel}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-[var(--color-accent)]" />
          <span className="text-[var(--color-text-primary)] font-bold">{actualLabel}</span>
        </div>
      </div>

      {/* Comparison rows */}
      <div className="space-y-3">
        {categories.map((cat, idx) => {
          const maxVal = Math.max(1, cat.planned, cat.actual);
          const plannedPct = Math.min(100, (cat.planned / maxVal) * 100);
          const actualPct = Math.min(100, (cat.actual / maxVal) * 100);
          const isOver = cat.actual > cat.planned && cat.planned > 0;

          return (
            <div key={idx} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-[var(--color-text-primary)] truncate pe-2">
                  {cat.name}
                </span>
                <div className="flex items-center gap-2 text-xs shrink-0 font-medium">
                  <span className={isOver ? 'text-[var(--color-negative)] font-bold' : 'text-[var(--color-text-primary)]'}>
                    {cat.formattedActual || `${cat.actual.toLocaleString()} ${currencySymbol}`}
                  </span>
                  <span className="text-[var(--color-text-muted)]">/</span>
                  <span className="text-[var(--color-text-secondary)]">
                    {cat.formattedPlanned || `${cat.planned.toLocaleString()} ${currencySymbol}`}
                  </span>
                </div>
              </div>

              {/* Paired thin bars */}
              <div className="space-y-1">
                {/* Planned bar */}
                <div className="w-full h-2 rounded-full bg-[var(--color-surface)] overflow-hidden border border-[var(--color-border)] p-0.5">
                  <div
                    className="h-full rounded-full transition-all duration-400"
                    style={{
                      width: `${plannedPct}%`,
                      backgroundColor: cat.plannedColor || 'var(--color-border)',
                    }}
                  />
                </div>
                {/* Actual bar */}
                <div className="w-full h-2 rounded-full bg-[var(--color-surface)] overflow-hidden border border-[var(--color-border)] p-0.5">
                  <div
                    className="h-full rounded-full transition-all duration-400"
                    style={{
                      width: `${actualPct}%`,
                      backgroundColor: isOver 
                        ? 'var(--color-negative)' 
                        : (cat.actualColor || 'var(--color-accent)'),
                    }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

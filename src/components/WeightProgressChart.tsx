import React, { useState } from 'react';
import { BodyweightEntry } from '../types';
import { AreaCurve } from './charts/AreaCurve';

interface WeightProgressChartProps {
  entries: BodyweightEntry[];
  onOpenLogModal: () => void;
}

export type TimeRange = '7d' | '30d' | '90d' | '1y' | 'all';

export const WeightProgressChart: React.FC<WeightProgressChartProps> = ({
  entries,
  onOpenLogModal,
}) => {
  const [range, setRange] = useState<TimeRange>('7d');

  const sorted = [...entries]
    .filter(e => !e.deleted_at)
    .sort((a, b) => a.local_date.localeCompare(b.local_date));

  // Filter based on range
  const filtered = sorted.slice(range === '7d' ? -7 : range === '30d' ? -30 : range === '90d' ? -90 : 0);

  if (filtered.length === 0) {
    return (
      <div className="bg-[var(--color-surface)] rounded-3xl p-6 border border-[var(--color-border)] text-center space-y-2">
        <p className="text-xs text-[var(--color-text-secondary)]">No weight history recorded yet.</p>
        <button
          onClick={onOpenLogModal}
          className="px-3 py-1.5 bg-[var(--color-accent)] text-[var(--color-accent-contrast)] text-xs font-bold rounded-xl "
        >
          Record First Weigh-in
        </button>
      </div>
    );
  }

  const curveData = filtered.map((e, idx) => {
    const windowStart = Math.max(0, idx - 6);
    const windowEntries = filtered.slice(windowStart, idx + 1);
    const avg = windowEntries.reduce((acc, curr) => acc + curr.weight_kg, 0) / windowEntries.length;

    return {
      label: e.local_date.slice(5),
      date: e.local_date,
      value: e.weight_kg,
      secondaryValue: parseFloat(avg.toFixed(1)),
    };
  });

  return (
    <div className="card-hero p-5 space-y-3.5">
      {/* Header & Range Selector */}
      <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-2.5">
        <div>
          <span className="text-caption font-bold text-[var(--color-text-muted)]">
            Weight History
          </span>
          <h2 className="text-xs font-semibold text-[var(--color-text-primary)]">Progress & Moving Avg</h2>
        </div>

        {/* Range Tabs */}
        <div className="flex bg-[var(--color-surface-subtle)] p-0.5 rounded-xl border border-[var(--color-border)] text-xs">
          {(['7d', '30d', '90d', 'all'] as TimeRange[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all tap-feedback ${
                range === r
                  ? 'bg-[var(--color-accent)] text-[var(--color-accent-contrast)] shadow-sm'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Kinetic AreaCurve Graph */}
      <div className="w-full relative py-1">
        <AreaCurve
          data={curveData}
          height={140}
          valueSuffix=" kg"
          showMovingAverage={true}
        />
      </div>

      {/* Footer Info */}
      <div className="flex items-center justify-between text-caption text-[var(--color-text-secondary)] pt-1 border-t border-[var(--color-border)]">
        <span>Dashed line: 7-day moving average</span>
        <span className="font-semibold text-[var(--color-accent)] tabular-nums">
          Latest: {filtered[filtered.length - 1]?.weight_kg} kg
        </span>
      </div>
    </div>
  );
};

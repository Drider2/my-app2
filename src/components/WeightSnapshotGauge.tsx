import React from 'react';
import { TrendingDown, TrendingUp, Minus, Calendar } from 'lucide-react';
import { BodyweightEntry } from '../types';

interface WeightSnapshotGaugeProps {
  currentWeight: number;
  previousWeight?: number | null;
  lastDate?: string;
  targetWeight?: number | null;
  onOpenLogModal: () => void;
}

export const WeightSnapshotGauge: React.FC<WeightSnapshotGaugeProps> = ({
  currentWeight,
  previousWeight,
  lastDate,
  targetWeight,
  onOpenLogModal,
}) => {
  const weightChange = previousWeight !== undefined && previousWeight !== null 
    ? Math.round((currentWeight - previousWeight) * 10) / 10 
    : 0;

  // Calculate arc gauge angle if target is configured
  // e.g. Start at 82, target 75, current 78.4
  let progressRatio = 0.65;
  if (targetWeight && previousWeight) {
    const totalDist = Math.abs(82 - targetWeight);
    const currDist = Math.abs(currentWeight - targetWeight);
    progressRatio = Math.max(0.1, Math.min(1.0, 1 - (currDist / (totalDist || 1))));
  }

  // SVG Arc Calculation (180-degree semi-circle gauge)
  const radius = 64;
  const strokeWidth = 9;
  const circumference = Math.PI * radius; // Half-circle
  const strokeDashoffset = circumference * (1 - progressRatio);

  return (
    <div className="bg-[var(--color-surface)] rounded-3xl p-5 border border-[var(--color-border)]  space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-2.5">
        <div>
          <span className="text-xs font-bold text-[var(--color-text-muted)]">
            Body-Weight Snapshot
          </span>
          <h2 className="text-xs font-semibold text-[var(--color-text-primary)]">
            Weight Measurement & Trend
          </h2>
        </div>
        <button
          onClick={onOpenLogModal}
          className="px-2.5 py-1 rounded-xl bg-[#222C24] hover:bg-[#2A342C] border border-[var(--color-border)] text-[var(--color-accent)] text-xs font-bold transition-all tap-feedback"
        >
          + Log Weight
        </button>
      </div>

      {/* Skulpt-Style Circular / Arc Gauge Visualizer */}
      <div className="flex flex-col items-center justify-center pt-1">
        <div className="relative w-48 h-28 flex flex-col items-center justify-end">
          <svg className="w-48 h-32 overflow-visible" viewBox="0 0 160 90">
            {/* Background Arc Track */}
            <path
              d="M 16 80 A 64 64 0 0 1 144 80"
              fill="none"
              stroke="#2A342C"
              strokeWidth={strokeWidth}
              strokeLinecap="round"
            />
            {/* Active Progress Arc */}
            <path
              d="M 16 80 A 64 64 0 0 1 144 80"
              fill="none"
              stroke="#A6D96A"
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className="transition-all duration-700 ease-out"
            />
          </svg>

          {/* Central Values */}
          <div className="absolute bottom-1 flex flex-col items-center">
            <span className="text-xs font-bold text-[var(--color-text-muted)]">
              Current Weight
            </span>
            <div className="text-3xl font-black text-[var(--color-text-primary)] tracking-tight flex items-baseline gap-1">
              {currentWeight}
              <span className="text-sm font-semibold text-[var(--color-accent)]">kg</span>
            </div>
          </div>
        </div>

        {/* Change Metrics Beneath Gauge */}
        <div className="grid grid-cols-2 gap-3 w-full pt-3 mt-1 border-t border-[var(--color-border)]">
          <div className="p-2.5 rounded-2xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] text-center">
            <span className="text-xs text-[var(--color-text-muted)]">Previous Record</span>
            <div className="text-xs font-bold text-[var(--color-text-primary)] mt-0.5">
              {previousWeight ? `${previousWeight} kg` : 'First entry'}
            </div>
          </div>

          <div className="p-2.5 rounded-2xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] text-center">
            <span className="text-xs text-[var(--color-text-muted)]">Weight Change</span>
            <div className="flex items-center justify-center gap-1 text-xs font-bold mt-0.5">
              {weightChange < 0 ? (
                <span className="text-[#8BCB83] flex items-center gap-0.5">
                  <TrendingDown className="w-3.5 h-3.5" />
                  {weightChange} kg
                </span>
              ) : weightChange > 0 ? (
                <span className="text-[#D6AD68] flex items-center gap-0.5">
                  <TrendingUp className="w-3.5 h-3.5" />
                  +{weightChange} kg
                </span>
              ) : (
                <span className="text-[var(--color-text-secondary)] flex items-center gap-0.5">
                  <Minus className="w-3.5 h-3.5" />
                  0.0 kg
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Target or Last Date Information */}
        <div className="w-full flex items-center justify-between text-xs text-[var(--color-text-muted)] pt-2 px-1">
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3 text-[var(--color-accent)]" />
            Measured: {lastDate || 'Today'}
          </span>
          {targetWeight && (
            <span className="font-semibold text-[var(--color-accent)]">
              Goal: {targetWeight} kg ({Math.abs(Math.round((currentWeight - targetWeight) * 10) / 10)} kg left)
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

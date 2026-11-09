import React from 'react';

export interface SegmentedProgressBarProps {
  totalSegments: number;
  filledSegments: number;
  color?: string;
  inactiveColor?: string;
  height?: number;
  gap?: number;
  labels?: string[];
  onSegmentClick?: (index: number) => void;
  className?: string;
}

export const SegmentedProgressBar: React.FC<SegmentedProgressBarProps> = ({
  totalSegments,
  filledSegments,
  color = 'var(--color-accent)',
  inactiveColor = 'var(--color-surface)',
  height = 8,
  gap = 3,
  labels,
  onSegmentClick,
  className = '',
}) => {
  const segments = Array.from({ length: totalSegments }, (_, i) => i < filledSegments);

  return (
    <div className={`w-full flex flex-col gap-1 ${className}`}>
      <div 
        className="w-full flex items-center"
        style={{ gap: `${gap}px` }}
      >
        {segments.map((isFilled, idx) => (
          <div
            key={idx}
            onClick={() => onSegmentClick && onSegmentClick(idx)}
            className={`flex-1 rounded-full transition-all duration-300 border border-[var(--color-border)] ${
              onSegmentClick ? 'cursor-pointer hover:opacity-80' : ''
            }`}
            style={{
              height: `${height}px`,
              backgroundColor: isFilled ? color : inactiveColor,
            }}
          />
        ))}
      </div>

      {labels && labels.length === totalSegments && (
        <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)] font-semibold px-0.5">
          {labels.map((lbl, idx) => (
            <span key={idx} className="truncate text-center flex-1">
              {lbl}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

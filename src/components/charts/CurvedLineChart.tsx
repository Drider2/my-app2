import React, { useState } from 'react';

export interface LineChartPoint {
  label: string;
  value: number;
  secondaryValue?: number;
}

export interface CurvedLineChartProps {
  data: LineChartPoint[];
  height?: number;
  color?: string;
  secondaryColor?: string;
  fillGradient?: boolean;
  showPoints?: boolean;
  showGrid?: boolean;
  valuePrefix?: string;
  valueSuffix?: string;
  thresholdLine?: number;
  className?: string;
}

export const CurvedLineChart: React.FC<CurvedLineChartProps> = ({
  data,
  height = 140,
  color = 'var(--color-accent)',
  secondaryColor = 'var(--color-positive)',
  fillGradient = true,
  showPoints = true,
  showGrid = true,
  valuePrefix = '',
  valueSuffix = '',
  thresholdLine,
  className = '',
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <div 
        className={`w-full flex items-center justify-center text-xs text-[var(--color-text-muted)] border border-dashed border-[var(--color-border)] rounded-2xl ${className}`}
        style={{ height }}
      >
        No chart data available
      </div>
    );
  }

  const paddingX = 24;
  const paddingY = 20;
  const chartWidth = 320;
  const chartHeight = height;

  const values = data.map(d => d.value);
  if (thresholdLine !== undefined) values.push(thresholdLine);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const range = maxVal - minVal > 0 ? maxVal - minVal : 1;

  const points = data.map((d, i) => {
    const x = paddingX + (i / Math.max(1, data.length - 1)) * (chartWidth - paddingX * 2);
    const y = chartHeight - paddingY - ((d.value - minVal) / range) * (chartHeight - paddingY * 2);
    return { x, y, ...d };
  });

  // Calculate smooth cubic Bezier path
  const createSmoothPath = (pts: { x: number; y: number }[]) => {
    if (pts.length === 0) return '';
    if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;

    let path = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const current = pts[i];
      const next = pts[i + 1];
      const controlX1 = current.x + (next.x - current.x) / 2;
      const controlY1 = current.y;
      const controlX2 = current.x + (next.x - current.x) / 2;
      const controlY2 = next.y;
      path += ` C ${controlX1} ${controlY1}, ${controlX2} ${controlY2}, ${next.x} ${next.y}`;
    }
    return path;
  };

  const linePath = createSmoothPath(points);
  const firstPt = points[0];
  const lastPt = points[points.length - 1];
  const areaPath = `${linePath} L ${lastPt.x} ${chartHeight - paddingY} L ${firstPt.x} ${chartHeight - paddingY} Z`;

  const gradientId = `chart-grad-${Math.random().toString(36).substring(2, 9)}`;

  return (
    <div className={`w-full relative flex flex-col ${className}`}>
      {/* Tooltip header */}
      <div className="flex items-center justify-between text-xs mb-1.5 px-1">
        <span className="text-[var(--color-text-secondary)]">
          {hoveredIdx !== null ? data[hoveredIdx].label : 'Trajectory'}
        </span>
        <span className="font-extrabold text-[var(--color-text-primary)]">
          {hoveredIdx !== null 
            ? `${valuePrefix}${data[hoveredIdx].value.toLocaleString()}${valueSuffix}`
            : `${valuePrefix}${data[data.length - 1].value.toLocaleString()}${valueSuffix}`
          }
        </span>
      </div>

      <div className="w-full relative overflow-hidden" style={{ height: chartHeight }}>
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          className="w-full h-full overflow-visible"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.25" />
              <stop offset="100%" stopColor={color} stopOpacity="0.00" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {showGrid && (
            <g stroke="var(--color-border)" strokeWidth="1" strokeDasharray="3 3">
              <line x1={paddingX} y1={paddingY} x2={chartWidth - paddingX} y2={paddingY} />
              <line x1={paddingX} y1={chartHeight / 2} x2={chartWidth - paddingX} y2={chartHeight / 2} />
              <line x1={paddingX} y1={chartHeight - paddingY} x2={chartWidth - paddingX} y2={chartHeight - paddingY} />
            </g>
          )}

          {/* Threshold reference line */}
          {thresholdLine !== undefined && (
            <line
              x1={paddingX}
              y1={chartHeight - paddingY - ((thresholdLine - minVal) / range) * (chartHeight - paddingY * 2)}
              x2={chartWidth - paddingX}
              y2={chartHeight - paddingY - ((thresholdLine - minVal) / range) * (chartHeight - paddingY * 2)}
              stroke="var(--color-warning)"
              strokeWidth="1.2"
              strokeDasharray="4 2"
            />
          )}

          {/* Area gradient */}
          {fillGradient && (
            <path d={areaPath} fill={`url(#${gradientId})`} />
          )}

          {/* Smooth line */}
          <path
            d={linePath}
            fill="none"
            stroke={color}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data point markers */}
          {showPoints && points.map((pt, i) => (
            <circle
              key={i}
              cx={pt.x}
              cy={pt.y}
              r={hoveredIdx === i ? 5 : 3}
              fill="var(--color-card)"
              stroke={color}
              strokeWidth="2"
              className="cursor-pointer transition-all duration-150"
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
              onClick={() => setHoveredIdx(i)}
            />
          ))}
        </svg>
      </div>

      {/* Bottom X-Axis labels */}
      <div className="flex justify-between items-center text-xs text-[var(--color-text-muted)] pt-1 px-2 border-t border-[var(--color-border)]">
        <span>{data[0]?.label}</span>
        {data.length > 2 && <span>{data[Math.floor(data.length / 2)]?.label}</span>}
        <span>{data[data.length - 1]?.label}</span>
      </div>
    </div>
  );
};

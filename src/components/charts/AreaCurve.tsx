import React, { useState, useRef, useId, useMemo } from 'react';
import { useTranslation } from '../../services/i18n';

export interface AreaCurvePoint {
  label: string;
  value: number;
  date?: string;
  secondaryValue?: number;
}

export interface AreaCurveProps {
  data: AreaCurvePoint[];
  height?: number;
  color?: string;
  secondaryColor?: string;
  valuePrefix?: string;
  valueSuffix?: string;
  valueFormatter?: (v: number) => string;
  showMovingAverage?: boolean;
  className?: string;
}

const AreaCurveComponent: React.FC<AreaCurveProps> = ({
  data,
  height = 160,
  color = 'var(--accent)',
  secondaryColor = 'var(--accent-light)',
  valuePrefix = '',
  valueSuffix = '',
  valueFormatter,
  showMovingAverage = false,
  className = '',
}) => {
  const { isRtl } = useTranslation();
  const rawId = useId();
  const gradId = `area-grad-${rawId.replace(/:/g, '')}`;
  const svgRef = useRef<SVGSVGElement | null>(null);

  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const paddingX = 20;
  const paddingY = 24;
  const chartWidth = 340;
  const chartHeight = height;

  const validData = useMemo(() => {
    return data && data.length > 0 ? data : [];
  }, [data]);

  const { points, secPoints } = useMemo(() => {
    if (validData.length === 0) {
      return { points: [], secPoints: [], minVal: 0, maxVal: 1 };
    }

    const allValues = validData.map(d => d.value);
    if (showMovingAverage) {
      validData.forEach(d => {
        if (d.secondaryValue !== undefined) allValues.push(d.secondaryValue);
      });
    }

    const min = Math.min(...allValues);
    const max = Math.max(...allValues);
    const range = max - min > 0 ? max - min : 1;

    const pts = validData.map((d, i) => {
      const x = paddingX + (i / Math.max(1, validData.length - 1)) * (chartWidth - paddingX * 2);
      const y = chartHeight - paddingY - ((d.value - min) / range) * (chartHeight - paddingY * 2);
      return { ...d, x, y };
    });

    const secPts = showMovingAverage
      ? validData
          .filter(d => d.secondaryValue !== undefined)
          .map((d, i) => {
            const x = paddingX + (i / Math.max(1, validData.length - 1)) * (chartWidth - paddingX * 2);
            const y = chartHeight - paddingY - (((d.secondaryValue as number) - min) / range) * (chartHeight - paddingY * 2);
            return { x, y };
          })
      : [];

    return { points: pts, secPoints: secPts, minVal: min, maxVal: max };
  }, [validData, chartHeight, showMovingAverage]);

  // Monotone cubic spline path generator
  const createSmoothPath = (pts: { x: number; y: number }[]) => {
    if (pts.length === 0) return '';
    if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;

    let path = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i === 0 ? i : i - 1];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[i + 2] || p2;

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }
    return path;
  };

  const linePath = useMemo(() => createSmoothPath(points), [points]);
  const secLinePath = useMemo(() => createSmoothPath(secPoints), [secPoints]);

  const areaPath = useMemo(() => {
    if (points.length < 2) return '';
    const bottomY = chartHeight - paddingY;
    return `${linePath} L ${points[points.length - 1].x} ${bottomY} L ${points[0].x} ${bottomY} Z`;
  }, [linePath, points, chartHeight, paddingY]);

  // Interactive scrubber pointer handler
  const handlePointer = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!svgRef.current || points.length === 0) return;
    const rect = svgRef.current.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clientX / rect.width));
    const idx = Math.round(ratio * (points.length - 1));
    setActiveIndex(idx);
  };

  const handlePointerLeave = () => {
    setActiveIndex(null);
  };

  if (validData.length === 0) {
    return (
      <div
        className={`w-full flex items-center justify-center text-[12px] text-[var(--text-3)] border border-dashed border-[var(--hairline)] rounded-2xl ${className}`}
        style={{ height }}
      >
        No trend data available
      </div>
    );
  }

  const activePoint = activeIndex !== null ? points[activeIndex] : null;
  const formatVal = (v: number) => {
    if (valueFormatter) return valueFormatter(v);
    return `${valuePrefix}${v.toLocaleString()}${valueSuffix}`;
  };

  return (
    <div className={`relative w-full select-none ${className}`}>
      {/* Floating Scrubber Value Chip */}
      {activePoint && (
        <div
          className="absolute -top-3 z-20 px-2.5 py-1 rounded-full bg-[rgb(var(--accent-rgb)/0.2)] border border-[rgb(var(--accent-rgb)/0.5)] shadow-[0_0_14px_rgb(var(--accent-rgb)/0.4)] text-[12px] font-medium flex items-center gap-1.5 transition-all pointer-events-none "
          style={{
            left: `${(activePoint.x / chartWidth) * 100}%`,
            transform: 'translateX(-50%)',
          }}
        >
          <span className="text-[var(--text-2)]">{activePoint.date || activePoint.label}:</span>
          <span className="text-[var(--accent-light)] tabular-nums font-medium">{formatVal(activePoint.value)}</span>
        </div>
      )}

      {/* SVG Canvas */}
      <svg
        ref={svgRef}
        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
        className="w-full h-auto overflow-visible cursor-crosshair touch-none"
        onPointerMove={handlePointer}
        onPointerDown={handlePointer}
        onPointerLeave={handlePointerLeave}
        onPointerUp={handlePointerLeave}
      >
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgb(var(--accent-rgb))" stopOpacity="0.25" />
            <stop offset="100%" stopColor="rgb(var(--accent-rgb))" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Shaded Area Fill */}
        <path d={areaPath} fill={`url(#${gradId})`} />

        {/* Secondary Moving Average Line (if active) */}
        {showMovingAverage && secLinePath && (
          <path
            d={secLinePath}
            fill="none"
            stroke={secondaryColor}
            strokeWidth="1.5"
            strokeDasharray="4 3"
            opacity="0.6"
          />
        )}

        {/* Main Monotone Spline */}
        <path
          d={linePath}
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            filter: 'drop-shadow(0 0 6px rgb(var(--accent-rgb) / 0.45))',
          }}
        />

        {/* Scrubber Guide Line & Dot */}
        {activePoint && (
          <g>
            <line
              x1={activePoint.x}
              y1={paddingY}
              x2={activePoint.x}
              y2={chartHeight - paddingY}
              stroke="var(--accent)"
              strokeWidth="1"
              strokeDasharray="3 3"
              opacity="0.8"
            />
            <circle
              cx={activePoint.x}
              cy={activePoint.y}
              r="5"
              fill="#FFFFFF"
              stroke="var(--accent)"
              strokeWidth="2"
              style={{
                filter: 'drop-shadow(0 0 8px rgb(var(--accent-rgb)))',
              }}
            />
          </g>
        )}
      </svg>

      {/* Baseline Date Labels */}
      <div className="flex items-center justify-between text-[12px] text-[var(--text-3)] px-1 mt-1">
        <span>{validData[0]?.label || ''}</span>
        {validData.length > 2 && (
          <span>{validData[Math.floor(validData.length / 2)]?.label || ''}</span>
        )}
        <span>{validData[validData.length - 1]?.label || ''}</span>
      </div>
    </div>
  );
};

export const AreaCurve = React.memo(AreaCurveComponent);
export default AreaCurve;

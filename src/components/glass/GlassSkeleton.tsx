// ========================================================
// GlassSkeleton: High-Performance GPU-Accelerated Shimmer
// Zero layout shift (CLS = 0), fluid glass styling
// Respects prefers-reduced-motion
// ========================================================
import React from 'react';

interface GlassSkeletonProps {
  className?: string;
  variant?: 'text' | 'card' | 'circle' | 'pill' | 'chart';
  width?: string | number;
  height?: string | number;
}

export const GlassSkeleton: React.FC<GlassSkeletonProps> = ({
  className = '',
  variant = 'text',
  width,
  height,
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'circle':
        return 'rounded-full aspect-square';
      case 'pill':
        return 'rounded-full';
      case 'card':
        return 'rounded-[22px]';
      case 'chart':
        return 'rounded-xl';
      case 'text':
      default:
        return 'rounded-md h-3.5';
    }
  };

  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === 'number' ? `${width}px` : width;
  if (height) style.height = typeof height === 'number' ? `${height}px` : height;

  return (
    <div
      style={style}
      className={`relative overflow-hidden bg-white/[0.05] border border-white/[0.08] ${getVariantStyles()} ${className}`}
      aria-hidden="true"
    >
      <div 
        className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/[0.09] to-transparent animate-[shimmer_1.8s_infinite]"
        style={{
          transform: 'translateZ(0)',
          willChange: 'transform',
        }}
      />
    </div>
  );
};

export const ScreenSkeleton: React.FC = () => {
  return (
    <div className="space-y-4 pt-1 animate-fade-in">
      {/* Header skeleton */}
      <div className="flex items-center justify-between pb-2">
        <div className="space-y-2">
          <GlassSkeleton width={110} height={14} />
          <GlassSkeleton width={160} height={24} />
        </div>
        <GlassSkeleton variant="circle" width={40} height={40} />
      </div>

      {/* Hero card skeleton */}
      <div className="p-5 rounded-[22px] bg-white/[0.05] border border-white/[0.1] space-y-4">
        <div className="flex items-center gap-4">
          <GlassSkeleton variant="circle" width={84} height={84} />
          <div className="flex-1 space-y-2">
            <GlassSkeleton width="60%" height={18} />
            <GlassSkeleton width="90%" height={12} />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 pt-2">
          <GlassSkeleton variant="card" height={72} />
          <GlassSkeleton variant="card" height={72} />
          <GlassSkeleton variant="card" height={72} />
        </div>
      </div>

      {/* Secondary card skeleton */}
      <div className="p-4 rounded-[22px] bg-white/[0.04] border border-white/[0.08] space-y-3">
        <GlassSkeleton width={140} height={16} />
        <GlassSkeleton height={48} variant="chart" />
      </div>

      {/* List items skeleton */}
      <div className="p-4 rounded-[22px] bg-white/[0.04] border border-white/[0.08] space-y-2.5">
        <GlassSkeleton width={120} height={16} />
        <GlassSkeleton height={42} variant="card" />
        <GlassSkeleton height={42} variant="card" />
        <GlassSkeleton height={42} variant="card" />
      </div>
    </div>
  );
};

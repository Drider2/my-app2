import React from 'react';

export interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'card' | 'circle' | 'pill' | 'chart';
  width?: string | number;
  height?: string | number;
}

export const Skeleton: React.FC<SkeletonProps> = ({
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
      className={`relative overflow-hidden bg-[var(--color-surface)] border border-[var(--color-border)] ${getVariantStyles()} ${className}`}
      aria-hidden="true"
    >
      <div 
        className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-[var(--color-card)] to-transparent animate-[shimmer_1.8s_infinite]"
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
    <div className="w-full flex flex-col gap-4 py-4 animate-enter" aria-label="Loading content">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between pb-2">
        <div className="flex flex-col gap-2">
          <Skeleton variant="text" width={140} height={24} />
          <Skeleton variant="text" width={200} height={14} />
        </div>
        <Skeleton variant="circle" width={40} height={40} />
      </div>

      {/* Hero / Overview Card */}
      <div className="p-5 rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] shadow-xs flex flex-col gap-3">
        <Skeleton variant="text" width={100} height={14} />
        <Skeleton variant="text" width={180} height={32} />
        <Skeleton variant="pill" height={10} className="w-full mt-2" />
      </div>

      {/* Secondary Metrics Grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-4 rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] flex flex-col gap-2">
          <Skeleton variant="text" width={60} height={12} />
          <Skeleton variant="text" width={90} height={20} />
        </div>
        <div className="p-4 rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] flex flex-col gap-2">
          <Skeleton variant="text" width={60} height={12} />
          <Skeleton variant="text" width={90} height={20} />
        </div>
      </div>

      {/* Main List / Feed Skeleton */}
      <div className="flex flex-col gap-2.5 mt-2">
        <div className="p-4 rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton variant="circle" width={32} height={32} />
            <div className="flex flex-col gap-1.5">
              <Skeleton variant="text" width={120} height={14} />
              <Skeleton variant="text" width={70} height={11} />
            </div>
          </div>
          <Skeleton variant="text" width={40} height={16} />
        </div>
        <div className="p-4 rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton variant="circle" width={32} height={32} />
            <div className="flex flex-col gap-1.5">
              <Skeleton variant="text" width={140} height={14} />
              <Skeleton variant="text" width={80} height={11} />
            </div>
          </div>
          <Skeleton variant="text" width={40} height={16} />
        </div>
      </div>
    </div>
  );
};

export default Skeleton;

import React from 'react';

interface GlassChipProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  active?: boolean;
}

export const GlassChip: React.FC<GlassChipProps> = ({
  children,
  className = '',
  onClick,
  active = false,
  ...rest
}) => {
  return (
    <div
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl border transition-all duration-150 ${
        active 
          ? 'bg-[var(--color-accent)] text-[var(--color-bg)] font-bold border-[var(--color-accent)] shadow-xs' 
          : 'bg-[var(--color-surface)] text-[var(--color-text-secondary)] border-[var(--color-border)] hover:text-[var(--color-text-primary)]'
      } ${onClick ? 'cursor-pointer active:scale-[0.96]' : ''} ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
};

export const GlassTile: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className = '',
  onClick,
  ...rest
}) => {
  return (
    <div
      onClick={onClick}
      className={`p-3 rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] shadow-xs transition-all duration-150 ${onClick ? 'cursor-pointer active:scale-[0.97]' : ''} ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
};

export default GlassChip;

import React from 'react';

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  variant?: 'default' | 'tile';
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className = '',
  onClick,
  variant = 'default',
  ...rest
}) => {
  const baseClasses = variant === 'tile'
    ? 'bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-xs'
    : 'bg-[var(--color-card)] border border-[var(--color-border)] rounded-2xl shadow-sm';

  return (
    <div
      onClick={onClick}
      className={`${baseClasses} p-4 transition-all duration-200 ${onClick ? 'cursor-pointer active:scale-[0.98]' : ''} ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
};

export default GlassCard;

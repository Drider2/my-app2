import React from 'react';

export interface AccentChipProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  icon?: React.ReactNode;
  variant?: 'accent' | 'white';
}

export const AccentChip: React.FC<AccentChipProps> = ({
  children,
  className = '',
  icon,
  variant = 'accent',
  ...rest
}) => {
  const isWhite = variant === 'white';
  
  return (
    <div
      className={`inline-flex items-center gap-1.5 px-[11px] py-[4px] rounded-full text-[12px] font-medium transition-all ${
        isWhite
          ? 'text-[var(--color-text-primary)] bg-[var(--color-surface)] border border-[var(--color-border)] shadow-xs'
          : 'text-[var(--color-accent)] bg-[var(--color-surface)] border border-[var(--color-border)] shadow-xs font-semibold'
      } ${className}`}
      {...rest}
    >
      {icon && <span className="inline-flex shrink-0">{icon}</span>}
      <span>{children}</span>
    </div>
  );
};

export default AccentChip;

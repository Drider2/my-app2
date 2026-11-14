import React from 'react';

export interface PageProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  disableBottomNavPadding?: boolean;
}

/**
 * <Page> is the unified responsive container primitive for GreenDream screens.
 * Automatically respects the three layout sizes (Phone, Wide, Tablet) via CSS tokens:
 * - max-w-[var(--page-max)] (430px / 760px / 1280px)
 * - px-[var(--gutter)] (14px / 20px / 28px)
 * - pb-[var(--nav-total-clearance)] on phone & wide; tablet:pb-10 on tablet
 */
export const Page: React.FC<PageProps> = ({
  children,
  className = '',
  disableBottomNavPadding = false,
  ...rest
}) => {
  return (
    <div
      className={`w-full max-w-[var(--page-max)] mx-auto px-[var(--gutter)] py-3 sm:py-5 ${
        disableBottomNavPadding
          ? ''
          : 'pb-[var(--nav-total-clearance)] tablet:pb-10'
      } ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
};

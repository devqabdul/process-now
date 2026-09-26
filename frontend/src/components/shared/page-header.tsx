import type { ReactNode } from 'react';

import { cn } from '@lib/cn';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  // Primary action(s) for the screen, right-aligned on desktop.
  actions?: ReactNode;
  // Phones drop a tagline subtitle to save height; set this when it carries data (a period).
  subtitleOnPhone?: boolean;
  className?: string;
}

export const PageHeader = ({
  title,
  subtitle,
  actions,
  subtitleOnPhone = false,
  className,
}: PageHeaderProps) => (
  <header
    className={cn(
      'flex flex-wrap items-center justify-between gap-x-3.5 gap-y-2.5 lg:items-start',
      className,
    )}
  >
    <div className="min-w-0">
      <h1 className="text-xl font-bold tracking-[-0.02em] lg:text-[26px]">{title}</h1>
      {subtitle && (
        <p
          className={cn(
            'mt-0.5 text-xs text-fg-subtle lg:mt-1.25 lg:block lg:text-13',
            !subtitleOnPhone && 'hidden',
          )}
        >
          {subtitle}
        </p>
      )}
    </div>
    {actions && <div className="flex flex-none flex-wrap items-center gap-2">{actions}</div>}
  </header>
);

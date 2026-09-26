import type { ReactNode } from 'react';

import { cn } from '@lib/cn';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  // Primary action(s) for the screen, right-aligned on desktop.
  actions?: ReactNode;
  className?: string;
}

export const PageHeader = ({ title, subtitle, actions, className }: PageHeaderProps) => (
  <header className={cn('flex flex-wrap items-start justify-between gap-3.5', className)}>
    <div className="min-w-0">
      <h1 className="text-[22px] font-bold tracking-[-0.02em] lg:text-[26px]">{title}</h1>
      {subtitle && <p className="mt-1.25 text-13 text-fg-subtle">{subtitle}</p>}
    </div>
    {actions && <div className="flex flex-none flex-wrap items-center gap-2">{actions}</div>}
  </header>
);

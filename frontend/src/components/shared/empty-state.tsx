import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '@lib/cn';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  // Why it's empty and what to do next.
  description?: string;
  action?: ReactNode;
  className?: string;
}

export const EmptyState = ({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) => (
  <div className={cn('flex flex-col items-center gap-3 px-5 py-11 text-center', className)}>
    {Icon && (
      <span className="grid size-11 place-items-center rounded-13 bg-surface-muted text-fg-subtle">
        <Icon aria-hidden="true" className="size-4.75" strokeWidth={1.6} />
      </span>
    )}
    <div>
      <p className="text-sm font-semibold">{title}</p>
      {description && (
        <p className="mt-1 max-w-[340px] text-xs leading-[1.55] text-fg-subtle">{description}</p>
      )}
    </div>
    {action}
  </div>
);

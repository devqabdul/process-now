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

// The one "nothing here" shape: the screen's own icon inside soft rings, a plain title, a next step.
export const EmptyState = ({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) => (
  <div className={cn('flex flex-col items-center gap-4 px-6 py-14 text-center', className)}>
    {Icon && (
      <span
        aria-hidden="true"
        className="grid size-24 place-items-center rounded-full bg-surface-subtle ring-1 ring-line-subtle"
      >
        <span className="grid size-16 place-items-center rounded-full bg-surface-muted ring-1 ring-line-subtle">
          <span className="grid size-10 animate-pop place-items-center rounded-12 bg-surface text-fg-secondary shadow-card ring-1 ring-line">
            <Icon className="size-5" strokeWidth={1.7} />
          </span>
        </span>
      </span>
    )}
    <div>
      <p className="text-base font-semibold tracking-[-0.01em]">{title}</p>
      {description && (
        <p className="mx-auto mt-1.5 max-w-sm text-13 leading-[1.55] text-fg-subtle">
          {description}
        </p>
      )}
    </div>
    {action}
  </div>
);

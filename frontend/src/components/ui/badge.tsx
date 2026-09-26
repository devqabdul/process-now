import type { ReactNode } from 'react';

import { cn } from '@lib/cn';

export type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'violet';

const TONES: Record<BadgeTone, string> = {
  neutral: 'bg-surface-muted text-fg-muted',
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  danger: 'bg-danger-soft text-danger-strong',
  info: 'bg-info-soft text-info',
  violet: 'bg-violet-soft text-violet',
};

interface BadgeProps {
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
}

export const Badge = ({ tone = 'neutral', children, className }: BadgeProps) => (
  <span
    className={cn(
      'inline-flex items-center rounded-7 px-2.5 py-1 text-11 leading-none font-semibold whitespace-nowrap',
      TONES[tone],
      className,
    )}
  >
    {children}
  </span>
);

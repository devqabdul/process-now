import type { HTMLAttributes } from 'react';

import { cn } from '@lib/cn';

export const Card = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('rounded-14 border border-line bg-surface p-4', className)} {...props} />
);

// The design's panel heading: small mono caps ("ORDER & JOB VOLUME").
export const CardTitle = ({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLHeadingElement>) => (
  <h2
    className={cn('font-mono text-[11px] font-medium tracking-[0.1em] uppercase', className)}
    {...props}
  >
    {children}
  </h2>
);

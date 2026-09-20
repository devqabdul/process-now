import type { CSSProperties } from 'react';

import { cn } from '@lib/cn';

interface SkeletonProps {
  className?: string;
  style?: CSSProperties;
}

// A shimmering bar. Size it with className (h-2.5 w-1/2); bars are pills unless overridden.
export const Skeleton = ({ className, style }: SkeletonProps) => (
  <span
    aria-hidden="true"
    style={style}
    className={cn('shimmer block h-2.5 rounded-full', className)}
  />
);

import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { Card } from '@components/ui/card';
import { Skeleton } from '@components/ui/skeleton';
import { cn } from '@lib/cn';

type DeltaTone = 'up' | 'down' | 'neutral';

const DELTA_TONES: Record<DeltaTone, string> = {
  up: 'text-success',
  down: 'text-danger',
  neutral: 'text-fg-muted',
};

interface StatTileProps {
  label: string;
  value: ReactNode;
  icon?: LucideIcon;
  // Background + icon colour for the well, only where the colour means something (money in/out).
  iconClassName?: string;
  delta?: string;
  deltaTone?: DeltaTone;
  sub?: string;
  className?: string;
}

export const StatTile = ({
  label,
  value,
  icon: Icon,
  iconClassName,
  delta,
  deltaTone = 'neutral',
  sub,
  className,
}: StatTileProps) => (
  <Card
    className={cn(
      'min-w-0 px-3.5 py-3 transition-[transform,box-shadow] duration-200 hover:-translate-y-0.75 hover:shadow-raise',
      className,
    )}
  >
    <div className="mb-3 flex items-center gap-2.25">
      {Icon && (
        <span
          className={cn(
            'grid size-6 flex-none place-items-center rounded-7',
            iconClassName ?? 'bg-surface-muted text-fg-muted',
          )}
        >
          <Icon aria-hidden="true" className="size-3.25" strokeWidth={2} />
        </span>
      )}
      <span className="font-mono text-11 font-medium tracking-[0.1em] text-fg-muted uppercase">
        {label}
      </span>
    </div>
    <p className="font-mono text-xl font-semibold tracking-[-0.01em] break-words sm:text-2xl">
      {value}
    </p>
    {(delta ?? sub) && (
      <p className="mt-1.25 text-xs text-fg-subtle">
        {delta && <span className={cn('font-semibold', DELTA_TONES[deltaTone])}>{delta}</span>}
        {delta && sub ? ' ' : ''}
        {sub}
      </p>
    )}
  </Card>
);

// Same wrapper and rows as the loaded tile, text swapped for bars, so nothing shifts.
export const StatTileSkeleton = ({ className }: { className?: string }) => (
  <Card className={cn('min-w-0 px-3.5 py-3', className)}>
    <div className="mb-3 flex items-center gap-2.25">
      <Skeleton className="size-6 flex-none rounded-7" />
      <Skeleton className="h-2.25 w-1/2" />
    </div>
    <p className="font-mono text-xl font-semibold tracking-[-0.01em] sm:text-2xl">
      <Skeleton className="inline-block h-4 w-2/3" />
    </p>
    <p className="mt-1.25 text-xs">
      <Skeleton className="inline-block h-2 w-2/5" />
    </p>
  </Card>
);

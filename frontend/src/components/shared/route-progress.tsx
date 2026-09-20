import { useNavigation } from 'react-router';

import { cn } from '@lib/cn';

// The design's 2px route bar: it appears while the next route's chunk and data load,
// so the shell stays put instead of flashing a full-page loader.
export const RouteProgress = ({ className }: { className?: string }) => {
  const { state } = useNavigation();
  if (state === 'idle') return null;

  return (
    <div
      role="progressbar"
      aria-label="Loading page"
      className={cn('absolute inset-x-0 top-0 h-0.5 overflow-hidden bg-line-subtle', className)}
    >
      <div className="h-full w-[38%] animate-routebar bg-[linear-gradient(90deg,transparent,var(--pn-primary),transparent)]" />
    </div>
  );
};

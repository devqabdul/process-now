import { RotateCcw } from 'lucide-react';
import { useState } from 'react';

import { cn } from '@lib/cn';
import { resetApp } from '@lib/app-reset';

interface ResetAppButtonProps {
  className?: string;
}

// For "the app looks stuck or out of date": one tap instead of hunting through browser settings.
export const ResetAppButton = ({ className }: ResetAppButtonProps) => {
  const [busy, setBusy] = useState(false);

  return (
    <button
      type="button"
      disabled={busy}
      aria-busy={busy || undefined}
      onClick={() => {
        setBusy(true);
        void resetApp();
      }}
      className={cn(
        'inline-flex h-11 items-center gap-1.5 rounded-8 px-2 text-13 font-semibold text-fg-subtle transition-colors duration-150 hover:text-fg disabled:cursor-wait lg:h-8',
        className,
      )}
    >
      <RotateCcw
        aria-hidden="true"
        className={cn('size-3.5', busy && 'animate-spin [animation-direction:reverse]')}
        strokeWidth={2}
      />
      {busy ? 'Resetting…' : 'Reset app'}
    </button>
  );
};

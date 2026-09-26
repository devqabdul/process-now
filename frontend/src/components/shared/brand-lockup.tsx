import { cn } from '@lib/cn';

import { ProcessMark } from './process-mark';

interface BrandLockupProps {
  // "dark" = ink tile with white mark (on light UI); "inverse" = white tile (on the brand panel)
  tone?: 'dark' | 'inverse';
  size?: 'sm' | 'md';
  className?: string;
}

export const BrandLockup = ({ tone = 'dark', size = 'sm', className }: BrandLockupProps) => (
  <div className={cn('flex items-center', size === 'md' ? 'gap-2.75' : 'gap-2.5', className)}>
    <span
      className={cn(
        'grid flex-none place-items-center',
        size === 'md' ? 'size-8.5 rounded-11' : 'size-8 rounded-10',
        tone === 'inverse' ? 'bg-brand-fg text-brand-bg' : 'bg-brand-bg text-brand-fg',
      )}
    >
      <ProcessMark className="size-[74%]" />
    </span>
    <span
      className={cn(
        'font-mono font-semibold tracking-[0.12em]',
        size === 'md' ? 'text-sm' : 'text-13',
      )}
    >
      PROCESSNOW
    </span>
  </div>
);

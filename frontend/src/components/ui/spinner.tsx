import { cn } from '@lib/cn';

interface SpinnerProps {
  className?: string;
}

export const Spinner = ({ className }: SpinnerProps) => (
  <span
    aria-hidden="true"
    className={cn(
      'inline-block size-3.5 flex-none animate-spin rounded-full border-2 border-current border-t-transparent opacity-80',
      className,
    )}
  />
);

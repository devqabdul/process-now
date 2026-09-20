import { CheckCircle2, X } from 'lucide-react';
import { useEffect } from 'react';

import { IconButton } from '@components/ui/icon-button';

const DISMISS_AFTER_MS = 6_000;

interface ToastProps {
  message: string | null;
  onDismiss: () => void;
}

/**
 * One message, owned by the page that raised it — no provider, no queue. The region stays
 * mounted so a screen reader announces the message as a change rather than a new node.
 */
export const Toast = ({ message, onDismiss }: ToastProps) => {
  // effects
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(onDismiss, DISMISS_AFTER_MS);
    return () => clearTimeout(timer);
    // onDismiss is a fresh arrow each render; depending on it would restart the timer forever.
  }, [message]);

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      // Sits above the phone tab bar, which owns the bottom 5.5rem plus the safe area.
      className="pointer-events-none fixed inset-x-4 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-40 flex justify-center lg:inset-x-0 lg:bottom-6"
    >
      {message && (
        <div className="pointer-events-auto flex w-full max-w-sm animate-toast-in items-start gap-2.5 rounded-12 border border-success-line bg-success-soft px-3.5 py-3 shadow-popover">
          <CheckCircle2
            aria-hidden="true"
            className="mt-px size-4 flex-none text-success"
            strokeWidth={1.8}
          />
          <p className="flex-1 text-[12.5px] leading-[1.5] text-success">{message}</p>
          <IconButton aria-label="Dismiss" onClick={onDismiss}>
            <X aria-hidden="true" className="size-3.75" strokeWidth={2} />
          </IconButton>
        </div>
      )}
    </div>
  );
};

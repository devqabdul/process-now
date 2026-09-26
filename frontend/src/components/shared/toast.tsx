import { CheckCircle2, CircleAlert, X } from 'lucide-react';
import { useEffect, useState } from 'react';

import { IconButton } from '@components/ui/icon-button';
import { cn } from '@lib/cn';

const DISMISS_AFTER_MS = 6_000;

interface ToastProps {
  message: string | null;
  onDismiss: () => void;
  // One follow-up, e.g. Undo after a one-tap change.
  action?: { label: string; onClick: () => void } | undefined;
  tone?: 'success' | 'danger';
}

/**
 * One message, owned by the page that raised it — no provider, no queue. The region stays
 * mounted so a screen reader announces the message as a change rather than a new node.
 */
export const Toast = ({ message, onDismiss, action, tone = 'success' }: ToastProps) => {
  // state
  // Held while pointer or focus is on the toast, so Undo can't vanish under the cursor.
  const [paused, setPaused] = useState(false);
  const [shown, setShown] = useState(message);
  if (message !== shown) {
    setShown(message);
    setPaused(false);
  }

  // derived
  const danger = tone === 'danger';
  const Icon = danger ? CircleAlert : CheckCircle2;
  const text = danger ? 'text-danger-strong' : 'text-success';

  // effects
  useEffect(() => {
    if (!message || paused) return;
    const timer = setTimeout(onDismiss, DISMISS_AFTER_MS);
    return () => clearTimeout(timer);
    // onDismiss is a fresh arrow each render; depending on it would restart the timer forever.
  }, [message, paused]);

  return (
    <div
      aria-live={danger ? 'assertive' : 'polite'}
      aria-atomic="true"
      // Sits above the phone tab bar, which owns the bottom 5.5rem plus the safe area.
      className="pointer-events-none fixed inset-x-4 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-40 flex justify-center lg:inset-x-0 lg:bottom-6"
    >
      {message && (
        <div
          onPointerEnter={() => setPaused(true)}
          onPointerLeave={() => setPaused(false)}
          onFocus={() => setPaused(true)}
          onBlur={() => setPaused(false)}
          className={cn(
            'pointer-events-auto flex w-full max-w-sm animate-toast-in items-start gap-2.5 rounded-12 border px-3.5 py-3 shadow-popover',
            danger ? 'border-danger-line bg-danger-soft' : 'border-success-line bg-success-soft',
          )}
        >
          <Icon
            aria-hidden="true"
            className={cn('mt-px size-4 flex-none', text)}
            strokeWidth={1.8}
          />
          <p className={cn('flex-1 text-13 leading-[1.5]', text)}>{message}</p>
          {action && (
            <button
              type="button"
              onClick={action.onClick}
              className={cn(
                '-my-2 h-11 flex-none rounded-8 px-2.5 text-13 font-semibold underline-offset-2 hover:underline lg:h-8',
                text,
              )}
            >
              {action.label}
            </button>
          )}
          <IconButton aria-label="Dismiss" onClick={onDismiss}>
            <X aria-hidden="true" className="size-3.75" strokeWidth={2} />
          </IconButton>
        </div>
      )}
    </div>
  );
};

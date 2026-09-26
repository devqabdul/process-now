import { X } from 'lucide-react';
import { type FormEvent, type ReactNode, useEffect, useId, useRef } from 'react';

import { IconButton } from '@components/ui/icon-button';
import { cn } from '@lib/cn';

interface DialogProps {
  open: boolean;
  title: string;
  description?: ReactNode;
  // Sits left of the title; destructive dialogs use it to say so before anything is read.
  icon?: ReactNode;
  children?: ReactNode;
  // The one committing control — a submit Button, or a SlideToConfirm. Always full width.
  action: ReactNode;
  cancelLabel?: string;
  busy?: boolean;
  // Create/edit forms for a row of the list behind: a right-hand sheet from lg up, the card on phones.
  sheet?: boolean;
  // Docked to the bottom edge, full width: the phone Filters sheet.
  bottom?: boolean;
  // Destructive confirmations: a large icon over a centred heading.
  centered?: boolean;
  onClose: () => void;
  onSubmit?: (event: FormEvent<HTMLFormElement>) => void;
}

/**
 * Every modal in the app is this shape: heading, body, the one action full width, and a
 * quiet Cancel underneath it. Keeping the anatomy here is what keeps the dialogs consistent
 * — a screen that lays its own buttons out will drift from the rest within a release.
 */
export const Dialog = ({
  open,
  title,
  description,
  icon,
  children,
  action,
  cancelLabel = 'Cancel',
  busy = false,
  sheet = false,
  bottom = false,
  centered = false,
  onClose,
  onSubmit,
}: DialogProps) => {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  // effects
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open) {
      if (!dialog.open) dialog.showModal();
    } else if (dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      className={cn(
        'm-auto w-[calc(100vw-2rem)] max-w-sm rounded-16 border border-line bg-surface p-0 text-fg backdrop:bg-black/40',
        centered && 'max-w-md rounded-20 shadow-dialog',
        bottom && 'mx-0 mb-0 w-full max-w-none rounded-b-none border-x-0 border-b-0',
        sheet &&
          'lg:mr-0 lg:ml-auto lg:h-dvh lg:max-h-dvh lg:w-full lg:max-w-lg lg:animate-sheet-in lg:rounded-none lg:border-y-0 lg:border-r-0',
      )}
    >
      {/* noValidate like every other form here: required fields are announced through the
          field's own error, not a browser tooltip the design has no say over. */}
      <form
        noValidate
        onSubmit={onSubmit ?? ((event) => event.preventDefault())}
        // Capped to the screen so a long form scrolls its body; heading and buttons stay in reach.
        className={cn(
          'flex max-h-[calc(100dvh-2rem)] flex-col gap-field p-4',
          centered && 'p-6',
          sheet && 'lg:h-full lg:max-h-none lg:gap-0 lg:p-0',
        )}
      >
        <div
          className={cn(
            'flex flex-none items-start gap-3',
            centered && 'flex-col items-center gap-4 pt-2 text-center',
            sheet && 'lg:flex-none lg:border-b lg:border-line-subtle lg:px-panel lg:py-5',
          )}
        >
          {icon}
          <div className="min-w-0 flex-1">
            <h2
              id={titleId}
              className={cn(
                'text-sm font-semibold',
                sheet && 'lg:text-base',
                centered && 'text-lg tracking-[-0.01em]',
              )}
            >
              {title}
            </h2>
            {description && (
              <p
                className={cn(
                  'mt-1 text-xs leading-[1.55] text-fg-subtle',
                  centered && 'mt-2 text-13 text-fg-muted',
                )}
              >
                {description}
              </p>
            )}
          </div>
          {!centered && (
            <IconButton
              aria-label="Close"
              onClick={onClose}
              disabled={busy}
              className="-mt-1 -mr-2"
            >
              <X aria-hidden="true" className="size-4" strokeWidth={1.9} />
            </IconButton>
          )}
        </div>

        {children && (
          <div
            className={cn(
              // -m-1 p-1 keeps focus rings from being clipped by the scroll box.
              '-m-1 flex min-h-0 flex-col gap-field overflow-y-auto overscroll-contain p-1',
              sheet && 'lg:m-0 lg:flex-1 lg:p-panel',
            )}
          >
            {children}
          </div>
        )}

        <div
          className={cn(
            'flex flex-none flex-col gap-3',
            sheet && 'lg:border-t lg:border-line-subtle lg:px-panel lg:py-4',
          )}
        >
          {action}

          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="mx-auto h-11 rounded-8 px-3 text-13 font-semibold text-fg-subtle transition-colors duration-150 hover:text-fg disabled:cursor-not-allowed lg:h-9"
          >
            {cancelLabel}
          </button>
        </div>
      </form>
    </dialog>
  );
};

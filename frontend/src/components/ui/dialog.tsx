import { type FormEvent, type ReactNode, useEffect, useId, useRef } from 'react';

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
      className="m-auto w-[calc(100vw-2rem)] max-w-sm rounded-16 border border-line bg-surface p-0 text-fg backdrop:bg-black/40"
    >
      {/* noValidate like every other form here: required fields are announced through the
          field's own error, not a browser tooltip the design has no say over. */}
      <form
        noValidate
        onSubmit={onSubmit ?? ((event) => event.preventDefault())}
        className="flex flex-col gap-3.5 p-4"
      >
        <div className="flex items-start gap-3">
          {icon}
          <div className="min-w-0">
            <h2 id={titleId} className="text-sm font-semibold">
              {title}
            </h2>
            {description && (
              <p className="mt-1 text-[12px] leading-[1.55] text-fg-subtle">{description}</p>
            )}
          </div>
        </div>

        {children}

        {action}

        <button
          type="button"
          onClick={onClose}
          disabled={busy}
          className="mx-auto h-11 rounded-8 px-3 text-[12.5px] font-semibold text-fg-subtle transition-colors duration-150 hover:text-fg disabled:cursor-not-allowed lg:h-9"
        >
          {cancelLabel}
        </button>
      </form>
    </dialog>
  );
};

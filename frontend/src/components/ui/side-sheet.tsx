import { X } from 'lucide-react';
import { type ReactNode, useEffect, useId, useRef } from 'react';

import { IconButton } from '@components/ui/icon-button';

interface SideSheetProps {
  open: boolean;
  title: string;
  description?: string;
  children: ReactNode;
  onClose: () => void;
}

/**
 * A panel that slides in from the right with the screen behind it still visible — for a task
 * that belongs to the list it opens over, like adding a row to it. It is a real modal dialog,
 * so Escape, the focus trap and the backdrop are the browser's rather than ours.
 */
export const SideSheet = ({ open, title, description, children, onClose }: SideSheetProps) => {
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
      className="mr-0 ml-auto h-dvh max-h-dvh w-full max-w-lg animate-sheet-in border-l border-line bg-surface p-0 text-fg backdrop:bg-black/40"
    >
      <div className="flex h-full flex-col">
        <header className="flex flex-none items-start justify-between gap-3 border-b border-line-subtle px-5 py-4">
          <div className="min-w-0">
            <h2 id={titleId} className="text-base font-semibold">
              {title}
            </h2>
            {description && <p className="mt-1 text-13 text-fg-subtle">{description}</p>}
          </div>
          <IconButton aria-label="Close" onClick={onClose}>
            <X aria-hidden="true" className="size-4" strokeWidth={1.9} />
          </IconButton>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">{children}</div>
      </div>
    </dialog>
  );
};

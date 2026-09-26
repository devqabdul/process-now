import type { ReactNode } from 'react';

import { DeleteIllustration } from '@components/shared/delete-illustration';
import { Dialog } from '@components/ui/dialog';
import { FieldError } from '@components/ui/field-error';
import { SlideToConfirm } from '@components/ui/slide-to-confirm';

interface ConfirmDeleteDialogProps {
  open: boolean;
  // "Delete this expense?" — names the thing, ends in a question.
  title: string;
  // What goes and what survives; the dialog adds that it can't be undone.
  description: ReactNode;
  errorId: string;
  error: string | null;
  isSubmitting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

/** Every delete asks the same way: bin, question, a slide — a delete can't be undone, so no single tap. */
export const ConfirmDeleteDialog = ({
  open,
  title,
  description,
  errorId,
  error,
  isSubmitting,
  onClose,
  onConfirm,
}: ConfirmDeleteDialogProps) => (
  <Dialog
    open={open}
    centered
    title={title}
    description={<>{description} This action cannot be undone.</>}
    icon={<DeleteIllustration />}
    busy={isSubmitting}
    onClose={onClose}
    action={
      <SlideToConfirm
        label="Delete"
        busyLabel="Deleting…"
        busy={isSubmitting}
        onConfirm={onConfirm}
      />
    }
  >
    {error && <FieldError id={errorId} message={error} />}
  </Dialog>
);

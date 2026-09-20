import { Ban } from 'lucide-react';
import { type FormEvent, useState } from 'react';

import type { Order } from '@api/process-backend/orders';
import { FormField } from '@components/shared/form-field';
import { Button } from '@components/ui/button';
import { Dialog } from '@components/ui/dialog';
import { FieldError } from '@components/ui/field-error';

interface CancelOrderDialogProps {
  order: Order | null;
  isSubmitting: boolean;
  error: string | null;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}

/**
 * Cancelling is final — an order that has been returned can only be undone by voiding its
 * bill — so the reason is required. It is what the vendor will be told.
 */
export const CancelOrderDialog = ({
  order,
  isSubmitting,
  error,
  onClose,
  onConfirm,
}: CancelOrderDialogProps) => {
  const [reason, setReason] = useState('');
  const [touched, setTouched] = useState(false);
  const invalid = reason.trim().length < 3;

  // callbacks
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setTouched(true);
    if (!invalid) onConfirm(reason.trim());
  };

  return (
    <Dialog
      open={!!order}
      title={`Cancel ${order?.orderNo}?`}
      description={`${order?.vendor.name}'s lot is dropped and no bill is raised. The order stays on the list as cancelled — nothing is deleted.`}
      icon={
        <span className="grid size-9 flex-none place-items-center rounded-10 bg-danger-softer text-danger-strong">
          <Ban aria-hidden="true" className="size-4.5" strokeWidth={1.8} />
        </span>
      }
      busy={isSubmitting}
      onClose={onClose}
      onSubmit={submit}
      cancelLabel="Keep the order"
      action={
        <Button type="submit" size="md" variant="danger" loading={isSubmitting} className="w-full">
          Cancel this order
        </Button>
      }
    >
      <FormField
        id="cancel-reason"
        label="Why is it being cancelled?"
        required
        placeholder="Vendor withdrew the lot"
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        error={
          touched && invalid
            ? { type: 'custom', message: 'Give a short reason — it goes on the record.' }
            : undefined
        }
      />

      <FieldError id="cancel-order-error" message={error ?? undefined} />
    </Dialog>
  );
};

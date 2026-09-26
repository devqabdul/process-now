import { Ban } from 'lucide-react';
import { type FormEvent, useState } from 'react';

import type { Bill } from '@api/process-backend/billing';
import { FormField } from '@components/shared/form-field';
import { Button } from '@components/ui/button';
import { Dialog } from '@components/ui/dialog';
import { FieldError } from '@components/ui/field-error';
import { formatMoney } from '@utils/format/money';

interface VoidBillDialogProps {
  bill: Bill | null;
  isSubmitting: boolean;
  error: string | null;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}

/** Voiding is for a bill raised in error; the reason stays on the bill for the audit trail. */
export const VoidBillDialog = ({
  bill,
  isSubmitting,
  error,
  onClose,
  onConfirm,
}: VoidBillDialogProps) => {
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
      open={!!bill}
      title={`Void bill ${bill?.billNo}?`}
      description={`${bill?.order.vendor.name} no longer owes the ${formatMoney(bill?.total)}. The bill stays on the list as voided — nothing is deleted.`}
      icon={
        <span className="grid size-9 flex-none place-items-center rounded-10 bg-danger-softer text-danger-strong">
          <Ban aria-hidden="true" className="size-4.5" strokeWidth={1.8} />
        </span>
      }
      busy={isSubmitting}
      onClose={onClose}
      onSubmit={submit}
      cancelLabel="Keep the bill"
      action={
        <Button type="submit" size="md" variant="danger" loading={isSubmitting} className="w-full">
          Void this bill
        </Button>
      }
    >
      <FormField
        id="void-reason"
        label="Why is it being voided?"
        required
        maxLength={200}
        placeholder="Wrong quantity billed"
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        error={
          touched && invalid
            ? { type: 'custom', message: 'Give a short reason — it stays on the bill.' }
            : undefined
        }
      />

      <FieldError id="void-bill-error" message={error ?? undefined} />
    </Dialog>
  );
};

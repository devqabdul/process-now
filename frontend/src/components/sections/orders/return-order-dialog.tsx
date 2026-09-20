import { PackageCheck } from 'lucide-react';
import { type FormEvent, useState } from 'react';

import type { Order } from '@api/process-backend/orders';
import { Button } from '@components/ui/button';
import { Dialog } from '@components/ui/dialog';
import { FieldError } from '@components/ui/field-error';
import { FieldLabel } from '@components/ui/field-label';
import { InputShell, inputClasses } from '@components/ui/input-shell';
import { formatQuantity } from '@utils/format/quantity';

const isQuantity = (value: string) => /^\d+(\.\d+)?$/.test(value.trim());

export interface ReturnQuantities {
  [orderItemId: string]: string;
}

interface ReturnOrderDialogProps {
  order: Order | null;
  isSubmitting: boolean;
  error: string | null;
  onClose: () => void;
  onConfirm: (quantities: ReturnQuantities) => void;
}

/**
 * Returning is what turns an order into a bill, so the quantity entered here is the quantity
 * charged for. It starts at what came in — the usual case — and anything short of that is a
 * deliberate edit, which is why nothing is pre-rounded or guessed.
 */
export const ReturnOrderDialog = ({
  order,
  isSubmitting,
  error,
  onClose,
  onConfirm,
}: ReturnOrderDialogProps) => {
  // The page keys this dialog by order, so each one opens with its own quantities.
  const [quantities, setQuantities] = useState<ReturnQuantities>(() =>
    Object.fromEntries((order?.items ?? []).map((item) => [item.id, item.qtyIn])),
  );
  const [touched, setTouched] = useState(false);

  // derived
  const invalid = order?.items.some((item) => {
    const value = quantities[item.id] ?? '';
    return !isQuantity(value) || Number(value) > Number(item.qtyIn);
  });

  // callbacks
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setTouched(true);
    if (!invalid) onConfirm(quantities);
  };

  return (
    <Dialog
      open={!!order}
      title={`Return ${order?.orderNo} to ${order?.vendor.name}`}
      description="This closes the order and raises its bill. Enter what is going back — less than came in if anything failed."
      icon={
        <span className="grid size-9 flex-none place-items-center rounded-10 bg-success-soft text-success">
          <PackageCheck aria-hidden="true" className="size-4.5" strokeWidth={1.8} />
        </span>
      }
      busy={isSubmitting}
      onClose={onClose}
      onSubmit={submit}
      action={
        <Button type="submit" size="md" loading={isSubmitting} className="w-full">
          Return and raise bill
        </Button>
      }
    >
      <ul className="flex flex-col gap-2.5">
        {order?.items.map((item) => {
          const value = quantities[item.id] ?? '';
          const tooMany = isQuantity(value) && Number(value) > Number(item.qtyIn);
          const bad = touched && (!isQuantity(value) || tooMany);
          return (
            <li key={item.id}>
              <div className="mb-1.5 flex items-baseline justify-between gap-2">
                <FieldLabel htmlFor={`qty-${item.id}`}>{item.serviceType.name}</FieldLabel>
                <span className="text-[11px] text-fg-subtle">
                  {formatQuantity(item.qtyIn, item.serviceType.unit)} in
                </span>
              </div>
              <InputShell invalid={bad}>
                <input
                  id={`qty-${item.id}`}
                  inputMode="decimal"
                  value={value}
                  aria-invalid={bad}
                  aria-describedby={bad ? `qty-${item.id}-error` : undefined}
                  onChange={(event) =>
                    setQuantities((was) => ({ ...was, [item.id]: event.target.value }))
                  }
                  className={inputClasses}
                />
              </InputShell>
              <FieldError
                id={`qty-${item.id}-error`}
                message={
                  bad
                    ? tooMany
                      ? `Only ${formatQuantity(item.qtyIn, item.serviceType.unit)} came in.`
                      : 'Enter the quantity going back.'
                    : undefined
                }
              />
            </li>
          );
        })}
      </ul>

      <FieldError id="return-order-error" message={error ?? undefined} />
    </Dialog>
  );
};

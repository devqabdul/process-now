import { TriangleAlert } from 'lucide-react';

import type { Expense } from '@api/process-backend/expenses';
import { Dialog } from '@components/ui/dialog';
import { FieldError } from '@components/ui/field-error';
import { SlideToConfirm } from '@components/ui/slide-to-confirm';
import { formatShortDate } from '@utils/format/date';
import { formatMoney } from '@utils/format/money';

interface DeleteExpenseDialogProps {
  expense: Expense | null;
  isSubmitting: boolean;
  error: string | null;
  onClose: () => void;
  onConfirm: () => void;
}

// Unlike retiring a vendor, this destroys the row, so it takes a deliberate slide.
export const DeleteExpenseDialog = ({
  expense,
  isSubmitting,
  error,
  onClose,
  onConfirm,
}: DeleteExpenseDialogProps) => (
  <Dialog
    open={!!expense}
    title="Delete this expense?"
    description={
      expense
        ? `${expense.category}, ${formatMoney(expense.amount)} on ${formatShortDate(expense.spentOn)}. The money goes back onto ${expense.bankAccount.name}'s balance, and the expense cannot be recovered.`
        : undefined
    }
    icon={
      <span className="grid size-9 flex-none place-items-center rounded-10 bg-danger-softer text-danger-strong">
        <TriangleAlert aria-hidden="true" className="size-4.5" strokeWidth={1.8} />
      </span>
    }
    busy={isSubmitting}
    onClose={onClose}
    action={
      <SlideToConfirm
        label="Delete expense"
        busyLabel="Deleting…"
        busy={isSubmitting}
        onConfirm={onConfirm}
      />
    }
  >
    <FieldError id="delete-expense-error" message={error ?? undefined} />
  </Dialog>
);

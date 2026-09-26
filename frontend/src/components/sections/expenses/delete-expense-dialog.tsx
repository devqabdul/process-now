import type { Expense } from '@api/process-backend/expenses';
import { ConfirmDeleteDialog } from '@components/shared/confirm-delete-dialog';
import { formatShortDate } from '@utils/format/date';
import { formatMoney } from '@utils/format/money';

interface DeleteExpenseDialogProps {
  expense: Expense | null;
  isSubmitting: boolean;
  error: string | null;
  onClose: () => void;
  onConfirm: () => void;
}

export const DeleteExpenseDialog = ({
  expense,
  isSubmitting,
  error,
  onClose,
  onConfirm,
}: DeleteExpenseDialogProps) => (
  <ConfirmDeleteDialog
    open={!!expense}
    title="Delete this expense?"
    description={
      expense &&
      `${expense.category}, ${formatMoney(expense.amount)} on ${formatShortDate(expense.spentOn)}. The money goes back onto ${expense.bankAccount.name}'s balance.`
    }
    errorId="delete-expense-error"
    error={error}
    isSubmitting={isSubmitting}
    onClose={onClose}
    onConfirm={onConfirm}
  />
);

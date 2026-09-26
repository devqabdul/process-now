import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { isSuccess, type NormalizedError, safeApiError } from '@api/process-backend';
import {
  type BankAccount,
  bankAccountsKeys,
  useBankAccounts,
} from '@api/process-backend/bank-accounts';
import { dashboardKeys } from '@api/process-backend/dashboard';
import {
  createExpense,
  deleteExpense,
  type Expense,
  expensesKeys,
  updateExpense,
  useExpenseCategories,
  useExpenses,
} from '@api/process-backend/expenses';
import type {
  ExpenseFormInput,
  ExpenseSaveResult,
} from '@components/sections/expenses/expense-form-dialog';
import { useMediaQuery } from '@hooks/use-media-query';
import { shiftIsoDate, todayIso } from '@utils/format/date';

const FIELDS = ['bankAccountId', 'category', 'amount', 'spentOn', 'notes'] as const;

const isFieldName = (key: string): key is keyof ExpenseFormInput =>
  (FIELDS as readonly string[]).includes(key);

const toErrorMessage = (err: NormalizedError, fallback: string) =>
  err.error_type === 'network'
    ? `${fallback} Check your connection and try again.`
    : (err.message ?? fallback);

const toPayload = (values: ExpenseFormInput) => ({
  bankAccountId: values.bankAccountId,
  category: values.category.trim(),
  amount: Number(values.amount),
  spentOn: values.spentOn,
  // Always sent, so clearing the field on an edit actually clears the notes.
  notes: values.notes.trim(),
});

export interface UseExpensesListPageResult {
  from: string;
  to: string;
  today: string;
  accountId: string;
  accounts: BankAccount[];
  activeAccounts: BankAccount[];
  categories: string[];
  expenses: Expense[];
  total: string | undefined;
  target: Expense | 'new' | null;
  deleting: Expense | null;
  isDeleting: boolean;
  deleteError: string | null;
  saved: string | null;
  showTable: boolean;
  isLoading: boolean;
  isError: boolean;
  setRange: (range: { from: string; to: string }) => void;
  setAccountId: (id: string) => void;
  openNew: () => void;
  openEdit: (expense: Expense) => void;
  closeDialog: () => void;
  save: (values: ExpenseFormInput) => Promise<ExpenseSaveResult>;
  askDelete: (expense: Expense) => void;
  closeDelete: () => void;
  confirmDelete: () => void;
  dismissSaved: () => void;
  retry: () => void;
}

export const useExpensesListPage = (): UseExpensesListPageResult => {
  // state
  // The API's own default: the last 30 days, today included.
  const [range, setRange] = useState(() => ({
    from: shiftIsoDate(todayIso(), -29),
    to: todayIso(),
  }));
  const [accountId, setAccountId] = useState('');
  const [target, setTarget] = useState<Expense | 'new' | null>(null);
  const [deleting, setDeleting] = useState<Expense | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  // wiring
  const queryClient = useQueryClient();
  const { data, isPending, isError, refetch } = useExpenses(
    accountId ? { ...range, bankAccountId: accountId } : range,
  );
  const { data: accounts = [] } = useBankAccounts();
  const { data: categories = [] } = useExpenseCategories();
  // Tailwind's md: below it the same rows read better as cards.
  const showTable = useMediaQuery('(min-width: 48rem)');

  // derived
  const today = todayIso();
  const activeAccounts = accounts.filter((account) => account.isActive !== false);

  // callbacks
  // An expense moves an account's balance and the day's dashboard, so all three refetch.
  const invalidate = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: expensesKeys.all }),
      queryClient.invalidateQueries({ queryKey: bankAccountsKeys.all }),
      queryClient.invalidateQueries({ queryKey: dashboardKeys.all }),
    ]);

  const save = async (values: ExpenseFormInput): Promise<ExpenseSaveResult> => {
    const editing = target !== null && target !== 'new' ? target : null;
    const payload = toPayload(values);
    const { bankAccountId, ...unchangedAccount } = payload;
    try {
      // An unchanged account is left out, so an expense on a since-closed account still edits.
      const response = editing
        ? await updateExpense(
            editing.id,
            bankAccountId === editing.bankAccountId ? unchangedAccount : payload,
          )
        : await createExpense(payload);
      if (!isSuccess(response.data)) return { ok: false, message: 'Unable to save this expense.' };
      await invalidate();
      setTarget(null);
      setSaved(editing ? `${payload.category} updated.` : `${payload.category} recorded.`);
      return { ok: true };
    } catch (error) {
      let result: ExpenseSaveResult = { ok: false };
      safeApiError(error, {
        context: { page: 'expenses', action: editing ? 'updateExpense' : 'createExpense' },
        onError: (err) => {
          const fields = Object.fromEntries(
            Object.entries(err.fields ?? {}).filter(([key]) => isFieldName(key)),
          );
          result = {
            ok: false,
            fields,
            message: toErrorMessage(err, 'Unable to save this expense.'),
          };
        },
      });
      return result;
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const response = await deleteExpense(deleting.id);
      if (!isSuccess(response.data)) {
        setDeleteError('Unable to delete this expense.');
        return;
      }
      await invalidate();
      setSaved(`${deleting.category} deleted. ${deleting.bankAccount.name}'s balance is restored.`);
      setDeleting(null);
    } catch (error) {
      safeApiError(error, {
        context: { page: 'expenses', action: 'deleteExpense' },
        onError: (err) => setDeleteError(toErrorMessage(err, 'Unable to delete this expense.')),
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return {
    from: range.from,
    to: range.to,
    today,
    accountId,
    accounts,
    activeAccounts,
    categories,
    expenses: data?.expenses ?? [],
    total: data?.total,
    target,
    deleting,
    isDeleting,
    deleteError,
    saved,
    showTable,
    isLoading: isPending,
    isError,
    setRange,
    setAccountId,
    openNew: () => {
      setSaved(null);
      setTarget('new');
    },
    openEdit: (expense) => {
      setSaved(null);
      setTarget(expense);
    },
    closeDialog: () => setTarget(null),
    save,
    askDelete: (expense) => {
      setSaved(null);
      setDeleteError(null);
      setDeleting(expense);
    },
    closeDelete: () => setDeleting(null),
    confirmDelete: () => void confirmDelete(),
    dismissSaved: () => setSaved(null),
    retry: () => void refetch(),
  };
};

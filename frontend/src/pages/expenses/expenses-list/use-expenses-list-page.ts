import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';

import {
  fetchAllPages,
  isSuccess,
  type NormalizedError,
  safeApiError,
  usePagedList,
} from '@api/process-backend';
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
  getExpenses,
  updateExpense,
  useExpenseCategories,
} from '@api/process-backend/expenses';
import type {
  ExpenseFormInput,
  ExpenseSaveResult,
} from '@components/sections/expenses/expense-form-dialog';
import { buildExpenseColumns } from '@components/sections/expenses/expenses-table';
import type { PickerColumn } from '@components/ui/column-picker';
import {
  type ColumnVisibilityState,
  type DataTableColumn,
  exportRows,
  pickerColumns,
  type SortingState,
} from '@components/ui/data-table';
import type { FilterOption } from '@components/ui/filter-chip';
import { useCsvExport } from '@hooks/use-csv-export';
import { useListParams } from '@hooks/use-list-params';
import { useMediaQuery } from '@hooks/use-media-query';
import { usePersistedState } from '@hooks/use-persisted-state';
import { DEFAULT_DATE_PRESET, matchPreset } from '@utils/date-presets';
import { formatShortDate, todayIso } from '@utils/format/date';

const SORT_KEYS = ['spentOn', 'amount', 'category'];

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
  // "28 Aug – 26 Sep", for the summary line.
  period: string;
  accountFilter: string[];
  accountOptions: FilterOption[];
  activeAccounts: BankAccount[];
  categories: string[];
  categoryFilter: string[];
  expenses: Expense[];
  total: number;
  // Money over every matching row, not just this page.
  sum: string | undefined;
  page: number;
  pageSize: number;
  q: string;
  sorting: SortingState;
  hasFilters: boolean;
  // Chips holding a value (a non-default period counts), for the phone Filters badge.
  activeFilters: number;
  columns: DataTableColumn<Expense>[];
  columnVisibility: ColumnVisibilityState;
  pickerColumns: PickerColumn[];
  target: Expense | 'new' | null;
  deleting: Expense | null;
  isDeleting: boolean;
  deleteError: string | null;
  saved: string | null;
  showTable: boolean;
  isLoading: boolean;
  isRefreshing: boolean;
  isLoadingMore: boolean;
  isError: boolean;
  exportError: string | null;
  setRange: (range: { from: string; to: string }) => void;
  setAccount: (selected: string[]) => void;
  setCategory: (selected: string[]) => void;
  setPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;
  setQ: (q: string) => void;
  setSorting: (sorting: SortingState) => void;
  clearFilters: () => void;
  setColumnVisibility: (visibility: ColumnVisibilityState) => void;
  toggleColumn: (id: string, visible: boolean) => void;
  loadMore: () => void;
  exportCsv: () => Promise<void>;
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
  // Read first: the Bank page's "Add expense" arrives with the form to open.
  const location = useLocation();
  const [target, setTarget] = useState<Expense | 'new' | null>(() =>
    (location.state as { addExpense?: boolean } | null)?.addExpense ? 'new' : null,
  );
  const [deleting, setDeleting] = useState<Expense | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [columnVisibility, setColumnVisibility] = usePersistedState<ColumnVisibilityState>(
    'pn.table.expenses.columns',
    {},
  );

  // wiring
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const list = useListParams(SORT_KEYS, '-spentOn');
  const range = list.getRange();
  const accountId = list.getId('account');
  const categoryFilter = list.getMany('category');
  const filters = {
    ...range,
    ...(list.q ? { q: list.q } : {}),
    ...(list.apiSort && { sort: list.apiSort }),
    ...(accountId ? { bankAccountId: accountId } : {}),
    ...(categoryFilter.length > 0 ? { category: categoryFilter } : {}),
  };
  // Tailwind's lg: below it the rows read better as cards that load more.
  const showTable = useMediaQuery('(min-width: 64rem)');
  const rows = usePagedList(
    expensesKeys,
    { ...filters, page: list.page, pageSize: list.pageSize },
    showTable,
    list.setPage,
  );
  const { data: accounts = [] } = useBankAccounts();
  const { data: categories = [] } = useExpenseCategories();
  const { exportError, runExport } = useCsvExport('expenses');

  // derived
  const today = todayIso();
  const hasFilters = !!list.q || !!accountId || categoryFilter.length > 0;
  const activeFilters =
    Number(matchPreset(range, today) !== DEFAULT_DATE_PRESET) +
    Number(!!accountId) +
    Number(categoryFilter.length > 0);
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

  const openEdit = (expense: Expense) => {
    setSaved(null);
    setTarget(expense);
  };

  const askDelete = (expense: Expense) => {
    setSaved(null);
    setDeleteError(null);
    setDeleting(expense);
  };

  const columns = buildExpenseColumns({ onEdit: openEdit, onDelete: askDelete });

  const exportCsv = () =>
    runExport(async () => exportRows(columns, await fetchAllPages(getExpenses, filters)));

  // effects
  // Drop the Bank page's flag, so a refresh doesn't reopen the form.
  useEffect(() => {
    if (target !== 'new') return;
    void navigate({ search: location.search }, { replace: true, state: null });
  }, []);

  return {
    from: range.from,
    to: range.to,
    today,
    period: `${formatShortDate(range.from)} – ${formatShortDate(range.to)}`,
    accountFilter: accountId ? [accountId] : [],
    accountOptions: accounts.map((account) => ({ value: account.id, label: account.name })),
    activeAccounts,
    categories,
    categoryFilter,
    expenses: rows.items,
    total: rows.total,
    sum: rows.data?.sum,
    page: list.page,
    pageSize: list.pageSize,
    q: list.q,
    sorting: list.sorting,
    hasFilters,
    activeFilters,
    columns,
    columnVisibility,
    pickerColumns: pickerColumns(columns, columnVisibility),
    target,
    deleting,
    isDeleting,
    deleteError,
    saved,
    showTable,
    isLoading: rows.isLoading,
    isRefreshing: rows.isRefreshing,
    isLoadingMore: rows.isLoadingMore,
    isError: rows.isError,
    exportError,
    setRange: list.setRange,
    setAccount: ([id]) => list.update({ account: id }),
    setCategory: (selected) => list.update({ category: selected }),
    setPage: list.setPage,
    setPageSize: list.setPageSize,
    setQ: list.setQ,
    setSorting: list.setSorting,
    clearFilters: () =>
      list.update({
        q: undefined,
        from: undefined,
        to: undefined,
        account: undefined,
        category: undefined,
      }),
    setColumnVisibility,
    toggleColumn: (id, visible) =>
      setColumnVisibility((previous) => ({ ...previous, [id]: visible })),
    loadMore: rows.loadMore,
    exportCsv,
    openNew: () => {
      setSaved(null);
      setTarget('new');
    },
    openEdit,
    closeDialog: () => setTarget(null),
    save,
    askDelete,
    closeDelete: () => setDeleting(null),
    confirmDelete: () => void confirmDelete(),
    dismissSaved: () => setSaved(null),
    retry: rows.retry,
  };
};

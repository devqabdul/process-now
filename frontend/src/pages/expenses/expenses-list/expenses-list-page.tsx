import { Plus, ReceiptText, WifiOff } from 'lucide-react';

import { DeleteExpenseDialog } from '@components/sections/expenses/delete-expense-dialog';
import {
  EXPENSE_SKELETON_ROWS,
  ExpenseCard,
  ExpenseCardSkeleton,
} from '@components/sections/expenses/expense-card';
import { ExpenseFormDialog } from '@components/sections/expenses/expense-form-dialog';
import { ExpensesTable } from '@components/sections/expenses/expenses-table';
import { DateRangeFields } from '@components/shared/date-range-fields';
import { EmptyState } from '@components/shared/empty-state';
import { LoadError } from '@components/shared/load-error';
import { PageHeader } from '@components/shared/page-header';
import { Toast } from '@components/shared/toast';
import { Button } from '@components/ui/button';
import { Skeleton } from '@components/ui/skeleton';
import { formatMoney } from '@utils/format/money';

import { useExpensesListPage } from './use-expenses-list-page';

const SKELETON_CARDS = Array.from({ length: EXPENSE_SKELETON_ROWS }, (_, index) => index * 0.08);

export const ExpensesListPage = () => {
  const {
    from,
    to,
    today,
    accountId,
    accounts,
    activeAccounts,
    categories,
    expenses,
    total,
    target,
    deleting,
    isDeleting,
    deleteError,
    saved,
    showTable,
    isLoading,
    isError,
    setRange,
    setAccountId,
    openNew,
    openEdit,
    closeDialog,
    save,
    askDelete,
    closeDelete,
    confirmDelete,
    dismissSaved,
    retry,
  } = useExpensesListPage();

  const empty = (
    <EmptyState
      icon={ReceiptText}
      title="No expenses in this period"
      description="Nothing was paid out between these dates from this account. Widen the range, or record what was spent."
      action={
        <Button size="sm" onClick={openNew}>
          Add expense
        </Button>
      }
    />
  );

  return (
    <>
      <title>Expenses · ProcessNow</title>
      <PageHeader
        title="Expenses"
        subtitle="Money paid out of the business, and the account it came from."
        actions={
          <Button size="sm" onClick={openNew}>
            <Plus aria-hidden="true" className="size-3.75" strokeWidth={2.2} />
            Add expense
          </Button>
        }
      />

      {isError ? (
        <LoadError
          icon={WifiOff}
          title="Couldn't load your expenses"
          description="The list didn't come back. Check your connection and try again — nothing has been lost."
          onRetry={retry}
        />
      ) : (
        <>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="flex flex-wrap items-end gap-2">
              <DateRangeFields from={from} to={to} max={today} onChange={setRange} />
              <div className="flex flex-col gap-1">
                <label
                  htmlFor="expense-account-filter"
                  className="text-[11.5px] font-semibold text-fg-secondary"
                >
                  Account
                </label>
                <select
                  id="expense-account-filter"
                  value={accountId}
                  onChange={(event) => setAccountId(event.target.value)}
                  className="h-11 rounded-10 border border-line-field bg-surface px-3 text-[12.5px] text-fg outline-none transition-[border-color,box-shadow] duration-150 focus:border-focus focus:shadow-focus lg:h-9.5"
                >
                  <option value="">All accounts</option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <p className="text-right">
              <span className="block font-mono text-[10.5px] font-medium tracking-[0.1em] text-fg-muted uppercase">
                Total
              </span>
              <span className="font-mono text-2xl font-semibold tracking-[-0.01em]">
                {total === undefined ? (
                  <Skeleton className="inline-block h-4 w-24" />
                ) : (
                  formatMoney(total)
                )}
              </span>
            </p>
          </div>

          {showTable ? (
            <ExpensesTable
              rows={expenses}
              loading={isLoading}
              empty={empty}
              onEdit={openEdit}
              onDelete={askDelete}
            />
          ) : (
            <ul className="flex flex-col gap-2.5">
              {isLoading
                ? SKELETON_CARDS.map((delay) => <ExpenseCardSkeleton key={delay} delay={delay} />)
                : expenses.map((expense) => (
                    <ExpenseCard
                      key={expense.id}
                      expense={expense}
                      onEdit={openEdit}
                      onDelete={askDelete}
                    />
                  ))}
              {!isLoading && expenses.length === 0 && (
                <li className="rounded-14 border border-line-input">{empty}</li>
              )}
            </ul>
          )}

          <p role="status" className="text-[11.5px] text-fg-subtle empty:sr-only">
            {!isLoading && expenses.length > 0
              ? `Showing ${expenses.length} ${expenses.length === 1 ? 'expense' : 'expenses'}.`
              : null}
          </p>
        </>
      )}

      <ExpenseFormDialog
        target={target}
        accounts={activeAccounts}
        categories={categories}
        today={today}
        onClose={closeDialog}
        onSubmit={save}
      />
      <DeleteExpenseDialog
        expense={deleting}
        isSubmitting={isDeleting}
        error={deleteError}
        onClose={closeDelete}
        onConfirm={confirmDelete}
      />

      <Toast message={saved} onDismiss={dismissSaved} />
    </>
  );
};

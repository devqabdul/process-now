import { Plus, ReceiptText, SearchX, WifiOff } from 'lucide-react';

import { DeleteExpenseDialog } from '@components/sections/expenses/delete-expense-dialog';
import {
  EXPENSE_SKELETON_ROWS,
  ExpenseCard,
  ExpenseCardSkeleton,
} from '@components/sections/expenses/expense-card';
import { ExpenseFormDialog } from '@components/sections/expenses/expense-form-dialog';
import { ExpensesTable } from '@components/sections/expenses/expenses-table';
import { CardList } from '@components/shared/card-list';
import { DateRangeChip } from '@components/shared/date-range-chip';
import { EmptyState } from '@components/shared/empty-state';
import { LoadError } from '@components/shared/load-error';
import { PageHeader } from '@components/shared/page-header';
import { TableToolbar } from '@components/shared/table-toolbar';
import { Toast } from '@components/shared/toast';
import { Button } from '@components/ui/button';
import { FilterChip } from '@components/ui/filter-chip';
import { LoadMore } from '@components/ui/load-more';
import { Pagination } from '@components/ui/pagination';
import { formatCount } from '@utils/format/count';
import { formatMoney } from '@utils/format/money';

import { useExpensesListPage } from './use-expenses-list-page';

export const ExpensesListPage = () => {
  const {
    from,
    to,
    today,
    period,
    accountFilter,
    accountOptions,
    activeAccounts,
    categories,
    categoryFilter,
    expenses,
    total,
    sum,
    page,
    pageSize,
    q,
    sorting,
    hasFilters,
    activeFilters,
    columns,
    columnVisibility,
    pickerColumns,
    target,
    deleting,
    isDeleting,
    deleteError,
    saved,
    showTable,
    isLoading,
    isRefreshing,
    isLoadingMore,
    isError,
    exportError,
    setRange,
    setAccount,
    setCategory,
    setPage,
    setPageSize,
    setQ,
    setSorting,
    clearFilters,
    setColumnVisibility,
    toggleColumn,
    loadMore,
    exportCsv,
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

  const empty = hasFilters ? (
    <EmptyState
      icon={SearchX}
      title="No expense matches"
      description="Nothing in this period fits this search and these filters. Try fewer letters, or clear them."
      action={
        <Button variant="secondary" size="sm" onClick={clearFilters}>
          Clear search and filters
        </Button>
      }
    />
  ) : (
    <EmptyState
      icon={ReceiptText}
      title="No expenses in this period"
      description="Nothing was paid out between these dates from this account. Widen the range, or record what was spent."
      action={
        <Button variant="secondary" size="sm" onClick={openNew}>
          Add expense
        </Button>
      }
    />
  );

  const summary = (
    <>
      <strong className="font-mono font-semibold text-fg">{formatMoney(sum)}</strong> spent ·{' '}
      {formatCount(total, 'expense', 'expenses')} · {period}
    </>
  );

  const error = (
    <LoadError
      icon={WifiOff}
      title="Couldn't load your expenses"
      description="The list didn't come back. Check your connection and try again — nothing has been lost."
      onRetry={retry}
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

      <TableToolbar
        rowCount={total}
        search={q}
        onSearchChange={setQ}
        searchLabel="Search expenses by category or notes"
        searchPlaceholder="Search expenses…"
        columns={pickerColumns}
        onToggleColumn={toggleColumn}
        onExport={exportCsv}
        activeFilters={activeFilters}
        onClearAll={clearFilters}
      >
        <DateRangeChip from={from} to={to} max={today} onChange={setRange} />
        {accountOptions.length > 0 && (
          <FilterChip
            label="Account"
            multiple={false}
            options={accountOptions}
            selected={accountFilter}
            onChange={setAccount}
            onClear={() => setAccount([])}
          />
        )}
        {categories.length > 0 && (
          <FilterChip
            label="Category"
            options={categories.map((name) => ({ value: name, label: name }))}
            selected={categoryFilter}
            onChange={setCategory}
            onClear={() => setCategory([])}
          />
        )}
      </TableToolbar>
      {exportError && (
        <p role="alert" className="text-13 text-danger-strong">
          {exportError}
        </p>
      )}

      {showTable ? (
        <ExpensesTable
          columns={columns}
          rows={expenses}
          loading={isLoading}
          refreshing={isRefreshing}
          error={isError ? error : undefined}
          empty={empty}
          sorting={sorting}
          onSortingChange={setSorting}
          columnVisibility={columnVisibility}
          onColumnVisibilityChange={setColumnVisibility}
          summary={summary}
          footer={
            <Pagination
              page={page}
              pageSize={pageSize}
              total={total}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          }
        />
      ) : (
        <CardList
          items={expenses}
          rowKey={(expense) => expense.id}
          renderItem={(expense) => (
            <ExpenseCard expense={expense} onEdit={openEdit} onDelete={askDelete} />
          )}
          label="Expenses"
          loading={isLoading}
          skeleton={<ExpenseCardSkeleton />}
          skeletonCount={EXPENSE_SKELETON_ROWS}
          error={isError ? error : undefined}
          empty={empty}
          summary={summary}
          footer={
            <LoadMore
              shown={expenses.length}
              total={total}
              loading={isLoadingMore}
              onLoadMore={loadMore}
            />
          }
        />
      )}

      {/* Always mounted: a live region has to exist before the count it announces changes. */}
      <p role="status" className="sr-only">
        {!isLoading && !isError ? `${formatCount(total, 'expense', 'expenses')} found.` : null}
      </p>

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

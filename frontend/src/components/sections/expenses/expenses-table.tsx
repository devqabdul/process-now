import { createColumnHelper } from '@tanstack/react-table';
import type { ReactNode } from 'react';

import type { Expense } from '@api/process-backend/expenses';
import { DataTable, type DataTableFeatures } from '@components/ui/data-table';
import { formatShortDate } from '@utils/format/date';
import { formatMoney } from '@utils/format/money';

import { EXPENSE_SKELETON_ROWS, ExpenseActions, type ExpenseActionHandlers } from './expense-card';

const helper = createColumnHelper<DataTableFeatures, Expense>();

const buildColumns = (actions: ExpenseActionHandlers) =>
  helper.columns([
    helper.display({
      id: 'date',
      header: 'Date',
      meta: { className: 'w-[12%] whitespace-nowrap font-mono' },
      cell: ({ row }) => formatShortDate(row.original.spentOn),
    }),
    helper.accessor('category', {
      header: 'Category',
      enableSorting: true,
      sortFn: 'text',
      meta: { className: 'w-[22%]' },
      cell: ({ row }) => (
        <span className="block min-w-0 truncate font-medium">{row.original.category}</span>
      ),
    }),
    helper.display({
      id: 'account',
      header: 'Paid from',
      meta: { className: 'w-[20%]' },
      cell: ({ row }) => (
        <span className="block min-w-0 truncate">{row.original.bankAccount.name}</span>
      ),
    }),
    helper.display({
      id: 'notes',
      header: 'Notes',
      cell: ({ row }) => (
        <span className="block min-w-0 truncate text-fg-subtle">{row.original.notes || '—'}</span>
      ),
    }),
    helper.display({
      id: 'amount',
      header: 'Amount',
      meta: { className: 'w-[14%] text-right whitespace-nowrap' },
      cell: ({ row }) => (
        <span className="font-mono font-semibold">{formatMoney(row.original.amount)}</span>
      ),
    }),
    helper.display({
      id: 'actions',
      header: '',
      meta: { className: 'w-12' },
      cell: ({ row }) => <ExpenseActions expense={row.original} {...actions} />,
    }),
  ]);

interface ExpensesTableProps extends ExpenseActionHandlers {
  rows: Expense[];
  loading: boolean;
  empty: ReactNode;
}

export const ExpensesTable = ({ rows, loading, empty, ...actions }: ExpensesTableProps) => (
  <DataTable
    columns={buildColumns(actions)}
    rows={rows}
    rowKey={(expense) => expense.id}
    label="Expenses"
    loading={loading}
    skeletonRows={EXPENSE_SKELETON_ROWS}
    empty={empty}
  />
);

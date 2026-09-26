import { createColumnHelper } from '@tanstack/react-table';
import type { ComponentProps } from 'react';

import type { Expense } from '@api/process-backend/expenses';
import { DataTable, type DataTableFeatures } from '@components/ui/data-table';
import { formatShortDate } from '@utils/format/date';
import { formatMoney } from '@utils/format/money';

import { EXPENSE_SKELETON_ROWS, ExpenseActions, type ExpenseActionHandlers } from './expense-card';

const helper = createColumnHelper<DataTableFeatures, Expense>();

// Column ids that sort are the API's sort keys: spentOn, category, amount.
export const buildExpenseColumns = (actions: ExpenseActionHandlers) =>
  helper.columns([
    helper.accessor('spentOn', {
      header: 'Date',
      enableSorting: true,
      meta: {
        className: 'w-[12%] whitespace-nowrap tabular-nums',
        exportValue: (expense) => expense.spentOn,
      },
      cell: ({ row }) => formatShortDate(row.original.spentOn),
    }),
    helper.accessor('category', {
      header: 'Category',
      enableSorting: true,
      meta: { className: 'w-[22%]', hideable: false, exportValue: (expense) => expense.category },
      cell: ({ row }) => (
        <span className="block min-w-0 truncate font-medium">{row.original.category}</span>
      ),
    }),
    helper.display({
      id: 'account',
      header: 'Paid from',
      meta: { className: 'w-[20%]', exportValue: (expense) => expense.bankAccount.name },
      cell: ({ row }) => (
        <span className="block min-w-0 truncate">{row.original.bankAccount.name}</span>
      ),
    }),
    helper.display({
      id: 'notes',
      header: 'Notes',
      meta: { exportValue: (expense) => expense.notes },
      cell: ({ row }) => (
        <span className="block min-w-0 truncate text-fg-subtle">{row.original.notes || '—'}</span>
      ),
    }),
    helper.accessor('amount', {
      header: 'Amount',
      enableSorting: true,
      meta: {
        className: 'w-[14%] text-right whitespace-nowrap',
        exportValue: (expense) => expense.amount,
      },
      cell: ({ row }) => (
        <span className="font-mono font-semibold">{formatMoney(row.original.amount)}</span>
      ),
    }),
    helper.display({
      id: 'actions',
      header: '',
      meta: { label: 'Actions', hideable: false },
      cell: ({ row }) => <ExpenseActions expense={row.original} {...actions} />,
    }),
  ]);

type ExpensesTableProps = Omit<
  ComponentProps<typeof DataTable<Expense>>,
  'label' | 'rowKey' | 'skeletonRows'
>;

export const ExpensesTable = (props: ExpensesTableProps) => (
  <DataTable
    {...props}
    label="Expenses"
    rowKey={(expense) => expense.id}
    skeletonRows={EXPENSE_SKELETON_ROWS}
  />
);

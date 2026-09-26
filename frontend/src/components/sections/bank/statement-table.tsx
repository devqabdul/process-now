import { createColumnHelper } from '@tanstack/react-table';
import type { ComponentProps } from 'react';

import type { StatementEntry } from '@api/process-backend/bank-accounts';
import { DataTable, type DataTableFeatures } from '@components/ui/data-table';
import { cn } from '@lib/cn';
import { formatShortDate } from '@utils/format/date';
import { formatMoney } from '@utils/format/money';

const helper = createColumnHelper<DataTableFeatures, StatementEntry>();

// The sign carries the direction for anyone who can't tell the two colours apart.
const KIND = {
  in: { sign: '+', label: 'Received', className: 'text-success' },
  out: { sign: '−', label: 'Paid out', className: 'text-danger-strong' },
} as const;

export const statementColumns = helper.columns([
  helper.display({
    id: 'date',
    header: 'Date',
    meta: {
      className: 'w-[18%] whitespace-nowrap tabular-nums',
      exportValue: (entry) => entry.date,
    },
    cell: ({ row }) => formatShortDate(row.original.date),
  }),
  helper.display({
    id: 'details',
    header: 'Details',
    meta: {
      hideable: false,
      exportValue: (entry) =>
        [KIND[entry.kind].label, entry.title, entry.detail].filter(Boolean).join(' · '),
    },
    cell: ({ row }) => (
      <span className="block min-w-0">
        <span className="block truncate font-medium">{row.original.title}</span>
        <span className="block truncate text-xs text-fg-subtle">
          {KIND[row.original.kind].label}
          {row.original.detail ? ` · ${row.original.detail}` : ''}
        </span>
      </span>
    ),
  }),
  helper.display({
    id: 'amount',
    header: 'Amount',
    meta: {
      className: 'w-[24%] text-right whitespace-nowrap',
      // Unsigned: the direction is in Details, and a leading "−" would read as a formula.
      exportValue: (entry) => entry.amount,
    },
    cell: ({ row }) => {
      const kind = KIND[row.original.kind];
      return (
        <span className={cn('font-mono font-semibold', kind.className)}>
          {kind.sign}
          {formatMoney(row.original.amount)}
        </span>
      );
    },
  }),
]);

type StatementTableProps = Omit<
  ComponentProps<typeof DataTable<StatementEntry>>,
  'columns' | 'label' | 'rowKey' | 'tableClassName'
>;

export const StatementTable = (props: StatementTableProps) => (
  <DataTable
    {...props}
    columns={statementColumns}
    rowKey={(entry) => `${entry.kind}-${entry.id}`}
    label="Statement entries"
    tableClassName="min-w-[32rem]"
  />
);

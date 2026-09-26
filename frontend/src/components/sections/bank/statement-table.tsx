import { createColumnHelper } from '@tanstack/react-table';
import type { ReactNode } from 'react';

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

const columns = helper.columns([
  helper.display({
    id: 'date',
    header: 'Date',
    meta: { className: 'w-[18%] whitespace-nowrap font-mono' },
    cell: ({ row }) => formatShortDate(row.original.date),
  }),
  helper.display({
    id: 'details',
    header: 'Details',
    cell: ({ row }) => (
      <span className="block min-w-0">
        <span className="block truncate font-medium">{row.original.title}</span>
        <span className="block truncate text-[11.5px] text-fg-subtle">
          {KIND[row.original.kind].label}
          {row.original.detail ? ` · ${row.original.detail}` : ''}
        </span>
      </span>
    ),
  }),
  helper.display({
    id: 'amount',
    header: 'Amount',
    meta: { className: 'w-[24%] text-right whitespace-nowrap' },
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

interface StatementTableProps {
  rows: StatementEntry[];
  loading: boolean;
  empty: ReactNode;
}

export const StatementTable = ({ rows, loading, empty }: StatementTableProps) => (
  <DataTable
    columns={columns}
    rows={rows}
    rowKey={(entry) => `${entry.kind}-${entry.id}`}
    label="Statement entries"
    loading={loading}
    empty={empty}
    tableClassName="min-w-[32rem]"
  />
);

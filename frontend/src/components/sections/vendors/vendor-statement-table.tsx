import { createColumnHelper } from '@tanstack/react-table';
import type { ComponentProps } from 'react';

import type { VendorStatementEntry } from '@api/process-backend/vendors';
import { Badge } from '@components/ui/badge';
import { DataTable, type DataTableFeatures } from '@components/ui/data-table';
import { cn } from '@lib/cn';
import { formatShortDate } from '@utils/format/date';
import { formatMoney } from '@utils/format/money';

const helper = createColumnHelper<DataTableFeatures, VendorStatementEntry>();

// The sign carries the direction for anyone who can't tell the two colours apart.
const KIND = {
  order: { sign: '', label: 'Order', className: 'text-fg-muted' },
  bill: { sign: '+', label: 'Billed', className: 'text-fg' },
  payment: { sign: '−', label: 'Paid', className: 'text-success' },
} as const;

const isVoided = (entry: VendorStatementEntry) =>
  entry.kind === 'bill' && entry.status === 'voided';

export const vendorStatementColumns = helper.columns([
  helper.display({
    id: 'date',
    header: 'Date',
    meta: {
      className: 'w-[14%] whitespace-nowrap tabular-nums',
      exportValue: (entry) => entry.date,
    },
    cell: ({ row }) => formatShortDate(row.original.date),
  }),
  helper.display({
    id: 'details',
    header: 'Details',
    meta: {
      hideable: false,
      exportValue: (entry) => [KIND[entry.kind].label, entry.title, entry.detail].join(' · '),
    },
    cell: ({ row }) => (
      <span className="block min-w-0">
        <span className="flex items-center gap-2">
          <span className="truncate font-medium">{row.original.title}</span>
          {isVoided(row.original) && <Badge tone="neutral">Voided</Badge>}
        </span>
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
      className: 'w-[18%] text-right whitespace-nowrap',
      // Unsigned: the direction is in Details, and a leading "−" would read as a formula.
      exportValue: (entry) => entry.amount ?? '',
    },
    cell: ({ row }) => {
      const entry = row.original;
      if (entry.amount === null) return <span className="text-fg-subtle">—</span>;
      const kind = KIND[entry.kind];
      return (
        <span
          className={cn(
            'font-mono font-semibold',
            kind.className,
            isVoided(entry) && 'text-fg-subtle line-through',
          )}
        >
          {kind.sign}
          {formatMoney(entry.amount)}
        </span>
      );
    },
  }),
  helper.display({
    id: 'balance',
    header: 'Due after',
    meta: {
      className: 'w-[18%] text-right whitespace-nowrap',
      exportValue: (entry) => entry.balance,
    },
    cell: ({ row }) => (
      <span className="font-mono text-fg-secondary">{formatMoney(row.original.balance)}</span>
    ),
  }),
]);

type VendorStatementTableProps = Omit<
  ComponentProps<typeof DataTable<VendorStatementEntry>>,
  'columns' | 'label' | 'rowKey' | 'tableClassName'
>;

export const VendorStatementTable = (props: VendorStatementTableProps) => (
  <DataTable
    {...props}
    columns={vendorStatementColumns}
    rowKey={(entry) => `${entry.kind}-${entry.id}`}
    label="Vendor transactions"
    tableClassName="min-w-[40rem]"
  />
);

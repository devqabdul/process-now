import { createColumnHelper } from '@tanstack/react-table';
import type { ComponentProps } from 'react';

import type { Bill } from '@api/process-backend/billing';
import { LetterTile } from '@components/ui/avatar';
import { DataTable, type DataTableFeatures } from '@components/ui/data-table';
import { formatShortDate } from '@utils/format/date';
import { formatMoney } from '@utils/format/money';

import {
  BILL_SKELETON_ROWS,
  BillActions,
  type BillActionHandlers,
  BillStatusBadge,
} from './bill-card';

const helper = createColumnHelper<DataTableFeatures, Bill>();

// Column ids that sort are the API's sort keys: billNo, issuedAt, total.
export const buildBillColumns = (actions: BillActionHandlers) =>
  helper.columns([
    helper.accessor('billNo', {
      header: 'Bill',
      enableSorting: true,
      meta: {
        className: 'w-24 font-mono whitespace-nowrap text-fg-muted',
        hideable: false,
        exportValue: (bill) => bill.billNo,
      },
      cell: ({ row }) => row.original.billNo,
    }),
    helper.display({
      id: 'vendor',
      header: 'Vendor',
      meta: { className: 'w-[24%] font-medium', exportValue: (bill) => bill.order.vendor.name },
      cell: ({ row }) => (
        <span className="flex items-center gap-2.5">
          <LetterTile name={row.original.order.vendor.name} size="sm" />
          <span className="min-w-0 truncate">{row.original.order.vendor.name}</span>
        </span>
      ),
    }),
    helper.display({
      id: 'order',
      header: 'Order',
      meta: {
        className: 'w-24 font-mono whitespace-nowrap text-fg-muted',
        exportValue: (bill) => bill.order.orderNo,
      },
      cell: ({ row }) => row.original.order.orderNo,
    }),
    helper.accessor('issuedAt', {
      header: 'Issued',
      enableSorting: true,
      meta: { className: 'w-24 text-fg-muted tabular-nums', exportValue: (bill) => bill.issuedAt },
      cell: ({ row }) => formatShortDate(row.original.issuedAt),
    }),
    helper.accessor('total', {
      header: 'Total',
      enableSorting: true,
      meta: { className: 'w-28 text-right font-mono', exportValue: (bill) => bill.total },
      cell: ({ row }) => formatMoney(row.original.total),
    }),
    helper.display({
      id: 'paid',
      header: 'Paid',
      meta: {
        className: 'w-28 text-right font-mono text-fg-muted',
        exportValue: (bill) => bill.amountPaid,
      },
      cell: ({ row }) => formatMoney(row.original.amountPaid),
    }),
    helper.display({
      id: 'due',
      header: 'Due',
      meta: { className: 'w-28 text-right font-mono', exportValue: (bill) => bill.amountDue },
      cell: ({ row }) => formatMoney(row.original.amountDue),
    }),
    helper.display({
      id: 'status',
      header: 'Status',
      meta: { className: 'w-24', exportValue: (bill) => bill.status },
      cell: ({ row }) => <BillStatusBadge status={row.original.status} />,
    }),
    helper.display({
      id: 'actions',
      header: '',
      meta: { label: 'Actions', hideable: false },
      cell: ({ row }) => <BillActions bill={row.original} {...actions} />,
    }),
  ]);

type BillsTableProps = Omit<
  ComponentProps<typeof DataTable<Bill>>,
  'label' | 'rowKey' | 'skeletonRows' | 'tableClassName'
>;

export const BillsTable = (props: BillsTableProps) => (
  <DataTable
    {...props}
    label="Bills"
    rowKey={(bill) => bill.id}
    skeletonRows={BILL_SKELETON_ROWS}
    tableClassName="min-w-[900px]"
  />
);

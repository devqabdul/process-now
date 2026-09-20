import { createColumnHelper } from '@tanstack/react-table';
import type { ReactNode } from 'react';

import type { Order } from '@api/process-backend/orders';
import { LetterTile } from '@components/ui/avatar';
import { DataTable, type DataTableFeatures } from '@components/ui/data-table';
import { formatShortDate } from '@utils/format/date';
import { formatMoney } from '@utils/format/money';

import {
  ORDER_SKELETON_ROWS,
  OrderActions,
  type OrderActionHandlers,
  orderQuantity,
  OrderServices,
  OrderStatusBadge,
} from './order-card';

const helper = createColumnHelper<DataTableFeatures, Order>();

const buildColumns = (actions: OrderActionHandlers) =>
  helper.columns([
    helper.accessor('orderNo', {
      header: 'Order',
      enableSorting: true,
      sortFn: 'text',
      meta: { className: 'w-24 font-mono text-fg-muted' },
      cell: ({ row }) => row.original.orderNo,
    }),
    helper.display({
      id: 'vendor',
      header: 'Vendor',
      meta: { className: 'w-[22%] font-medium' },
      cell: ({ row }) => (
        <span className="flex items-center gap-2.5">
          <LetterTile name={row.original.vendor.name} size="sm" />
          <span className="min-w-0 truncate">{row.original.vendor.name}</span>
        </span>
      ),
    }),
    helper.display({
      id: 'service',
      header: 'Service',
      meta: { className: 'w-[22%] text-fg-secondary' },
      cell: ({ row }) => <OrderServices order={row.original} />,
    }),
    helper.display({
      id: 'qty',
      header: 'Quantity in',
      meta: { className: 'w-28 font-mono' },
      cell: ({ row }) => orderQuantity(row.original),
    }),
    helper.accessor('receivedAt', {
      header: 'Received',
      enableSorting: true,
      sortFn: 'text',
      meta: { className: 'w-24 font-mono text-fg-muted' },
      cell: ({ row }) => formatShortDate(row.original.receivedAt),
    }),
    helper.display({
      id: 'status',
      header: 'Status',
      meta: { className: 'w-28' },
      cell: ({ row }) => <OrderStatusBadge status={row.original.status} />,
    }),
    helper.display({
      id: 'bill',
      header: 'Bill',
      meta: { className: 'w-28 font-mono text-[11px] text-fg-muted' },
      cell: ({ row }) =>
        row.original.bill ? (
          <>
            {row.original.bill.billNo}
            <span className="block">{formatMoney(row.original.bill.total)}</span>
          </>
        ) : (
          '—'
        ),
    }),
    helper.display({
      id: 'actions',
      header: '',
      meta: { className: 'w-12' },
      cell: ({ row }) => <OrderActions order={row.original} {...actions} />,
    }),
  ]);

interface OrdersTableProps extends OrderActionHandlers {
  rows: Order[];
  loading: boolean;
  empty: ReactNode;
}

export const OrdersTable = ({ rows, loading, empty, ...actions }: OrdersTableProps) => (
  <DataTable
    columns={buildColumns(actions)}
    rows={rows}
    rowKey={(order) => order.id}
    label="Orders"
    loading={loading}
    skeletonRows={ORDER_SKELETON_ROWS}
    tableClassName="min-w-[860px]"
    empty={empty}
  />
);

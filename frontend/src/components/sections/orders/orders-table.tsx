import { createColumnHelper } from '@tanstack/react-table';
import type { ComponentProps } from 'react';

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

// Column ids that sort are the API's sort keys: orderNo, vendor, receivedAt.
export const buildOrderColumns = (actions: OrderActionHandlers) =>
  helper.columns([
    helper.accessor('orderNo', {
      header: 'Order',
      enableSorting: true,
      meta: {
        className: 'w-24 font-mono whitespace-nowrap text-fg-muted',
        hideable: false,
        exportValue: (order) => order.orderNo,
      },
      cell: ({ row }) => row.original.orderNo,
    }),
    helper.accessor((order) => order.vendor.name, {
      id: 'vendor',
      header: 'Vendor',
      enableSorting: true,
      meta: { className: 'w-[22%] font-medium', exportValue: (order) => order.vendor.name },
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
      meta: {
        className: 'w-[20%] text-fg-secondary',
        exportValue: (order) => order.items.map((item) => item.serviceType.name).join('; '),
      },
      cell: ({ row }) => <OrderServices order={row.original} />,
    }),
    helper.display({
      id: 'qty',
      header: 'Quantity in',
      meta: {
        className: 'w-28 text-right font-mono',
        exportValue: (order) => order.items.reduce((sum, item) => sum + Number(item.qtyIn), 0),
      },
      cell: ({ row }) => orderQuantity(row.original),
    }),
    helper.accessor('receivedAt', {
      header: 'Received',
      enableSorting: true,
      meta: {
        className: 'w-24 text-fg-muted tabular-nums',
        exportValue: (order) => order.receivedAt,
      },
      cell: ({ row }) => formatShortDate(row.original.receivedAt),
    }),
    helper.display({
      id: 'status',
      header: 'Status',
      meta: { className: 'w-28', exportValue: (order) => order.status },
      cell: ({ row }) => <OrderStatusBadge status={row.original.status} />,
    }),
    helper.display({
      id: 'bill',
      header: 'Bill',
      meta: {
        className: 'w-24 font-mono whitespace-nowrap text-fg-muted',
        exportValue: (order) => order.bill?.billNo,
      },
      cell: ({ row }) => row.original.bill?.billNo ?? '—',
    }),
    helper.display({
      id: 'billTotal',
      header: 'Bill total',
      meta: {
        className: 'w-28 text-right font-mono',
        exportValue: (order) => order.bill?.total,
      },
      cell: ({ row }) => (row.original.bill ? formatMoney(row.original.bill.total) : '—'),
    }),
    helper.display({
      id: 'actions',
      header: '',
      meta: { label: 'Actions', hideable: false },
      cell: ({ row }) => <OrderActions order={row.original} {...actions} />,
    }),
  ]);

type OrdersTableProps = Omit<
  ComponentProps<typeof DataTable<Order>>,
  'label' | 'rowKey' | 'skeletonRows' | 'tableClassName'
>;

export const OrdersTable = (props: OrdersTableProps) => (
  <DataTable
    {...props}
    label="Orders"
    rowKey={(order) => order.id}
    skeletonRows={ORDER_SKELETON_ROWS}
    tableClassName="min-w-[940px]"
  />
);

import { createColumnHelper } from '@tanstack/react-table';
import { PackageCheck, PackagePlus } from 'lucide-react';
import { Link } from 'react-router';

import type { Dashboard, DashboardPendingOrder } from '@api/process-backend/dashboard';
import { CardList } from '@components/shared/card-list';
import { EmptyState } from '@components/shared/empty-state';
import { useMediaQuery } from '@hooks/use-media-query';
import { Skeleton } from '@components/ui/skeleton';
import { LetterTile } from '@components/ui/avatar';
import { Badge } from '@components/ui/badge';
import { buttonClasses } from '@components/ui/button';
import { Card, CardTitle } from '@components/ui/card';
import { DataTable, type DataTableFeatures } from '@components/ui/data-table';
import { cn } from '@lib/cn';
import { formatShortDate } from '@utils/format/date';
import { formatQuantity } from '@utils/format/quantity';

const PREVIEW_ROWS = 5;

const STATUS = {
  received: { label: 'Received', tone: 'info' },
  processing: { label: 'Processing', tone: 'warning' },
} as const;

const helper = createColumnHelper<DataTableFeatures, DashboardPendingOrder>();

// A five-row preview of the newest work: nothing to sort, so no column opts in.
const columns = helper.columns([
  helper.display({
    id: 'orderNo',
    header: 'Order',
    meta: { className: 'w-24 font-mono whitespace-nowrap text-fg-muted' },
    cell: ({ row }) => row.original.orderNo,
  }),
  helper.display({
    id: 'vendor',
    header: 'Vendor',
    meta: { className: 'min-w-[180px] font-medium' },
    cell: ({ row }) => (
      <span className="flex items-center gap-2">
        <LetterTile name={row.original.vendorName} size="sm" />
        {row.original.vendorName}
      </span>
    ),
  }),
  helper.display({
    id: 'serviceType',
    header: 'Service',
    meta: { className: 'min-w-[140px] text-fg-secondary' },
    cell: ({ row }) => row.original.serviceTypeName,
  }),
  helper.display({
    id: 'qtyIn',
    header: 'Quantity in',
    meta: { className: 'w-28 text-right font-mono' },
    cell: ({ row }) => formatQuantity(row.original.qtyIn, row.original.unit),
  }),
  helper.display({
    id: 'receivedAt',
    header: 'Received',
    meta: { className: 'w-24 text-fg-muted tabular-nums' },
    cell: ({ row }) => formatShortDate(row.original.receivedAt),
  }),
  helper.display({
    id: 'status',
    header: 'Status',
    meta: { className: 'w-28' },
    cell: ({ row }) => {
      // A status the API adds later still renders as itself rather than crashing the page.
      const status = STATUS[row.original.status] ?? {
        label: row.original.status,
        tone: 'neutral' as const,
      };
      return <Badge tone={status.tone}>{status.label}</Badge>;
    },
  }),
]);

const StatusBadge = ({ status }: { status: DashboardPendingOrder['status'] }) => {
  // A status the API adds later still renders as itself rather than crashing the page.
  const meta = STATUS[status] ?? { label: status, tone: 'neutral' as const };
  return <Badge tone={meta.tone}>{meta.label}</Badge>;
};

// Below lg the six columns would need 680px and a sideways scroll — on the screen a shop
// floor opens most often. The same row, stacked.
const PendingOrderCard = ({ order }: { order: DashboardPendingOrder }) => (
  <div className="flex items-start gap-2.5">
    <LetterTile name={order.vendorName} size="sm" className="mt-0.5" />
    <div className="min-w-0 flex-1">
      <p className="flex items-baseline gap-2">
        <span className="min-w-0 truncate text-13 font-medium">{order.vendorName}</span>
        <span className="ml-auto flex-none font-mono text-11 text-fg-muted">{order.orderNo}</span>
      </p>
      <p className="mt-0.5 text-xs text-fg-subtle">
        {order.serviceTypeName} · {formatQuantity(order.qtyIn, order.unit)}
      </p>
      <p className="mt-1.5 flex items-center gap-2">
        <StatusBadge status={order.status} />
        <span className="text-11 text-fg-muted tabular-nums">
          {formatShortDate(order.receivedAt)}
        </span>
      </p>
    </div>
  </div>
);

const PendingOrderCardSkeleton = () => (
  <div className="flex items-start gap-2.5">
    <Skeleton className="size-5 flex-none rounded-6" />
    <div className="min-w-0 flex-1">
      <Skeleton className="inline-block h-2.75 w-2/5" />
      <p className="mt-1.5">
        <Skeleton className="inline-block h-2.25 w-3/5" />
      </p>
    </div>
  </div>
);

interface PendingOrdersTableProps {
  dashboard: Dashboard | undefined;
}

export const PendingOrdersTable = ({ dashboard }: PendingOrdersTableProps) => {
  // Tailwind's lg: the same breakpoint every other list in the app switches at.
  const showTable = useMediaQuery('(min-width: 64rem)');
  const rows = dashboard?.pendingOrders.slice(0, PREVIEW_ROWS) ?? [];

  const empty = dashboard?.hasOrders ? (
    <EmptyState
      icon={PackageCheck}
      title="Nothing pending"
      description="Every order has been returned to its vendor. New work will show up here as soon as it arrives."
    />
  ) : (
    <EmptyState
      icon={PackagePlus}
      title="No orders yet"
      description="Take in your first lot of work and it will appear here until you return it to the vendor."
      action={
        <Link
          to="/orders?new=1"
          className={cn(buttonClasses('primary', 'md'), 'hover:text-primary-fg hover:no-underline')}
        >
          New order
        </Link>
      }
    />
  );

  return (
    <Card>
      <div className="mb-3 flex items-center gap-2.5">
        <CardTitle>Pending orders</CardTitle>
        {dashboard && (
          <span className="rounded-6 bg-surface-muted px-1.5 font-mono text-11 font-semibold text-fg-muted">
            {dashboard.pendingOrdersCount}
          </span>
        )}
        <Link
          to="/orders"
          className="ml-auto flex h-11 items-center text-13 font-semibold text-link hover:text-link-hover lg:h-auto"
        >
          View all
        </Link>
      </div>

      {showTable ? (
        <DataTable
          label="Pending orders"
          columns={columns}
          rows={rows}
          rowKey={(order) => order.id}
          loading={!dashboard}
          skeletonRows={PREVIEW_ROWS}
          tableClassName="min-w-[680px]"
          empty={empty}
        />
      ) : (
        <CardList
          items={rows}
          rowKey={(order) => order.id}
          renderItem={(order) => <PendingOrderCard order={order} />}
          label="Pending orders"
          loading={!dashboard}
          skeleton={<PendingOrderCardSkeleton />}
          skeletonCount={PREVIEW_ROWS}
          empty={empty}
        />
      )}
    </Card>
  );
};

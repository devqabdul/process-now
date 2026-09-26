import { Ban, PackageCheck, Play } from 'lucide-react';

import type { Order, OrderStatus } from '@api/process-backend/orders';
import { LetterTile } from '@components/ui/avatar';
import { Badge, type BadgeTone } from '@components/ui/badge';
import { Card } from '@components/ui/card';
import { Menu, MenuItem } from '@components/ui/menu';
import { Skeleton } from '@components/ui/skeleton';
import { formatShortDate } from '@utils/format/date';
import { formatMoney } from '@utils/format/money';
import { formatQuantity } from '@utils/format/quantity';

export const ORDER_SKELETON_ROWS = 6;

export const ORDER_STATUS: Record<OrderStatus, { label: string; tone: BadgeTone }> = {
  received: { label: 'Received', tone: 'info' },
  processing: { label: 'Processing', tone: 'warning' },
  returned: { label: 'Returned', tone: 'success' },
  cancelled: { label: 'Cancelled', tone: 'neutral' },
};

export const OrderStatusBadge = ({ status }: { status: OrderStatus }) => {
  // A status the API adds later still renders as itself rather than crashing the page.
  const meta = ORDER_STATUS[status] ?? { label: status, tone: 'neutral' as const };
  return <Badge tone={meta.tone}>{meta.label}</Badge>;
};

/** What the order is for: one service, or how many when a lot mixes them. */
export const OrderServices = ({ order }: { order: Order }) => {
  const [first] = order.items;
  if (!first) return <span className="text-fg-subtle">—</span>;
  return (
    <>
      {first.serviceType.name}
      {order.items.length > 1 && (
        <span className="text-fg-subtle"> +{order.items.length - 1} more</span>
      )}
    </>
  );
};

/** Quantity in, summed across the lot — the figure the floor counts. */
export const orderQuantity = (order: Order) => {
  const [first] = order.items;
  if (!first) return '—';
  const total = order.items.reduce((sum, item) => sum + Number(item.qtyIn), 0);
  return formatQuantity(String(total), first.serviceType.unit);
};

export interface OrderActionHandlers {
  onStart: (order: Order) => void;
  onReturn: (order: Order) => void;
  onCancel: (order: Order) => void;
}

export const OrderActions = ({
  order,
  onStart,
  onReturn,
  onCancel,
}: { order: Order } & OrderActionHandlers) => {
  // A returned or cancelled order is finished: nothing left to do to it from here.
  const open = order.status === 'received' || order.status === 'processing';
  if (!open) return null;

  return (
    <Menu label={`Actions for ${order.orderNo}`} className="flex-none">
      {(close) => (
        <>
          {order.status === 'received' && (
            <MenuItem
              onClick={() => {
                close();
                onStart(order);
              }}
            >
              <Play aria-hidden="true" className="size-3.5" strokeWidth={1.8} />
              Start processing
            </MenuItem>
          )}
          <MenuItem
            onClick={() => {
              close();
              onReturn(order);
            }}
          >
            <PackageCheck aria-hidden="true" className="size-3.5" strokeWidth={1.8} />
            Return to vendor
          </MenuItem>
          <MenuItem
            tone="danger"
            onClick={() => {
              close();
              onCancel(order);
            }}
          >
            <Ban aria-hidden="true" className="size-3.5" strokeWidth={1.8} />
            Cancel order
          </MenuItem>
        </>
      )}
    </Menu>
  );
};

export const OrderCard = ({ order, ...actions }: { order: Order } & OrderActionHandlers) => (
  <Card className="p-3.5">
    <div className="flex items-start gap-2.75">
      <LetterTile name={order.vendor.name} />
      <div className="min-w-0 flex-1">
        <p className="flex items-baseline gap-2">
          <span className="min-w-0 truncate text-sm font-semibold">{order.vendor.name}</span>
          <span className="ml-auto flex-none font-mono text-11 text-fg-muted">{order.orderNo}</span>
        </p>
        <p className="mt-1 text-xs text-fg-secondary">
          <OrderServices order={order} /> · {orderQuantity(order)}
        </p>
        <p className="mt-1.5 flex flex-wrap items-center gap-2">
          <OrderStatusBadge status={order.status} />
          <span className="text-11 text-fg-muted tabular-nums">
            {formatShortDate(order.receivedAt)}
          </span>
          {order.bill && (
            <span className="font-mono text-11 text-fg-muted">
              {order.bill.billNo} · {formatMoney(order.bill.total)}
            </span>
          )}
        </p>
      </div>
      {/* Held open when there is no menu, so the IDs line up down the list. */}
      <div className="w-11 flex-none">
        <OrderActions order={order} {...actions} />
      </div>
    </div>
  </Card>
);

export const OrderCardSkeleton = ({ delay = 0 }: { delay?: number }) => {
  const style = { animationDelay: `${delay}s` };
  return (
    <Card className="p-3.5">
      <div className="flex items-start gap-2.75">
        <Skeleton className="size-7 flex-none rounded-9" style={style} />
        <div className="min-w-0 flex-1">
          <Skeleton className="inline-block h-2.75 w-2/5" style={style} />
          <p className="mt-1.5">
            <Skeleton className="inline-block h-2.25 w-3/5" style={style} />
          </p>
        </div>
      </div>
    </Card>
  );
};

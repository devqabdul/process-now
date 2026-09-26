import { Ban, Download, IndianRupee, Share2 } from 'lucide-react';

import type { Bill, BillStatus } from '@api/process-backend/billing';
import { LetterTile } from '@components/ui/avatar';
import { Badge, type BadgeTone } from '@components/ui/badge';
import { Card } from '@components/ui/card';
import { Menu, MenuItem } from '@components/ui/menu';
import { Skeleton } from '@components/ui/skeleton';
import { formatShortDate } from '@utils/format/date';
import { formatMoney } from '@utils/format/money';

export const BILL_SKELETON_ROWS = 6;

export const BILL_STATUS: Record<BillStatus, { label: string; tone: BadgeTone }> = {
  due: { label: 'Due', tone: 'warning' },
  paid: { label: 'Paid', tone: 'success' },
  voided: { label: 'Voided', tone: 'neutral' },
};

export const BillStatusBadge = ({ status }: { status: BillStatus }) => {
  const meta = BILL_STATUS[status] ?? { label: status, tone: 'neutral' as const };
  return <Badge tone={meta.tone}>{meta.label}</Badge>;
};

export interface BillActionHandlers {
  onPay: (bill: Bill) => void;
  onVoid: (bill: Bill) => void;
  onDownload: (bill: Bill) => void;
  onShare: (bill: Bill) => void;
}

export const BillActions = ({
  bill,
  onPay,
  onVoid,
  onDownload,
  onShare,
}: { bill: Bill } & BillActionHandlers) => {
  const due = bill.status === 'due';
  // The API refuses to void a bill with payments against it, so the menu doesn't offer it.
  const canVoid = due && Number(bill.amountPaid) === 0;

  return (
    <Menu label={`Actions for bill ${bill.billNo}`} className="flex-none">
      {(close) => (
        <>
          {due && (
            <MenuItem
              onClick={() => {
                close();
                onPay(bill);
              }}
            >
              <IndianRupee aria-hidden="true" className="size-3.5" strokeWidth={1.8} />
              Record payment
            </MenuItem>
          )}
          <MenuItem
            onClick={() => {
              close();
              onDownload(bill);
            }}
          >
            <Download aria-hidden="true" className="size-3.5" strokeWidth={1.8} />
            Download PDF
          </MenuItem>
          {/* A voided bill is kept for the record, not sent to the vendor. */}
          {bill.status !== 'voided' && (
            <MenuItem
              onClick={() => {
                close();
                onShare(bill);
              }}
            >
              <Share2 aria-hidden="true" className="size-3.5" strokeWidth={1.8} />
              Send on WhatsApp
            </MenuItem>
          )}
          {canVoid && (
            <MenuItem
              tone="danger"
              onClick={() => {
                close();
                onVoid(bill);
              }}
            >
              <Ban aria-hidden="true" className="size-3.5" strokeWidth={1.8} />
              Void bill
            </MenuItem>
          )}
        </>
      )}
    </Menu>
  );
};

export const BillCard = ({ bill, ...actions }: { bill: Bill } & BillActionHandlers) => (
  <Card className="p-3.5">
    <div className="flex items-start gap-2.75">
      <LetterTile name={bill.order.vendor.name} />
      <div className="min-w-0 flex-1">
        <p className="flex items-baseline gap-2">
          <span className="min-w-0 truncate text-sm font-semibold">{bill.order.vendor.name}</span>
          <span className="ml-auto flex-none font-mono text-11 text-fg-muted">{bill.billNo}</span>
        </p>
        <p className="mt-1 font-mono text-xs text-fg-secondary">
          {formatMoney(bill.total)}
          {bill.status === 'due' && (
            <span className="text-fg-subtle"> · {formatMoney(bill.amountDue)} due</span>
          )}
        </p>
        <p className="mt-1.5 flex flex-wrap items-center gap-2">
          <BillStatusBadge status={bill.status} />
          <span className="text-11 text-fg-muted tabular-nums">
            {formatShortDate(bill.issuedAt)} · order {bill.order.orderNo}
          </span>
        </p>
      </div>
      {/* Held open when there is no menu, so the IDs line up down the list. */}
      <div className="w-11 flex-none">
        <BillActions bill={bill} {...actions} />
      </div>
    </div>
  </Card>
);

export const BillCardSkeleton = ({ delay = 0 }: { delay?: number }) => {
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

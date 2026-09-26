import { ArrowDownLeft, ArrowUpRight, CalendarDays, ChevronRight, Inbox } from 'lucide-react';
import { Link } from 'react-router';

import type { StatementEntry } from '@api/process-backend/bank-accounts';
import { EmptyState } from '@components/shared/empty-state';
import { Badge } from '@components/ui/badge';
import { Card } from '@components/ui/card';
import { Skeleton } from '@components/ui/skeleton';
import { cn } from '@lib/cn';
import { formatShortDate } from '@utils/format/date';
import { formatMoney } from '@utils/format/money';

export const RECENT_LIMIT = 5;

// The sign carries the direction for anyone who can't tell the two colours apart.
const KIND = {
  in: {
    icon: ArrowDownLeft,
    sign: '+',
    label: 'In',
    tone: 'success',
    well: 'bg-success-soft text-success',
    amount: 'text-success',
  },
  out: {
    icon: ArrowUpRight,
    sign: '−',
    label: 'Out',
    tone: 'danger',
    well: 'bg-danger-soft text-danger-strong',
    amount: 'text-danger-strong',
  },
} as const;

const DateLabel = ({ date, className }: { date: string; className?: string }) => (
  <span className={cn('items-center gap-1 text-fg-subtle tabular-nums', className)}>
    <CalendarDays aria-hidden="true" className="size-3.5 flex-none" strokeWidth={1.8} />
    {formatShortDate(date)}
  </span>
);

interface RecentEntriesProps {
  // Newest first, at most RECENT_LIMIT.
  entries: StatementEntry[];
  accountId: string | undefined;
  loading: boolean;
  refreshing: boolean;
}

export const RecentEntries = ({ entries, accountId, loading, refreshing }: RecentEntriesProps) => (
  <Card className="p-5">
    <div className="flex items-center justify-between gap-3">
      <h2 className="text-base font-semibold tracking-[-0.01em]">Recent</h2>
      {accountId && (
        <Link
          to={`/bank/${accountId}`}
          className="flex h-11 items-center gap-0.5 text-13 font-semibold text-link hover:text-link-hover lg:h-auto"
        >
          View all
          <ChevronRight aria-hidden="true" className="size-3.75" strokeWidth={2} />
        </Link>
      )}
    </div>

    {loading ? (
      <ul aria-hidden="true" className="mt-2 divide-y divide-line-subtle">
        {Array.from({ length: 3 }, (_, index) => (
          <li key={index} className="flex items-center gap-3 py-3">
            <Skeleton className="size-10 flex-none" />
            <span className="flex-1">
              <Skeleton className="h-2.75 w-2/5" />
              <Skeleton className="mt-2 h-2.25 w-1/4" />
            </span>
            <Skeleton className="h-2.75 w-16" />
          </li>
        ))}
      </ul>
    ) : entries.length === 0 ? (
      <EmptyState
        icon={Inbox}
        title="No movement yet"
        description="Payments recorded into this account and expenses paid from it show up here."
        className="py-10"
      />
    ) : (
      <ul
        className={cn(
          'mt-2 divide-y divide-line-subtle transition-opacity',
          refreshing && 'opacity-50',
        )}
      >
        {entries.map((entry) => {
          const kind = KIND[entry.kind];
          const Icon = kind.icon;
          return (
            <li key={`${entry.kind}-${entry.id}`} className="flex items-center gap-3 py-3">
              <span
                aria-hidden="true"
                className={cn('grid size-10 flex-none place-items-center rounded-full', kind.well)}
              >
                <Icon className="size-4.5" strokeWidth={1.9} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-13 font-medium">{entry.title}</span>
                <span className="flex min-w-0 gap-2 text-xs text-fg-subtle">
                  <DateLabel date={entry.date} className="flex sm:hidden" />
                  {entry.detail && <span className="truncate">{entry.detail}</span>}
                </span>
              </span>
              <DateLabel date={entry.date} className="hidden text-xs sm:flex" />
              <span className="flex flex-none flex-col items-end gap-1 sm:flex-row sm:items-center sm:gap-3">
                <span className={cn('font-mono text-13 font-semibold', kind.amount)}>
                  {kind.sign}
                  {formatMoney(entry.amount)}
                </span>
                <Badge tone={kind.tone}>{kind.label}</Badge>
              </span>
            </li>
          );
        })}
      </ul>
    )}
  </Card>
);

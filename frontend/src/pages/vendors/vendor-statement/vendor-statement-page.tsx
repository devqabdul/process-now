import {
  ArrowDownLeft,
  ArrowLeft,
  CalendarX,
  History,
  PackageOpen,
  ReceiptText,
  Scale,
  WifiOff,
} from 'lucide-react';
import { Link } from 'react-router';

import { VendorStatementTable } from '@components/sections/vendors/vendor-statement-table';
import { DateRangeChip } from '@components/shared/date-range-chip';
import { EmptyState } from '@components/shared/empty-state';
import { LoadError } from '@components/shared/load-error';
import { PageHeader } from '@components/shared/page-header';
import { StatTile, StatTileSkeleton } from '@components/shared/stat-tile';
import { TableToolbar } from '@components/shared/table-toolbar';
import { Badge } from '@components/ui/badge';
import { LoadMore } from '@components/ui/load-more';
import { Pagination } from '@components/ui/pagination';
import { formatShortDate } from '@utils/format/date';
import { formatMoney } from '@utils/format/money';

import { useVendorStatementPage } from './use-vendor-statement-page';

// Five tiles in two columns: the last one, Due now, takes the full row instead of sitting alone.
const GRID =
  'grid grid-cols-2 gap-3 lg:grid-cols-5 [&>*:last-child]:col-span-2 lg:[&>*:last-child]:col-span-1';

export const VendorStatementPage = () => {
  const {
    from,
    to,
    today,
    statement,
    vendor,
    entries,
    total,
    page,
    pageSize,
    shown,
    showPages,
    period,
    activeFilters,
    isLoading,
    isError,
    isRetrying,
    exportError,
    setRange,
    clearRange,
    setPage,
    setPageSize,
    loadMore,
    exportCsv,
    retry,
  } = useVendorStatementPage();

  return (
    <>
      <title>{`${vendor?.name ?? 'Vendor report'} · ProcessNow`}</title>
      <Link
        to="/vendors"
        className="flex h-11 w-fit items-center gap-1.5 text-13 font-semibold text-link hover:text-link-hover lg:h-auto"
      >
        <ArrowLeft aria-hidden="true" className="size-3.75" strokeWidth={2} />
        All vendors
      </Link>
      <PageHeader
        title={vendor?.name ?? 'Vendor report'}
        subtitle={`Orders, bills and payments, ${period}.`}
        actions={
          vendor && (
            <>
              {vendor.isActive === false && <Badge tone="neutral">Inactive</Badge>}
              <Link
                to={`/orders?vendorId=${vendor.id}`}
                className="text-13 font-semibold text-link hover:text-link-hover"
              >
                All their orders
              </Link>
            </>
          )
        }
      />

      {isError ? (
        <LoadError
          framed
          icon={WifiOff}
          title="Couldn't load this report"
          description="The vendor's transactions didn't come back. Check your connection and try again — nothing has been lost."
          onRetry={retry}
          isRetrying={isRetrying}
        />
      ) : (
        <>
          <TableToolbar
            rowCount={total}
            onExport={exportCsv}
            activeFilters={activeFilters}
            onClearAll={clearRange}
          >
            <DateRangeChip from={from} to={to} max={today} onChange={setRange} />
          </TableToolbar>
          {exportError && (
            <p role="alert" className="text-13 text-danger-strong">
              {exportError}
            </p>
          )}

          {statement ? (
            <div className={GRID}>
              <StatTile
                label="Due before"
                value={formatMoney(statement.openingDue)}
                icon={History}
                sub={`Owed going into ${formatShortDate(from)}`}
              />
              <StatTile
                label="Orders in"
                value={statement.ordersIn}
                icon={PackageOpen}
                sub="In this period"
              />
              <StatTile
                label="Billed"
                value={formatMoney(statement.billed)}
                icon={ReceiptText}
                sub="Voided bills left out"
              />
              <StatTile
                label="Received"
                value={formatMoney(statement.received)}
                icon={ArrowDownLeft}
                iconClassName="bg-success-solid text-brand-fg"
                sub="In this period"
              />
              <StatTile
                label="Due now"
                value={formatMoney(statement.closingDue)}
                icon={Scale}
                sub={`At the end of ${formatShortDate(to)}`}
              />
            </div>
          ) : (
            <div className={GRID}>
              {[0, 1, 2, 3, 4].map((key) => (
                <StatTileSkeleton key={key} />
              ))}
            </div>
          )}

          <VendorStatementTable
            rows={entries}
            loading={isLoading}
            summary={
              statement && (
                <>
                  <strong className="font-mono font-semibold text-fg">
                    {formatMoney(statement.billed)}
                  </strong>{' '}
                  billed ·{' '}
                  <strong className="font-mono font-semibold text-fg">
                    {formatMoney(statement.received)}
                  </strong>{' '}
                  received · {period}
                </>
              )
            }
            footer={
              showPages ? (
                <Pagination
                  page={page}
                  pageSize={pageSize}
                  total={total}
                  onPageChange={setPage}
                  onPageSizeChange={setPageSize}
                />
              ) : total > 0 ? (
                <LoadMore shown={shown} total={total} onLoadMore={loadMore} />
              ) : undefined
            }
            empty={
              <EmptyState
                icon={CalendarX}
                title="Nothing in this period"
                description="No order came in, no bill was raised and nothing was paid between these dates. Try a wider range."
              />
            }
          />
        </>
      )}
    </>
  );
};

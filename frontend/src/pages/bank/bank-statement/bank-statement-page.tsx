import { ArrowDownLeft, ArrowLeft, ArrowUpRight, CalendarX, Landmark, WifiOff } from 'lucide-react';
import { Link } from 'react-router';

import { StatementTable } from '@components/sections/bank/statement-table';
import { DateRangeChip } from '@components/shared/date-range-chip';
import { EmptyState } from '@components/shared/empty-state';
import { LoadError } from '@components/shared/load-error';
import { PageHeader } from '@components/shared/page-header';
import { StatTile, StatTileSkeleton } from '@components/shared/stat-tile';
import { TableToolbar } from '@components/shared/table-toolbar';
import { Badge } from '@components/ui/badge';
import { LoadMore } from '@components/ui/load-more';
import { Pagination } from '@components/ui/pagination';
import { formatMoney } from '@utils/format/money';

import { useBankStatementPage } from './use-bank-statement-page';

const GRID = 'grid grid-cols-1 gap-3 sm:grid-cols-3';

export const BankStatementPage = () => {
  const {
    from,
    to,
    today,
    statement,
    account,
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
  } = useBankStatementPage();

  return (
    <>
      <title>{`${account?.name ?? 'Statement'} · ProcessNow`}</title>
      <Link
        to="/bank"
        className="flex h-11 w-fit items-center gap-1.5 text-13 font-semibold text-link hover:text-link-hover lg:h-auto"
      >
        <ArrowLeft aria-hidden="true" className="size-3.75" strokeWidth={2} />
        All accounts
      </Link>
      <PageHeader
        title={account?.name ?? 'Statement'}
        subtitle={`Money in and out, ${period}.`}
        actions={account?.isActive === false ? <Badge tone="neutral">Closed</Badge> : undefined}
      />

      {isError ? (
        <LoadError
          framed
          icon={WifiOff}
          title="Couldn't load this statement"
          description="The account didn't come back. Check your connection and try again — nothing has been lost."
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
                label="Balance"
                value={formatMoney(statement.account.balance)}
                icon={Landmark}
                sub="Right now, all time"
              />
              <StatTile
                label="Money in"
                value={formatMoney(statement.moneyIn)}
                icon={ArrowDownLeft}
                iconClassName="bg-success-solid text-brand-fg"
                sub="In this period"
              />
              <StatTile
                label="Money out"
                value={formatMoney(statement.moneyOut)}
                icon={ArrowUpRight}
                iconClassName="bg-danger-solid text-brand-fg"
                sub="In this period"
              />
            </div>
          ) : (
            <div className={GRID}>
              <StatTileSkeleton />
              <StatTileSkeleton />
              <StatTileSkeleton />
            </div>
          )}

          <StatementTable
            rows={entries}
            loading={isLoading}
            summary={
              statement && (
                <>
                  <strong className="font-mono font-semibold text-fg">
                    {formatMoney(statement.moneyIn)}
                  </strong>{' '}
                  in ·{' '}
                  <strong className="font-mono font-semibold text-fg">
                    {formatMoney(statement.moneyOut)}
                  </strong>{' '}
                  out · {period}
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
                description="No payment landed here and no expense was paid from it between these dates. Try a wider range."
              />
            }
          />
        </>
      )}
    </>
  );
};

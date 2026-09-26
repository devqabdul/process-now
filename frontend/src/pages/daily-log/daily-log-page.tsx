import { CalendarPlus, ClipboardList, WifiOff } from 'lucide-react';

import { DailyLogFormDialog } from '@components/sections/daily-log/daily-log-form-dialog';
import {
  DAILY_LOG_SKELETON_ROWS,
  DailyLogCard,
  DailyLogCardSkeleton,
  DailyLogsTable,
} from '@components/sections/daily-log/daily-logs-table';
import { TodayLogCard } from '@components/sections/daily-log/today-log-card';
import { CardList } from '@components/shared/card-list';
import { DateRangeChip } from '@components/shared/date-range-chip';
import { EmptyState } from '@components/shared/empty-state';
import { LoadError } from '@components/shared/load-error';
import { PageHeader } from '@components/shared/page-header';
import { TableToolbar } from '@components/shared/table-toolbar';
import { Toast } from '@components/shared/toast';
import { Button } from '@components/ui/button';
import { Pagination } from '@components/ui/pagination';
import { formatCount } from '@utils/format/count';

import { useDailyLogPage } from './use-daily-log-page';

const QTY = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 });

export const DailyLogPage = () => {
  const {
    today,
    todayLabel,
    todayLog,
    isTodayLoading,
    isTodayError,
    from,
    to,
    period,
    rate,
    logs,
    pageLogs,
    daysLogged,
    daysInRange,
    totalHours,
    totalUnits,
    page,
    pageSize,
    activeFilters,
    columns,
    target,
    saved,
    showTable,
    isLoading,
    isRefreshing,
    isError,
    exportError,
    setRange,
    clearFilters,
    setPage,
    setPageSize,
    exportCsv,
    saveToday,
    save,
    openNew,
    openEdit,
    closeDialog,
    dismissSaved,
    retry,
    retryToday,
  } = useDailyLogPage();

  const empty = (
    <EmptyState
      icon={ClipboardList}
      title="No days logged in this period"
      description="Nothing was recorded between these dates. Widen the range, or log a day you missed."
      action={
        <Button size="sm" onClick={openNew}>
          Log a day
        </Button>
      }
    />
  );

  const summary = (
    <>
      <strong className="font-semibold text-fg tabular-nums">
        {daysLogged} of {formatCount(daysInRange, 'day', 'days')}
      </strong>{' '}
      logged · <span className="tabular-nums">{QTY.format(totalHours)}</span> machine hours ·{' '}
      <span className="tabular-nums">{QTY.format(totalUnits)}</span> units · {period}
    </>
  );

  const error = (
    <LoadError
      icon={WifiOff}
      title="Couldn't load your daily logs"
      description="The history didn't come back. Check your connection and try again — nothing has been lost."
      onRetry={retry}
    />
  );

  return (
    <>
      <title>Daily log · ProcessNow</title>
      <PageHeader
        title="Daily log"
        subtitle="Machine hours and electricity for each day — the real numbers behind your costs."
        actions={
          <Button size="sm" variant="secondary" onClick={openNew}>
            <CalendarPlus aria-hidden="true" className="size-3.75" strokeWidth={2} />
            Log another day
          </Button>
        }
      />

      <TodayLogCard
        today={today}
        todayLabel={todayLabel}
        log={todayLog}
        rate={rate}
        loading={isTodayLoading}
        error={isTodayError}
        onRetry={retryToday}
        onSubmit={saveToday}
      />

      <h2 className="sr-only">History</h2>
      <TableToolbar
        rowCount={logs.length}
        onExport={exportCsv}
        activeFilters={activeFilters}
        onClearAll={clearFilters}
      >
        <DateRangeChip from={from} to={to} max={today} onChange={setRange} />
      </TableToolbar>
      {exportError && (
        <p role="alert" className="text-13 text-danger-strong">
          {exportError}
        </p>
      )}

      {showTable ? (
        <DailyLogsTable
          columns={columns}
          rows={pageLogs}
          loading={isLoading}
          refreshing={isRefreshing}
          error={isError ? error : undefined}
          empty={empty}
          summary={summary}
          footer={
            <Pagination
              page={page}
              pageSize={pageSize}
              total={logs.length}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          }
        />
      ) : (
        <CardList
          items={logs}
          rowKey={(log) => log.id}
          renderItem={(log) => <DailyLogCard log={log} rate={rate} onEdit={openEdit} />}
          label="Daily logs"
          loading={isLoading}
          skeleton={<DailyLogCardSkeleton />}
          skeletonCount={DAILY_LOG_SKELETON_ROWS}
          error={isError ? error : undefined}
          empty={empty}
          summary={summary}
        />
      )}

      {/* Always mounted: a live region has to exist before the count it announces changes. */}
      <p role="status" className="sr-only">
        {!isLoading && !isError ? `${formatCount(daysLogged, 'day', 'days')} logged.` : null}
      </p>

      <DailyLogFormDialog
        target={target}
        today={today}
        rate={rate}
        onClose={closeDialog}
        onSubmit={save}
      />

      <Toast message={saved} onDismiss={dismissSaved} />
    </>
  );
};

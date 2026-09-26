import { ReceiptText, SearchX, WifiOff } from 'lucide-react';
import { Link } from 'react-router';

import {
  BILL_SKELETON_ROWS,
  BILL_STATUS,
  BillCard,
  BillCardSkeleton,
  BillStatusBadge,
} from '@components/sections/bills/bill-card';
import { BillsTable } from '@components/sections/bills/bills-table';
import { ShareBillDialog } from '@components/sections/bills/share-bill-dialog';
import { RecordPaymentDialog } from '@components/sections/bills/record-payment-dialog';
import { VoidBillDialog } from '@components/sections/bills/void-bill-dialog';
import { CardList } from '@components/shared/card-list';
import { EmptyState } from '@components/shared/empty-state';
import { LoadError } from '@components/shared/load-error';
import { PageHeader } from '@components/shared/page-header';
import { TableToolbar } from '@components/shared/table-toolbar';
import { Toast } from '@components/shared/toast';
import { Button, buttonClasses } from '@components/ui/button';
import { FilterChip } from '@components/ui/filter-chip';
import { LoadMore } from '@components/ui/load-more';
import { Pagination } from '@components/ui/pagination';
import { formatCount } from '@utils/format/count';

import { BILL_STATUSES, useBillsListPage } from './use-bills-list-page';

const STATUS_OPTIONS = BILL_STATUSES.map((status) => ({
  value: status,
  label: BILL_STATUS[status].label,
  render: <BillStatusBadge status={status} />,
}));

export const BillsListPage = () => {
  const {
    bills,
    total,
    page,
    pageSize,
    q,
    sorting,
    statuses,
    hasFilters,
    columns,
    columnVisibility,
    pickerColumns,
    accounts,
    showTable,
    isLoading,
    isRefreshing,
    isLoadingMore,
    isError,
    exportError,
    fileError,
    readyToShare,
    confirmShare,
    cancelShare,
    payTarget,
    voidTarget,
    isSubmitting,
    actionError,
    saved,
    setPage,
    setPageSize,
    setQ,
    setSorting,
    setStatuses,
    clearFilters,
    setColumnVisibility,
    toggleColumn,
    loadMore,
    exportCsv,
    openPay,
    closePay,
    confirmPay,
    openVoid,
    closeVoid,
    confirmVoid,
    downloadPdf,
    sharePdf,
    dismissSaved,
    retry,
  } = useBillsListPage();

  const rowActions = {
    onPay: openPay,
    onVoid: openVoid,
    onDownload: downloadPdf,
    onShare: sharePdf,
  };

  const empty = hasFilters ? (
    <EmptyState
      icon={SearchX}
      title="No bill matches"
      description="Nothing fits this search and these filters. Try fewer letters, or clear them."
      action={
        <Button variant="secondary" size="sm" onClick={clearFilters}>
          Clear search and filters
        </Button>
      }
    />
  ) : (
    <EmptyState
      icon={ReceiptText}
      title="No bills yet"
      description="A bill is raised when an order is returned to its vendor. Return one from the Orders page."
      action={
        <Link to="/orders" className={buttonClasses('primary', 'sm')}>
          Go to orders
        </Link>
      }
    />
  );

  const summary = (
    <strong className="font-semibold text-fg">{formatCount(total, 'bill', 'bills')}</strong>
  );

  const error = (
    <LoadError
      icon={WifiOff}
      title="Couldn't load the bills"
      description="The list didn't come back. Check your connection and try again — nothing has been lost."
      onRetry={retry}
    />
  );

  return (
    <>
      <title>Bills · ProcessNow</title>
      <PageHeader title="Bills" subtitle="What each vendor owes, and what they've paid." />

      <TableToolbar
        rowCount={total}
        search={q}
        onSearchChange={setQ}
        searchLabel="Search bills by vendor or number"
        searchPlaceholder="Search bills…"
        columns={pickerColumns}
        onToggleColumn={toggleColumn}
        onExport={exportCsv}
        activeFilters={Number(statuses.length > 0)}
        onClearAll={clearFilters}
      >
        <FilterChip
          label="Status"
          options={STATUS_OPTIONS}
          selected={statuses}
          onChange={setStatuses}
          onClear={() => setStatuses([])}
        />
      </TableToolbar>
      {(exportError ?? fileError) && (
        <p role="alert" className="text-13 text-danger-strong">
          {exportError ?? fileError}
        </p>
      )}

      {showTable ? (
        <BillsTable
          columns={columns}
          rows={bills}
          loading={isLoading}
          refreshing={isRefreshing}
          error={isError ? error : undefined}
          empty={empty}
          sorting={sorting}
          onSortingChange={setSorting}
          columnVisibility={columnVisibility}
          onColumnVisibilityChange={setColumnVisibility}
          summary={summary}
          footer={
            <Pagination
              page={page}
              pageSize={pageSize}
              total={total}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          }
        />
      ) : (
        <CardList
          items={bills}
          rowKey={(bill) => bill.id}
          renderItem={(bill) => <BillCard bill={bill} {...rowActions} />}
          label="Bills"
          loading={isLoading}
          skeleton={<BillCardSkeleton />}
          skeletonCount={BILL_SKELETON_ROWS}
          error={isError ? error : undefined}
          empty={empty}
          summary={summary}
          footer={
            <LoadMore
              shown={bills.length}
              total={total}
              loading={isLoadingMore}
              onLoadMore={loadMore}
            />
          }
        />
      )}

      {/* Always mounted: a live region has to exist before the count it announces changes. */}
      <p role="status" className="sr-only">
        {!isLoading && !isError ? `${formatCount(total, 'bill', 'bills')} found.` : null}
      </p>

      <RecordPaymentDialog
        key={payTarget?.id}
        bill={payTarget}
        accounts={accounts}
        isSubmitting={isSubmitting}
        error={actionError}
        onClose={closePay}
        onConfirm={confirmPay}
      />

      <VoidBillDialog
        key={voidTarget?.id}
        bill={voidTarget}
        isSubmitting={isSubmitting}
        error={actionError}
        onClose={closeVoid}
        onConfirm={confirmVoid}
      />

      <ShareBillDialog
        billNo={readyToShare?.billNo ?? null}
        onClose={cancelShare}
        onShare={confirmShare}
      />

      <Toast message={saved} onDismiss={dismissSaved} />
    </>
  );
};

import { PackagePlus, Plus, SearchX, WifiOff } from 'lucide-react';

import { CancelOrderDialog } from '@components/sections/orders/cancel-order-dialog';
import { NewOrderDialog } from '@components/sections/orders/new-order-dialog';
import {
  ORDER_SKELETON_ROWS,
  ORDER_STATUS,
  OrderCard,
  OrderCardSkeleton,
  OrderStatusBadge,
} from '@components/sections/orders/order-card';
import { OrdersTable } from '@components/sections/orders/orders-table';
import { ReturnOrderDialog } from '@components/sections/orders/return-order-dialog';
import { CardList } from '@components/shared/card-list';
import { EmptyState } from '@components/shared/empty-state';
import { LoadError } from '@components/shared/load-error';
import { PageHeader } from '@components/shared/page-header';
import { TableToolbar } from '@components/shared/table-toolbar';
import { Toast } from '@components/shared/toast';
import { Button } from '@components/ui/button';
import { FilterChip } from '@components/ui/filter-chip';
import { LoadMore } from '@components/ui/load-more';
import { Pagination } from '@components/ui/pagination';
import { formatCount } from '@utils/format/count';

import { ORDER_STATUSES, useOrdersListPage } from './use-orders-list-page';

const STATUS_OPTIONS = ORDER_STATUSES.map((status) => ({
  value: status,
  label: ORDER_STATUS[status].label,
  render: <OrderStatusBadge status={status} />,
}));

export const OrdersListPage = () => {
  const {
    orders,
    total,
    page,
    pageSize,
    q,
    sorting,
    statuses,
    vendorIds,
    vendorOptions,
    hasFilters,
    activeFilters,
    columns,
    columnVisibility,
    pickerColumns,
    showTable,
    isLoading,
    isRefreshing,
    isLoadingMore,
    isError,
    exportError,
    returnTarget,
    cancelTarget,
    isSubmitting,
    actionError,
    saved,
    creating,
    activeVendors,
    serviceTypes,
    isLoadingNew,
    openNew,
    closeNew,
    saveNew,
    setPage,
    setPageSize,
    setQ,
    setSorting,
    setStatuses,
    setVendor,
    clearFilters,
    setColumnVisibility,
    toggleColumn,
    loadMore,
    exportCsv,
    start,
    openReturn,
    closeReturn,
    confirmReturn,
    openCancel,
    closeCancel,
    confirmCancel,
    dismissSaved,
    retry,
  } = useOrdersListPage();

  const rowActions = { onStart: start, onReturn: openReturn, onCancel: openCancel };

  const empty = hasFilters ? (
    <EmptyState
      icon={SearchX}
      title="No order matches"
      description="Nothing fits this search and these filters. Try fewer letters, or clear them."
      action={
        <Button variant="secondary" size="sm" onClick={clearFilters}>
          Clear search and filters
        </Button>
      }
    />
  ) : (
    <EmptyState
      icon={PackagePlus}
      title="No open orders"
      description="Take in a lot of work and it will appear here until you return it to the vendor."
      action={
        <Button variant="secondary" size="sm" onClick={openNew}>
          Take in an order
        </Button>
      }
    />
  );

  const summary = (
    <strong className="font-semibold text-fg">{formatCount(total, 'order', 'orders')}</strong>
  );

  const error = (
    <LoadError
      icon={WifiOff}
      title="Couldn't load the orders"
      description="The list didn't come back. Check your connection and try again — nothing has been lost."
      onRetry={retry}
    />
  );

  return (
    <>
      <title>Orders · ProcessNow</title>
      <PageHeader
        title="Orders"
        subtitle="Every lot in the shop, from received to returned."
        actions={
          // Phones already have the tab bar's New button for this.
          <Button size="sm" onClick={openNew} className="hidden lg:inline-flex">
            <Plus aria-hidden="true" className="size-3.75" strokeWidth={2.2} />
            New order
          </Button>
        }
      />

      <TableToolbar
        rowCount={total}
        search={q}
        onSearchChange={setQ}
        searchLabel="Search orders by vendor or number"
        searchPlaceholder="Search orders…"
        columns={pickerColumns}
        onToggleColumn={toggleColumn}
        onExport={exportCsv}
        activeFilters={activeFilters}
        onClearAll={clearFilters}
      >
        <FilterChip
          label="Status"
          options={STATUS_OPTIONS}
          selected={statuses}
          onChange={setStatuses}
          onClear={() => setStatuses([])}
        />
        <FilterChip
          label="Vendor"
          options={vendorOptions}
          selected={vendorIds}
          onChange={setVendor}
          onClear={() => setVendor([])}
        />
      </TableToolbar>
      {exportError && (
        <p role="alert" className="text-13 text-danger-strong">
          {exportError}
        </p>
      )}

      {showTable ? (
        <OrdersTable
          columns={columns}
          rows={orders}
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
          items={orders}
          rowKey={(order) => order.id}
          renderItem={(order) => <OrderCard order={order} {...rowActions} />}
          label="Orders"
          loading={isLoading}
          skeleton={<OrderCardSkeleton />}
          skeletonCount={ORDER_SKELETON_ROWS}
          error={isError ? error : undefined}
          empty={empty}
          summary={summary}
          footer={
            <LoadMore
              shown={orders.length}
              total={total}
              loading={isLoadingMore}
              onLoadMore={loadMore}
            />
          }
        />
      )}

      {/* Always mounted: a live region has to exist before the count it announces changes. */}
      <p role="status" className="sr-only">
        {!isLoading && !isError ? `${formatCount(total, 'order', 'orders')} found.` : null}
      </p>

      <ReturnOrderDialog
        key={returnTarget?.id}
        order={returnTarget}
        isSubmitting={isSubmitting}
        error={actionError}
        onClose={closeReturn}
        onConfirm={confirmReturn}
      />

      <CancelOrderDialog
        key={cancelTarget?.id}
        order={cancelTarget}
        isSubmitting={isSubmitting}
        error={actionError}
        onClose={closeCancel}
        onConfirm={confirmCancel}
      />

      <NewOrderDialog
        open={creating}
        vendors={activeVendors}
        serviceTypes={serviceTypes}
        isLoading={isLoadingNew}
        onClose={closeNew}
        onSubmit={saveNew}
      />

      <Toast message={saved} onDismiss={dismissSaved} />
    </>
  );
};

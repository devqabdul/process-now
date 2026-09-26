import { Plus, SearchX, Truck, WifiOff } from 'lucide-react';

import {
  VENDOR_SKELETON_ROWS,
  VendorCard,
  VendorCardSkeleton,
} from '@components/sections/vendors/vendor-card';
import { VendorFormDialog } from '@components/sections/vendors/vendor-form-dialog';
import { VendorsTable } from '@components/sections/vendors/vendors-table';
import { CardList } from '@components/shared/card-list';
import { EmptyState } from '@components/shared/empty-state';
import { LoadError } from '@components/shared/load-error';
import { PageHeader } from '@components/shared/page-header';
import { TableToolbar } from '@components/shared/table-toolbar';
import { Toast } from '@components/shared/toast';
import { Button } from '@components/ui/button';
import { LoadMore } from '@components/ui/load-more';
import { Pagination } from '@components/ui/pagination';
import { formatCount } from '@utils/format/count';

import { useVendorsListPage } from './use-vendors-list-page';

export const VendorsListPage = () => {
  const {
    vendors,
    total,
    page,
    pageSize,
    q,
    sorting,
    columns,
    columnVisibility,
    pickerColumns,
    target,
    showTable,
    isLoading,
    isRefreshing,
    isLoadingMore,
    isError,
    exportError,
    setPage,
    setPageSize,
    setQ,
    setSorting,
    setColumnVisibility,
    toggleColumn,
    loadMore,
    exportCsv,
    openNew,
    openEdit,
    closeDialog,
    save,
    saved,
    dismissSaved,
    undoRetire,
    setActive,
    retry,
    clearSearch,
  } = useVendorsListPage();

  const empty = q ? (
    <EmptyState
      icon={SearchX}
      title={`No vendor matches “${q}”`}
      description="Nothing here by that name or number. Try fewer letters, or clear the search."
      action={
        <Button variant="secondary" size="sm" onClick={clearSearch}>
          Show all vendors
        </Button>
      }
    />
  ) : (
    <EmptyState
      icon={Truck}
      title="No vendors yet"
      description="Vendors bring the material you process. Add the first one — orders are raised against a vendor."
      action={
        <Button variant="secondary" size="sm" onClick={openNew}>
          Add the first vendor
        </Button>
      }
    />
  );

  const summary = (
    <strong className="font-semibold text-fg">{formatCount(total, 'vendor', 'vendors')}</strong>
  );

  const error = (
    <LoadError
      icon={WifiOff}
      title="Couldn't load your vendors"
      description="The list didn't come back. Check your connection and try again — nothing has been lost."
      onRetry={retry}
    />
  );

  return (
    <>
      <title>Vendors · ProcessNow</title>
      <PageHeader
        title="Vendors"
        subtitle="The businesses whose material you process."
        actions={
          <Button size="sm" onClick={openNew}>
            <Plus aria-hidden="true" className="size-3.75" strokeWidth={2.2} />
            New vendor
          </Button>
        }
      />

      <TableToolbar
        rowCount={total}
        search={q}
        onSearchChange={setQ}
        searchLabel="Search vendors by name or mobile number"
        searchPlaceholder="Search vendors…"
        columns={pickerColumns}
        onToggleColumn={toggleColumn}
        onExport={exportCsv}
      />
      {exportError && (
        <p role="alert" className="text-13 text-danger-strong">
          {exportError}
        </p>
      )}

      {showTable ? (
        <VendorsTable
          columns={columns}
          rows={vendors}
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
          items={vendors}
          rowKey={(vendor) => vendor.id}
          renderItem={(vendor) => (
            <VendorCard vendor={vendor} onEdit={openEdit} onSetActive={setActive} />
          )}
          label="Vendors"
          loading={isLoading}
          skeleton={<VendorCardSkeleton />}
          skeletonCount={VENDOR_SKELETON_ROWS}
          error={isError ? error : undefined}
          empty={empty}
          summary={summary}
          footer={
            <LoadMore
              shown={vendors.length}
              total={total}
              loading={isLoadingMore}
              onLoadMore={loadMore}
            />
          }
        />
      )}

      {/* Always mounted: a live region has to exist before the count it announces changes. */}
      <p role="status" className="sr-only">
        {!isLoading && !isError ? `${formatCount(total, 'vendor', 'vendors')} found.` : null}
      </p>

      <VendorFormDialog target={target} onClose={closeDialog} onSubmit={save} />

      <Toast
        message={saved}
        onDismiss={dismissSaved}
        action={undoRetire ? { label: 'Undo', onClick: undoRetire } : undefined}
      />
    </>
  );
};

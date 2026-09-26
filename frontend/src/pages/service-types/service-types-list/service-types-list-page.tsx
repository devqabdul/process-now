import { Plus, SearchX, Wrench, WifiOff } from 'lucide-react';

import { DeleteServiceTypeDialog } from '@components/sections/service-types/delete-service-type-dialog';
import { ServiceTypeFormDialog } from '@components/sections/service-types/service-type-form-dialog';
import {
  SERVICE_TYPE_SKELETON_ROWS,
  ServiceTypeCard,
  ServiceTypeCardSkeleton,
} from '@components/sections/service-types/service-type-card';
import { ServiceTypesTable } from '@components/sections/service-types/service-types-table';
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

import { useServiceTypesListPage } from './use-service-types-list-page';

export const ServiceTypesListPage = () => {
  const {
    serviceTypes,
    total,
    page,
    pageSize,
    q,
    sorting,
    columns,
    columnVisibility,
    pickerColumns,
    target,
    saved,
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
    dismissSaved,
    undoRetire,
    save,
    setActive,
    deleting,
    isDeleting,
    deleteError,
    askDelete,
    closeDelete,
    confirmDelete,
    retry,
    clearSearch,
  } = useServiceTypesListPage();

  const empty = q ? (
    <EmptyState
      icon={SearchX}
      title={`Nothing matches “${q}”`}
      description="No service on this list has that name. Try fewer letters, or clear the search."
      action={
        <Button variant="secondary" size="sm" onClick={clearSearch}>
          Show all services
        </Button>
      }
    />
  ) : (
    <EmptyState
      icon={Wrench}
      title="No services yet"
      description="A service is a job you do and what you charge for one of them — per piece, per kg, per hour. Orders are priced from this list."
      action={
        <Button variant="secondary" size="sm" onClick={openNew}>
          Add the first service
        </Button>
      }
    />
  );

  const summary = (
    <strong className="font-semibold text-fg">{formatCount(total, 'service', 'services')}</strong>
  );

  const error = (
    <LoadError
      icon={WifiOff}
      title="Couldn't load the services"
      description="The list didn't come back. Check your connection and try again — nothing has been lost."
      onRetry={retry}
    />
  );

  return (
    <>
      <title>Service types · ProcessNow</title>
      <PageHeader
        title="Service types"
        subtitle="What this company does, and what each one earns."
        actions={
          <Button size="sm" onClick={openNew}>
            <Plus aria-hidden="true" className="size-3.75" strokeWidth={2.2} />
            New service
          </Button>
        }
      />

      <TableToolbar
        rowCount={total}
        search={q}
        onSearchChange={setQ}
        searchLabel="Search services by name"
        searchPlaceholder="Search services…"
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
        <ServiceTypesTable
          columns={columns}
          rows={serviceTypes}
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
          items={serviceTypes}
          rowKey={(serviceType) => serviceType.id}
          renderItem={(serviceType) => (
            <ServiceTypeCard
              serviceType={serviceType}
              onEdit={openEdit}
              onSetActive={setActive}
              onDelete={askDelete}
            />
          )}
          label="Service types"
          loading={isLoading}
          skeleton={<ServiceTypeCardSkeleton />}
          skeletonCount={SERVICE_TYPE_SKELETON_ROWS}
          error={isError ? error : undefined}
          empty={empty}
          summary={summary}
          footer={
            <LoadMore
              shown={serviceTypes.length}
              total={total}
              loading={isLoadingMore}
              onLoadMore={loadMore}
            />
          }
        />
      )}

      {/* Always mounted: a live region has to exist before the count it announces changes. */}
      <p role="status" className="sr-only">
        {!isLoading && !isError ? `${formatCount(total, 'service', 'services')} found.` : null}
      </p>

      <ServiceTypeFormDialog target={target} onClose={closeDialog} onSubmit={save} />

      <DeleteServiceTypeDialog
        serviceType={deleting}
        isSubmitting={isDeleting}
        error={deleteError}
        onClose={closeDelete}
        onConfirm={confirmDelete}
      />

      <Toast
        message={saved}
        onDismiss={dismissSaved}
        action={undoRetire ? { label: 'Undo', onClick: undoRetire } : undefined}
      />
    </>
  );
};

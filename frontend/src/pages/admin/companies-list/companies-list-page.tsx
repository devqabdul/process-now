import { Building2, Plus, SearchX, WifiOff } from 'lucide-react';
import { Link, useNavigate, useOutlet } from 'react-router';

import {
  COMPANY_SKELETON_ROWS,
  CompanyCard,
  CompanyCardSkeleton,
} from '@components/sections/admin/company-card';
import { CompaniesTable } from '@components/sections/admin/companies-table';
import { DeactivateCompanyDialog } from '@components/sections/admin/deactivate-company-dialog';
import { ResetPasswordDialog } from '@components/sections/admin/reset-password-dialog';
import { CardList } from '@components/shared/card-list';
import { EmptyState } from '@components/shared/empty-state';
import { LoadError } from '@components/shared/load-error';
import { PageHeader } from '@components/shared/page-header';
import { TableToolbar } from '@components/shared/table-toolbar';
import { Toast } from '@components/shared/toast';
import { Button, buttonClasses } from '@components/ui/button';
import { LoadMore } from '@components/ui/load-more';
import { Pagination } from '@components/ui/pagination';
import { SideSheet } from '@components/ui/side-sheet';
import { useMediaQuery } from '@hooks/use-media-query';
import { formatCount } from '@utils/format/count';

import { useCompaniesListPage } from './use-companies-list-page';

export const CompaniesListPage = () => {
  const {
    rows,
    total,
    page,
    pageSize,
    q,
    sorting,
    columns,
    columnVisibility,
    pickerColumns,
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
    resetTarget,
    showPassword,
    resetDone,
    dismissResetDone,
    deactivateTarget,
    isDeactivating,
    deactivateError,
    openDeactivate,
    closeDeactivate,
    confirmDeactivate,
    activate,
    openReset,
    closeReset,
    togglePassword,
    submitReset,
    retry,
    clearSearch,
  } = useCompaniesListPage();

  const navigate = useNavigate();
  // Tailwind's lg: from here up there is room to keep the list beside the form.
  const asSheet = useMediaQuery('(min-width: 64rem)');
  const outlet = useOutlet({ inSheet: asSheet });
  const closeSheet = () => void navigate('/admin/companies');

  // On a phone the child route replaces the list rather than covering it.
  if (outlet && !asSheet) return outlet;

  const rowActions = {
    onResetPassword: openReset,
    onDeactivate: openDeactivate,
    onActivate: activate,
  };

  const empty = q ? (
    <EmptyState
      icon={SearchX}
      title={`Nothing matches “${q}”`}
      description="No company on ProcessNow has that name. Try fewer letters, or clear the search."
      action={
        <Button variant="secondary" size="sm" onClick={clearSearch}>
          Show all companies
        </Button>
      }
    />
  ) : (
    <EmptyState
      icon={Building2}
      title="No companies yet"
      description="Create the first company — its admin, vendors, service types and orders all hang off this record."
      action={
        <Link to="/admin/companies/new" className={buttonClasses('secondary', 'sm')}>
          Create the first company
        </Link>
      }
    />
  );

  const summary = (
    <strong className="font-semibold text-fg">{formatCount(total, 'company', 'companies')}</strong>
  );

  const error = (
    <LoadError
      icon={WifiOff}
      title="Couldn't load the companies"
      description="The list didn't come back. Check your connection and try again — nothing has been lost."
      onRetry={retry}
    />
  );

  return (
    <>
      <title>Companies · ProcessNow</title>
      <PageHeader
        title="Companies"
        subtitle="Every business running on ProcessNow, and the admin who runs it."
        actions={
          <Link to="/admin/companies/new" className={buttonClasses('primary', 'sm')}>
            <Plus aria-hidden="true" className="size-3.75" strokeWidth={2.2} />
            New company
          </Link>
        }
      />

      <TableToolbar
        rowCount={total}
        search={q}
        onSearchChange={setQ}
        searchLabel="Search companies by name"
        searchPlaceholder="Search companies…"
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
        <CompaniesTable
          columns={columns}
          rows={rows}
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
          items={rows}
          rowKey={(company) => company.id}
          renderItem={(company) => <CompanyCard company={company} {...rowActions} />}
          label="Companies on ProcessNow"
          loading={isLoading}
          skeleton={<CompanyCardSkeleton />}
          skeletonCount={COMPANY_SKELETON_ROWS}
          error={isError ? error : undefined}
          empty={empty}
          summary={summary}
          footer={
            <LoadMore
              shown={rows.length}
              total={total}
              loading={isLoadingMore}
              onLoadMore={loadMore}
            />
          }
        />
      )}

      {/* Always mounted: a live region has to exist before the count it announces changes. */}
      <p role="status" className="sr-only">
        {!isLoading && !isError ? `${formatCount(total, 'company', 'companies')} found.` : null}
      </p>

      <SideSheet
        open={!!outlet}
        title="New company"
        description="Add a business and the admin who will run it."
        onClose={closeSheet}
      >
        {outlet}
      </SideSheet>

      <Toast message={resetDone} onDismiss={dismissResetDone} />

      <DeactivateCompanyDialog
        company={deactivateTarget}
        isSubmitting={isDeactivating}
        error={deactivateError}
        onClose={closeDeactivate}
        onConfirm={confirmDeactivate}
      />

      <ResetPasswordDialog
        company={resetTarget}
        showPassword={showPassword}
        onTogglePassword={togglePassword}
        onClose={closeReset}
        onSubmit={submitReset}
      />
    </>
  );
};

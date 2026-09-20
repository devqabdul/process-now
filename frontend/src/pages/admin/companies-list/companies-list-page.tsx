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
import { EmptyState } from '@components/shared/empty-state';
import { LoadError } from '@components/shared/load-error';
import { PageHeader } from '@components/shared/page-header';
import { Toast } from '@components/shared/toast';
import { Button, buttonClasses } from '@components/ui/button';
import { SearchInput } from '@components/ui/search-input';
import { SideSheet } from '@components/ui/side-sheet';
import { useMediaQuery } from '@hooks/use-media-query';

import { useCompaniesListPage } from './use-companies-list-page';

const SKELETON_CARDS = Array.from({ length: COMPANY_SKELETON_ROWS }, (_, index) => index * 0.08);

export const CompaniesListPage = () => {
  const {
    search,
    setSearch,
    rows,
    totalCount,
    showTable,
    isLoading,
    isError,
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

  const empty = search.trim() ? (
    <EmptyState
      icon={SearchX}
      title={`Nothing matches “${search.trim()}”`}
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
        <Link to="/admin/companies/new" className={buttonClasses('primary', 'sm')}>
          Create the first company
        </Link>
      }
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

      {isError ? (
        <LoadError
          icon={WifiOff}
          title="Couldn't load the companies"
          description="The list didn't come back. Check your connection and try again — nothing has been lost."
          onRetry={retry}
        />
      ) : (
        <>
          <SearchInput
            value={search}
            onChange={setSearch}
            label="Search companies by name"
            placeholder="Search companies…"
            className="lg:max-w-xs"
          />

          {/* Below md a wide table would scroll sideways, so the same rows become cards. */}
          {showTable ? (
            <CompaniesTable rows={rows} loading={isLoading} empty={empty} {...rowActions} />
          ) : (
            <ul className="flex flex-col gap-2.5">
              {isLoading
                ? SKELETON_CARDS.map((delay) => <CompanyCardSkeleton key={delay} delay={delay} />)
                : rows.map((company) => (
                    <CompanyCard key={company.id} company={company} {...rowActions} />
                  ))}
              {!isLoading && rows.length === 0 && (
                <li className="rounded-14 border border-line-input">{empty}</li>
              )}
            </ul>
          )}

          {/* Always mounted: a live region has to exist before the count it announces changes. */}
          <p role="status" className="text-[11.5px] text-fg-subtle empty:sr-only">
            {!isLoading && rows.length > 0
              ? `Showing ${rows.length} of ${totalCount} ${totalCount === 1 ? 'company' : 'companies'}.`
              : null}
          </p>
        </>
      )}

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

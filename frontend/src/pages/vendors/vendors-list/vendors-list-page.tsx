import { Plus, SearchX, Truck, WifiOff } from 'lucide-react';

import {
  VENDOR_SKELETON_ROWS,
  VendorCard,
  VendorCardSkeleton,
} from '@components/sections/vendors/vendor-card';
import { VendorFormDialog } from '@components/sections/vendors/vendor-form-dialog';
import { Toast } from '@components/shared/toast';
import { VendorsTable } from '@components/sections/vendors/vendors-table';
import { EmptyState } from '@components/shared/empty-state';
import { LoadError } from '@components/shared/load-error';
import { PageHeader } from '@components/shared/page-header';
import { Button } from '@components/ui/button';
import { SearchInput } from '@components/ui/search-input';

import { useVendorsListPage } from './use-vendors-list-page';

const SKELETON_CARDS = Array.from({ length: VENDOR_SKELETON_ROWS }, (_, index) => index * 0.08);

export const VendorsListPage = () => {
  const {
    search,
    setSearch,
    vendors,
    target,
    showTable,
    isLoading,
    isError,
    openNew,
    openEdit,
    closeDialog,
    save,
    saved,
    dismissSaved,
    setActive,
    retry,
    clearSearch,
  } = useVendorsListPage();

  const empty = search.trim() ? (
    <EmptyState
      icon={SearchX}
      title={`No vendor matches “${search.trim()}”`}
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
        <Button size="sm" onClick={openNew}>
          Add the first vendor
        </Button>
      }
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

      {isError ? (
        <LoadError
          icon={WifiOff}
          title="Couldn't load your vendors"
          description="The list didn't come back. Check your connection and try again — nothing has been lost."
          onRetry={retry}
        />
      ) : (
        <>
          <SearchInput
            value={search}
            onChange={setSearch}
            label="Search vendors by name or mobile number"
            placeholder="Search vendors…"
            className="lg:max-w-xs"
          />

          {showTable ? (
            <VendorsTable
              rows={vendors}
              loading={isLoading}
              empty={empty}
              onEdit={openEdit}
              onSetActive={setActive}
            />
          ) : (
            <ul className="flex flex-col gap-2.5">
              {isLoading
                ? SKELETON_CARDS.map((delay) => <VendorCardSkeleton key={delay} delay={delay} />)
                : vendors.map((vendor) => (
                    <VendorCard
                      key={vendor.id}
                      vendor={vendor}
                      onEdit={openEdit}
                      onSetActive={setActive}
                    />
                  ))}
              {!isLoading && vendors.length === 0 && (
                <li className="rounded-14 border border-line-input">{empty}</li>
              )}
            </ul>
          )}

          <p role="status" className="text-[11.5px] text-fg-subtle empty:sr-only">
            {!isLoading && vendors.length > 0
              ? `Showing ${vendors.length} ${vendors.length === 1 ? 'vendor' : 'vendors'}.`
              : null}
          </p>
        </>
      )}

      <VendorFormDialog target={target} onClose={closeDialog} onSubmit={save} />

      <Toast message={saved} onDismiss={dismissSaved} />
    </>
  );
};

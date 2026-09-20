import { Plus, SearchX, Wrench, WifiOff } from 'lucide-react';

import { ServiceTypeFormDialog } from '@components/sections/service-types/service-type-form-dialog';
import {
  SERVICE_TYPE_SKELETON_ROWS,
  ServiceTypeCard,
  ServiceTypeCardSkeleton,
} from '@components/sections/service-types/service-type-card';
import { ServiceTypesTable } from '@components/sections/service-types/service-types-table';
import { EmptyState } from '@components/shared/empty-state';
import { LoadError } from '@components/shared/load-error';
import { PageHeader } from '@components/shared/page-header';
import { Toast } from '@components/shared/toast';
import { Button } from '@components/ui/button';
import { SearchInput } from '@components/ui/search-input';

import { useServiceTypesListPage } from './use-service-types-list-page';

const SKELETON_CARDS = Array.from({ length: SERVICE_TYPE_SKELETON_ROWS }, (_, i) => i * 0.08);

export const ServiceTypesListPage = () => {
  const {
    search,
    setSearch,
    serviceTypes,
    totalCount,
    target,
    saved,
    showTable,
    isLoading,
    isError,
    openNew,
    openEdit,
    closeDialog,
    dismissSaved,
    save,
    setActive,
    retry,
    clearSearch,
  } = useServiceTypesListPage();

  const empty = search.trim() ? (
    <EmptyState
      icon={SearchX}
      title={`Nothing matches “${search.trim()}”`}
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
      description="A service is a job you do and what you charge for one of them — fusing a piece, crushing a kilo. Orders are priced from this list."
      action={
        <Button size="sm" onClick={openNew}>
          Add the first service
        </Button>
      }
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

      {isError ? (
        <LoadError
          icon={WifiOff}
          title="Couldn't load the services"
          description="The list didn't come back. Check your connection and try again — nothing has been lost."
          onRetry={retry}
        />
      ) : (
        <>
          <SearchInput
            value={search}
            onChange={setSearch}
            label="Search services by name"
            placeholder="Search services…"
            className="lg:max-w-xs"
          />

          {/* Below md a wide table would scroll sideways, so the same rows become cards. */}
          {showTable ? (
            <ServiceTypesTable
              rows={serviceTypes}
              loading={isLoading}
              empty={empty}
              onEdit={openEdit}
              onSetActive={setActive}
            />
          ) : (
            <ul className="flex flex-col gap-2.5">
              {isLoading
                ? SKELETON_CARDS.map((delay) => (
                    <ServiceTypeCardSkeleton key={delay} delay={delay} />
                  ))
                : serviceTypes.map((serviceType) => (
                    <ServiceTypeCard
                      key={serviceType.id}
                      serviceType={serviceType}
                      onEdit={openEdit}
                      onSetActive={setActive}
                    />
                  ))}
              {!isLoading && serviceTypes.length === 0 && (
                <li className="rounded-14 border border-line-input">{empty}</li>
              )}
            </ul>
          )}

          {/* Always mounted: a live region has to exist before the count it announces changes. */}
          <p role="status" className="text-[11.5px] text-fg-subtle empty:sr-only">
            {!isLoading && serviceTypes.length > 0
              ? `Showing ${serviceTypes.length} of ${totalCount} ${totalCount === 1 ? 'service' : 'services'}.`
              : null}
          </p>
        </>
      )}

      <ServiceTypeFormDialog target={target} onClose={closeDialog} onSubmit={save} />

      <Toast message={saved} onDismiss={dismissSaved} />
    </>
  );
};

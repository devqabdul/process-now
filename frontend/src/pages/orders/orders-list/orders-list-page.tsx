import { PackagePlus, Plus, SearchX, WifiOff } from 'lucide-react';
import { Link } from 'react-router';

import { CancelOrderDialog } from '@components/sections/orders/cancel-order-dialog';
import {
  ORDER_SKELETON_ROWS,
  OrderCard,
  OrderCardSkeleton,
} from '@components/sections/orders/order-card';
import { OrdersTable } from '@components/sections/orders/orders-table';
import { ReturnOrderDialog } from '@components/sections/orders/return-order-dialog';
import { EmptyState } from '@components/shared/empty-state';
import { LoadError } from '@components/shared/load-error';
import { PageHeader } from '@components/shared/page-header';
import { Toast } from '@components/shared/toast';
import { Button, buttonClasses } from '@components/ui/button';
import { SearchInput } from '@components/ui/search-input';
import { cn } from '@lib/cn';

import { STATUS_FILTERS, useOrdersListPage } from './use-orders-list-page';

const SKELETON_CARDS = Array.from({ length: ORDER_SKELETON_ROWS }, (_, i) => i * 0.08);

export const OrdersListPage = () => {
  const {
    search,
    setSearch,
    status,
    setStatus,
    orders,
    showTable,
    isLoading,
    isError,
    returnTarget,
    cancelTarget,
    isSubmitting,
    actionError,
    saved,
    start,
    openReturn,
    closeReturn,
    confirmReturn,
    openCancel,
    closeCancel,
    confirmCancel,
    dismissSaved,
    retry,
    clearSearch,
  } = useOrdersListPage();

  const rowActions = { onStart: start, onReturn: openReturn, onCancel: openCancel };

  const empty = search.trim() ? (
    <EmptyState
      icon={SearchX}
      title={`Nothing matches “${search.trim()}”`}
      description="No order matches that vendor or number. Try fewer letters, or clear the search."
      action={
        <Button variant="secondary" size="sm" onClick={clearSearch}>
          Show all orders
        </Button>
      }
    />
  ) : (
    <EmptyState
      icon={PackagePlus}
      title={status ? 'Nothing at this stage' : 'No orders yet'}
      description={
        status
          ? 'No order is sitting here right now. Try another stage, or show them all.'
          : 'Take in your first lot of work and it will appear here until you return it to the vendor.'
      }
      action={
        status ? (
          <Button variant="secondary" size="sm" onClick={() => setStatus('')}>
            Show all orders
          </Button>
        ) : (
          <Link to="/orders/new" className={buttonClasses('primary', 'sm')}>
            Take in an order
          </Link>
        )
      }
    />
  );

  return (
    <>
      <title>Orders · ProcessNow</title>
      <PageHeader
        title="Orders"
        subtitle="Every lot in the shop, from received to returned."
        actions={
          <Link to="/orders/new" className={buttonClasses('primary', 'sm')}>
            <Plus aria-hidden="true" className="size-3.75" strokeWidth={2.2} />
            New order
          </Link>
        }
      />

      {isError ? (
        <LoadError
          icon={WifiOff}
          title="Couldn't load the orders"
          description="The list didn't come back. Check your connection and try again — nothing has been lost."
          onRetry={retry}
        />
      ) : (
        <>
          <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center">
            <SearchInput
              value={search}
              onChange={setSearch}
              label="Search orders by vendor or number"
              placeholder="Search orders…"
              className="lg:max-w-xs"
            />

            {/* A stage is a filter, not a tab bar: the list is the same list either way. */}
            <div role="group" aria-label="Filter by stage" className="flex flex-wrap gap-1.5">
              {STATUS_FILTERS.map((filter) => (
                <button
                  key={filter.value}
                  type="button"
                  aria-pressed={status === filter.value}
                  onClick={() => setStatus(filter.value)}
                  className={cn(
                    'h-9 rounded-10 border px-3 text-[12px] font-medium transition-colors duration-150',
                    status === filter.value
                      ? 'border-primary bg-primary text-primary-fg'
                      : 'border-line bg-surface text-fg-secondary hover:border-line-strong hover:text-fg',
                  )}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>

          {/* Below md the eight columns would need a sideways scroll, so rows become cards. */}
          {showTable ? (
            <OrdersTable rows={orders} loading={isLoading} empty={empty} {...rowActions} />
          ) : (
            <ul className="flex flex-col gap-2.5">
              {isLoading
                ? SKELETON_CARDS.map((delay) => <OrderCardSkeleton key={delay} delay={delay} />)
                : orders.map((order) => <OrderCard key={order.id} order={order} {...rowActions} />)}
              {!isLoading && orders.length === 0 && (
                <li className="rounded-14 border border-line-input">{empty}</li>
              )}
            </ul>
          )}

          {/* Always mounted: a live region has to exist before the count it announces changes. */}
          <p role="status" className="text-[11.5px] text-fg-subtle empty:sr-only">
            {!isLoading && orders.length > 0
              ? `Showing ${orders.length} ${orders.length === 1 ? 'order' : 'orders'}.`
              : null}
          </p>
        </>
      )}

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

      <Toast message={saved} onDismiss={dismissSaved} />
    </>
  );
};

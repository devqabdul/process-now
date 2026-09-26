import { Landmark, Plus, WifiOff } from 'lucide-react';

import { AccountQuickActions } from '@components/sections/bank/account-quick-actions';
import { BankAccountFormDialog } from '@components/sections/bank/bank-account-form-dialog';
import { MoneyChart } from '@components/sections/bank/money-chart';
import { RecentEntries } from '@components/sections/bank/recent-entries';
import { WalletCardSkeleton, WalletCarousel } from '@components/sections/bank/wallet-carousel';
import { EmptyState } from '@components/shared/empty-state';
import { LoadError } from '@components/shared/load-error';
import { PageHeader } from '@components/shared/page-header';
import { Toast } from '@components/shared/toast';
import { Button } from '@components/ui/button';
import { Card } from '@components/ui/card';

import { useBankAccountsListPage } from './use-bank-accounts-list-page';

export const BankAccountsListPage = () => {
  const {
    accounts,
    selected,
    statement,
    recent,
    from,
    to,
    today,
    period,
    hideBalance,
    target,
    saved,
    isLoading,
    isError,
    isStatementLoading,
    isStatementRefreshing,
    isStatementError,
    select,
    setRange,
    toggleHideBalance,
    openNew,
    openEdit,
    closeDialog,
    dismissSaved,
    save,
    setActive,
    retry,
    retryStatement,
  } = useBankAccountsListPage();

  return (
    <>
      <title>Bank · ProcessNow</title>
      <PageHeader
        title="Bank"
        subtitle="Where the money is: each bank account and the cash in hand."
        actions={
          <Button size="sm" onClick={openNew}>
            <Plus aria-hidden="true" className="size-3.75" strokeWidth={2.2} />
            Add account
          </Button>
        }
      />

      {isError ? (
        <LoadError
          framed
          icon={WifiOff}
          title="Couldn't load your accounts"
          description="The list didn't come back. Check your connection and try again — nothing has been lost."
          onRetry={retry}
        />
      ) : !isLoading && accounts.length === 0 ? (
        <Card>
          <EmptyState
            icon={Landmark}
            title="No accounts yet"
            description="Add “Cash in hand” for the money in the shop, and one for each bank account. Payments land in one, expenses are paid from one."
            action={
              <Button variant="secondary" size="sm" onClick={openNew}>
                Add the first account
              </Button>
            }
          />
        </Card>
      ) : (
        // Phones stack wallet → actions → chart → Recent; from lg the wallet is the right column.
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_22.5rem] lg:gap-5">
          <section
            aria-label="Wallet"
            className="flex min-w-0 flex-col gap-4 lg:col-start-2 lg:row-start-1"
          >
            <Card className="p-5">
              <h2 className="mb-4 text-base font-semibold tracking-[-0.01em]">Wallet</h2>
              {isLoading ? (
                <WalletCardSkeleton />
              ) : (
                <WalletCarousel
                  accounts={accounts}
                  selectedId={selected?.id}
                  hideBalance={hideBalance}
                  onSelect={select}
                  onToggleHideBalance={toggleHideBalance}
                  onAdd={openNew}
                />
              )}
              {selected && (
                <div className="mt-4 border-t border-line-subtle pt-4">
                  <AccountQuickActions
                    account={selected}
                    onEdit={openEdit}
                    onSetActive={setActive}
                  />
                </div>
              )}
            </Card>
          </section>

          <div className="flex min-w-0 flex-col gap-4 lg:col-start-1 lg:row-start-1 lg:gap-5">
            {isStatementError ? (
              <LoadError
                framed
                icon={WifiOff}
                title="Couldn't load this account's money"
                description="The statement didn't come back. Check your connection and try again — nothing has been lost."
                onRetry={retryStatement}
              />
            ) : (
              <>
                <MoneyChart
                  statement={statement}
                  from={from}
                  to={to}
                  today={today}
                  period={period}
                  loading={isLoading || isStatementLoading}
                  refreshing={isStatementRefreshing}
                  onRangeChange={setRange}
                />
                <RecentEntries
                  entries={recent}
                  accountId={selected?.id}
                  loading={isLoading || isStatementLoading}
                  refreshing={isStatementRefreshing}
                />
              </>
            )}
          </div>
        </div>
      )}

      <BankAccountFormDialog target={target} onClose={closeDialog} onSubmit={save} />

      <Toast message={saved} onDismiss={dismissSaved} />
    </>
  );
};

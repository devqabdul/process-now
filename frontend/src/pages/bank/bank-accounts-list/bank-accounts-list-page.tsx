import { Landmark, Plus, WifiOff } from 'lucide-react';

import {
  BANK_ACCOUNT_SKELETON_ROWS,
  BankAccountCard,
  BankAccountCardSkeleton,
} from '@components/sections/bank/bank-account-card';
import { BankAccountFormDialog } from '@components/sections/bank/bank-account-form-dialog';
import { EmptyState } from '@components/shared/empty-state';
import { LoadError } from '@components/shared/load-error';
import { PageHeader } from '@components/shared/page-header';
import { Toast } from '@components/shared/toast';
import { Button } from '@components/ui/button';
import { Card } from '@components/ui/card';

import { useBankAccountsListPage } from './use-bank-accounts-list-page';

const SKELETON_CARDS = Array.from(
  { length: BANK_ACCOUNT_SKELETON_ROWS },
  (_, index) => index * 0.08,
);

export const BankAccountsListPage = () => {
  const {
    accounts,
    target,
    saved,
    isLoading,
    isError,
    openNew,
    openEdit,
    closeDialog,
    dismissSaved,
    save,
    setActive,
    retry,
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
              <Button size="sm" onClick={openNew}>
                Add the first account
              </Button>
            }
          />
        </Card>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {isLoading
            ? SKELETON_CARDS.map((delay) => <BankAccountCardSkeleton key={delay} delay={delay} />)
            : accounts.map((account) => (
                <BankAccountCard
                  key={account.id}
                  account={account}
                  onEdit={openEdit}
                  onSetActive={setActive}
                />
              ))}
        </ul>
      )}

      <BankAccountFormDialog target={target} onClose={closeDialog} onSubmit={save} />

      <Toast message={saved} onDismiss={dismissSaved} />
    </>
  );
};

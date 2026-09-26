import { Lock, LockOpen, Pencil } from 'lucide-react';
import { Link } from 'react-router';

import type { BankAccount } from '@api/process-backend/bank-accounts';
import { Badge } from '@components/ui/badge';
import { Card } from '@components/ui/card';
import { Menu, MenuItem } from '@components/ui/menu';
import { Skeleton } from '@components/ui/skeleton';
import { formatMoney } from '@utils/format/money';

export const BANK_ACCOUNT_SKELETON_ROWS = 3;

export interface BankAccountActionHandlers {
  onEdit: (account: BankAccount) => void;
  onSetActive: (account: BankAccount, isActive: boolean) => void;
}

const BankAccountActions = ({
  account,
  onEdit,
  onSetActive,
}: { account: BankAccount } & BankAccountActionHandlers) => (
  <Menu label={`Actions for ${account.name}`} className="flex-none">
    {(close) => (
      <>
        <MenuItem
          onClick={() => {
            close();
            onEdit(account);
          }}
        >
          <Pencil aria-hidden="true" className="size-3.5" strokeWidth={1.8} />
          Edit
        </MenuItem>
        {account.isActive === false ? (
          <MenuItem
            onClick={() => {
              close();
              onSetActive(account, true);
            }}
          >
            <LockOpen aria-hidden="true" className="size-3.5" strokeWidth={1.8} />
            Reopen
          </MenuItem>
        ) : (
          <MenuItem
            tone="danger"
            onClick={() => {
              close();
              onSetActive(account, false);
            }}
          >
            <Lock aria-hidden="true" className="size-3.5" strokeWidth={1.8} />
            Close account
          </MenuItem>
        )}
      </>
    )}
  </Menu>
);

export const BankAccountCard = ({
  account,
  ...actions
}: { account: BankAccount } & BankAccountActionHandlers) => (
  <li>
    {/* The name's link stretches over the card; the menu sits above it so both stay reachable. */}
    <Card className="relative p-3.5 transition-shadow duration-200 hover:shadow-raise">
      <div className="flex items-start gap-2">
        <p className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
          <Link
            to={`/bank/${account.id}`}
            className="truncate text-sm font-semibold text-fg after:absolute after:inset-0 after:rounded-14 hover:text-fg"
          >
            {account.name}
          </Link>
          {account.isActive === false && <Badge tone="neutral">Closed</Badge>}
        </p>
        <BankAccountActions account={account} {...actions} />
      </div>
      <p className="mt-2 font-mono text-2xl font-semibold tracking-[-0.01em]">
        <span className="sr-only">Balance </span>
        {formatMoney(account.balance)}
      </p>
      <dl className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11.5px] text-fg-subtle">
        <div className="flex gap-1">
          <dt>In</dt>
          <dd className="font-mono font-semibold text-success">{formatMoney(account.moneyIn)}</dd>
        </div>
        <div className="flex gap-1">
          <dt>Out</dt>
          <dd className="font-mono font-semibold text-danger-strong">
            {formatMoney(account.moneyOut)}
          </dd>
        </div>
      </dl>
    </Card>
  </li>
);

export const BankAccountCardSkeleton = ({ delay = 0 }: { delay?: number }) => {
  const style = { animationDelay: `${delay}s` };
  return (
    <li>
      <Card className="p-3.5">
        <p className="text-sm font-semibold">
          <Skeleton className="inline-block h-2.75 w-2/5" style={style} />
        </p>
        <p className="mt-2 font-mono text-2xl font-semibold">
          <Skeleton className="inline-block h-4 w-1/2" style={style} />
        </p>
        <p className="mt-2 text-[11.5px]">
          <Skeleton className="inline-block h-2.25 w-2/3" style={style} />
        </p>
      </Card>
    </li>
  );
};

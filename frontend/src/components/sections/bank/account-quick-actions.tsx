import {
  Lock,
  LockOpen,
  type LucideIcon,
  Pencil,
  ReceiptText,
  ScrollText,
  WalletMinimal,
} from 'lucide-react';
import { Link } from 'react-router';

import type { BankAccount } from '@api/process-backend/bank-accounts';
import { Menu, MenuItem } from '@components/ui/menu';
import { cn } from '@lib/cn';

const TILE =
  'group flex min-h-11 flex-col items-center gap-1.5 text-center text-xs font-medium text-fg-secondary';
const WELL =
  'grid size-12 place-items-center rounded-14 bg-surface text-fg ring-1 ring-line transition-colors group-hover:bg-surface-muted';

const TileLink = ({
  to,
  state,
  icon: Icon,
  label,
  disabled = false,
}: {
  to: string;
  state?: unknown;
  icon: LucideIcon;
  label: string;
  disabled?: boolean;
}) => (
  <li>
    {disabled ? (
      <span aria-disabled="true" className={cn(TILE, 'opacity-50')}>
        <span className={WELL}>
          <Icon aria-hidden="true" className="size-5" strokeWidth={1.8} />
        </span>
        {label}
      </span>
    ) : (
      <Link to={to} state={state} className={cn(TILE, 'hover:text-fg')}>
        <span className={WELL}>
          <Icon aria-hidden="true" className="size-5" strokeWidth={1.8} />
        </span>
        {label}
      </Link>
    )}
  </li>
);

interface AccountQuickActionsProps {
  account: BankAccount;
  onEdit: (account: BankAccount) => void;
  onSetActive: (account: BankAccount, isActive: boolean) => void;
}

export const AccountQuickActions = ({ account, onEdit, onSetActive }: AccountQuickActionsProps) => {
  const closed = account.isActive === false;
  return (
    <ul aria-label={`Actions for ${account.name}`} className="grid grid-cols-4 gap-2">
      {/* A closed account takes no new expenses. */}
      <TileLink
        to={`/expenses?account=${account.id}`}
        state={{ addExpense: true }}
        icon={WalletMinimal}
        label="Add expense"
        disabled={closed}
      />
      <TileLink to="/bills" icon={ReceiptText} label="Bills" />
      <TileLink to={`/bank/${account.id}`} icon={ScrollText} label="Statement" />
      <li className={TILE}>
        <Menu
          label={`More actions for ${account.name}`}
          triggerClassName={cn(WELL, 'text-fg lg:size-12 hover:bg-surface-muted hover:text-fg')}
        >
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
              {closed ? (
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
        <span aria-hidden="true">More</span>
      </li>
    </ul>
  );
};

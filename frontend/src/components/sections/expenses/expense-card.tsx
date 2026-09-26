import { Pencil, Trash2 } from 'lucide-react';

import type { Expense } from '@api/process-backend/expenses';
import { Card } from '@components/ui/card';
import { Menu, MenuItem } from '@components/ui/menu';
import { Skeleton } from '@components/ui/skeleton';
import { formatShortDate } from '@utils/format/date';
import { formatMoney } from '@utils/format/money';

export const EXPENSE_SKELETON_ROWS = 6;

export interface ExpenseActionHandlers {
  onEdit: (expense: Expense) => void;
  onDelete: (expense: Expense) => void;
}

const describe = (expense: Expense) =>
  `${expense.category}, ${formatMoney(expense.amount)} on ${formatShortDate(expense.spentOn)}`;

export const ExpenseActions = ({
  expense,
  onEdit,
  onDelete,
}: { expense: Expense } & ExpenseActionHandlers) => (
  <Menu label={`Actions for ${describe(expense)}`} className="flex-none">
    {(close) => (
      <>
        <MenuItem
          onClick={() => {
            close();
            onEdit(expense);
          }}
        >
          <Pencil aria-hidden="true" className="size-3.5" strokeWidth={1.8} />
          Edit
        </MenuItem>
        <MenuItem
          tone="danger"
          onClick={() => {
            close();
            onDelete(expense);
          }}
        >
          <Trash2 aria-hidden="true" className="size-3.5" strokeWidth={1.8} />
          Delete
        </MenuItem>
      </>
    )}
  </Menu>
);

export const ExpenseCard = ({
  expense,
  ...actions
}: { expense: Expense } & ExpenseActionHandlers) => (
  <li>
    <Card className="p-3.5">
      <div className="flex items-start gap-2.75">
        <div className="min-w-0 flex-1">
          <p className="flex items-baseline justify-between gap-2">
            <span className="truncate text-sm font-semibold">{expense.category}</span>
            <span className="font-mono text-sm font-semibold whitespace-nowrap">
              {formatMoney(expense.amount)}
            </span>
          </p>
          <p className="mt-1 text-[11.5px] text-fg-subtle">
            <span className="font-mono">{formatShortDate(expense.spentOn)}</span> ·{' '}
            {expense.bankAccount.name}
          </p>
          {expense.notes && <p className="mt-1 text-[11.5px] text-fg-subtle">{expense.notes}</p>}
        </div>
        <ExpenseActions expense={expense} {...actions} />
      </div>
    </Card>
  </li>
);

export const ExpenseCardSkeleton = ({ delay = 0 }: { delay?: number }) => {
  const style = { animationDelay: `${delay}s` };
  return (
    <li>
      <Card className="p-3.5">
        <p className="text-sm font-semibold">
          <Skeleton className="inline-block h-2.75 w-2/5" style={style} />
        </p>
        <p className="mt-1">
          <Skeleton className="inline-block h-2.25 w-1/3" style={style} />
        </p>
      </Card>
    </li>
  );
};

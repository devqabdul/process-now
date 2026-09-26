import { zodResolver } from '@hookform/resolvers/zod';
import { CalendarDays, IndianRupee, Landmark, NotebookPen, Tag, WalletMinimal } from 'lucide-react';
import { useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { Link } from 'react-router';
import * as z from 'zod/mini';

import type { BankAccount } from '@api/process-backend/bank-accounts';
import type { Expense } from '@api/process-backend/expenses';
import { AmountWords } from '@components/shared/amount-words';
import { FormField } from '@components/shared/form-field';
import { SelectField } from '@components/shared/select-field';
import { Button, buttonClasses } from '@components/ui/button';
import { Dialog } from '@components/ui/dialog';
import { FieldError } from '@components/ui/field-error';
import { cn } from '@lib/cn';

const ICON = 'size-4 text-fg-subtle';

const isAmount = (value: string) => /^\d+(\.\d{1,2})?$/.test(value.trim());

const expenseSchema = z
  .object({
    bankAccountId: z.string(),
    category: z.string(),
    amount: z.string(),
    spentOn: z.string(),
    notes: z.string(),
  })
  .check((ctx) => {
    const { bankAccountId, category, amount, spentOn, notes } = ctx.value;
    const issue = (path: string, message: string) =>
      ctx.issues.push({ code: 'custom', path: [path], message, input: ctx.value });
    if (!bankAccountId) issue('bankAccountId', 'Choose the account it was paid from.');
    if (!category.trim()) issue('category', 'What was it for — electricity, salary, repairs?');
    if (category.trim().length > 60) issue('category', 'Keep the category under 60 characters.');
    if (!isAmount(amount) || Number(amount) < 0.01)
      issue('amount', 'Enter an amount, like 450 or 450.50.');
    if (!spentOn) issue('spentOn', 'Pick the day it was paid.');
    if (notes.length > 500) issue('notes', 'Keep notes under 500 characters.');
  });

export type ExpenseFormInput = z.infer<typeof expenseSchema>;

export interface ExpenseSaveResult {
  ok: boolean;
  message?: string;
  fields?: Partial<Record<keyof ExpenseFormInput, string>>;
}

interface ExpenseFormDialogProps {
  // null = closed; an expense = editing it; 'new' = adding one.
  target: Expense | 'new' | null;
  // Active accounts only: a closed one takes no new expenses.
  accounts: BankAccount[];
  categories: string[];
  today: string;
  onClose: () => void;
  onSubmit: (values: ExpenseFormInput) => Promise<ExpenseSaveResult>;
}

export const ExpenseFormDialog = ({
  target,
  accounts,
  categories,
  today,
  onClose,
  onSubmit,
}: ExpenseFormDialogProps) => {
  const editing = target !== null && target !== 'new' ? target : null;
  const empty: ExpenseFormInput = {
    bankAccountId: accounts.length === 1 ? (accounts[0]?.id ?? '') : '',
    category: '',
    amount: '',
    spentOn: today,
    notes: '',
  };
  const {
    control,
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ExpenseFormInput>({
    resolver: zodResolver(expenseSchema),
    defaultValues: empty,
    mode: 'onSubmit',
  });
  const [watchedAmount] = useWatch({ control, name: ['amount'] });
  // An expense on an account closed since keeps showing it, so editing never moves it silently.
  const options =
    editing && !accounts.some((account) => account.id === editing.bankAccountId)
      ? [...accounts, { id: editing.bankAccount.id, name: `${editing.bankAccount.name} (closed)` }]
      : accounts;
  const noAccounts = options.length === 0;

  // callbacks
  const submit = handleSubmit(async (values) => {
    const result = await onSubmit(values);
    if (result.ok) return;
    const fields = Object.entries(result.fields ?? {}) as [keyof ExpenseFormInput, string][];
    fields.forEach(([field, message], index) =>
      setError(field, { type: 'server', message }, { shouldFocus: index === 0 }),
    );
    if (fields.length === 0)
      setError('root', {
        type: 'server',
        message: result.message ?? 'Unable to save this expense right now.',
      });
  });

  // effects
  useEffect(() => {
    if (!target) return;
    reset(
      editing
        ? {
            bankAccountId: editing.bankAccountId,
            category: editing.category,
            amount: editing.amount,
            spentOn: editing.spentOn,
            notes: editing.notes ?? '',
          }
        : empty,
    );
  }, [target]);

  return (
    <Dialog
      open={!!target}
      title={editing ? 'Edit expense' : 'New expense'}
      description={
        noAccounts
          ? 'An expense is paid from an account, and there is no open one yet.'
          : 'Money paid out of the business. It comes off the account it was paid from.'
      }
      icon={
        <span className="grid size-9 flex-none place-items-center rounded-10 bg-surface-muted text-fg-secondary">
          <WalletMinimal aria-hidden="true" className="size-4.5" strokeWidth={1.8} />
        </span>
      }
      // Nothing to fill in without an account: the small card, not a full-height sheet.
      sheet={!noAccounts}
      busy={isSubmitting}
      onClose={onClose}
      onSubmit={(event) => void submit(event)}
      action={
        noAccounts ? (
          <Link
            to="/bank"
            className={cn(buttonClasses('primary', 'md'), 'w-full hover:text-primary-fg')}
          >
            Add an account on the Bank page
          </Link>
        ) : (
          <Button type="submit" size="md" loading={isSubmitting} className="w-full">
            {editing ? 'Save changes' : 'Add expense'}
          </Button>
        )
      }
    >
      {noAccounts ? (
        <p className="text-13 leading-[1.55] text-fg-secondary">
          Add “Cash in hand” or a bank account first, then come back to record what was spent.
        </p>
      ) : (
        <>
          <SelectField
            id="expense-account"
            label="Paid from"
            required
            error={errors.bankAccountId}
            leading={<Landmark className={ICON} strokeWidth={1.8} aria-hidden="true" />}
            {...register('bankAccountId')}
          >
            <option value="">Choose an account</option>
            {options.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </SelectField>

          <FormField
            id="expense-category"
            label="Category"
            required
            maxLength={60}
            list="expense-categories"
            placeholder="Electricity"
            autoComplete="off"
            error={errors.category}
            leading={<Tag className={ICON} strokeWidth={1.8} aria-hidden="true" />}
            {...register('category')}
          />
          <datalist id="expense-categories">
            {categories.map((category) => (
              <option key={category} value={category} />
            ))}
          </datalist>

          <div className="grid gap-x-field-x gap-y-field sm:grid-cols-2">
            <FormField
              id="expense-amount"
              label="Amount"
              required
              inputMode="decimal"
              placeholder="450"
              error={errors.amount}
              leading={<IndianRupee className={ICON} strokeWidth={1.8} aria-hidden="true" />}
              help={<AmountWords value={watchedAmount} money />}
              {...register('amount')}
            />
            <FormField
              id="expense-date"
              label="Paid on"
              required
              type="date"
              max={today}
              error={errors.spentOn}
              leading={<CalendarDays className={ICON} strokeWidth={1.8} aria-hidden="true" />}
              {...register('spentOn')}
            />
          </div>

          <FormField
            id="expense-notes"
            label="Notes"
            hint="Optional"
            maxLength={500}
            placeholder="September bill"
            error={errors.notes}
            leading={<NotebookPen className={ICON} strokeWidth={1.8} aria-hidden="true" />}
            {...register('notes')}
          />
        </>
      )}

      <FieldError id="expense-form-error" message={errors.root?.message} />
    </Dialog>
  );
};

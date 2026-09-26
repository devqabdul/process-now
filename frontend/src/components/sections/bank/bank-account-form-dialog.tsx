import { zodResolver } from '@hookform/resolvers/zod';
import { IndianRupee, Landmark } from 'lucide-react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import * as z from 'zod/mini';

import type { BankAccount } from '@api/process-backend/bank-accounts';
import { FormField } from '@components/shared/form-field';
import { Button } from '@components/ui/button';
import { Dialog } from '@components/ui/dialog';
import { FieldError } from '@components/ui/field-error';

const ICON = 'size-4 text-fg-subtle';

// A plain amount or nothing: blank means the account started empty.
const isAmount = (value: string) => /^\d+(\.\d{1,2})?$/.test(value.trim());

const bankAccountSchema = z
  .object({ name: z.string(), openingBalance: z.string(), isActive: z.boolean() })
  .check((ctx) => {
    const { name, openingBalance } = ctx.value;
    const issue = (path: string, message: string) =>
      ctx.issues.push({ code: 'custom', path: [path], message, input: ctx.value });
    if (!name.trim()) issue('name', 'Name this account, like "Cash in hand" or "HDFC Current".');
    if (name.trim().length > 60) issue('name', 'Keep the name under 60 characters.');
    if (openingBalance.trim() && !isAmount(openingBalance))
      issue('openingBalance', 'Enter an amount, like 5000 or 5000.50.');
  });

export type BankAccountFormInput = z.infer<typeof bankAccountSchema>;

export interface BankAccountSaveResult {
  ok: boolean;
  message?: string;
  fields?: Partial<Record<keyof BankAccountFormInput, string>>;
}

const EMPTY: BankAccountFormInput = { name: '', openingBalance: '', isActive: true };

interface BankAccountFormDialogProps {
  // null = closed; an account = editing it; 'new' = adding one.
  target: BankAccount | 'new' | null;
  onClose: () => void;
  onSubmit: (values: BankAccountFormInput) => Promise<BankAccountSaveResult>;
}

export const BankAccountFormDialog = ({
  target,
  onClose,
  onSubmit,
}: BankAccountFormDialogProps) => {
  const editing = target !== null && target !== 'new' ? target : null;
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<BankAccountFormInput>({
    resolver: zodResolver(bankAccountSchema),
    defaultValues: EMPTY,
    mode: 'onSubmit',
  });

  // callbacks
  const submit = handleSubmit(async (values) => {
    const result = await onSubmit(values);
    if (result.ok) return;
    const fields = Object.entries(result.fields ?? {}) as [keyof BankAccountFormInput, string][];
    fields.forEach(([field, message], index) =>
      setError(field, { type: 'server', message }, { shouldFocus: index === 0 }),
    );
    if (fields.length === 0)
      setError('root', {
        type: 'server',
        message: result.message ?? 'Unable to save this account right now.',
      });
  });

  // effects
  useEffect(() => {
    if (!target) return;
    reset(
      editing
        ? {
            name: editing.name,
            openingBalance: editing.openingBalance,
            isActive: editing.isActive !== false,
          }
        : EMPTY,
    );
  }, [target, editing, reset]);

  return (
    <Dialog
      open={!!target}
      title={editing ? 'Edit account' : 'New account'}
      description={
        editing
          ? 'Payments and expenses already recorded against it stay as they are.'
          : 'Where money is kept — a bank account, or the cash in the shop.'
      }
      icon={
        <span className="grid size-9 flex-none place-items-center rounded-10 bg-surface-muted text-fg-secondary">
          <Landmark aria-hidden="true" className="size-4.5" strokeWidth={1.8} />
        </span>
      }
      busy={isSubmitting}
      onClose={onClose}
      onSubmit={(event) => void submit(event)}
      action={
        <Button type="submit" size="md" loading={isSubmitting} className="w-full">
          {editing ? 'Save changes' : 'Add account'}
        </Button>
      }
    >
      <FormField
        id="bank-account-name"
        label="Account name"
        required
        maxLength={60}
        placeholder="Cash in hand"
        error={errors.name}
        leading={<Landmark className={ICON} strokeWidth={1.8} aria-hidden="true" />}
        {...register('name')}
      />
      <FormField
        id="bank-account-opening"
        label="Opening balance"
        hint="Optional"
        inputMode="decimal"
        placeholder="0"
        error={errors.openingBalance}
        leading={<IndianRupee className={ICON} strokeWidth={1.8} aria-hidden="true" />}
        {...register('openingBalance')}
      />

      {editing && (
        <label className="flex cursor-pointer items-center gap-2.5">
          <input type="checkbox" className="size-4 accent-primary" {...register('isActive')} />
          <span className="min-w-0">
            <span className="block text-[12.5px] font-medium">Open for new money</span>
            <span className="block text-[11px] text-fg-subtle">
              Turn this off to close the account. Its history stays.
            </span>
          </span>
        </label>
      )}

      <FieldError id="bank-account-form-error" message={errors.root?.message} />
    </Dialog>
  );
};

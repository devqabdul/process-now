import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { isSuccess, type NormalizedError, safeApiError } from '@api/process-backend';
import {
  type BankAccount,
  bankAccountsKeys,
  createBankAccount,
  updateBankAccount,
  useBankAccounts,
} from '@api/process-backend/bank-accounts';
import type {
  BankAccountFormInput,
  BankAccountSaveResult,
} from '@components/sections/bank/bank-account-form-dialog';

const FIELDS = ['name', 'openingBalance', 'isActive'] as const;

const isFieldName = (key: string): key is keyof BankAccountFormInput =>
  (FIELDS as readonly string[]).includes(key);

const toSaveErrorMessage = (err: NormalizedError) =>
  err.error_type === 'network'
    ? 'Unable to save this account. Check your connection and try again.'
    : (err.message ?? 'Unable to save this account right now.');

export interface UseBankAccountsListPageResult {
  accounts: BankAccount[];
  target: BankAccount | 'new' | null;
  saved: string | null;
  isLoading: boolean;
  isError: boolean;
  openNew: () => void;
  openEdit: (account: BankAccount) => void;
  closeDialog: () => void;
  dismissSaved: () => void;
  save: (values: BankAccountFormInput) => Promise<BankAccountSaveResult>;
  setActive: (account: BankAccount, isActive: boolean) => void;
  retry: () => void;
}

export const useBankAccountsListPage = (): UseBankAccountsListPageResult => {
  // state
  const [target, setTarget] = useState<BankAccount | 'new' | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  // wiring
  const queryClient = useQueryClient();
  const { data, isPending, isError, refetch } = useBankAccounts();

  // derived
  const accounts = data ?? [];

  // callbacks
  const save = async (values: BankAccountFormInput): Promise<BankAccountSaveResult> => {
    const editing = target !== null && target !== 'new' ? target : null;
    // Blank means the account started empty; the API takes a number.
    const payload = {
      name: values.name.trim(),
      openingBalance: values.openingBalance.trim() ? Number(values.openingBalance) : 0,
    };
    try {
      const response = editing
        ? await updateBankAccount(editing.id, { ...payload, isActive: values.isActive })
        : await createBankAccount(payload);
      if (!isSuccess(response.data)) return { ok: false, message: 'Unable to save this account.' };
      await queryClient.invalidateQueries({ queryKey: bankAccountsKeys.all });
      setTarget(null);
      setSaved(editing ? `${payload.name} updated.` : `${payload.name} is ready to take money.`);
      return { ok: true };
    } catch (error) {
      let result: BankAccountSaveResult = { ok: false };
      safeApiError(error, {
        context: { page: 'bank', action: editing ? 'updateBankAccount' : 'createBankAccount' },
        onError: (err) => {
          const fields = Object.fromEntries(
            Object.entries(err.fields ?? {}).filter(([key]) => isFieldName(key)),
          );
          result = { ok: false, fields, message: toSaveErrorMessage(err) };
        },
      });
      return result;
    }
  };

  // Closing keeps every past payment and expense, and reopens in one click.
  const setActive = async (account: BankAccount, isActive: boolean) => {
    try {
      const response = await updateBankAccount(account.id, { isActive });
      if (!isSuccess(response.data)) return;
      await queryClient.invalidateQueries({ queryKey: bankAccountsKeys.all });
      setSaved(
        isActive
          ? `${account.name} is open again.`
          : `${account.name} is closed. Its history is untouched.`,
      );
    } catch (error) {
      safeApiError(error, {
        context: { page: 'bank', action: 'setBankAccountActive' },
        onError: (err) => setSaved(err.message ?? 'Unable to change this account right now.'),
      });
    }
  };

  return {
    accounts,
    target,
    saved,
    isLoading: isPending,
    isError,
    openNew: () => {
      setSaved(null);
      setTarget('new');
    },
    openEdit: (account) => {
      setSaved(null);
      setTarget(account);
    },
    closeDialog: () => setTarget(null),
    dismissSaved: () => setSaved(null),
    save,
    setActive: (account, isActive) => void setActive(account, isActive),
    retry: () => void refetch(),
  };
};

import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { isSuccess, type NormalizedError, safeApiError } from '@api/process-backend';
import {
  type BankAccount,
  bankAccountsKeys,
  type BankStatement,
  type StatementEntry,
  createBankAccount,
  updateBankAccount,
  useBankAccounts,
} from '@api/process-backend/bank-accounts';
import type {
  BankAccountFormInput,
  BankAccountSaveResult,
} from '@components/sections/bank/bank-account-form-dialog';
import { RECENT_LIMIT } from '@components/sections/bank/recent-entries';
import { useListParams } from '@hooks/use-list-params';
import { usePersistedState } from '@hooks/use-persisted-state';
import { formatShortDate, todayIso } from '@utils/format/date';

const FIELDS = ['name', 'openingBalance', 'isActive'] as const;

const isFieldName = (key: string): key is keyof BankAccountFormInput =>
  (FIELDS as readonly string[]).includes(key);

const toSaveErrorMessage = (err: NormalizedError) =>
  err.error_type === 'network'
    ? 'Unable to save this account. Check your connection and try again.'
    : (err.message ?? 'Unable to save this account right now.');

export interface UseBankAccountsListPageResult {
  accounts: BankAccount[];
  selected: BankAccount | undefined;
  statement: BankStatement | undefined;
  // The newest few entries of the period, for Recent.
  recent: StatementEntry[];
  from: string;
  to: string;
  today: string;
  // "28 Aug – 26 Sep", under the chart's title.
  period: string;
  hideBalance: boolean;
  target: BankAccount | 'new' | null;
  saved: string | null;
  isLoading: boolean;
  isError: boolean;
  isStatementLoading: boolean;
  // A new range or account is loading; the previous one stays on screen, dimmed.
  isStatementRefreshing: boolean;
  isStatementError: boolean;
  select: (id: string) => void;
  setRange: (range: { from: string; to: string }) => void;
  toggleHideBalance: () => void;
  openNew: () => void;
  openEdit: (account: BankAccount) => void;
  closeDialog: () => void;
  dismissSaved: () => void;
  save: (values: BankAccountFormInput) => Promise<BankAccountSaveResult>;
  setActive: (account: BankAccount, isActive: boolean) => void;
  retry: () => void;
  retryStatement: () => void;
}

export const useBankAccountsListPage = (): UseBankAccountsListPageResult => {
  // state
  const [target, setTarget] = useState<BankAccount | 'new' | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState('');
  const [hideBalance, setHideBalance] = usePersistedState('pn.bank.hideBalance', false);

  // wiring
  const queryClient = useQueryClient();
  const { data, isPending, isError, refetch } = useBankAccounts();
  const list = useListParams([], '');
  const range = list.getRange();
  const accounts = data ?? [];
  // Until a card is picked, the first account is the one on show.
  const selected = accounts.find((account) => account.id === selectedId) ?? accounts[0];
  const statement = useQuery({
    ...bankAccountsKeys.statement(selected?.id ?? '', range),
    enabled: !!selected,
    placeholderData: keepPreviousData,
  });

  // derived
  const today = todayIso();

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
    selected,
    statement: statement.data,
    recent: statement.data?.entries.slice(0, RECENT_LIMIT) ?? [],
    from: range.from,
    to: range.to,
    today,
    period: `${formatShortDate(range.from)} – ${formatShortDate(range.to)}`,
    hideBalance,
    target,
    saved,
    isLoading: isPending,
    isError,
    isStatementLoading: statement.isPending,
    isStatementRefreshing: statement.isPlaceholderData,
    isStatementError: statement.isError,
    select: setSelectedId,
    setRange: list.setRange,
    toggleHideBalance: () => setHideBalance((hidden) => !hidden),
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
    retryStatement: () => void statement.refetch(),
  };
};

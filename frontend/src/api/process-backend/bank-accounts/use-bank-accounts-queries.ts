import { queryOptions, useQuery } from '@tanstack/react-query';

import { unwrap } from '../unwrap';

import { getBankAccounts, getBankStatement } from './bank-accounts-service';
import type { StatementQuery } from './bank-accounts.types';

export const bankAccountsKeys = {
  all: ['bank-accounts'] as const,
  list: () =>
    queryOptions({
      queryKey: [...bankAccountsKeys.all, 'list'] as const,
      queryFn: () => unwrap(getBankAccounts()),
    }),
  statement: (id: string, params: StatementQuery = {}) =>
    queryOptions({
      queryKey: [...bankAccountsKeys.all, 'statement', id, params] as const,
      queryFn: () => unwrap(getBankStatement(id, params)),
    }),
};

export const useBankAccounts = () => useQuery(bankAccountsKeys.list());

export const useBankStatement = (id: string, params: StatementQuery = {}) =>
  useQuery(bankAccountsKeys.statement(id, params));

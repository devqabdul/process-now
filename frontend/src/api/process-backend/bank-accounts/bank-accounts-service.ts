import { http } from '../axios';
import type { ApiEnvelope } from '../types';

import type {
  BankAccount,
  BankStatement,
  CreateBankAccountPayload,
  StatementQuery,
  UpdateBankAccountPayload,
} from './bank-accounts.types';

export const getBankAccounts = () => http.get<ApiEnvelope<BankAccount[]>>('/bank-accounts');

export const getBankStatement = (id: string, params: StatementQuery = {}) =>
  http.get<ApiEnvelope<BankStatement>>(`/bank-accounts/${id}/statement`, { params });

export const createBankAccount = (payload: CreateBankAccountPayload) =>
  http.post<ApiEnvelope<BankAccount>>('/bank-accounts', payload);

export const updateBankAccount = (id: string, payload: UpdateBankAccountPayload) =>
  http.patch<ApiEnvelope<BankAccount>>(`/bank-accounts/${id}`, payload);

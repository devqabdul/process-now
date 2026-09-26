import { http } from '../axios';
import type { ApiEnvelope } from '../types';

import type {
  CreateExpensePayload,
  Expense,
  ExpenseList,
  ExpensesQuery,
  UpdateExpensePayload,
} from './expenses.types';

export const getExpenses = (params: ExpensesQuery) =>
  http.get<ApiEnvelope<ExpenseList>>('/expenses', { params });

export const getExpenseCategories = () => http.get<ApiEnvelope<string[]>>('/expenses/categories');

export const createExpense = (payload: CreateExpensePayload) =>
  http.post<ApiEnvelope<Expense>>('/expenses', payload);

export const updateExpense = (id: string, payload: UpdateExpensePayload) =>
  http.patch<ApiEnvelope<Expense>>(`/expenses/${id}`, payload);

export const deleteExpense = (id: string) => http.delete<ApiEnvelope<Expense>>(`/expenses/${id}`);

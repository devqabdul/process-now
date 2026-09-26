import { queryOptions, useQuery } from '@tanstack/react-query';

import { unwrap } from '../unwrap';

import { getExpenseCategories, getExpenses } from './expenses-service';
import type { ExpensesQuery } from './expenses.types';

export const expensesKeys = {
  all: ['expenses'] as const,
  list: (params: ExpensesQuery = {}) =>
    queryOptions({
      queryKey: [...expensesKeys.all, 'list', params] as const,
      queryFn: () => unwrap(getExpenses(params)),
    }),
  categories: () =>
    queryOptions({
      queryKey: [...expensesKeys.all, 'categories'] as const,
      queryFn: () => unwrap(getExpenseCategories()),
    }),
};

export const useExpenses = (params: ExpensesQuery = {}) => useQuery(expensesKeys.list(params));

export const useExpenseCategories = () => useQuery(expensesKeys.categories());

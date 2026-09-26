import { queryOptions, useInfiniteQuery, useQuery } from '@tanstack/react-query';

import { listQueries } from '../list-query';
import { unwrap } from '../unwrap';

import { getExpenseCategories, getExpenses } from './expenses-service';
import type { ExpensesQuery } from './expenses.types';

export const expensesKeys = {
  all: ['expenses'] as const,
  ...listQueries(['expenses'], getExpenses),
  categories: () =>
    queryOptions({
      queryKey: [...expensesKeys.all, 'categories'] as const,
      queryFn: () => unwrap(getExpenseCategories()),
    }),
};

export const useExpenses = (params: ExpensesQuery) => useQuery(expensesKeys.list(params));

export const useExpensesInfinite = (params: Omit<ExpensesQuery, 'page'>) =>
  useInfiniteQuery(expensesKeys.infinite(params));

export const useExpenseCategories = () => useQuery(expensesKeys.categories());

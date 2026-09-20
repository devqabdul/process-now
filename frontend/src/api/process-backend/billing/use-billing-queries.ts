import { queryOptions, useQuery } from '@tanstack/react-query';

import { unwrap } from '../unwrap';

import { getBill, getBills } from './billing-service';
import type { BillsQuery } from './billing.types';

export const billsKeys = {
  all: ['bills'] as const,
  list: (params: BillsQuery = {}) =>
    queryOptions({
      queryKey: [...billsKeys.all, 'list', params] as const,
      queryFn: () => unwrap(getBills(params)),
    }),
  detail: (id: string) =>
    queryOptions({
      queryKey: [...billsKeys.all, 'detail', id] as const,
      queryFn: () => unwrap(getBill(id)),
    }),
};

export const useBills = (params: BillsQuery = {}) => useQuery(billsKeys.list(params));

export const useBill = (id: string) => useQuery(billsKeys.detail(id));

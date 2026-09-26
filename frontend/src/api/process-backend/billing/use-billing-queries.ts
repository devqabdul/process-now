import { queryOptions, useInfiniteQuery, useQuery } from '@tanstack/react-query';

import { listQueries } from '../list-query';
import { unwrap } from '../unwrap';

import { getBill, getBills } from './billing-service';
import type { BillsQuery } from './billing.types';

export const billsKeys = {
  all: ['bills'] as const,
  ...listQueries(['bills'], getBills),
  detail: (id: string) =>
    queryOptions({
      queryKey: [...billsKeys.all, 'detail', id] as const,
      queryFn: () => unwrap(getBill(id)),
    }),
};

export const useBills = (params: BillsQuery) => useQuery(billsKeys.list(params));

export const useBillsInfinite = (params: Omit<BillsQuery, 'page'>) =>
  useInfiniteQuery(billsKeys.infinite(params));

export const useBill = (id: string) => useQuery(billsKeys.detail(id));

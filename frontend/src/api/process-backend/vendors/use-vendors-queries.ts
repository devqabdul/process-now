import { queryOptions, useInfiniteQuery, useQuery } from '@tanstack/react-query';

import type { StatementQuery } from '../bank-accounts';
import { listQueries } from '../list-query';
import { unwrap } from '../unwrap';

import { getVendors, getVendorStatement } from './vendors-service';
import type { VendorsQuery } from './vendors.types';

export const vendorsKeys = {
  all: ['vendors'] as const,
  ...listQueries(['vendors'], getVendors),
  statement: (id: string, params: StatementQuery = {}) =>
    queryOptions({
      queryKey: [...vendorsKeys.all, 'statement', id, params] as const,
      queryFn: () => unwrap(getVendorStatement(id, params)),
    }),
};

export const useVendors = (params: VendorsQuery) => useQuery(vendorsKeys.list(params));

export const useVendorsInfinite = (params: Omit<VendorsQuery, 'page'>) =>
  useInfiniteQuery(vendorsKeys.infinite(params));

export const useVendorStatement = (id: string, params: StatementQuery = {}) =>
  useQuery(vendorsKeys.statement(id, params));

import { queryOptions, useQuery } from '@tanstack/react-query';

import { unwrap } from '../unwrap';

import { getVendors } from './vendors-service';
import type { VendorsQuery } from './vendors.types';

export const vendorsKeys = {
  all: ['vendors'] as const,
  list: (params: VendorsQuery = {}) =>
    queryOptions({
      queryKey: [...vendorsKeys.all, 'list', params] as const,
      queryFn: () => unwrap(getVendors(params)),
    }),
};

export const useVendors = (params: VendorsQuery = {}) => useQuery(vendorsKeys.list(params));

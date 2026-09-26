import { queryOptions, useInfiniteQuery, useQuery } from '@tanstack/react-query';

import { listQueries } from '../list-query';
import { unwrap } from '../unwrap';

import { getServiceType, getServiceTypes } from './service-types-service';
import type { ServiceTypesQuery } from './service-types.types';

export const serviceTypesKeys = {
  all: ['service-types'] as const,
  ...listQueries(['service-types'], getServiceTypes),
  detail: (id: string) =>
    queryOptions({
      queryKey: [...serviceTypesKeys.all, 'detail', id] as const,
      queryFn: () => unwrap(getServiceType(id)),
    }),
};

export const useServiceTypes = (params: ServiceTypesQuery) =>
  useQuery(serviceTypesKeys.list(params));

export const useServiceTypesInfinite = (params: Omit<ServiceTypesQuery, 'page'>) =>
  useInfiniteQuery(serviceTypesKeys.infinite(params));

export const useServiceType = (id: string) => useQuery(serviceTypesKeys.detail(id));

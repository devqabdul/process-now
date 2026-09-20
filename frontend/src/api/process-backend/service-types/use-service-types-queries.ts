import { queryOptions, useQuery } from '@tanstack/react-query';

import { unwrap } from '../unwrap';

import { getServiceType, getServiceTypes } from './service-types-service';
import type { ServiceTypesQuery } from './service-types.types';

export const serviceTypesKeys = {
  all: ['service-types'] as const,
  list: (params: ServiceTypesQuery = {}) =>
    queryOptions({
      queryKey: [...serviceTypesKeys.all, 'list', params] as const,
      queryFn: () => unwrap(getServiceTypes(params)),
    }),
  detail: (id: string) =>
    queryOptions({
      queryKey: [...serviceTypesKeys.all, 'detail', id] as const,
      queryFn: () => unwrap(getServiceType(id)),
    }),
};

export const useServiceTypes = (params: ServiceTypesQuery = {}) =>
  useQuery(serviceTypesKeys.list(params));

export const useServiceType = (id: string) => useQuery(serviceTypesKeys.detail(id));

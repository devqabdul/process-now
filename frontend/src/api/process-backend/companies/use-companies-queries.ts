import { queryOptions, useQuery } from '@tanstack/react-query';

import { unwrap } from '../unwrap';

import { getCompanies } from './companies-service';
import type { CompaniesQuery } from './companies.types';

export const companiesKeys = {
  all: ['companies'] as const,
  list: (params: CompaniesQuery = {}) =>
    queryOptions({
      queryKey: [...companiesKeys.all, 'list', params] as const,
      queryFn: () => unwrap(getCompanies(params)),
    }),
};

export const useCompanies = (params: CompaniesQuery = {}) => useQuery(companiesKeys.list(params));

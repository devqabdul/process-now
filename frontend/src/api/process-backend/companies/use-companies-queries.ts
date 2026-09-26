import { useInfiniteQuery, useQuery } from '@tanstack/react-query';

import { listQueries } from '../list-query';

import { getCompanies } from './companies-service';
import type { CompaniesQuery } from './companies.types';

export const companiesKeys = {
  all: ['companies'] as const,
  ...listQueries(['companies'], getCompanies),
};

export const useCompanies = (params: CompaniesQuery) => useQuery(companiesKeys.list(params));

export const useCompaniesInfinite = (params: Omit<CompaniesQuery, 'page'>) =>
  useInfiniteQuery(companiesKeys.infinite(params));

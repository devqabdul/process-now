import { queryOptions, useQuery } from '@tanstack/react-query';

import { unwrap } from '../unwrap';

import { getDashboard } from './dashboard-service';

export const dashboardKeys = {
  all: ['dashboard'] as const,
  detail: (date: string) =>
    queryOptions({
      queryKey: [...dashboardKeys.all, date] as const,
      queryFn: () => unwrap(getDashboard(date)),
    }),
};

export const useDashboard = (date: string) => useQuery(dashboardKeys.detail(date));

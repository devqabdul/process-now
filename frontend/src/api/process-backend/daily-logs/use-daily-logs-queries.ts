import { queryOptions, useQuery } from '@tanstack/react-query';

import { unwrap } from '../unwrap';

import { getDailyLogs } from './daily-logs-service';
import type { DailyLogsQuery } from './daily-logs.types';

export const dailyLogsKeys = {
  all: ['daily-logs'] as const,
  list: (params: DailyLogsQuery = {}) =>
    queryOptions({
      queryKey: [...dailyLogsKeys.all, 'list', params] as const,
      queryFn: () => unwrap(getDailyLogs(params)),
    }),
};

export const useDailyLogs = (params: DailyLogsQuery = {}) => useQuery(dailyLogsKeys.list(params));

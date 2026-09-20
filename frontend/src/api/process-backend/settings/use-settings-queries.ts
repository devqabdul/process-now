import { queryOptions, useQuery } from '@tanstack/react-query';

import { unwrap } from '../unwrap';

import { getSettings } from './settings-service';

export const settingsKeys = {
  all: ['settings'] as const,
  detail: () =>
    queryOptions({
      queryKey: [...settingsKeys.all, 'detail'] as const,
      queryFn: () => unwrap(getSettings()),
    }),
};

export const useSettings = () => useQuery(settingsKeys.detail());

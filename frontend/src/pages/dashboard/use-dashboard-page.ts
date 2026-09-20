import { useState } from 'react';

import { type Dashboard, useDashboard } from '@api/process-backend/dashboard';
import { formatDayLabel, todayIso } from '@utils/format/date';

export interface UseDashboardPageResult {
  date: string;
  today: string;
  dayLabel: string;
  dashboard: Dashboard | undefined;
  isError: boolean;
  isRetrying: boolean;
  setDate: (date: string) => void;
  retry: () => void;
}

export const useDashboardPage = (): UseDashboardPageResult => {
  // state
  const [date, setDate] = useState(todayIso);

  // wiring
  const { data, isError, isFetching, refetch } = useDashboard(date);

  // derived
  const today = todayIso();
  const dayLabel = formatDayLabel(date);

  // callbacks
  const retry = () => void refetch();

  return {
    date,
    today,
    dayLabel,
    dashboard: data,
    isError,
    isRetrying: isError && isFetching,
    setDate,
    retry,
  };
};

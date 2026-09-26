import { useState } from 'react';
import { useParams } from 'react-router';

import {
  type BankAccount,
  type BankStatement,
  useBankStatement,
} from '@api/process-backend/bank-accounts';
import { formatShortDate, shiftIsoDate, todayIso } from '@utils/format/date';

export interface UseBankStatementPageResult {
  from: string;
  to: string;
  today: string;
  statement: BankStatement | undefined;
  account: BankAccount | undefined;
  period: string;
  isLoading: boolean;
  isError: boolean;
  isRetrying: boolean;
  setRange: (range: { from: string; to: string }) => void;
  retry: () => void;
}

export const useBankStatementPage = (): UseBankStatementPageResult => {
  // state
  // The API's own default: the last 30 days, today included.
  const [range, setRange] = useState(() => ({
    from: shiftIsoDate(todayIso(), -29),
    to: todayIso(),
  }));

  // wiring
  const { id = '' } = useParams();
  const { data, isPending, isError, isFetching, refetch } = useBankStatement(id, range);

  // derived
  const today = todayIso();
  const period = `${formatShortDate(range.from)} – ${formatShortDate(range.to)}`;

  return {
    from: range.from,
    to: range.to,
    today,
    statement: data,
    account: data?.account,
    period,
    isLoading: isPending,
    isError,
    isRetrying: isError && isFetching,
    setRange,
    retry: () => void refetch(),
  };
};

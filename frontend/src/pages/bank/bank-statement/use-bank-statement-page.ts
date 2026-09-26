import { useState } from 'react';
import { useParams } from 'react-router';

import {
  type BankAccount,
  type BankStatement,
  type StatementEntry,
  useBankStatement,
} from '@api/process-backend/bank-accounts';
import { statementColumns } from '@components/sections/bank/statement-table';
import { exportRows } from '@components/ui/data-table';
import { useCsvExport } from '@hooks/use-csv-export';
import { DEFAULT_PAGE_SIZE, useListParams } from '@hooks/use-list-params';
import { useMediaQuery } from '@hooks/use-media-query';
import { DEFAULT_DATE_PRESET, matchPreset } from '@utils/date-presets';
import { formatShortDate, todayIso } from '@utils/format/date';
import { pageCountOf } from '@utils/pagination';

export interface UseBankStatementPageResult {
  from: string;
  to: string;
  today: string;
  statement: BankStatement | undefined;
  account: BankAccount | undefined;
  entries: StatementEntry[];
  total: number;
  page: number;
  pageSize: number;
  shown: number;
  showPages: boolean;
  period: string;
  // A period other than the default, for the phone Filters badge and Clear all.
  activeFilters: number;
  isLoading: boolean;
  isError: boolean;
  isRetrying: boolean;
  exportError: string | null;
  setRange: (range: { from: string; to: string }) => void;
  clearRange: () => void;
  setPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;
  loadMore: () => void;
  exportCsv: () => Promise<void>;
  retry: () => void;
}

export const useBankStatementPage = (): UseBankStatementPageResult => {
  // state
  // Phones append a page at a time instead of paging.
  const [phonePages, setPhonePages] = useState(1);

  // wiring
  const { id = '' } = useParams();
  const list = useListParams([], '');
  const range = list.getRange();
  const { data, isPending, isError, isFetching, refetch } = useBankStatement(id, range);
  const showPages = useMediaQuery('(min-width: 64rem)');
  const { exportError, runExport } = useCsvExport('statement');

  // derived
  // ponytail: the API returns the whole period, so paging is local; page it server-side if a
  // year of entries ever gets heavy.
  const all = data?.entries ?? [];
  const pageSize = list.pageSize;
  const page = Math.min(list.page, Math.max(1, pageCountOf(all.length, pageSize)));
  const shown = Math.min(all.length, phonePages * DEFAULT_PAGE_SIZE);
  const entries = showPages
    ? all.slice((page - 1) * pageSize, page * pageSize)
    : all.slice(0, shown);
  const today = todayIso();
  const period = `${formatShortDate(range.from)} – ${formatShortDate(range.to)}`;

  return {
    from: range.from,
    to: range.to,
    today,
    statement: data,
    account: data?.account,
    entries,
    total: all.length,
    page,
    pageSize,
    shown,
    showPages,
    period,
    activeFilters: Number(matchPreset(range, today) !== DEFAULT_DATE_PRESET),
    isLoading: isPending,
    isError,
    isRetrying: isError && isFetching,
    exportError,
    setRange: (next) => {
      setPhonePages(1);
      list.setRange(next);
    },
    clearRange: () => {
      setPhonePages(1);
      list.update({ from: undefined, to: undefined });
    },
    setPage: list.setPage,
    setPageSize: list.setPageSize,
    loadMore: () => setPhonePages((pages) => pages + 1),
    exportCsv: () => runExport(async () => exportRows(statementColumns, all)),
    retry: () => void refetch(),
  };
};

import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { isSuccess, type NormalizedError, safeApiError } from '@api/process-backend';
import { dashboardKeys } from '@api/process-backend/dashboard';
import {
  type DailyLog,
  dailyLogsKeys,
  saveDailyLog,
  useDailyLogs,
} from '@api/process-backend/daily-logs';
import { useSettings } from '@api/process-backend/settings';
import { buildDailyLogColumns } from '@components/sections/daily-log/daily-logs-table';
import type {
  DailyLogFormInput,
  DailyLogSaveResult,
} from '@components/sections/daily-log/use-daily-log-form';
import { type DataTableColumn, exportRows } from '@components/ui/data-table';
import { useCsvExport } from '@hooks/use-csv-export';
import { useListParams } from '@hooks/use-list-params';
import { useMediaQuery } from '@hooks/use-media-query';
import { DEFAULT_DATE_PRESET, matchPreset } from '@utils/date-presets';
import { formatShortDate, formatWeekdayDate, todayIso } from '@utils/format/date';

const FIELDS = ['date', 'machineHours', 'electricityUnits', 'notes'] as const;

const isFieldName = (key: string): key is keyof DailyLogFormInput =>
  (FIELDS as readonly string[]).includes(key);

const toErrorMessage = (err: NormalizedError) =>
  err.error_type === 'network'
    ? 'Unable to save this log. Check your connection and try again.'
    : (err.message ?? 'Unable to save this log.');

const toPayload = (values: DailyLogFormInput) => {
  const notes = values.notes.trim();
  // Left out when blank: the API then clears any notes the day had.
  return {
    machineHours: Number(values.machineHours),
    electricityUnits: Number(values.electricityUnits),
    ...(notes ? { notes } : {}),
  };
};

// Both figures have at most two places, so adding whole hundredths keeps the sum exact.
const sumOf = (values: string[]) =>
  values.reduce((total, value) => total + Math.round(Number(value) * 100), 0) / 100;

const DAY_MS = 86_400_000;
const daysIn = (from: string, to: string) =>
  Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS) + 1;

export interface UseDailyLogPageResult {
  today: string;
  // "Fri, 26 Sep"
  todayLabel: string;
  todayLog: DailyLog | undefined;
  isTodayLoading: boolean;
  isTodayError: boolean;
  from: string;
  to: string;
  // "28 Aug – 26 Sep"
  period: string;
  // ₹ per unit; undefined when the company hasn't set one.
  rate: number | undefined;
  logs: DailyLog[];
  // The rows on this page of the table.
  pageLogs: DailyLog[];
  daysLogged: number;
  daysInRange: number;
  totalHours: number;
  totalUnits: number;
  page: number;
  pageSize: number;
  activeFilters: number;
  columns: DataTableColumn<DailyLog>[];
  target: DailyLog | 'new' | null;
  saved: string | null;
  showTable: boolean;
  isLoading: boolean;
  isRefreshing: boolean;
  isError: boolean;
  exportError: string | null;
  setRange: (range: { from: string; to: string }) => void;
  clearFilters: () => void;
  setPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;
  exportCsv: () => Promise<void>;
  saveToday: (values: DailyLogFormInput) => Promise<DailyLogSaveResult>;
  save: (values: DailyLogFormInput) => Promise<DailyLogSaveResult>;
  openNew: () => void;
  openEdit: (log: DailyLog) => void;
  closeDialog: () => void;
  dismissSaved: () => void;
  retry: () => void;
  retryToday: () => void;
}

export const useDailyLogPage = (): UseDailyLogPageResult => {
  // state
  const [target, setTarget] = useState<DailyLog | 'new' | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  // wiring
  const queryClient = useQueryClient();
  const list = useListParams([], '');
  const range = list.getRange();
  const today = todayIso();
  const history = useQuery({ ...dailyLogsKeys.list(range), placeholderData: keepPreviousData });
  const todayQuery = useDailyLogs({ from: today, to: today });
  const { data: settings } = useSettings();
  // Tailwind's lg: below it the rows read better as cards.
  const showTable = useMediaQuery('(min-width: 64rem)');
  const { exportError, runExport } = useCsvExport('daily-log');

  // derived
  const logs = history.data ?? [];
  const configuredRate = settings?.settings.electricityRate;
  const rate = configuredRate && configuredRate > 0 ? configuredRate : undefined;
  const pageStart = (list.page - 1) * list.pageSize;

  // callbacks
  const save = async (values: DailyLogFormInput): Promise<DailyLogSaveResult> => {
    try {
      const response = await saveDailyLog(values.date, toPayload(values));
      if (!isSuccess(response.data)) return { ok: false, message: 'Unable to save this log.' };
      // The dashboard's hours, units and electricity cost come from this log.
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: dailyLogsKeys.all }),
        queryClient.invalidateQueries({ queryKey: dashboardKeys.all }),
      ]);
      setTarget(null);
      setSaved(
        values.date === today
          ? "Today's log saved."
          : `Log for ${formatWeekdayDate(values.date)} saved.`,
      );
      return { ok: true };
    } catch (error) {
      let result: DailyLogSaveResult = { ok: false };
      safeApiError(error, {
        context: { page: 'daily-log', action: 'saveDailyLog' },
        onError: (err) => {
          const fields = Object.fromEntries(
            Object.entries(err.fields ?? {}).filter(([key]) => isFieldName(key)),
          );
          result = { ok: false, fields, message: toErrorMessage(err) };
        },
      });
      return result;
    }
  };

  const openEdit = (log: DailyLog) => {
    setSaved(null);
    setTarget(log);
  };

  const columns = buildDailyLogColumns(rate, openEdit);

  // The endpoint returns the whole range, so the export is the rows already here.
  const exportCsv = () => runExport(() => Promise.resolve(exportRows(columns, logs)));

  return {
    today,
    todayLabel: formatWeekdayDate(today),
    todayLog: todayQuery.data?.[0],
    isTodayLoading: todayQuery.isPending,
    isTodayError: todayQuery.isError,
    from: range.from,
    to: range.to,
    period: `${formatShortDate(range.from)} – ${formatShortDate(range.to)}`,
    rate,
    logs,
    pageLogs: logs.slice(pageStart, pageStart + list.pageSize),
    daysLogged: logs.length,
    daysInRange: daysIn(range.from, range.to),
    totalHours: sumOf(logs.map((log) => log.machineHours)),
    totalUnits: sumOf(logs.map((log) => log.electricityUnits)),
    page: list.page,
    pageSize: list.pageSize,
    activeFilters: Number(matchPreset(range, today) !== DEFAULT_DATE_PRESET),
    columns,
    target,
    saved,
    showTable,
    isLoading: history.isPending,
    isRefreshing: history.isFetching && history.isPlaceholderData,
    isError: history.isError,
    exportError,
    setRange: list.setRange,
    clearFilters: () => list.update({ from: undefined, to: undefined }),
    setPage: list.setPage,
    setPageSize: list.setPageSize,
    exportCsv,
    saveToday: (values) => save({ ...values, date: today }),
    save,
    openNew: () => {
      setSaved(null);
      setTarget('new');
    },
    openEdit,
    closeDialog: () => setTarget(null),
    dismissSaved: () => setSaved(null),
    retry: () => void history.refetch(),
    retryToday: () => void todayQuery.refetch(),
  };
};

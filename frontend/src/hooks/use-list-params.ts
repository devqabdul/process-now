import { useSearchParams } from 'react-router';

import { DEFAULT_PAGE_SIZE } from '@api/process-backend/list-query';
import { DEFAULT_DATE_PRESET, type DateRange, matchPreset } from '@utils/date-presets';
import { shiftIsoDate, todayIso } from '@utils/format/date';
import { fromSortParam, type SortState, toSortParam } from '@utils/sort-param';

export { DEFAULT_PAGE_SIZE };
export const PAGE_SIZES = [15, 25, 50, 100];
const MAX_Q = 100;
// The API refuses a window longer than this; see DateRangeFields.
const MAX_SPAN_DAYS = 366;
// Ids are UUIDs; this only keeps junk out of the request, the API checks the rest.
const ID = /^[\w-]{1,64}$/;

type Patch = Record<string, string | number | string[] | undefined>;

/**
 * A list's page, size, search, sort and filters, kept in the URL so a refresh or Back lands on
 * the same rows. Anything hand-edited or stale falls back to the default rather than a 422.
 */
export const useListParams = (sortKeys: readonly string[], defaultSort: string) => {
  // wiring
  const [params, setParams] = useSearchParams();

  // derived
  const pageParam = Number(params.get('page'));
  const page = Number.isInteger(pageParam) && pageParam >= 1 ? pageParam : 1;
  const sizeParam = Number(params.get('pageSize'));
  const pageSize = PAGE_SIZES.includes(sizeParam) ? sizeParam : DEFAULT_PAGE_SIZE;
  const q = (params.get('q') ?? '').trim().slice(0, MAX_Q);
  const sortParam = params.get('sort') ?? '';
  const sort = sortKeys.includes(sortParam.replace(/^-/, '')) ? sortParam : defaultSort;
  const date = (key: string) => {
    const value = params.get(key) ?? '';
    return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : '';
  };

  // callbacks
  // Anything but a page turn starts over at page 1; defaults stay out of the URL.
  const update = (patch: Patch) =>
    setParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        if (!('page' in patch)) next.delete('page');
        for (const [key, value] of Object.entries(patch)) {
          next.delete(key);
          for (const one of [value].flat()) {
            if (one !== undefined && one !== '') next.append(key, String(one));
          }
        }
        if (next.get('page') === '1') next.delete('page');
        if (next.get('pageSize') === String(DEFAULT_PAGE_SIZE)) next.delete('pageSize');
        if (next.get('sort') === defaultSort) next.delete('sort');
        return next;
      },
      { replace: true },
    );

  return {
    page,
    pageSize,
    q,
    sort,
    sorting: fromSortParam(sort),
    // What to send: nothing when it's the list's default order.
    apiSort: sort === defaultSort ? undefined : sort,
    update,
    setPage: (next: number) => update({ page: next }),
    setPageSize: (next: number) => update({ pageSize: next }),
    setQ: (next: string) => update({ q: next.trim() }),
    setSorting: (next: SortState) => update({ sort: toSortParam(next) }),
    // Only values the endpoint accepts survive.
    getAll: <T extends string>(key: string, allowed: readonly T[]) =>
      params
        .getAll(key)
        .filter((value): value is T => (allowed as readonly string[]).includes(value)),
    getId: (key: string) => {
      const value = params.get(key) ?? '';
      return ID.test(value) ? value : '';
    },
    getIds: (key: string) => params.getAll(key).filter((value) => ID.test(value)),
    getMany: (key: string) =>
      params
        .getAll(key)
        .map((value) => value.slice(0, MAX_Q))
        .filter(Boolean),
    // `from`/`to`, defaulting like the API: the 30 days up to today.
    getRange: () => {
      const today = todayIso();
      const to = date('to') && date('to') <= today ? date('to') : today;
      const from = date('from');
      const valid = from && from <= to && from >= shiftIsoDate(to, -MAX_SPAN_DAYS);
      return { from: valid ? from : shiftIsoDate(to, -29), to };
    },
    // The default window stays out of the URL, like every other default.
    setRange: (next: DateRange) =>
      update(
        matchPreset(next) === DEFAULT_DATE_PRESET
          ? { from: undefined, to: undefined }
          : { ...next },
      ),
    get: (key: string) => (params.get(key) ?? '').slice(0, MAX_Q),
  };
};

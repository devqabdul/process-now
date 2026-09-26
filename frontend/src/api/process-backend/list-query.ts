import {
  infiniteQueryOptions,
  keepPreviousData,
  queryOptions,
  useInfiniteQuery,
  useQuery,
} from '@tanstack/react-query';
import { useEffect } from 'react';

import type { ListParams, Paged } from './common.types';
import type { ApiEnvelope } from './types';
import { unwrap } from './unwrap';

type Fetch<P, R> = (params: P) => Promise<{ data: ApiEnvelope<R> }>;

// The largest page the API serves; exports and "all" selects ask for it.
export const MAX_PAGE_SIZE = 100;
// The API's own defaults: a value equal to one of these never goes on the wire.
export const DEFAULT_PAGE_SIZE = 15;

/** A list response without `items` (e.g. an API older than this app) is a failed read, not an empty list. */
const pagedOrThrow = <R extends Paged<unknown>>(data: R): R => {
  if (!Array.isArray(data?.items)) throw new Error('The list response is not paged');
  return data;
};

/** Drops what the API would assume anyway, so a request carries only what the user changed. */
export const withoutDefaults = <P extends ListParams>(params: P): P => {
  const { page, pageSize, q, ...rest } = params;
  return {
    ...rest,
    ...(page !== undefined && page > 1 && { page }),
    ...(pageSize !== undefined && pageSize !== DEFAULT_PAGE_SIZE && { pageSize }),
    ...(q?.trim() && { q: q.trim() }),
  } as P;
};

/**
 * `list` is one page for the desktop table; `infinite` appends pages for phone cards. Both sit
 * under the domain's root key, so invalidating `xKeys.all` refetches them.
 */
export const listQueries = <P extends ListParams, R extends Paged<unknown>>(
  root: readonly string[],
  fetch: Fetch<P, R>,
) => ({
  list: (params: P) =>
    queryOptions({
      queryKey: [...root, 'list', params] as const,
      queryFn: async () => pagedOrThrow(await unwrap(fetch(withoutDefaults(params)))),
      // A new page, sort or filter keeps the old rows on screen (refreshing), not skeletons.
      placeholderData: keepPreviousData,
    }),
  infinite: (params: Omit<P, 'page'>) =>
    infiniteQueryOptions({
      queryKey: [...root, 'infinite', params] as const,
      queryFn: async ({ pageParam }) =>
        pagedOrThrow(await unwrap(fetch(withoutDefaults({ ...params, page: pageParam } as P)))),
      initialPageParam: 1,
      getNextPageParam: (last: R) =>
        last.page * last.pageSize < last.total ? last.page + 1 : undefined,
      placeholderData: keepPreviousData,
    }),
});

/** Every row matching the filters, a page of 100 at a time — for CSV export. */
export const fetchAllPages = async <P extends ListParams, T>(
  fetch: Fetch<P, Paged<T>>,
  params: Omit<P, 'page' | 'pageSize'>,
) => {
  const rows: T[] = [];
  for (let page = 1; ; page += 1) {
    const data = pagedOrThrow(
      await unwrap(fetch(withoutDefaults({ ...params, page, pageSize: MAX_PAGE_SIZE } as P))),
    );
    rows.push(...data.items);
    if (data.items.length === 0 || rows.length >= data.total) return rows;
  }
};

/**
 * One list screen's rows: a page for the desktop table, appended pages for phone cards. Only the
 * layout on screen fetches. A page left empty by a delete jumps back to the last real page.
 */
export const usePagedList = <P extends ListParams, R extends Paged<unknown>>(
  queries: ReturnType<typeof listQueries<P, R>>,
  params: P,
  desktop: boolean,
  onPageOverflow: (lastPage: number) => void,
) => {
  // wiring
  const paged = useQuery({ ...queries.list(params), enabled: desktop });
  // The page number is the infinite query's own pageParam, so it stays out of the key.
  const infinite = useInfiniteQuery({
    ...queries.infinite({ ...params, page: undefined }),
    enabled: !desktop,
  });

  // derived
  const active = desktop ? paged : infinite;
  const first = desktop ? paged.data : infinite.data?.pages[0];
  const items: R['items'] = desktop
    ? (paged.data?.items ?? [])
    : (infinite.data?.pages.flatMap((page) => page.items) ?? []);
  const overflow =
    desktop && paged.data && !paged.isPlaceholderData && paged.data.items.length === 0
      ? Math.ceil(paged.data.total / paged.data.pageSize)
      : 0;

  // effects
  useEffect(() => {
    if (overflow > 0 && overflow < (params.page ?? 1)) onPageOverflow(overflow);
  }, [overflow, params.page]);

  return {
    items,
    // The first page's envelope: total, and any list-wide figure such as expenses' sum.
    data: first,
    total: first?.total ?? 0,
    isLoading: active.isPending,
    isRefreshing: active.isFetching && !active.isPending && !infinite.isFetchingNextPage,
    isError: active.isError,
    isLoadingMore: infinite.isFetchingNextPage,
    loadMore: () => void infinite.fetchNextPage(),
    retry: () => void active.refetch(),
  };
};

# API layer

One backend, one folder: `src/api/process-backend/`. One axios instance, thin services,
co-located query hooks. Pages import from the domain's `index.ts`
(`@api/process-backend/companies`), never from a deep file.

```
src/api/process-backend/
  axios.ts              the single http client + the 401 response interceptor
  types.ts              ApiEnvelope<T>, NormalizedError, ApiErrorType
  safe-api-error.ts     isSuccess, normalizeError, safeApiError
  unwrap.ts             envelope → payload; the seam every query hook goes through
  common.types.ts       ListParams + Paged<T> — the list contract
  list-query.ts         listQueries, usePagedList, fetchAllPages — paged lists
  index.ts              re-exports the helpers above
  <domain>/             <domain>.types.ts, <domain>-service.ts,
                        use-<domain>-queries.ts, index.ts
```

Nine domains, one per backend module: `auth`, `billing`, `companies`, `daily-logs`, `dashboard`,
`orders`, `service-types`, `settings`, `vendors`. **Six have no screen yet** — the folder exists so
the screen that needs one finds its types and hooks already written. Two departures from the shape
above:

- `auth/` adds `use-auth-queries.ts` (`authKeys`, `meQueryOptions`, `useMe`), and `auth-service.ts`
  carries `login`, `logout`, `getMe` and `changePassword`.
- `companies/` and `dashboard/` each keep a `<domain>.fixtures.ts`. Those are **test data**,
  imported only by `companies-list-page.test.tsx` and `dashboard-page.test.tsx`. Nothing outside a
  test reads them.

## The envelope

Every response has the same shape (`src/api/process-backend/types.ts`):

```ts
interface ApiEnvelope<T> {
  status_code: number;
  message: string;
  data?: T;
}
```

`status_code` and `message` are snake_case because that is what the API sends; everything inside
`data` is camelCase. Wire types are written by hand in `<domain>.types.ts` to match the API's
response DTOs — there is no codegen.

## `unwrap` — the envelope seam

A query hook wants the payload, not the envelope, so every `queryFn` goes through `unwrap`:

```ts
export const unwrap = async <T>(request: Promise<{ data: ApiEnvelope<T> }>): Promise<T> => {
  const { data: envelope } = await request;
  if (!isSuccess(envelope)) throw new Error(envelope.message || 'Request failed');
  return envelope.data;
};
```

A non-2xx never reaches it — axios rejects first. What it catches is a **2xx carrying no data**,
which it throws on so React Query shows an error state instead of rendering `undefined`. Pages, by
contrast, guard with `isSuccess` themselves, because they call the service directly.

`common.types.ts` holds the other cross-domain contract, the one every list endpoint shares — see
[Paged lists](#paged-lists).

## Guard on the negation

```ts
if (!isSuccess(response.data)) {
  setError('root', { type: 'server', message: '…' });
  return;
}
// happy path continues at the top level
```

Never `if (isSuccess(res.data)) { … }` wrapping the happy path. Flat, early exit, cheap check
first. `isSuccess` narrows `ApiEnvelope<T>` to `{ data: T }` and treats a 2xx with `undefined` or
`null` data as a failure — an empty list or object is a success, because every list is empty for a
newly created company.

## `safeApiError` is the only catch site

```ts
catch (error) {
  safeApiError(error, {
    context: { page: 'create-company', action: 'createCompany' },
    onError: (err) => { /* err is a NormalizedError */ },
  });
}
```

`normalizeError` flattens anything axios throws into
`{ error_type: 'network' | 'http' | 'unknown', status_code, message, fields? }`.
`safeApiError` logs it with the `page/action` context in dev only, then hands it to `onError`.

Rules for `onError`:

- `err.fields` (a `Record<string, string>` from the API) maps onto `form.setError(field, …)`,
  filtered through a page-local `isFieldName` type guard. Focus the first one.
- Anything else goes to `setError('root', …)` or a field-level message. **Failures live in the
  form, never in a toast** — the user is looking at the field that broke. `shared/toast.tsx` is
  for _success_ after the form is gone (a dialog that closed, a row acted on), and it is a dumb
  component the page owns: `message` + `onDismiss`, no provider, no queue.
- Map status codes to copy in a module-level helper, not inline. See `toLoginErrorMessage` in
  `src/pages/auth/login/use-login-page.ts`, which gives 401 and 429 their own sentence and keeps
  the wrong-credentials message identical for both fields so the API never reveals which accounts
  exist.

## Query keys and `queryOptions`

Each domain exports one key factory. `*.all` is a plain prefix used for invalidation; the other
members return `queryOptions({ queryKey, queryFn })` so a hook and anything else share one key
and one fetcher.

```ts
export const dashboardKeys = {
  all: ['dashboard'] as const,
  detail: (date: string) =>
    queryOptions({
      queryKey: [...dashboardKeys.all, date] as const,
      queryFn: () => unwrap(getDashboard(date)),
    }),
};

export const useDashboard = (date: string) => useQuery(dashboardKeys.detail(date));
```

Invalidate by prefix through the factory:
`queryClient.invalidateQueries({ queryKey: companiesKeys.all })`.

## Paged lists

Every list endpoint (`/vendors`, `/service-types`, `/orders`, `/bills`, `/expenses`,
`/admin/companies`) takes `ListParams` and answers `Paged<T>`:

```ts
interface ListParams {
  page: number;
  pageSize: number;
  q?: string;
  sort?: string;
}
interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
```

`pageSize` is 15, 25, 50 or 100; `sort` is one of the endpoint's keys, `-` prefixed for
descending — an unknown key is a 422, so a column only sorts when its id **is** an API sort key.
The domain's `XQuery` extends `ListParams` with its filters; an array filter (`status: OrderStatus[]`)
goes out as a repeated param (`status=a&status=b`) because `axios.ts` sets
`paramsSerializer: { indexes: null }`. `/expenses` answers `Paged<Expense> & { sum }`, the money
total over every matching row.

`listQueries(root, getThings)` (`list-query.ts`) gives a domain its two list factories, spread
into the key factory so they sit under the domain's root key and `xKeys.all` still invalidates
them:

```ts
export const ordersKeys = {
  all: ['orders'] as const,
  ...listQueries(['orders'], getOrders),
  detail: (id: string) => queryOptions({ … }),
};
```

| Factory                  | Key                          | For                                                                                                                                                            |
| ------------------------ | ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `xKeys.list(params)`     | `[root, 'list', params]`     | one page — the desktop table. `placeholderData: keepPreviousData`, so a page/sort/filter change dims the old rows (`refreshing`) instead of flashing skeletons |
| `xKeys.infinite(params)` | `[root, 'infinite', params]` | phone cards + Load more. `initialPageParam: 1`, `getNextPageParam` stops once `page * pageSize >= total`                                                       |

A list screen doesn't call both: `usePagedList(xKeys, params, showTable, setPage)` enables only
the one the layout shows and returns `items`, `total`, `data` (the first page's envelope, for
`sum`), `isLoading`, `isRefreshing`, `isError`, `isLoadingMore`, `loadMore` and `retry`. A page
left empty by a delete (page 4 of 3) calls `setPage` with the last real page.

A select that needs "every" vendor or service type asks for one page of 100
(`useVendors({ page: 1, pageSize: MAX_PAGE_SIZE, sort: 'name' })`) and reads `.items`; past 100
it needs a search, and the call site says so.

**CSV export is a one-off action, not a query**: `fetchAllPages(getThings, filters)` pages through
the service 100 rows at a time until it has `total`, with the same `q`, `sort` and filters as the
screen. The controller hook hands the rows to `exportRows(columns, rows)` through
`useCsvExport(name)` (`src/hooks/`), which downloads `<name>-YYYY-MM-DD.csv` and keeps a failure
to show under the toolbar.

The page, page size, `q`, sort and filters live in the **URL**, through `useListParams(sortKeys,
defaultSort)` (`src/hooks/use-list-params.ts`): a refresh or Back keeps them, a hand-edited value
falls back to the default instead of a 422, any change but a page turn resets to page 1, and
defaults stay out of the URL. `/orders?vendorId=…` is how the header's vendor quick-jump opens
one vendor's orders.

## Query vs direct call

| Kind of call                                         | How                                                                              |
| ---------------------------------------------------- | -------------------------------------------------------------------------------- |
| Cacheable read — a list, a detail, dashboard metrics | query hook next to the domain (`use-<domain>-queries.ts`), never in `src/hooks/` |
| Write or one-off action — create, login, logout      | call the service function **directly** from the page's controller hook           |

There is no `useMutation` in this codebase, by design. The controller hook owns the loading state
(`formState.isSubmitting` or local state) and invalidates the affected keys itself. Client
defaults are in `src/app/providers/query-client.ts`: `staleTime: 30_000`, `retry: 1`,
`refetchOnWindowFocus: false`, mutations `retry: 0`.

## Services

Services are thin route wrappers; they never inspect responses or handle errors:

```ts
export const login = (payload: LoginPayload) =>
  http.post<ApiEnvelope<LoginResponse>>('/auth/login', payload);
```

`http` (`axios.ts`) is created with `baseURL: env.VITE_API_BASE_URL`, `withCredentials: true`
(the session is an httpOnly cookie set by the API) and a 15s timeout.

`createCompany` is a plain `http.post` like every other service. The API answers a duplicate name /
phone / email with a 409 carrying per-field messages; the page's field-error path maps them onto
the form through `safeApiError`. That path is real, and
`create-company-page.test.tsx` mocks the service to exercise it.

## The 401 interceptor

One response interceptor, and it does exactly one thing:

```ts
http.interceptors.response.use(undefined, (error: unknown) => {
  if (isAxiosError(error) && error.response?.status === 401) {
    sessionEvents.emit('expired');
  }
  return Promise.reject(error);
});
```

It can't navigate — it has no router — so it announces. `src/lib/auth/session-listener.tsx`
subscribes, clears the query cache and navigates to `/login`; it is mounted once at the router
root. The rejection is re-thrown either way, so a caller's own `catch` still runs. See
[`routing.md`](./routing.md#auth-guards).

## What is still a placeholder

One UI shell carries `TODO(api)` — the notifications panel. Run `grep -rn "TODO(api)" src/` for
the current list rather than trusting a number here.

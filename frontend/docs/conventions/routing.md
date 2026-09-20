# Routing

React Router 8 in **data mode**. `createBrowserRouter(routes)` in
`src/app/router/app-router.tsx`, `RouterProvider` imported from `react-router/dom`; everything
else comes from `react-router`. The route table is one flat file,
[`src/app/router/routes.tsx`](../../src/app/router/routes.tsx), typed as `RouteObject[]`.

## The table

| Path                                                                                        | Component                                    | Guard                          | Chunk          |
| ------------------------------------------------------------------------------------------- | -------------------------------------------- | ------------------------------ | -------------- |
| `/login`                                                                                    | `LoginPage` (it renders `AuthLayout` itself) | `guestOnly`                    | lazy           |
| `/`                                                                                         | `WorkspaceShell` with `COMPANY_ADMIN_NAV`    | `requireRole('company_admin')` | entry (layout) |
| `/` (index)                                                                                 | `DashboardPage`                              | —                              | lazy           |
| `/orders`, `/orders/new`, `/bills`, `/vendors`, `/service-types`, `/daily-log`, `/settings` | `ComingSoonPage` with the screen's name      | —                              | lazy           |
| `/admin`                                                                                    | `WorkspaceShell` with `SUPER_ADMIN_NAV`      | `requireRole('super_admin')`   | entry (layout) |
| `/admin` (index)                                                                            | `loader: () => redirect('/admin/companies')` | —                              | —              |
| `/admin/companies`                                                                          | `CompaniesListPage`                          | —                              | lazy           |
| `/admin/companies/new`                                                                      | `CreateCompanyPage`                          | —                              | lazy           |
| `*`                                                                                         | `NotFoundPage`                               | —                              | lazy           |

`AuthLayout` is **not** a route: `login-page.tsx` wraps its own markup in it.

Both workspaces mount the **same** `WorkspaceShell`; only the nav groups and the identity differ,
and both come from the route as props (`src/constants/navigation.ts`).

A route may also carry `handle: { screen }` — the name of the screen it stands for. `comingSoon()`
sets it so one shared chunk can say which placeholder it is, and `WorkspaceShell` reads it for the
loading message.

## Lazy vs non-lazy

- **Every page is lazy, `/login` included**, through `React.lazy` + a `<Suspense>` boundary:

  ```tsx
  const DashboardPage = lazy(() =>
    import('@pages/dashboard/dashboard-page').then((m) => ({ default: m.DashboardPage })),
  );
  ```

  The layout owns the boundary, so the fallback is shaped like the page's own chrome.

- **Route-level `lazy` is deliberately not used.** It blocks the navigation while the chunk
  downloads instead of rendering, so no fallback ever paints and the user sits on the old screen
  with only the progress bar. The comment above the imports in `routes.tsx` records that.
- **The two layout routes stay non-lazy.** Route `middleware` cannot be set from a `lazy` function,
  and the auth guards live on those routes.
- `vite.config.ts` splits `react`, `react-dom`, `react-router`, `scheduler` and `@tanstack` into
  one long-lived `vendor` chunk. Everything else (zod, react-hook-form, …) stays in the route
  chunk that imports it.

## Loading treatment

Four levels, each with its own job. Never a bare full-page spinner between screens.

| When                                    | What                                                                                                                                                     |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Whole window waiting, no chrome yet     | `AppSplash` — turning mark, wordmark, a `message` (default "Loading your workspace…"). Root `HydrateFallback`, and the `*` route                         |
| A page chunk downloading inside a shell | `LoadingMark` — the same turning mark plus "Opening Orders…". `WorkspaceShell`'s Suspense fallback; `AuthFallback` wraps it in `AuthLayout` for `/login` |
| Navigating between pages                | `RouteProgress` — a 2px bar over the shell, driven by `useNavigation().state`, rendered once in `WorkspaceShell`                                         |
| Data arriving into a mounted screen     | Skeletons shaped like the content (`StatTileSkeleton`, `CompanyCardSkeleton`, `DataTable loading`)                                                       |

`LoadingMark` (`shared/loading-mark.tsx`) is a `role="status" aria-live="polite"` region, so the
wait is announced. The screen name comes from the matched route's `handle.screen`, falling back to
the nav item's label — `WorkspaceShell` resolves it. Pass `message` instead when there is no screen
to name ("Loading sign in…").

The mark spins (`animate-mark-spin`) in both `AppSplash` and `LoadingMark`, so the brand carries
the wait rather than a bare spinner — but it does appear between screens, not only at first paint.
The chrome around it stays put: `LoadingMark` renders _inside_ the layout.

A read that **fails** is not a loading state: it renders `LoadError`
(`shared/load-error.tsx`) — icon, title, description, Retry. See
[`components.md`](./components.md).

## Errors

`RouteErrorBoundary` (`src/app/router/route-error-boundary.tsx`) is the root route's
`ErrorBoundary`. It recognises a failed dynamic import — the signature of a tab running a build
that was replaced by a deploy — and reloads once. Otherwise it renders the status line from
`isRouteErrorResponse(error)` and a Refresh button.

## Auth guards

`src/app/router/middleware.ts` exports three `MiddlewareFunction`s:

| Guard               | Rule                                                                      |
| ------------------- | ------------------------------------------------------------------------- |
| `requireAuth`       | signed in, any role; otherwise `redirect('/login')`                       |
| `requireRole(role)` | signed in **with that role**; a wrong role goes to `ROLE_META[role].home` |
| `guestOnly`         | for `/login`: someone already signed in is sent to their own home         |

They are attached in `routes.tsx` — `guestOnly` on `/login`, `requireRole('company_admin')` on
`/`, `requireRole('super_admin')` on `/admin`. Middleware runs parent → child, before the loaders
and before render, so a signed-out visitor never sees a flash of the app. That is why the two
layout routes are not lazy. A wrong-role user is redirected, not shown an error.

All three call `loadSession()` (`src/lib/auth/session.ts`), which reads `/auth/me` through
`queryClient.query({ ...meQueryOptions, staleTime: 'static' })`. The `staleTime` is the point: the
guard's fetch is the one the page then reads from cache, so a guarded navigation doesn't hit
`/auth/me` twice. A 401 there means "not signed in", which is an answer — it returns `null` rather
than throwing.

The shell's identity comes from `useIdentity()` → `useMe()` in `routes.tsx`, a cache read by the
time it renders. There are no hard-coded identity constants any more.

`routes.test.tsx` covers the three cases: signed out, signed in with the wrong role, signed in with
the right one, plus `guestOnly` bouncing a signed-in user off `/login`.

### Session expiry

`axios.ts` emits `sessionEvents.emit('expired')` on any 401. `SessionListener`
(`src/lib/auth/session-listener.tsx`), mounted once at the router root, calls `redirectToLogin()`
— unless the user is already on `/login`. See
[`api-layer.md`](./api-layer.md#the-401-interceptor).

**Ending a session is a full page load, not a `navigate()`.** `redirectToLogin()`
(`src/lib/auth/session.ts`) does `window.location.replace('/login')`, and `useLogout` uses it after
awaiting `logout()`. Clearing the query cache instead is what made sign-out look broken: mounted
screens immediately refetched, every refetch 401'd, each 401 re-emitted `expired`, and the
navigation restarted forever. A reload drops the cache, the mounted screens and the in-flight
requests together, so nothing is left to refetch against a dead cookie.

## Navigation data

`src/constants/navigation.ts` owns both menus. A `NavItem` carries `label`, `to`, `icon` and
optional `mobile` (`'tab'` for its own bottom-bar tab, `'action'` for the raised centre button;
anything else falls into the "More" sheet), `mobileLabel`, `end` (exact match, needed when
another path starts with this one) and `badge`. `WorkspaceShell` derives the desktop sidebar or
top bar, the phone tab bar and the command palette from that one list — add a screen there, not
in three places.

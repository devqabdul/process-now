# Frontend Plan (POC)

Based on [problem-statement.md](problem-statement.md) and [module-design.md](module-design.md).

> **Written 2026-09-19, before the build.** Sections marked **Not built** below are intent, not a
> description of the app. Everything else has been corrected against the shipped code — but this
> **plan is a record of intent, not of what shipped**: where it and the code disagree, the code
> wins. [`../frontend/README.md`](../frontend/README.md) and
> [`../frontend/docs/conventions/`](../frontend/docs/conventions) describe what is actually there.

## Stack

Latest stable versions from the npm registry, checked 2026-09-19 against each project's docs and changelog (see [Sources](#sources)). Pin with `^` ranges and commit `yarn.lock`.

| Concern         | Package                                                                                                                                 | Version                                            |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| Runtime         | Node                                                                                                                                    | 24 LTS (24.21), see note 7                         |
| Package manager | Yarn (Berry) via Corepack                                                                                                               | 4.18, see note 7                                   |
| UI              | `react`, `react-dom`                                                                                                                    | 19.3                                               |
| Language        | `typescript` (strict, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`)                                                         | **6.0.3**, see note 1                              |
| Build           | `vite`, `@vitejs/plugin-react`                                                                                                          | 8.3, 6.1, see note 6                               |
| Styling         | `tailwindcss`, `@tailwindcss/vite` (`@theme` tokens; no SCSS or CSS-in-JS)                                                              | 4.3                                                |
| Routing         | `react-router` (data mode: `createBrowserRouter`; `RouterProvider` from `react-router/dom`)                                             | 8.4, see note 4                                    |
| Server state    | `@tanstack/react-query` (+ `-devtools` in dev)                                                                                          | 5.103, see note 5                                  |
| Forms           | `react-hook-form`, `@hookform/resolvers`                                                                                                | 7.88, 5.9                                          |
| Validation      | `zod` — page schemas import the `zod/mini` subpath; `app/config/env-schema.ts` uses the full `zod`                                      | 4.6                                                |
| HTTP            | `axios`                                                                                                                                 | 1.20                                               |
| UI primitives   | **None.** No `@base-ui/react`, no shadcn/ui, no `radix-ui` — `components/ui/` is hand-written (see note 9)                              | —                                                  |
| Class helpers   | `clsx`, `tailwind-merge` (`cn()`). **`class-variance-authority` is not installed** — variants are plain lookup objects                  | 2.1, 3.7                                           |
| Icons           | `lucide-react`                                                                                                                          | 1.47                                               |
| Tables          | `@tanstack/react-table` (`components/ui/data-table.tsx`)                                                                                | 9.2.4                                              |
| Fonts           | `@fontsource-variable/inter`, `@fontsource-variable/jetbrains-mono` — self-hosted, so the PWA precache glob includes `woff2`            | 5.3                                                |
| Web vitals      | `web-vitals`, reported from `lib/vitals/report-web-vitals.ts`                                                                           | 6.2                                                |
| Notifications   | **None.** No `react-toastify` and no `lib/notifications` module — errors are shown in the form or by `components/shared/load-error.tsx` | —                                                  |
| PWA             | `vite-plugin-pwa`                                                                                                                       | 1.3                                                |
| Testing         | `vitest`, `@testing-library/react`, `@testing-library/dom`, `@testing-library/user-event`, `@testing-library/jest-dom`, `jsdom`, `msw`  | 5.0, 16.3, 10.4, 14.6, 7.0, 30.1, 2.15, see note 8 |
| Lint            | `eslint` (flat config), `typescript-eslint`, `eslint-plugin-boundaries`, `eslint-plugin-react-hooks`, `eslint-plugin-jsx-a11y`          | **9.39**, 8.70, 7.2, 7.1, 6.10, see note 2         |
| Format          | `prettier`                                                                                                                              | 3.9                                                |
| Git hooks       | `husky`, `lint-staged`, `@commitlint/cli` + `config-conventional`                                                                       | 9.1, 17.5, 21.2                                    |

**Version notes**

1. **TypeScript 6.0.3, not 7.0.** TypeScript 7.0.2 is out, but it ships no programmatic compiler API (expected in 7.1). `typescript-eslint` 8.70 (including its canary builds) needs `typescript <6.1.0`, and its maintainers say they can't support 7 until that API exists (issue #10940; a TS 7.1 prototype is in draft PR #12803). The TypeScript team's official workaround is to install both side by side (`"@typescript/native": "npm:typescript@^7.0.2"`, `"typescript": "npm:@typescript/typescript6@^6.0.2"`). The POC keeps a single compiler on 6.0.3 and moves to 7 when `typescript-eslint` supports it. This doesn't affect Vite or Vitest, because they only transpile `.ts` files and never type-check. `tsconfig` must follow the TS 6 defaults: `baseUrl` is deprecated (and removed in 7), so write the `paths` aliases relative to the tsconfig; and `types` now defaults to `[]`, so list `vite/client` (plus `@testing-library/jest-dom` for tests) explicitly.
2. **ESLint 9.39, not 10.** ESLint 10.11 is out, but `eslint-plugin-jsx-a11y` 6.10.2 (last released 2024-10) only lists `eslint` up to `^9` as a peer. ESLint-10 support is tracked in its issue #1075, and PR #1081 is still open. That PR changes only the peer range and tests, not the rule code, but nothing is released yet. Note that ESLint 9 reached end-of-life on 2026-08-06. The plugin's maintainer says it will support 10 eventually, with no date. There is a community fork, `eslint-plugin-jsx-a11y-x` 0.2.0 (peer `eslint ^9 || ^10`), but it is small and hasn't been vetted as a drop-in replacement. The POC stays on 9.39 and moves to 10 once `eslint-plugin-jsx-a11y` releases support. The other lint packages (`typescript-eslint`, `eslint-plugin-react-hooks` 7.1, `eslint-plugin-boundaries` 7.2) already accept ESLint 10.
3. **Zod 4** has a different API from Zod 3, e.g. `z.email()` instead of `z.string().email()` and the `error` option replacing the `message` option (`message` is deprecated but still works). `@hookform/resolvers` 5.9 `zodResolver` supports Zod 4 (peer `zod ^3.25 || ^4`). If a schema uses `.default()` or transforms, type the form as `useForm<z.input<typeof schema>, unknown, z.output<typeof schema>>`, or leave the generics out, rather than passing a single `useForm<T>`.
4. **React Router 8** (released 2026-06): the `react-router-dom` package is gone. Import `RouterProvider` from `react-router/dom`, which wires in `flushSync`; everything else comes from `react-router`. Middleware is now always on: the v7 `future.v8_middleware` flag is the default, and route `middleware` runs from parent to child before any loader, on every client navigation. Loaders themselves run in parallel. Route `lazy` takes either a function returning `{ Component, loader, … }` or an object with one async function per property. `middleware` can't be set from a `lazy` function. The data-mode docs declare error UI with the `ErrorBoundary` route property (`errorElement` still exists; the two are mutually exclusive). The minimum versions are Node 22.22, React 19.2.7 and Vite 7.
5. **TanStack Query 5.103** deprecates `ensureQueryData`, `fetchQuery` and `prefetchQuery` (marked `@deprecated` in the source; they will be removed in v6). The replacement is `queryClient.query(options)`, and `query({ ...options, staleTime: 'static' })` is the direct equivalent of `ensureQueryData`. Share each query's key and `queryFn` through `queryOptions()`.
6. **`@vitejs/plugin-react` 6 and React Compiler:** a plain `react()` does not enable React Compiler. It's opt-in either through the `compiler: true` option (Rust port via `oxc-transform-react`, marked experimental, peer pinned to `^0.145.0`) or through Babel (`@rolldown/plugin-babel` + `babel-plugin-react-compiler` with `reactCompilerPreset()`, which is what react.dev documents). React's docs call the compiler stable and recommend it for new code, but the POC doesn't enable it (see the memoization rule under Conventions). `eslint-plugin-react-hooks` 7's `recommended` preset already includes the compiler-derived rules.
7. **Node and Yarn:** Node 24 is Active LTS until 2026-10-20 (then maintenance until 2028-04-30); Node 26 becomes LTS on 2026-10-28. Node 24 still bundles Corepack (marked experimental), but Node 25 and later don't, and Yarn's install guide now starts with `npm install -g corepack`. Set up with `npm install -g corepack` and pin `"packageManager": "yarn@4.18.0"`.
8. **Vitest 5:** requires Vite 6.4+ and Node 22.12+. `vite` is now a required peer, which Yarn doesn't install automatically, so keep `vite` as a direct devDependency (it already is). `clearMocks` now defaults to `true`. Setup: `test: { environment: 'jsdom', setupFiles: ['src/test/setup.ts'] }`. The setup file imports `@testing-library/jest-dom/vitest` and starts the MSW server (`setupServer` from `msw/node`: `listen` in `beforeAll`, `resetHandlers` in `afterEach`, `close` in `afterAll`). `@testing-library/dom` is a required peer of both `@testing-library/react` 16 and `@testing-library/jest-dom` 7.
9. **Reversed: no primitive library at all.** The build ships hand-written primitives in `components/ui/` (avatar, badge, button, card, data-table, field-error, field-label, icon-button, input-shell, search-input, skeleton, spinner) — no `@base-ui/react`, no shadcn/ui, no `class-variance-authority`. The POC needed a small, fixed set of controls, and Tailwind plus `cn()` covered them without a dependency. The original reasoning is kept below, unbuilt, because it still applies if a dialog, combobox or date picker is ever needed. _Base UI (built by the MUI team) reached v1.0 in 2025-12 and ships monthly releases. shadcn/ui made it the default for new projects in 2026-07. Radix (`radix-ui` 1.6.7) is still supported by shadcn, but its updates have slowed since the WorkOS acquisition. Base UI's per-component bundle is roughly 10–20% smaller (third-party benchmark, not measured on this project), and it adds Combobox, Autocomplete, Number Field and Drawer, which Radix lacks. Composition uses the `render={<X />}` prop instead of Radix's `asChild`. The package moved from `@base-ui-components/react` to `@base-ui/react` at v1. `date-fns` and `@date-fns/tz` are optional peers that are only needed for date components, so the POC doesn't install them. Set up with `yarn dlx shadcn@latest init`, then add components with `yarn dlx shadcn@latest add button dialog select tabs`. The generated files are ours to edit, and styling stays in Tailwind classes plus `@theme` tokens._

Not in the POC: product analytics, error monitoring, feature flags, i18n, charts (the dashboard uses stat tiles) and offline data. The one exception added during the build is `web-vitals`, and it only posts when `VITE_VITALS_URL` is set.

## Folder structure

As built:

```
src/
  app/
    config/          env.ts, env-schema.ts (zod-validated env, fails the dev server and the build)
    providers/       app-providers.tsx (QueryClient), query-client.ts
    router/          app-router.tsx, routes.tsx, middleware.ts, route-error-boundary.tsx
    tailwind.css
  api/
    process-backend/
      axios.ts
      safe-api-error.ts      safeApiError, isSuccess, normalizeError
      unwrap.ts              envelope → data, for query hooks
      types.ts               ApiEnvelope<T>, NormalizedError   common.types.ts  PageQuery, …
      auth/  companies/  settings/  vendors/  service-types/
      orders/  billing/  daily-logs/  dashboard/
        each: <domain>-service.ts, <domain>.types.ts, use-<domain>-queries.ts
  pages/
    auth/login/  admin/{companies-list,create-company}/  dashboard/
    coming-soon/  not-found/          (orders/, bills/, vendors/, service-types/,
                                       daily-log/, settings/ are not built yet)
  components/
    ui/          Avatar, Badge, Button, Card, DataTable, FieldError, FieldLabel,
                 IconButton, InputShell, SearchInput, Skeleton, Spinner
    shared/      AppSplash, BrandLockup, EmptyState, LoadError, LoadingMark,
                 LogoutButton, PageHeader, ProcessMark, RouteProgress, StatTile, ThemeToggle
    layouts/     WorkspaceShell (one shell for both workspaces: menu sheet, bottom nav,
                 command palette, company chip, notifications) + AuthLayout, AuthFallback
    sections/    page-bound components, mirrors pages/
  lib/
    auth/            session.ts (loadSession), session-events.ts (401 → logout),
                     session-listener.tsx
    layout-mode/     layout-mode.ts, use-layout-mode.ts
    theme/           theme.ts, use-theme.ts
    vitals/          report-web-vitals.ts
    cn.ts
  hooks/         use-media-query.ts
  constants/     navigation.ts, roles.ts
  types/         cross-cutting primitives (@shared) — the alias exists, the folder is empty
  utils/         format/ (money, date, quantity with unit), identifier.ts
```

**Not built:** `utils/pricing.ts` (the live price preview belongs to the unbuilt New order screen).

Differences from the pre-build plan, for anyone following it: there is no `app-config.ts`, no
`root-layout.tsx` (`routes.tsx` holds the root route inline), and `session-listener.tsx` lives in
`lib/auth/`, not `app/router/`. `isStatusSuccess` was never implemented — `isSuccess` is the only
envelope guard. There is one layout shell, `WorkspaceShell`, not the three planned (`AppLayout`,
`AdminLayout` and `AuthLayout`); `AuthLayout` survives but the login page renders it itself rather
than sitting under a layout route. `lib/notifications/` is an empty folder — no `notify` module was
ever written. `use-debounce` and `use-online-status` were never written either.

**Path aliases:** `@app`, `@api`, `@pages`, `@components`, `@lib`, `@hooks`, `@utils`, `@assets`, `@constants`, `@shared` (→ `src/types`), `@test`.

**Dependency direction** (enforced by `eslint-plugin-boundaries`): `ui → shared → sections → layouts → pages`. `lib/`, `utils/`, `constants/`, `api/`, `types/` and `hooks/` cannot import from `components/` or `pages/`. As built, the component tiers also may not import `app/`, while `lib/` and `api/` may — `lib/auth/session.ts` takes the `queryClient` singleton and `api/process-backend/axios.ts` takes `env`.

## Module structure

Every module has the same three parts: an **API domain**, one **page folder per screen**, and **sections** for that module's page-bound components.

### Template (the Orders module as the example)

The Orders **API domain** below is built; its pages and sections are **not built** — read this
block as the shape a new module should take, not as a file listing.

```
api/process-backend/orders/
  orders.types.ts          Order, OrderItem, OrderStatus, CreateOrderPayload, ReturnOrderPayload
  orders-service.ts        getOrders, getOrder, createOrder, startOrder, returnOrder, cancelOrder
  use-orders-queries.ts    ordersKeys, useOrders, useOrder  — reads only; the writes above
                           are called straight from the page's controller hook
  index.ts                 public exports of the domain

pages/orders/
  orders-list/
    orders-list-page.tsx         renders only; reads everything from the hook
    use-orders-list-page.ts      controller hook (state → wiring → derived → callbacks → effects → return)
  new-order/
    new-order-page.tsx
    use-new-order-page.ts        zod schema inline; exports NewOrderFormInput
  order-detail/
    order-detail-page.tsx
    use-order-detail-page.ts

components/sections/orders/
  order-card.tsx
  order-item-row.tsx
  service-option-picker.tsx
  return-quantities-form.tsx
```

Rules:

- **Query keys:** each domain exports one factory. `ordersKeys.all` is a plain key prefix, while `ordersKeys.list(filters)` and `ordersKeys.detail(id)` return `queryOptions({ queryKey, queryFn })`, so hooks and route middleware share the same key and fetcher. Mutations invalidate by prefix through it: returning an order calls `invalidateQueries({ queryKey: ordersKeys.all })`, and does the same for `billsKeys.all` and `dashboardKeys.all`.
- **Pages** import from `@api/process-backend/<domain>` (its `index.ts`), never from deep files.
- **A section** belongs to one module. Once a second module needs it, it moves to `components/shared/`.

### All modules

All nine API domains are built and call the real backend. The **Pages** and **Sections** columns
are built only for Auth, Companies and Dashboard; the rest are intent, and their routes currently
render the shared `coming-soon` page.

| Module                  | API domain (`api/process-backend/`)                                               | Pages (`pages/`)                                                          | Sections (`components/sections/`)                                              |
| ----------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Auth                    | `auth/`: login, logout, me, changePassword · `useMe`, `meQueryOptions`            | `auth/login/`                                                             | `auth/`: login-form                                                            |
| Companies (Super Admin) | `companies/`: list, create · `useCompanies`                                       | `admin/companies-list/`, `admin/create-company/`                          | `admin/`: company-card                                                         |
| Settings                | `settings/`: get, update · `useSettings`                                          | `settings/`                                                               | `settings/`: company-details-form, rates-form                                  |
| Vendors                 | `vendors/`: list, create, update · `useVendors`                                   | `vendors/vendors-list/`                                                   | `vendors/`: vendor-card, vendor-form-dialog, vendor-picker (used by New order) |
| Service types           | `service-types/`: list, get, create, update · `useServiceTypes`, `useServiceType` | `service-types/service-types-list/`, `service-types/service-type-editor/` | `service-types/`: service-type-card, option-group-editor, option-choice-row    |
| Orders                  | `orders/` (template above; adds cancel)                                           | `orders/orders-list/`, `orders/new-order/`, `orders/order-detail/`        | `orders/` (template above)                                                     |
| Billing                 | `billing/`: list, get, record payment, void · `useBills`, `useBill`               | `bills/bills-list/`, `bills/bill-detail/`                                 | `bills/`: bill-card, bill-summary, payment-form-dialog, payments-list          |
| Daily logs              | `daily-logs/`: list, upsert · `useDailyLogs`                                      | `daily-log/`                                                              | `daily-log/`: daily-log-form, daily-log-history                                |
| Dashboard               | `dashboard/`: get by date · `useDashboard`                                        | `dashboard/`                                                              | `dashboard/`: stat-grid, date-switcher                                         |

## API layer

- One axios instance. Services are thin route wrappers: they never inspect responses or handle errors.
- Pages guard with the negation: `if (!isSuccess(res.data)) return;`
- `safeApiError(error, { context, onError })` is the single place errors are handled. Field errors go to `form.setError(field, …)`, anything else to `form.setError('root', …)` — there is no toast layer, so the message is rendered in the form (or by `LoadError` on a read screen).
- **TanStack Query only where caching earns it**: reads that are shown repeatedly, shared between screens, or refetched after a change (dashboard, lists, detail views). Those get a query hook next to their domain (`api/process-backend/orders/use-orders-queries.ts`), not in `src/hooks/`.
- **Writes and one-off actions call the service function directly** from the page's controller hook — no `useMutation` wrapper. Loading state comes from the form (`formState.isSubmitting`) or local state, and the hook invalidates the affected query keys afterwards. Login does this.
- Wire types are written by hand in `<domain>.types.ts`, in camelCase (matching NestJS).
- Every API response uses one envelope, `{ status_code, message, data }` (see "Response format" in backend-plan.md). Query hooks unwrap it through `unwrap()`; pages guard writes with `isSuccess`.
- `VITE_API_BASE_URL` includes the version prefix (`http://localhost:1010/api/v1`).
- Lists take `limit` (default 50, max 100) and `cursor` — the id of the last row of the previous page (`PageQuery`).

## Auth

- NestJS sets the JWT in an **httpOnly cookie**; axios uses `withCredentials: true`. No token in localStorage.
- `middleware.ts`: route middleware on the layout routes (React Router 8 runs it parent → child before loaders and render, so there's no flash). `requireAuth` loads `/auth/me` via `queryClient.query({ ...meQueryOptions, staleTime: 'static' })` (the replacement for the deprecated `ensureQueryData`) and does `throw redirect('/login')` when there's no session. `requireRole('super_admin' | 'company_admin')` sends the wrong role to its home page.
- On a 401, the axios interceptor emits `sessionEvents 'expired'`. `SessionListener` clears the query cache and navigates to `/login`. There is no refresh-token flow in the POC.

## Routing

`routes.tsx` nests three branches (`/login`, `/`, `/admin`) under one root route. Two things came
out differently from the plan:

- **Per-route data is on `handle`, not `meta`** — and it carries only `{ screen }`, the label the
  shell and the command palette show. The guards replaced the rest: `requiresAuth`/`guestOnly`/
  `role` are expressed by which middleware is attached, and `layout` by which branch a route sits in.
- **Pages are `React.lazy` + `<Suspense>`, not route-level `lazy`.** Route `lazy` blocks the
  navigation, leaving the user on the old screen behind a progress bar; `React.lazy` lets the
  layout paint a fallback shaped like the page. The guard middleware still sits on the non-lazy
  branch routes, because `middleware` can't come from a `lazy` function.

`route-error-boundary.tsx` is set as the root route's `ErrorBoundary` and handles stale chunks
after a deploy; `AppSplash` is the root `HydrateFallback`.

| Path                                                                                        | Guard                          | Shell                               |
| ------------------------------------------------------------------------------------------- | ------------------------------ | ----------------------------------- |
| `/login`                                                                                    | `guestOnly`                    | AuthLayout (rendered by the page)   |
| `/admin` → `/admin/companies`, `/admin/companies/new`                                       | `requireRole('super_admin')`   | WorkspaceShell                      |
| `/` (dashboard)                                                                             | `requireRole('company_admin')` | WorkspaceShell                      |
| `/orders`, `/orders/new`, `/bills`, `/vendors`, `/service-types`, `/daily-log`, `/settings` | `requireRole('company_admin')` | WorkspaceShell → `coming-soon` page |
| `*`                                                                                         | —                              | NotFoundPage                        |

**Not built:** the detail routes `/orders/:orderId`, `/bills/:billId` and `/service-types/:id` —
they arrive with their screens.

## Screens

### Super Admin

| Screen         | Purpose                                                                                               |
| -------------- | ----------------------------------------------------------------------------------------------------- |
| Login          | Shared; redirects by role                                                                             |
| Companies      | List of companies                                                                                     |
| Create company | Name, optional GST number, first Company Admin's name, phone and/or email (at least one) and password |

### Company Admin

Bottom tab bar in `WorkspaceShell`: **Home · Orders · + New · Bills · More**

Only **Home** is built. Everything from Orders down is **not built** — the menu entries route to
the shared `coming-soon` page, and the rows below are the intent for those screens.

| Screen               | Purpose                                                                                                                                                  |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Home (dashboard)     | Stat tiles: pending orders, amount to collect, items processed, machine hours, electricity units, earnings, estimated profit. Date picker for past days. |
| Orders               | Tabs: Received / Processing / Returned. Search by vendor.                                                                                                |
| New order            | Choose vendor (or quick-add) → add items: service type → options → quantity in. Live price preview.                                                      |
| Order detail         | Start processing; return: enter quantity out per item → bill created                                                                                     |
| Bills                | Tabs: Due / Paid; amount due per bill                                                                                                                    |
| Bill detail          | Items, total, GST if set, payments, "Record payment"                                                                                                     |
| More → Vendors       | List, add, edit                                                                                                                                          |
| More → Service types | List, add, edit; editor for option groups and choices                                                                                                    |
| More → Daily log     | Today's form (machine hours, electricity units) plus history                                                                                             |
| More → Settings      | Company details, GST rate, electricity rate                                                                                                              |

## Conventions

- Kebab-case files; PascalCase component exports; hook files `use-x-y.ts`
- Page = page component + controller hook `use-<page>.ts`. Hook body order: state → wiring → derived → callbacks → effects → return.
- Zod schema inline in the controller hook until it passes about 250 lines
- Memoize only when the identity is consumed (e.g. an effect dependency, which is also where react.dev says manual memoization still matters); `exhaustive-deps` is off, dependencies are curated by hand. React Compiler is not enabled (note 6); if it is adopted later, this rule becomes "rely on the compiler, memoize by hand only for effect dependencies"
- Submit buttons show an inline spinner (`disabled` + `aria-busy`), never a full-page loader
- One `<h1>` per page; semantic elements; `aria-label` on icon-only buttons
- Comments only for business logic, at most 2 lines

## POC-specific decisions

- **Price preview:** the New order form uses the same formula as the backend, for display only. **The backend recalculates, and its number is the one that counts.**
- **Money:** amounts arrive as strings (Prisma `Decimal`) and are only formatted (`Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' })`). The preview is the only client-side calculation.
- **PWA:** caches the app shell only; API calls are network-only (offline is out of scope). No runtime caching is added, so API calls already go to the network. If the API is ever served from the same origin, add `navigateFallbackDenylist: [/^\/api\//]`. Two things came out differently from the plan:
  - **`registerType: 'autoUpdate'` with `injectRegister: 'inline'`, not `'prompt'`.** A shop-floor phone keeps the app open for days, so the shell updates on the next load rather than waiting for a prompt that nothing renders — there is no toast layer to render it. The reversal is commented in `vite.config.ts`.
  - **The precache glob is widened** to `'**/*.{js,css,html,ico,png,svg,woff2}'`, rather than left on the `generateSW` default: the default skips `woff2`, which would leave the self-hosted `@fontsource-variable` fonts uncached and re-fetched on every cold start.
  - **Not built:** `useOnlineStatus` and the "You're offline" banner.
- **Mobile first:** tap targets of at least 44px; `inputMode="decimal"` for quantities and money; the main action sits at the bottom of the screen.

## Build order

1. ✅ Scaffold: Yarn 4, Vite, TypeScript strict, Tailwind v4, ESLint + boundaries, Prettier, Husky, env schema, router, providers, PWA plugin, layouts, base `ui/` primitives (hand-written, not `shadcn init` — see note 9)
2. ✅ API layer: axios instance, envelope helpers, `safeApiError`, `sessionEvents` (every endpoint has a typed service; see the module table). No `notify` — errors render in the form
3. ✅ Auth: login, `/auth/me`, auth and role middleware (`requireAuth`, `requireRole`, `guestOnly`; a 401 clears the session and returns to `/login`)
4. ✅ Super Admin: companies list and create
5. **Not built** — Vendors and service types
6. **Not built** — Orders: new, list, detail, return
7. **Not built** — Bills and payments
8. **Not built** — Daily log
9. ✅ Dashboard (built out of order, ahead of 5–8)

## Decided

- **Repo layout:** one project folder, `process-now/`, with `frontend/` (this app) and `backend/` side by side. Each has its own `package.json`, README, `.env.example`, `.gitignore` and `.nvmrc`.

## Open questions

1. **Language:** is English alone enough for shop staff, or is Hindi needed later? Still open.
2. ~~**Backend first or mocks**~~ — **settled.** The backend was built first and in full; the frontend calls it. MSW stayed, as the test transport (`src/test/server.ts`).

## Sources

Checked 2026-09-19. Versions, dist-tags, peer dependencies and engines were also confirmed with `npm view`. `@tanstack/react-table` and the `@fontsource-variable` fonts were added during the build and so have no entry here; `frontend/docs/conventions/libraries.md` is the current list.

| Package / topic                                                                                                              | URL(s)                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| React Router 8 (upgrade, changelog, data-mode install, route object, `lazy`, middleware, error boundaries, parallel loaders) | https://reactrouter.com/upgrading/v7 ; https://github.com/remix-run/react-router/blob/main/CHANGELOG.md ; https://reactrouter.com/start/data/installation ; https://reactrouter.com/start/data/route-object ; https://reactrouter.com/start/data/custom ; https://reactrouter.com/how-to/middleware ; https://reactrouter.com/how-to/error-boundary ; https://reactrouter.com/api/components/Route ; https://reactrouter.com/how-to/data-strategy |
| Vite 8, `@vitejs/plugin-react` 6, React Compiler                                                                             | https://vite.dev/guide/features.html#typescript ; https://www.npmjs.com/package/@vitejs/plugin-react ; https://react.dev/learn/react-compiler/introduction ; https://react.dev/learn/react-compiler/installation                                                                                                                                                                                                                                  |
| Tailwind 4.3                                                                                                                 | https://tailwindcss.com/docs/installation/using-vite ; https://tailwindcss.com/docs/theme                                                                                                                                                                                                                                                                                                                                                         |
| TanStack Query 5.103                                                                                                         | https://tanstack.com/query/latest/docs/framework/react/guides/prefetching ; https://tanstack.com/query/latest/docs/framework/react/guides/query-options ; https://tanstack.com/query/latest/docs/framework/react/guides/query-invalidation ; `@tanstack/query-core` 5.103.1 `src/queryClient.ts` (`@deprecated` tags) ; https://tkdodo.eu/blog/the-query-options-api (maintainer's blog, key factory + `queryOptions`)                            |
| Zod 4, `@hookform/resolvers` 5.9, react-hook-form 7.88                                                                       | https://zod.dev/v4/changelog ; https://github.com/react-hook-form/resolvers ; https://www.npmjs.com/package/react-hook-form                                                                                                                                                                                                                                                                                                                       |
| vite-plugin-pwa 1.3                                                                                                          | https://github.com/vite-pwa/vite-plugin-pwa/releases/tag/v1.3.0 (Vite 8 peer support) ; https://vite-pwa-org.netlify.app/guide/prompt-for-update.html ; https://vite-pwa-org.netlify.app/guide/auto-update.html ; https://vite-pwa-org.netlify.app/guide/service-worker-precache.html ; https://vite-pwa-org.netlify.app/workbox/generate-sw.html                                                                                                 |
| Base UI 1.8, shadcn/ui (Base UI default)                                                                                     | https://base-ui.com/react/overview/quick-start ; https://ui.shadcn.com/docs/changelog/2026-07-base-ui-default ; https://ui.shadcn.com/docs/changelog/2026-01-base-ui ; https://infoq.com/news/2026/02/baseui-v1-accessible/ ; https://www.shadcndeck.com/blog/radix-vs-base-ui (bundle size comparison) ; https://blog.logrocket.com/headless-ui-alternatives/ (Radix vs React Aria vs Ark UI vs Base UI)                                         |
| TypeScript 6 / 7, typescript-eslint                                                                                          | https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/ ; https://devblogs.microsoft.com/typescript/announcing-typescript-6-0/ ; https://github.com/typescript-eslint/typescript-eslint/issues/10940 ; https://github.com/typescript-eslint/typescript-eslint/issues/12518 ; https://github.com/typescript-eslint/typescript-eslint/pull/12803                                                                                       |
| ESLint 10, jsx-a11y, react-hooks plugin                                                                                      | https://eslint.org/version-support/ ; https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/issues/1075 ; https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/pull/1081 ; https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/issues/1094 ; https://github.com/es-tooling/eslint-plugin-jsx-a11y-x ; https://www.npmjs.com/package/eslint-plugin-react-hooks                                                                                     |
| Vitest 5, jest-dom 7, Testing Library, MSW                                                                                   | https://vitest.dev/guide/migration ; https://vitest.dev/config/environment ; https://vitest.dev/config/setupfiles ; https://github.com/testing-library/jest-dom/releases/tag/v7.0.0 ; https://www.npmjs.com/package/@testing-library/jest-dom ; https://www.npmjs.com/package/@testing-library/react ; https://mswjs.io/docs/integrations/node                                                                                                    |
| Axios 1.20, lucide-react 1.47, react-toastify 11.1 (checked, then not adopted — see the Notifications row)                   | https://github.com/axios/axios/releases ; https://www.npmjs.com/package/lucide-react ; https://www.npmjs.com/package/react-toastify                                                                                                                                                                                                                                                                                                               |
| Node 24 LTS, Corepack, Yarn 4.18                                                                                             | https://nodejs.org/dist/index.json ; https://github.com/nodejs/Release/blob/main/schedule.json ; https://nodejs.org/docs/latest-v24.x/api/corepack.html ; https://yarnpkg.com/getting-started/install                                                                                                                                                                                                                                             |

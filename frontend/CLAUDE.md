# CLAUDE.md

ProcessNow frontend — mobile-first React PWA. Two workspaces on one shell: the **Company Admin**
workspace (`/`) and the **Super Admin** console (`/admin`). React 19, TypeScript 6 strict, Vite 8,
Tailwind v4, React Router 8 (data mode), TanStack Query 5, react-hook-form + zod 4.

Repo-level rules that hold across both apps are in [`../CLAUDE.md`](../CLAUDE.md). This file is
the frontend's own summary; the detail lives in
[`docs/conventions/`](docs/conventions/README.md) — **open the relevant doc before touching that
area.** [`README.md`](README.md) has setup, scripts, routes and the current build state.

## The one thing to know first

**The frontend calls the real API.** All nine domains under `src/api/process-backend/` go through
`unwrap(getThing())` on the shared axios instance; the backend exists and its DB-backed e2e suite
passes. The two remaining `*.fixtures.ts` files are **test data** — imported only by
`companies-list-page.test.tsx` and `dashboard-page.test.tsx`. Don't invent a count, a badge or a
metric with nothing behind it — ship an honest empty state. What is still a placeholder carries a
`TODO(api)` comment; `grep -rn "TODO(api)" src/` lists them rather than a number
that goes stale. See [`api-layer.md`](docs/conventions/api-layer.md).

## Conventions — read before working in an area

**Building a page** — start with the end-to-end recipe and build checklist in
[`form-page-playbook.md`](docs/conventions/form-page-playbook.md), and mirror the closest existing
page (`auth/login/` for a stepped form, `admin/create-company/` for a single form,
`admin/companies-list/` or `dashboard/` for a read screen) rather than inventing a fourth shape.

**Page + controller hook** — a page is two files: `<page>-page.tsx` renders, `use-<page>-page.ts`
decides. The component destructures the hook in one statement and holds no logic beyond JSX
branching. The hook has an exported `Use<Page>Result` and is annotated with it. See
[`pages.md`](docs/conventions/pages.md).

**Hook body order** — state → wiring → derived → callbacks → effects → return, with the section
comments kept in the file. All `useEffect`s are grouped last. `react-hooks/exhaustive-deps` is
**off**: curate dependency arrays by hand, listing only values that actually change. See
[`pages.md`](docs/conventions/pages.md#hook-body-order).

**Zod schema placement** — inline in the controller hook, importing **`zod/mini`**
(`import * as z from 'zod/mini'`); extract to `<page>-schema.ts` only past ~250 hook lines.
Cross-field rules go in a `.check((ctx) => …)` block pushing `{ code: 'custom', path, message,
input }` issues. The hook `export type`s the inferred `…FormInput` and the sections import it from
there. Only `src/app/config/env-schema.ts` uses the full `zod` build. See
[`pages.md`](docs/conventions/pages.md#zod-schemas).

**API response guards** — guard on the negation and continue at the top level
(`if (!isSuccess(response.data)) return;`), never wrap the happy path in
`if (isSuccess(…)) { … }`. `isSuccess` treats a 2xx with absent `data` as a failure but an empty
list or object as a success. See [`api-layer.md`](docs/conventions/api-layer.md).

**One catch site** — every `catch` goes through `safeApiError(error, { context: { page, action },
onError })`. `onError` maps `err.fields` onto `form.setError(field, …)` (through a page-local
`isFieldName` guard, focusing the first) and everything else onto `setError('root', …)`. Status
codes map to copy in a module-level helper, not inline. **Errors live in the form, never in a
toast**; `shared/toast.tsx` carries a _success_ message after a form is gone (see
`companies-list/`), taking `message` + `onDismiss` from the page — there is no toast provider or
queue. See [`api-layer.md`](docs/conventions/api-layer.md#safeapierror-is-the-only-catch-site).

**Query vs direct call** — TanStack Query is for **cacheable reads only** (lists, details,
dashboard metrics), through a `queryOptions` key factory co-located with its domain
(`use-<domain>-queries.ts`), never `src/hooks/`. **Writes and one-off actions call their service
directly** from the controller hook, which owns the loading state (`formState.isSubmitting`) and
invalidates the affected keys itself. There is no `useMutation` in this codebase, by design. See
[`api-layer.md`](docs/conventions/api-layer.md#query-vs-direct-call).

**Design tokens only, never a raw hex** — components use the utilities the tokens in
`src/app/tailwind.css` generate (`bg-surface`, `text-fg-muted`, `rounded-12`, `shadow-popover`).
Need a new colour? Add a token. **Adding a token means editing `src/lib/cn.ts` in the same
change** — tailwind-merge must know every token name or it will silently drop one of two classes.
See [`design-system.md`](docs/conventions/design-system.md).

**Contrast floors** — readable text ≥ 4.5:1, interactive borders ≥ 3:1 (WCAG 1.4.11). The
measured ratio sits in a comment next to each token; keep it current when you change a colour.
`--pn-fg-faint` and `--pn-line-input` are **decorative only** — never text, never a form-field
border (that's `--pn-line-field`). See
[`design-system.md`](docs/conventions/design-system.md#contrast-floors).

**Modals** — `ui/dialog.tsx` is the **only** modal; never hand-roll a `<dialog>`. It fixes the
anatomy — icon, title, description, body, **the one action full width**, centred Cancel beneath —
so the deactivate and change-password dialogs differ only in their action. `ui/side-sheet.tsx` is
the right-hand panel for a task belonging to the list behind it (`/admin/companies/new` is a
**child route** of the list: a sheet on `lg:` and up, a full page below). `ui/slide-to-confirm.tsx`
is the deliberate gesture for a destructive confirm — a native range input that springs back below
96% and refuses a single tap at the far end. See
[`components.md`](docs/conventions/components.md#modals-and-sheets).

**Popups leave their container** — `ui/menu.tsx` is `fixed`, measured from its trigger on open,
because an absolute popup inside the table is clipped by the scroll container and drags a
scrollbar into view; a z-index cannot fix an overflow clip. Scale: `z-30` header and tab bar,
`z-40` toast, `z-50` menus and skip link, native `<dialog>` above all.

**Tables** — `ui/data-table.tsx` is the **only** table; never hand-roll a `<table>`. It is built
on TanStack Table v9: a screen adds `createColumnHelper` column definitions (per-column layout in
`meta.className`), not markup. Sorting is opt-in per column (`enableSorting: true` + an explicit
`sortFn`); filtering, pagination and virtualisation are not registered yet. See
[`components.md`](docs/conventions/components.md#tables).

**Memoization** — `useCallback`/`useMemo`/`memo` only when the identity is consumed: passed to a
`memo()` child, or read by a hook's dependency array. The whole codebase has two such calls, both
in `src/hooks/use-media-query.ts`. Never memoize a hook's return object. React Compiler is not
enabled. See [`code-conventions.md`](docs/conventions/code-conventions.md#memoization).

**Loading treatment** — four levels: `AppSplash` for a whole-window wait (the root route's
`HydrateFallback`, and the `*` route with a `message`), `LoadingMark` inside a layout while a page
chunk downloads (a turning mark plus "Opening Orders…" in a `role="status" aria-live="polite"`
region — `WorkspaceShell`'s Suspense fallback, and `AuthFallback` for `/login`), `RouteProgress`
between pages, skeletons shaped like the content once a screen is mounted. Submit buttons show
inline progress (`Button` sets `disabled` + `aria-busy` + a spinner and the label changes); never a
full-page loader on submit. See [`routing.md`](docs/conventions/routing.md#loading-treatment).

**Routing** — one flat `src/app/router/routes.tsx`. **Every page is `React.lazy` + `<Suspense>`,
`/login` included**; only the two layout routes are non-lazy, because route `middleware` cannot
come from a `lazy` function. Route-level `lazy` is deliberately not used: it blocks the navigation
instead of rendering, so no fallback ever paints — the comment in `routes.tsx` says so. Menus are
data in `src/constants/navigation.ts` — add a screen there, not in the sidebar, the tab bar and the
palette separately. Auth guards are on the layout routes (`requireRole`) and on `/login`
(`guestOnly`). See [`routing.md`](docs/conventions/routing.md).

**Accessibility** — required fields carry `required`; an either-or pair is a `<fieldset>` with an
`sr-only` `<legend>` instead. Field errors wire `aria-invalid` + `aria-describedby` and render
`role="alert"`. A live region is **mounted before** the value it announces changes. Focus moves
deliberately: to `<main>` after navigation, to the heading that replaces a submitted form, to the
field that failed. Icon-only buttons go through `IconButton`, whose props type requires
`aria-label`; decorative icons are `aria-hidden`. 44px touch targets on phones, shrinking only
from `lg:` up. One `<h1>` per page. See
[`accessibility.md`](docs/conventions/accessibility.md).

**Comments** — business logic only, concise and complete, **max 2 lines**. Never restate what the
code plainly does; no file-header narration. Every `eslint-disable` ends with `-- <reason>`.

## Commands

```bash
yarn dev                   # dev server (port 9090, strictPort)
yarn build                 # tsc -b + vite build → build/
yarn typecheck             # tsc -b
yarn lint[:fix]            # eslint src
yarn format[:check]        # prettier
yarn test[:watch]          # vitest
npx vitest run src/path/to/file.test.tsx   # single test
yarn --cwd .. verify       # typecheck + lint + test, the repo-root shortcut
```

## Path aliases

`@app`, `@api`, `@pages`, `@components`, `@lib`, `@hooks`, `@utils`, `@assets`, `@constants` →
`src/<name>/*`. `@shared/*` → `src/types/*`. `@test/*` → `src/test/*`.
Declared in **both** `tsconfig.app.json` and `vite.config.ts` — change both.

## Auth and the session

Route `middleware` in `src/app/router/middleware.ts` does the guarding: `requireAuth`,
`requireRole(role)` and `guestOnly`, attached in `routes.tsx` to `/login` (`guestOnly`), `/`
(`company_admin`) and `/admin` (`super_admin`). A signed-out visitor is redirected to `/login`; a
wrong-role one goes to `ROLE_META[role].home` rather than to an error. `loadSession()` reads
`/auth/me` through `queryClient.query({ ...meQueryOptions, staleTime: 'static' })`, so the guard
and the page it renders share **one** fetch — which is also why `lib/auth/session.ts` imports the
`queryClient` singleton directly and uses React Query outside React. Identity in the shell comes
from `useIdentity()` → `useMe()`, a cache read. A 401 from any call makes the axios interceptor
emit `sessionEvents.emit('expired')`; `SessionListener`, mounted at the router root, calls
`redirectToLogin()`. Ending a session — sign-out or expiry — is a **full page load**
(`window.location.replace('/login')`), not a `navigate()`: clearing the cache instead left mounted
screens refetching against a dead cookie, and every 401 re-emitted `expired` in a loop. `routes.test.tsx` covers signed-out, wrong-role and right-role.

## Folder roles

```
src/
  app/           bootstrap — config (build-time env schema), providers, router, tailwind.css
  api/           process-backend/ — axios (+ 401 interceptor), envelope helpers, unwrap.ts,
                 common.types.ts, and nine domains (auth, billing, companies, daily-logs,
                 dashboard, orders, service-types, settings, vendors), each
                 types + service + query hooks + index
  pages/         routed pages — auth/login/, dashboard/, admin/companies-list/,
                 admin/create-company/, coming-soon/, not-found/, plus empty folders
                 scaffolded for the unbuilt screens (orders/, bills/, vendors/,
                 service-types/, daily-log/, settings/)
  components/
    ui/          primitives (Button, Card, DataTable, InputShell, Badge, Skeleton, …)
    shared/      cross-page blocks (PageHeader, EmptyState, StatTile, LoadError,
                 LoadingMark, AppSplash, RouteProgress, …)
    sections/    page-bound components, mirrors src/pages/ groups (the unbuilt
                 screens have empty folders here too)
    layouts/     AuthLayout, AuthFallback, WorkspaceShell (+ bottom nav, command
                 palette, menu sheet)
  lib/           cn.ts, auth/ (session + 401 listener), theme/ (pn.colorMode),
                 layout-mode/ (pn.layout), vitals/, notifications/ (empty)
  hooks/         generic hooks — use-media-query.ts
  constants/     navigation.ts (both menus), roles.ts (role → home, labels, accent fallback)
  utils/         identifier.ts, format/ (date, money, quantity)
  types/         cross-cutting primitives (@shared) — empty today
  test/          setup.ts, server.ts (MSW + envelope), axios-response.ts (axiosOk)
```

Dependency direction, enforced by `eslint-plugin-boundaries`:
`ui → shared → sections → layouts → pages`. `lib/`, `utils/`, `constants/`, `api/`, `types/` and
`hooks/` cannot import from `components/` or `pages/`. The **component tiers** (`ui`, `shared`,
`sections`, `layouts`) additionally may not import `app/` — `pages/` has no policy row at all, and
`lib/`, `api/` and friends may import `app/`. Two do, deliberately: `lib/auth/session.ts` takes the
`queryClient` singleton and `api/process-backend/axios.ts` takes `env`.

## Known gaps — don't paper over them

| Gap                                            | Where                                                                                     |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Notifications and company switching are shells | `grep -rn "TODO(api)" src/` — `workspace-notifications.tsx`, `workspace-company-chip.tsx` |
| Three API domains have no screen yet           | `billing`, `daily-logs`, `settings` — folders scaffolded                                  |
| Accent and radius presets have no UI           | CSS exists in `tailwind.css`; nothing sets `data-accent` / `data-radius`                  |
| Three unbuilt screens route to ComingSoon      | `bills`, `daily-log`, `settings`; `orders/new` too (the list itself is built)             |
| Fixed-px type scale                            | `text-[12.5px]` etc. — doesn't follow the browser's font-size preference                  |
| No e2e tests, no coverage tooling              | See [`testing-and-env.md`](docs/conventions/testing-and-env.md#known-gaps)                |
| No error monitoring, no product analytics      | Only Web Vitals (`src/lib/vitals/`), posted solely when `VITE_VITALS_URL` is set          |
| Hosting target undecided                       | Image, nginx config, CI and release pipeline all exist — see [Deploy](README.md#deploy)   |

## Conventions index

| Area                            | Doc                                                               |
| ------------------------------- | ----------------------------------------------------------------- |
| Building a page (end-to-end)    | [`form-page-playbook.md`](docs/conventions/form-page-playbook.md) |
| Pages and controller hooks      | [`pages.md`](docs/conventions/pages.md)                           |
| Accessibility                   | [`accessibility.md`](docs/conventions/accessibility.md)           |
| Routing                         | [`routing.md`](docs/conventions/routing.md)                       |
| State (server / form / local)   | [`state.md`](docs/conventions/state.md)                           |
| API layer + the `unwrap` seam   | [`api-layer.md`](docs/conventions/api-layer.md)                   |
| Components                      | [`components.md`](docs/conventions/components.md)                 |
| Design system and tokens        | [`design-system.md`](docs/conventions/design-system.md)           |
| Libraries, bootstrap, constants | [`libraries.md`](docs/conventions/libraries.md)                   |
| Types placement                 | [`types.md`](docs/conventions/types.md)                           |
| Naming, memoization, comments   | [`code-conventions.md`](docs/conventions/code-conventions.md)     |
| Testing, env vars, git hooks    | [`testing-and-env.md`](docs/conventions/testing-and-env.md)       |

## Product reference

[`../docs/problem-statement.md`](../docs/problem-statement.md) — what this solves and for whom.
[`../docs/module-design.md`](../docs/module-design.md) — data model, pricing, dashboard figures.
[`../docs/frontend-plan.md`](../docs/frontend-plan.md) — stack decisions with sources. **The plan
is a record of intent, not of what shipped** — where it and the code disagree, the code wins.
[`../.design/`](../.design) — exported design screens and `DESIGN-PHILOSOPHY.md`.

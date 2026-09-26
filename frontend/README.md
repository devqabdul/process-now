# ProcessNow Frontend

> **ProcessNow Frontend** — a mobile-first React PWA for job-work businesses: the Company Admin workspace that runs a shop floor, and the Super Admin console that onboards companies onto the platform.

[![Version](https://img.shields.io/badge/version-0.0.1-blue.svg)](package.json)
[![React](https://img.shields.io/badge/React-19.x-61DAFB.svg?logo=react)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-8.x-646CFF.svg?logo=vite)](https://vite.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0.3%20strict-3178C6.svg?logo=typescript)](https://www.typescriptlang.org)
[![Tailwind](https://img.shields.io/badge/Tailwind-v4-38BDF8.svg?logo=tailwindcss)](https://tailwindcss.com)
[![Private](https://img.shields.io/badge/access-private-lightgrey.svg)](#)

> **Status:** the frontend calls the real API. All eleven domains under `src/api/process-backend/` fetch through the shared axios client, the backend exists and its DB-backed e2e suite passes, and the route guards are in place. What is still a placeholder carries a `TODO(api)` comment — `grep -rn "TODO(api)" src/` lists them.

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Available Scripts](#available-scripts)
- [Project Structure](#project-structure)
- [Architecture](#architecture)
- [Feature Modules](#feature-modules)
- [Component Library](#component-library)
- [Code Style & Conventions](#code-style--conventions)
- [Quality Gates](#quality-gates)
- [Deploy](#deploy)
- [Contributing](#contributing)
- [Reference](#reference)

---

## Overview

A job-work business takes material from a vendor, processes it on its machines and returns it —
FuseNow fuses cloth, CrushNow crushes plastic. This app is where that day is run and watched.

**Who uses it:**

- **Company Admin** — the person running the shop floor, mostly on a phone. Lands on `/`.
- **Super Admin** — the platform operator who onboards companies. Lands on `/admin/companies`.

Both get the same shell (`WorkspaceShell`); only the menu and the identity differ.

**Working today, against the API:**

- **Sign in** — one screen for both roles: identify (email or mobile, detected as you type), then
  password; routed to the right workspace by role
- **Route guards** — `requireRole('company_admin')` on `/`, `requireRole('super_admin')` on
  `/admin`, `guestOnly` on `/login`; a wrong-role user lands on their own home. A 401 from any
  call clears the cache and returns to `/login`
- **Company dashboard** — seven stat tiles (pending orders, amount to collect, items processed,
  machine hours, electricity units, earnings, estimated profit), a date switcher for past days, a
  prompt when the daily log is missing, and a pending-orders table
- **Super Admin console** — companies list with search (table from `md` up, cards below) and a
  create-company form that also creates the first company admin
- **Workspace shell** — sidebar or top-bar layout on desktop, top bar plus bottom tabs on phones,
  ⌘K screen search, notifications panel, account sheet, dark mode, logout
- **PWA** — installable, app shell precached, self-hosted fonts

**Coming soon** — Orders, New order, Bills, Vendors, Service types, Daily log and Settings are in
the menu and route to a shared `ComingSoonPage`, so the menu stays navigable.

**Not built:** notifications data, company switching, the six
scaffolded API domains that have no screen yet (orders, bills, vendors, service types, daily log,
settings), error monitoring and product analytics.

---

## Tech Stack

Versions are the `package.json` ranges.

| Category            | Choice                                                                   | Notes                                                                       |
| ------------------- | ------------------------------------------------------------------------ | --------------------------------------------------------------------------- |
| **UI framework**    | React `^19.3.0`                                                          | Native `<title>` hoisting, ref-as-prop                                      |
| **Language**        | TypeScript `6.0.3` — **exact pin**                                       | Not 7 — see below                                                           |
| **Build tool**      | Vite `^8.3.0` + `@vitejs/plugin-react` `^6.1.1`                          | React Compiler not enabled                                                  |
| **Styling**         | Tailwind `^4.3.3` via `@tailwindcss/vite`                                | `@theme` tokens in one file — no SCSS, no CSS-in-JS                         |
| **Routing**         | React Router `^8.4.0`                                                    | Data mode: `createBrowserRouter` + `RouterProvider` from `react-router/dom` |
| **Server state**    | TanStack Query `^5.103.1` (+ devtools in dev)                            | `queryOptions` key factories; no `useMutation`                              |
| **Tables**          | TanStack Table `^9.2.4`                                                  | Headless; `ui/data-table.tsx` is the only table. Sorting only, opt-in       |
| **Forms**           | react-hook-form `^7.88.0` + `@hookform/resolvers` `^5.9.1`               |                                                                             |
| **Validation**      | Zod `^4.6.5`                                                             | `zod/mini` in form schemas; full `zod` only in the env schema               |
| **HTTP client**     | Axios `^1.20.0`                                                          | One instance, `withCredentials: true`, one response interceptor for 401     |
| **Icons**           | lucide-react `^1.47.0`                                                   |                                                                             |
| **Class helpers**   | clsx `^2.1.1` + tailwind-merge `^3.7.0`                                  | `cn()` in `src/lib/cn.ts`, extended with every design token                 |
| **Fonts**           | `@fontsource-variable/inter`, `@fontsource-variable/jetbrains-mono`      | Self-hosted — no Google round trip, no user IP leaving the app              |
| **PWA**             | vite-plugin-pwa `^1.3.0`                                                 | `registerType: 'autoUpdate'`, app shell only                                |
| **Testing**         | Vitest `^5.0.1` + Testing Library + MSW `^2.15.0` + jsdom                | Config inside `vite.config.ts`                                              |
| **Linting**         | ESLint `^9.39.5` — **deliberately not 10** + typescript-eslint `^8.70.0` | With `eslint-plugin-boundaries`, `-react-hooks`, `-jsx-a11y`                |
| **Formatting**      | Prettier `^3.9.8`                                                        | Single quotes, trailing commas, 100 columns                                 |
| **Package manager** | Yarn `4.18.0` via Corepack                                               | `packageManager` pin; `nodeLinker: node-modules`                            |

**The two deliberate pins**

- **TypeScript is pinned to exactly `6.0.3`, not 7.** TypeScript 7 ships no programmatic compiler
  API yet, and `typescript-eslint` 8 requires `typescript <6.1.0`. A single compiler on 6.0.3
  keeps lint and typecheck on the same one. Consequences for `tsconfig`: `baseUrl` is gone, so
  `paths` are written relative to the tsconfig, and `types` defaults to `[]`, so `vite/client`,
  `vite-plugin-pwa/client` and `@testing-library/jest-dom` are listed explicitly.
- **ESLint is held at 9, not 10.** `eslint-plugin-jsx-a11y` 6.10.2 still declares `eslint ^9` as
  its peer; accessibility linting matters more here than the major version. The other lint
  packages already accept 10.

Full reasoning and sources: [`../docs/frontend-plan.md`](../docs/frontend-plan.md#stack). Where
that plan and this code disagree, the code is what shipped.

---

## Prerequisites

| Requirement | Minimum | Notes                                                                      |
| ----------- | ------- | -------------------------------------------------------------------------- |
| **Node.js** | 24.x    | `.nvmrc` and `engines` in `package.json` (`^24`)                           |
| **Yarn**    | 4.18.0  | Yarn Berry via Corepack (`packageManager` pin) — `npm install -g corepack` |
| **Git**     | 2.x     | Required for the Husky hooks at the repository root                        |

Optional, skipped with a warning if absent: **gitleaks** and **semgrep** power the pre-commit
scans — `brew install gitleaks`, `pip install semgrep`. Semgrep's rulesets are pinned in the
`yarn semgrep` script.

---

## Getting Started

```bash
# 1. Repo-root tooling (installs the git hooks) — once, from ../
yarn install

# 2. Install this app's dependencies
yarn install

# 3. Configure environment
cp .env.example .env.local        # VITE_API_BASE_URL + VITE_APP_ENV

# 4. Start the dev server
yarn dev                          # http://localhost:9090
```

The port is fixed (`strictPort: true`) — if 9090 is taken, Vite fails rather than picking another.

Every screen needs the backend running: the route guards call `/auth/me` before anything renders,
so with no API reachable each route redirects to `/login` and sign-in fails with a network error.
`docker compose up --build` from the repository root brings up Postgres, the API and this app
together.

---

## Environment Variables

All variables are prefixed `VITE_`. Copy `.env.example` → `.env.local` and fill them in. The first
two are required; the third is optional.

| Variable            | Description                                                                                         |
| ------------------- | --------------------------------------------------------------------------------------------------- |
| `VITE_API_BASE_URL` | Base URL of the backend, **including the API version prefix** — e.g. `http://localhost:1010/api/v1` |
| `VITE_APP_ENV`      | Environment name — `local \| development \| staging \| production`                                  |
| `VITE_VITALS_URL`   | **Optional.** Where Web Vitals are posted. Unset or empty means nothing leaves the device           |

Validated by one zod schema, [`src/app/config/env-schema.ts`](src/app/config/env-schema.ts),
which enforces two rules:

1. `VITE_API_BASE_URL` is a valid URL.
2. It uses `https://` unless `VITE_APP_ENV` is `local` — passwords go over this URL.

The schema runs **at build time**: `vite.config.ts` calls `parseEnv(loadEnv(...))` before
returning the config, so `yarn dev` and `yarn build` fail with the offending variables listed and
a bad env never ships. At runtime [`src/app/config/env.ts`](src/app/config/env.ts) reads plain
strings off `import.meta.env`, keeping zod out of the runtime bundle.

**Deployment constraint** (documented in `.env.example`, not checkable in code): in production the
API must share a registrable domain with the app — `app.example.com` + `api.example.com` — because
the session cookie is `SameSite=Lax`.

---

## Available Scripts

| Command                             | What it does                                                          |
| ----------------------------------- | --------------------------------------------------------------------- |
| `yarn dev`                          | Dev server on **port 9090** (`strictPort`).                           |
| `yarn build`                        | `tsc -b` + `vite build` → **`build/`**.                               |
| `yarn preview`                      | Serve the production build on port 9090 for a smoke test.             |
| `yarn typecheck`                    | `tsc -b` — project references, no emit.                               |
| `yarn lint` / `yarn lint:fix`       | ESLint over `src`.                                                    |
| `yarn format` / `yarn format:check` | Prettier write / check over `src/**/*.{ts,tsx,css,json}`.             |
| `yarn test` / `yarn test:watch`     | Vitest, one pass / watch mode.                                        |
| `yarn semgrep`                      | Semgrep with the pinned TypeScript, React and secrets rulesets.       |
| `yarn analyze`                      | `ANALYZE=1 vite build` — bundle treemap via rollup-plugin-visualizer. |

From the repository root, `yarn verify` runs this app's typecheck, lint and tests in one go.

---

## Project Structure

```
src/
  app/
    config/      env-schema.ts (build-time zod), env.ts (runtime values)
    providers/   app-providers.tsx (QueryClientProvider), query-client.ts
    router/      app-router.tsx, routes.tsx, middleware.ts, route-error-boundary.tsx
    tailwind.css the whole design system — tokens, keyframes, base layer
  api/
    process-backend/
      axios.ts            the single http client + the 401 interceptor
      types.ts            ApiEnvelope<T>, NormalizedError, ApiErrorType
      safe-api-error.ts   isSuccess, normalizeError, safeApiError
      unwrap.ts           envelope → payload, the seam every query hook goes through
      common.types.ts     PageQuery — the cursor-paging contract
      auth/ billing/ companies/ daily-logs/ dashboard/ orders/
      service-types/ settings/ vendors/
        <domain>.types.ts, <domain>-service.ts,
        use-<domain>-queries.ts, index.ts
        (companies/ and dashboard/ also keep a <domain>.fixtures.ts — test data)
  pages/         auth/login/, dashboard/, admin/companies-list/,
                 admin/create-company/, coming-soon/, not-found/
                 each page: <page>-page.tsx + use-<page>-page.ts
                 plus empty folders scaffolded for the unbuilt screens:
                 orders/, bills/, vendors/, service-types/, daily-log/, settings/
  components/
    ui/          primitives — Button, Card, DataTable, InputShell, Badge, Avatar,
                 Skeleton, Spinner, SearchInput, FieldLabel, FieldError,
                 IconButton
    shared/      cross-page — PageHeader, EmptyState, LoadError, StatTile, AppSplash,
                 LoadingMark, RouteProgress, ThemeToggle, LogoutButton, BrandLockup,
                 ProcessMark
    sections/    page-bound, mirrors pages/ — admin/, auth/, dashboard/, and empty
                 folders for orders/, bills/, vendors/, service-types/,
                 daily-log/, settings/
    layouts/     AuthLayout, AuthFallback, WorkspaceShell (+ bottom nav, command
                 palette, company chip, menu sheet, notifications)
  lib/           cn.ts, auth/, theme/, layout-mode/, vitals/, notifications/ (empty)
  hooks/         use-media-query.ts
  constants/     navigation.ts, roles.ts
  utils/         identifier.ts, format/ (date, money, quantity)
  types/         cross-cutting primitives (alias @shared) — empty today
  assets/        empty today
  test/          setup.ts, server.ts (MSW + envelope), axios-response.ts (axiosOk)
public/          favicon.svg, robots.txt (noindex — this is a private admin tool)
```

### Path aliases

`@app`, `@api`, `@pages`, `@components`, `@lib`, `@hooks`, `@utils`, `@assets`, `@constants` →
`src/<name>/*`. `@shared/*` → `src/types/*`. `@test/*` → `src/test/*`.
Declared twice, deliberately: `tsconfig.app.json` for the compiler, `vite.config.ts` for the
bundler. **Change both.**

### Dependency direction

Enforced by `eslint-plugin-boundaries` (`eslint.config.js`):

```
ui → shared → sections → layouts → pages
```

A component tier may import anything to its left, never to its right, and never `app/`. `lib/`,
`utils/`, `constants/`, `api/`, `types/` and `hooks/` cannot import any component tier or `pages/`.

Read the rule as the lint config writes it: the `never app/` clause is a policy on `ui`, `shared`,
`sections` and `layouts` only. `pages/` has no policy row at all, and the foundation tiers may
import `app/`. Two do, by design — `lib/auth/session.ts` takes the `queryClient` singleton and
`api/process-backend/axios.ts` takes `env`.

---

## Architecture

### Application flow

```
main.tsx
  ├─ self-hosted fonts → tailwind.css        (font-face above the theme layer)
  ├─ applyTheme(readStoredTheme())           (before first paint — no flash)
  ├─ <AppProviders>  QueryClientProvider (+ devtools in dev)
  │    └─ <AppRouter>  createBrowserRouter(routes)
  │         ├─ HydrateFallback: AppSplash    (entry chunk booting)
  │         ├─ ErrorBoundary: RouteErrorBoundary
  │         ├─ SessionListener               (401 → reload at /login)
  │         ├─ /login ─── guestOnly ──────── LoginPage                  (lazy, AuthFallback)
  │         ├─ / ──────── requireRole('company_admin') ─ WorkspaceShell + COMPANY_ADMIN_NAV
  │         │     ├─ index ────────── DashboardPage                     (lazy)
  │         │     └─ orders, bills, vendors, service-types,
  │         │        daily-log, settings ─ ComingSoonPage               (lazy)
  │         ├─ /admin ─── requireRole('super_admin') ─── WorkspaceShell + SUPER_ADMIN_NAV
  │         │     ├─ index ────────── redirect → /admin/companies
  │         │     ├─ companies ────── CompaniesListPage                 (lazy)
  │         │     └─ companies/new ── CreateCompanyPage                 (lazy)
  │         └─ * ──────────────────── NotFoundPage                      (lazy, AppSplash)
  └─ reportWebVitals()                       (console in dev; posted only if VITE_VITALS_URL)
```

**Every page is `React.lazy` + `<Suspense>`, `/login` included.** Only the two layout routes are
non-lazy, because route `middleware` — the auth guards — cannot be set from a `lazy` function and
runs parent → child before render. Route-level `lazy` was rejected on purpose: it blocks the
navigation rather than rendering, so no fallback would ever paint. The comment at the top of
`routes.tsx` records that.

### Routes

| Path                                                                                        | Workspace     | Screen                           |
| ------------------------------------------------------------------------------------------- | ------------- | -------------------------------- |
| `/login`                                                                                    | —             | Sign in (identify → password)    |
| `/`                                                                                         | Company Admin | Dashboard                        |
| `/orders`, `/orders/new`, `/bills`, `/vendors`, `/service-types`, `/daily-log`, `/settings` | Company Admin | Coming soon                      |
| `/bank`, `/bank/:id`                                                                        | Company Admin | Bank accounts, account statement |
| `/expenses`                                                                                 | Company Admin | Expenses                         |
| `/admin`                                                                                    | Super Admin   | Redirects to `/admin/companies`  |
| `/admin/companies`                                                                          | Super Admin   | Companies list                   |
| `/admin/companies/new`                                                                      | Super Admin   | Create company                   |
| anything else                                                                               | —             | Not found                        |

Menus are data: `COMPANY_ADMIN_NAV` and `SUPER_ADMIN_NAV` in `src/constants/navigation.ts` drive
the sidebar, the top bar, the phone tab bar and the ⌘K palette from one list.

### The API domains

Eleven domains live under `src/api/process-backend/`: `auth`, `bank-accounts`, `billing`, `companies`,
`daily-logs`, `dashboard`, `expenses`, `orders`, `service-types`, `settings` and `vendors`. Each is four files — wire types,
a thin service, a query-key factory with its read hooks, and an `index.ts` barrel. Six of them have
no screen yet; their folders exist so the screen that needs one finds its hooks already written.

| File                      | Holds                                                                               |
| ------------------------- | ----------------------------------------------------------------------------------- |
| `<domain>.types.ts`       | hand-written wire types — camelCase inside `data`, money as an exact decimal string |
| `<domain>-service.ts`     | one thin `http.*` wrapper per endpoint; never inspects a response                   |
| `use-<domain>-queries.ts` | the key factory; every `queryFn` is `() => unwrap(getThing(...))`                   |
| `<domain>/index.ts`       | the only import path a page should use                                              |

`unwrap.ts` is the seam they all pass through: it takes the axios promise, returns
`envelope.data`, and throws on a 2xx that carries no data so React Query surfaces an error state
instead of rendering `undefined`. `common.types.ts` holds `PageQuery` (`limit`, `cursor`) — the
cursor-paging contract every list endpoint takes.

The two surviving `*.fixtures.ts` files (`companies`, `dashboard`) are **test data only**,
imported by `companies-list-page.test.tsx` and `dashboard-page.test.tsx`. Nothing in `src/` outside
a test reads them.

Still placeholders: the notifications panel and the company switcher (`TODO(api)`).
`grep -rn "TODO(api)" src/` is the current list.

### State management

| Layer               | Technology                           | Use case                                             |
| ------------------- | ------------------------------------ | ---------------------------------------------------- |
| **Server state**    | TanStack Query 5                     | Cacheable reads — lists, details, dashboard metrics  |
| **Form state**      | react-hook-form + zodResolver        | All form inputs, schema validation, submit state     |
| **Local UI state**  | `useState` / `useRef`                | Step, toggles, search text, selected date            |
| **Shared UI state** | `useSyncExternalStore` in `src/lib/` | Theme (`pn.colorMode`), desktop layout (`pn.layout`) |

No Redux, Zustand or app-level context. See
[`docs/conventions/state.md`](docs/conventions/state.md).

### API layer

One axios instance, one envelope (`{ status_code, message, data }`), thin services that never
inspect responses. Pages guard on the negation — `if (!isSuccess(res.data)) return;` — and every
catch goes through `safeApiError`. Cacheable reads use query hooks, whose `queryFn` is always
`unwrap(...)`; writes call the service directly and invalidate keys themselves (there is no
`useMutation` in the codebase). A single response interceptor turns a 401 into
`sessionEvents.emit('expired')`, which `SessionListener` picks up at the router root and answers
with a full page load at `/login` — the same path sign-out takes. See
[`docs/conventions/api-layer.md`](docs/conventions/api-layer.md).

### Loading and errors

Four levels, never a bare full-page spinner between screens:
`AppSplash` when the whole window is waiting (the root route's `HydrateFallback`, and the `*`
route, which passes it a `message`) → `LoadingMark` inside a layout while a page chunk downloads,
a turning mark plus the screen's name ("Opening Orders…") in a `role="status" aria-live="polite"`
region — `WorkspaceShell`'s Suspense fallback, and `AuthFallback` (`LoadingMark` inside
`AuthLayout`) for `/login` → `RouteProgress`, a 2px bar over the shell, once a shell is mounted →
skeletons shaped like the content inside a mounted screen. A failed read renders `LoadError`
(icon, title, description, Retry). `RouteErrorBoundary` recognises a failed chunk import after a
deploy and reloads once.

`WorkspaceShell` names the screen from the route's `handle.screen`, falling back to the matching
nav label, so the message is right for a route that has no page of its own.

### Theming

`<html>` carries three switches, all defined in `src/app/tailwind.css`:

| Attribute                            | Values                    | Driven by                                                     |
| ------------------------------------ | ------------------------- | ------------------------------------------------------------- |
| `data-theme="dark"` (absent = light) | `dark`                    | `setTheme()`, stored as `pn.colorMode`, applied in `main.tsx` |
| `data-accent`                        | `amber`, `teal`, `indigo` | **nothing yet** — the CSS exists, no UI sets it               |
| `data-radius`                        | `sm`, `lg`                | **nothing yet** — the CSS exists, no UI sets it               |

Components use token utilities (`bg-surface`, `text-fg-muted`, `rounded-12`, `shadow-popover`),
never raw hex. `cn()` extends tailwind-merge with every token group, so adding a token means
editing `tailwind.css` **and** `src/lib/cn.ts`. Contrast floors and measured ratios:
[`docs/conventions/design-system.md`](docs/conventions/design-system.md).

### PWA

`vite-plugin-pwa` with `registerType: 'autoUpdate'` and an inline registration: a shop-floor phone
keeps the app open for days, so the shell updates on the next load rather than waiting for a
prompt nothing renders. `workbox.globPatterns` includes `woff2` (the default omits it, which would
leave the self-hosted fonts uncached and re-fetched on every cold start).

The manifest is `standalone`, `start_url: '/'`, theme `#111417`, with the SVG favicon as its only
icon. **App shell only** — API calls are network-only and there is no offline data.

---

## Feature Modules

| Module                                                     | Scope                                                                                                                                                                    | State                                                       |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------- |
| **Auth**                                                   | Two-step sign-in: identifier (email or 10-digit mobile, detected live) → password. Routes by role via `ROLE_META`. Route guards, `/auth/me` session and 401 handling     | Built against the API, sign-out included                    |
| **Dashboard**                                              | Eight stat tiles for a chosen day, date switcher capped at today, daily-log prompt, pending-orders preview                                                               | Built against the API                                       |
| **Companies**                                              | Super Admin: list with search and a responsive table/cards swap; create a company plus its first admin, with duplicate-name / phone / email conflicts surfaced per field | Built against the API                                       |
| **Workspace shell**                                        | Sidebar or top-bar desktop layouts, phone top bar + bottom tabs + account sheet, ⌘K palette, notifications, theme toggle, logout                                         | Built; notifications and company switching are placeholders |
| Orders, Bills, Vendors, Service types, Daily log, Settings | In the menu, routed to `ComingSoonPage`                                                                                                                                  | Not built                                                   |

Domain reference — data model, pricing and how the dashboard figures are derived:
[`../docs/module-design.md`](../docs/module-design.md).

---

## Component Library

Built bottom-up, with no component library underneath: no Radix, no Base UI, no shadcn/ui, no
`class-variance-authority`. Primitives are plain React plus Tailwind classes composed with
`cn()`; variants are a `Record<Variant, string>` lookup at module scope.

```
components/ui/        primitives — Button (+ buttonClasses for link-buttons), Card,
                      DataTable (TanStack Table v9), InputShell + inputClasses,
                      SearchInput,
                      Badge, Avatar + LetterTile, Skeleton, Spinner, IconButton,
                      FieldLabel, FieldError
components/shared/    cross-page — PageHeader (owns the page <h1>), EmptyState, LoadError,
                      StatTile, AppSplash, LoadingMark, RouteProgress, ThemeToggle,
                      LogoutButton, BrandLockup, ProcessMark
components/sections/  page-bound, mirrors src/pages/ — admin/, auth/, dashboard/
components/layouts/   AuthLayout, AuthFallback, WorkspaceShell and its parts
```

Conventions worth knowing before you add one:

- Loading is a **sibling export**, not a prop: `StatTile` / `StatTileSkeleton`, `CompanyCard` /
  `CompanyCardSkeleton`. The skeleton reuses the loaded wrapper so nothing shifts.
- `buttonClasses(variant, size)` exists so a router `<Link>` can look like a button without
  nesting an `<a>` in a `<button>`.
- `IconButton`'s props type **requires** `aria-label` — the compiler enforces the accessible name.
- A failed read has one shape: `LoadError` (icon, title, description, Retry), used by
  `dashboard-page.tsx` and `companies-list-page.tsx`. Don't clone its behaviour into a page.

> **Accessibility** is carried by the primitives (semantic elements, label/error wiring, 44px
> touch targets) and by the shell (skip link, focus on `<main>` after navigation). The rules this
> codebase holds itself to are in
> [`docs/conventions/accessibility.md`](docs/conventions/accessibility.md).

---

## Code Style & Conventions

Area-specific patterns live in [`docs/conventions/`](docs/conventions/README.md);
[`CLAUDE.md`](CLAUDE.md) is the authoritative summary. Highlights:

- **A page is two files**: `<page>-page.tsx` renders, `use-<page>-page.ts` decides.
- **Controller-hook body order:** state → wiring → derived → callbacks → effects → return.
- **Kebab-case** files; PascalCase component exports; hook files `use-x-y.ts`.
- **Zod schema inline in the controller hook** (`zod/mini`), extracted only past ~250 lines.
- **Guard on the negation:** `if (!isSuccess(res.data)) return;` — flat, early exit.
- **Query hooks for cacheable reads; writes call the service directly** and invalidate keys.
- **Design tokens only** — never a raw hex value.
- **Memoize only when the identity is consumed.** The codebase has two such calls, both in
  `use-media-query.ts`. `exhaustive-deps` is off; dependency arrays are curated by hand.
- **Comments for business logic only**, at most two lines.

---

## Quality Gates

The git hooks live at the **repository root** (`../.husky/`); `yarn install` at the root installs
them. They cover **this app only** — `lint-staged` globs `frontend/**` and the pre-push hook runs
`yarn --cwd frontend`. CI is what covers both apps.

1. **Gitleaks** (pre-commit) — secrets scan on staged changes; skipped with a warning if absent
2. **Semgrep** (pre-commit) — `yarn semgrep` on staged `.ts`/`.tsx`; skipped if absent
3. **lint-staged** (pre-commit) — ESLint `--fix` + Prettier on staged files
4. **CommitLint** (commit-msg) — Conventional Commits, scopes `frontend` `backend` `docs` `repo` `deps`
5. **pre-push** — `yarn typecheck`, `yarn test`, `yarn build`

CI runs the same gates on GitHub. [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) runs
typecheck, lint, test and build per app on every pull request and on `main`, plus a non-blocking
dependency audit and — on pull requests only — a Docker build of each image.
[`release.yml`](../.github/workflows/release.yml) drives release-please and publishes the images to
GHCR. `.github/` also holds the PR template and CODEOWNERS; the template asks for a phone-width and
a dark-mode check — both are easy to regress.

---

## Deploy

**Only the hosting target is still undecided.** The image and its serving config exist and are
verified working: [`Dockerfile`](Dockerfile) (multi-stage — Yarn 4 install → `yarn build` →
`nginxinc/nginx-unprivileged`), [`docker/nginx.conf`](docker/nginx.conf),
[`docker/README.md`](docker/README.md) and the root [`docker-compose.yml`](../docker-compose.yml).
The built image serves the app with the SPA fallback, all seven security headers (CSP, HSTS,
`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`,
`X-Robots-Tag`), non-root (uid 101) and a passing healthcheck on `/healthz`.

```bash
docker build -t process-now-frontend:latest .
docker run --rm -p 9090:8080 process-now-frontend:latest   # http://localhost:9090
```

`docker compose up --build` from the repository root brings up Postgres, the API and this app
together.

Two things to know before a real deployment:

- **`VITE_*` are baked in at build time**, so the image is environment-specific: pass
  `--build-arg VITE_API_BASE_URL=… --build-arg VITE_APP_ENV=…`, and build staging and production
  separately from the same commit. There is no runtime setting to change afterwards.
- **The CSP's `connect-src` is derived from the same build arg.**
  `docker/render-nginx-conf.mjs` reads `VITE_API_BASE_URL` at image-build time and writes its
  origin into `connect-src` (and one `sha256-` per inline `<script>` into `script-src`), so a
  cross-origin API needs no manual edit of `docker/nginx.conf` — but pass the build arg, or the
  browser blocks every API call. `node docker/render-nginx-conf.mjs --selftest` checks that step.

The rest is already handled by the config: `yarn build` produces a static bundle in **`build/`**
(hashed files under `assets/`, plus `index.html`, `sw.js` and `manifest.webmanifest`), nginx serves
`index.html` for every unknown path, and `Cache-Control` is `immutable` for `/assets/*` and the
hashed `workbox-*.js`, `no-cache` for everything else. The API must still share a registrable
domain with the app, because the session cookie is `SameSite=Lax`. Remaining open questions:
[`../docs/frontend-plan.md`](../docs/frontend-plan.md).

---

## Contributing

### Branch naming

**Not yet decided** — there is no ticket tracker wired up and no prefix convention. Use a short
descriptive branch name until one is agreed.

### Conventional Commits

Enforced by CommitLint + Husky.

```
type(scope): short description

[optional body]

[optional footer]
```

Types: `feat` `fix` `docs` `style` `refactor` `perf` `test` `build` `ci` `chore` `revert`.
Scopes: `frontend` `backend` `docs` `repo` `deps`. Header ≤ 100 characters; the subject is not
start-case, PascalCase or UPPER-CASE.

```
feat(frontend): add the pending orders table to the dashboard
fix(frontend): keep the companies count live region mounted while loading
```

### Pull request process

1. Branch from `main`, then make your changes following
   [`docs/conventions/`](docs/conventions/README.md) and [`CLAUDE.md`](CLAUDE.md).
2. Lint and format:
   ```bash
   yarn lint:fix && yarn format
   ```
3. Verify — the same gates the push hook runs:
   ```bash
   yarn typecheck && yarn test && yarn build
   ```
4. Commit in the conventional format and open a PR with
   [the template](../.github/PULL_REQUEST_TEMPLATE.md), which asks you to confirm a phone-width
   and a dark-mode check.

### Code owners

Every change needs a review from a code owner.

| Owner | GitHub handle |
| ----- | ------------- |
| Abdul | @devqabdul    |

---

## Reference

- [`CLAUDE.md`](CLAUDE.md) — authoritative frontend conventions.
- [`docs/conventions/`](docs/conventions/README.md) — detailed, area-specific patterns.
- [`../README.md`](../README.md) · [`../CLAUDE.md`](../CLAUDE.md) — the repository and the rules
  that hold across both apps.
- [`../docs/problem-statement.md`](../docs/problem-statement.md) ·
  [`../docs/module-design.md`](../docs/module-design.md) ·
  [`../docs/frontend-plan.md`](../docs/frontend-plan.md) — the product, the data model and the
  stack decisions with their sources.
- [`../.design/`](../.design) — exported design screens and `DESIGN-PHILOSOPHY.md`.

---

<div align="center">
  <sub>Part of the <strong>ProcessNow</strong> monorepo.</sub>
</div>

# Libraries, bootstrap and constants

## `src/lib/` — adapters and shared stores

Small, self-contained modules that wrap something external (a library, `<html>`,
`localStorage`). They may not import from `components/` or `pages/`.

| Module                   | Exports                                                                                                                                          | Notes                                                                        |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| `src/lib/cn.ts`          | `cn(...inputs)`                                                                                                                                  | `clsx` + `extendTailwindMerge`. Knows every design token — see below         |
| `src/lib/auth/`          | `loadSession`, `redirectToLogin`, `sessionEvents`, `SessionListener`                                                                             | The session and the 401 path — see below                                     |
| `src/lib/theme/`         | `Theme`, `THEME_STORAGE_KEY`, `readStoredTheme`, `currentTheme`, `applyTheme`, `setTheme`, `subscribeTheme`, `THEME_SWITCHING_CLASS`, `useTheme` | `useSyncExternalStore` over `<html data-theme>`; key `pn.colorMode`          |
| `src/lib/layout-mode/`   | `LayoutMode`, `LAYOUT_MODE_STORAGE_KEY`, `readStoredLayoutMode`, `storeLayoutMode`, `useLayoutMode`                                              | Desktop chrome preference (`sidebar` / `top`); key `pn.layout`               |
| `src/lib/vitals/`        | `reportWebVitals`                                                                                                                                | `web-vitals` → console in dev, `sendBeacon` only if `VITE_VITALS_URL` is set |
| `src/lib/notifications/` | —                                                                                                                                                | Empty: scaffolded for the notifications tray, nothing in it yet              |

Shape: a plain `.ts` file with the logic, a `use-*.ts` beside it with the React binding, and an
`index.ts` barrel. Import from the folder (`@lib/theme`), not the file.

`auth/` is the exception to the "never imports `app/`" habit, and deliberately so. `session.ts`
imports the `queryClient` singleton from `@app/providers/query-client` and calls
`queryClient.query({ ...meQueryOptions, staleTime: 'static' })` — React Query used **outside
React**, because route middleware runs before any component does. The `staleTime` is what makes a
guarded navigation and the page it renders share one `/auth/me` fetch. `session-events.ts` is a
three-line listener set the axios interceptor emits into; `session-listener.tsx` is the component
at the router root that acts on it. The boundaries config permits this: only the component tiers
are forbidden from importing `app/`.

`cn.ts`'s `extendTailwindMerge` config lists every colour group, radius key and shadow name from
`tailwind.css`. **Adding a token means editing both files in the same change** — otherwise
tailwind-merge can't tell `text-fg-muted` from `text-sm` and drops one.

Every `localStorage` read and write is wrapped in `try`/`catch` with a default, so a private
window never breaks a render.

## `src/app/` — bootstrap

`app/` imports everything. **No component tier may import it** — that is the rule
`eslint.config.js` actually enforces, on `ui`, `shared`, `sections` and `layouts`. `pages/` has no
policy row, and `lib/`, `api/`, `utils/`, `constants/`, `types/` and `hooks/` may import `app/`.
Two do, by design: `lib/auth/session.ts` (the `queryClient` singleton) and
`api/process-backend/axios.ts` (`env`). Both need a value that exists exactly once per app.

| Path                                  | Role                                                                                            |
| ------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `app/config/env-schema.ts`            | The zod schema and `parseEnv`. Imported by `vite.config.ts`, so it runs at **build time**       |
| `app/config/env.ts`                   | The typed `env` object read from `import.meta.env`. **Keeps zod off the runtime path entirely** |
| `app/providers/query-client.ts`       | The single `QueryClient` and its defaults                                                       |
| `app/providers/app-providers.tsx`     | `QueryClientProvider` + devtools in dev. The only provider in the tree                          |
| `app/router/app-router.tsx`           | `createBrowserRouter(routes)` + `RouterProvider` from `react-router/dom`                        |
| `app/router/routes.tsx`               | The flat route table — see [`routing.md`](./routing.md)                                         |
| `app/router/middleware.ts`            | `requireAuth`, `requireRole(role)`, `guestOnly` — the route guards                              |
| `app/router/route-error-boundary.tsx` | Root `ErrorBoundary`; reloads once on a stale-chunk import failure                              |
| `app/tailwind.css`                    | The whole design system — see [`design-system.md`](./design-system.md)                          |

`src/main.tsx` does five things in order: import the self-hosted fonts, import `tailwind.css`,
apply the stored theme before the first paint, mount `<AppProviders><AppRouter/></AppProviders>`
in `StrictMode`, then start `reportWebVitals()`.

The env split is deliberate: the schema runs once in `vite.config.ts` (`parseEnv(loadEnv(...))`,
skipped in `mode === 'test'`) so a bad env fails the dev server or the build instead of shipping,
and the app reads plain strings at runtime. Variables are also declared in `src/vite-env.d.ts`.

## `src/hooks/` — generic hooks

Only what is generic and unbound to a domain. Today that is one file:

| Hook                   | Purpose                                                                                                                                                     |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `useMediaQuery(query)` | `useSyncExternalStore` over `matchMedia`. Lets a page render one layout instead of shipping both and hiding one with CSS — see `use-companies-list-page.ts` |

Cached server-state hooks live with their API domain
(`@api/process-backend/<domain>/use-<domain>-queries.ts`), **not** here. Page controller hooks
live with their page.

## `src/constants/`

| File                      | Exports                                                                                     |
| ------------------------- | ------------------------------------------------------------------------------------------- |
| `constants/navigation.ts` | `NavItem`, `NavGroup`, `WorkspaceIdentity`, `COMPANY_ADMIN_NAV`, `SUPER_ADMIN_NAV`          |
| `constants/roles.ts`      | `ROLE_META` — per `UserRole`: label, home path, badge/avatar classes, and two copy builders |

`ROLE_META[role].home` is where login sends a user, which keeps the role→landing-page mapping in
one place. Both files are plain data with no React in them.

## `src/utils/` — pure helpers

| File                       | Exports                                                                                                                                    |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `utils/identifier.ts`      | `detectIdentifierKind`, `toMobileDigits`, `isValidEmail`, `isValidMobile`, `isValidIdentifier`, `normalizeIdentifier`, `displayIdentifier` |
| `utils/format/date.ts`     | `toIsoDate`, `todayIso`, `shiftIsoDate`, `formatDayLabel`, `formatShortDate`, `formatCreatedOn`                                            |
| `utils/format/money.ts`    | `formatMoney` — `Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' })`                                                       |
| `utils/format/quantity.ts` | `formatQuantity(qty, unit)` — units are per service type; `piece` renders as `pcs`                                                         |

Two rules these encode, worth keeping:

- **Money is a string on the wire** (a Prisma `Decimal`). `Number()` appears only inside
  `formatMoney` / `formatQuantity`, for display. Never do arithmetic on it in the client.
- **Dates are calendar days in the shop's timezone.** `fromIsoDate` parses at local midnight
  (`T00:00:00`), never as UTC, so "today" doesn't flip at the wrong hour.

## Dependencies

No new dependency without a reason a few lines of code can't cover. There is no component
library, no toast library, no date library, no state library — `Intl`, `matchMedia`,
`useSyncExternalStore`, native `<dialog>` and `<input type="date">` cover what those would.

The one measurement dependency is `web-vitals`, behind `src/lib/vitals/`. It logs to the console in
dev and posts with `sendBeacon` **only** when `VITE_VITALS_URL` is set, so nothing leaves the
device by default. There is still no error monitoring and no product analytics.

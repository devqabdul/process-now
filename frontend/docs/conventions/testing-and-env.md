# Testing and environment

## Setup

Vitest config lives in the `test:` block of `vite.config.ts` — there is no separate
`vitest.config.ts`.

```ts
test: {
  environment: 'jsdom',
  setupFiles: ['src/test/setup.ts'],
  css: false,
  env: { VITE_API_BASE_URL: 'http://api.test', VITE_APP_ENV: 'local' },
}
```

`src/test/` holds three files:

| File                | Exports                                                                                                                                                 |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `setup.ts`          | imports `@testing-library/jest-dom/vitest`, starts MSW with `onUnhandledRequest: 'error'` in `beforeAll`, resets handlers + `cleanup()` in `afterEach`  |
| `server.ts`         | the bare `setupServer()`, `API = 'http://api.test'`, and `envelope<T>(data, status)` — the API's response shape, so a handler reads like the real thing |
| `axios-response.ts` | `axiosOk<T>(data, status)` — the bits of an `AxiosResponse` a test needs when it mocks a service call with `vi.mock`                                    |

Handlers are added per test with `server.use(...)`.

`css: false` means Tailwind classes are strings in tests — assert on roles, names and text, never
on a class.

## How a test renders

Page tests mount the real page inside a `createMemoryRouter` and a fresh `QueryClient`, with stub
routes for anywhere the page navigates:

```tsx
const router = createMemoryRouter(
  [
    { path: '/admin/companies', Component: CompaniesListPage },
    { path: '/admin/companies/new', Component: () => <h1>New company</h1> },
  ],
  { initialEntries: ['/admin/companies'] },
);
render(
  <QueryClientProvider client={new QueryClient()}>
    <RouterProvider router={router} />
  </QueryClientProvider>,
);
```

Interaction goes through `userEvent.setup()`, never `fireEvent`.

Two jsdom gaps to know about:

- **`<dialog>` has no modal methods.** `workspace-command-palette.test.tsx` stubs `showModal` and
  `close` in `beforeAll`. The real focus trap is the browser's and isn't covered.
- **`matchMedia` reports no match**, so `useMediaQuery` is always `false` and a page that switches
  layouts renders its phone variant. `companies-list-page.test.tsx` documents this — the table
  variant is untested.

## What is worth testing

Cover the rules a reader can't see from the markup, not the markup:

| Test file                                                     | What it pins down                                                                                                                                                                                                                                      |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/pages/auth/login/login-page.test.tsx`                    | identifier rejected before the password step; the normalised payload (`+91 98000 22222` → `9800022222`); one generic 401 message. Uses MSW                                                                                                             |
| `src/pages/admin/create-company/create-company-page.test.tsx` | which fields are `required` and that the either-or pair is a labelled `<fieldset>` instead; the neither-phone-nor-email rejection; the trimmed/upper-cased/lower-cased payload; focus landing on the success heading. Mocks the service with `vi.mock` |
| `src/app/router/routes.test.tsx`                              | the guards: a signed-out visitor lands on `/login`, each role is kept out of the other workspace and let into its own, and `guestOnly` bounces a signed-in user off `/login`. Uses MSW for `/auth/me`                                                  |
| `src/pages/admin/companies-list/companies-list-page.test.tsx` | rows render from `companies.fixtures.ts`; the count live region is mounted **before** the count changes; search filters and offers a way out of an empty result                                                                                        |
| `src/pages/dashboard/dashboard-page.test.tsx`                 | the formatted figures (`₹2,46,800`, `1,420 pcs`, `9.5 hrs`) off `dashboard.fixtures.ts`; the daily-log prompt on a day without one                                                                                                                     |
| `src/components/ui/data-table.test.tsx`                       | rows render from the data; skeleton rows while loading; the empty node; a sortable header sorts from the keyboard and a display column has no sort button                                                                                              |
| `src/components/sections/auth/auth-steps.test.tsx`            | both sign-in inputs are marked required                                                                                                                                                                                                                |
| `src/components/layouts/workspace-command-palette.test.tsx`   | ⌘K opens it, typing filters, Enter navigates                                                                                                                                                                                                           |
| `src/lib/theme/theme.test.ts`                                 | `<html data-theme>` + storage; fallback for unknown values; blocked storage; the switching class window; every `useTheme()` consumer stays in sync                                                                                                     |
| `src/lib/layout-mode/layout-mode.test.ts`                     | same three storage cases for the layout preference                                                                                                                                                                                                     |
| `src/utils/identifier.test.ts`                                | kind detection as the user types; `+91` / leading-zero normalisation                                                                                                                                                                                   |

Pure helpers get a plain unit test. Components get a test only when they carry a rule
(`required`, a live region, a keyboard interaction).

A few `findBy*` / `findAllBy*` calls pass `{ timeout: 3000 }`: `companies-list-page.test.tsx` and
`routes.test.tsx`, where the assertion waits on an MSW round trip and, in the routes case, the
guard's `/auth/me` fetch resolving before the router settles. The default 1000ms is enough for most
tests — raise it only where a real round trip is in the way.

## Known gaps

- **No coverage tooling.** No `@vitest/coverage-*` dependency, no `test:coverage` script, no
  threshold. "Coverage" today means the files listed above — `find src -name "*.test.ts*"` is the
  authoritative list.
- **No e2e tests.** No Playwright, no Cypress.
- **No visual regression and no automated accessibility checks** (no axe).
- The account sheet, the bottom navigation and the theme toggle's rendering are untested; only
  the underlying theme store is. The desktop table layouts are covered indirectly by
  `ui/data-table.test.tsx`, which renders the primitive straight rather than through a page.
- `RouteErrorBoundary` and its stale-chunk reload are untested.

## Commands

| Command                                                      | What it does            |
| ------------------------------------------------------------ | ----------------------- |
| `yarn test`                                                  | `vitest run` — one pass |
| `yarn test:watch`                                            | `vitest` — watch mode   |
| `npx vitest run src/pages/dashboard/dashboard-page.test.tsx` | a single file           |

## Environment variables

All variables are prefixed `VITE_`. Copy `.env.example` → `.env.local` and fill them in. The first
two are required; the third is optional.

| Variable            | Description                                                                                         |
| ------------------- | --------------------------------------------------------------------------------------------------- |
| `VITE_API_BASE_URL` | Base URL of the backend, **including the API version prefix** — e.g. `http://localhost:1010/api/v1` |
| `VITE_APP_ENV`      | `local` \| `development` \| `staging` \| `production`                                               |
| `VITE_VITALS_URL`   | **Optional.** Where `src/lib/vitals/` posts Web Vitals. Unset or empty means nothing is sent        |

Two rules the schema enforces (`src/app/config/env-schema.ts`):

1. `VITE_API_BASE_URL` must be a valid URL.
2. It must use `https://` unless `VITE_APP_ENV` is `local` — passwords go over this URL.

A third rule is a deployment constraint, documented in `.env.example` rather than checkable in
code: in production the API must share a registrable domain with the app
(`app.example.com` + `api.example.com`), because the session cookie is `SameSite=Lax`.

**Validation runs at build time.** `vite.config.ts` calls `parseEnv(loadEnv(mode, …, 'VITE_'))`
before returning the config, so a bad env fails `yarn dev` and `yarn build` with the offending
variables listed — it never ships. `mode === 'test'` is skipped; Vitest injects its own values.
At runtime `src/app/config/env.ts` reads plain strings off `import.meta.env`, which keeps zod out
of the runtime bundle. The variables are also declared in `src/vite-env.d.ts`.

## Git hooks

The hooks live at the **repository root** (`../.husky/`). `yarn install` at the root installs them.
They cover **the frontend only**: `lint-staged` globs `frontend/**` and the pre-push hook runs
`yarn --cwd frontend`. Backend code is linted and tested by CI, not by a hook.

| Hook           | Runs                                                                                                             |
| -------------- | ---------------------------------------------------------------------------------------------------------------- |
| **pre-commit** | gitleaks on staged changes → semgrep on staged `.ts`/`.tsx` (`yarn --cwd frontend semgrep`) → `yarn lint-staged` |
| **commit-msg** | commitlint — Conventional Commits, scopes `frontend` `backend` `docs` `repo` `deps`                              |
| **pre-push**   | `yarn --cwd frontend typecheck` → `test` → `build`                                                               |

gitleaks and semgrep are optional locally: the hook prints a warning and continues if the binary
isn't installed (`brew install gitleaks`, `pip install semgrep`). lint-staged runs ESLint `--fix`
and Prettier on staged `frontend/src/**/*.{ts,tsx}`, Prettier on staged `css`/`json`, and Prettier
on staged Markdown.

`yarn verify` at the root is the same typecheck + lint + test the push hook runs, minus the build.

CI runs the same gates plus more. `.github/workflows/ci.yml` runs typecheck, lint, test and build
for each app on every pull request and on `main`, adds a non-blocking `yarn npm audit`, and builds
both Docker images on pull requests. `release.yml` drives release-please and pushes the images to
GHCR. `.github/` also holds the PR template and CODEOWNERS.

The hooks are still the faster loop, and they run a subset: no lint on push, and nothing at all for
the backend.

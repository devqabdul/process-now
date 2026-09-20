# Code conventions

## Naming

| Thing                  | Convention                      | Example                                      |
| ---------------------- | ------------------------------- | -------------------------------------------- |
| Files and folders      | kebab-case                      | `use-create-company-page.ts`                 |
| Component exports      | PascalCase                      | `CompaniesListPage`, `StatTile`              |
| Hook files and exports | `use-x-y.ts` / `useXY`          | `use-media-query.ts` → `useMediaQuery`       |
| Page files             | `<page>-page.tsx`               | `dashboard-page.tsx`                         |
| Controller hooks       | `use-<page>-page.ts`            | `use-dashboard-page.ts`                      |
| API wire types         | `<domain>.types.ts`             | `companies.types.ts`                         |
| Fixtures               | `<domain>.fixtures.ts`          | `dashboard.fixtures.ts`                      |
| Tests                  | `*.test.ts(x)`, co-located      | `login-page.test.tsx`                        |
| Module constants       | SCREAMING_SNAKE at module scope | `SHAKE_MS`, `COMPANY_SKELETON_ROWS`, `GSTIN` |

## Components

- Arrow functions with a destructured props object. No `function` declarations, no default
  exports, no `React.FC`.
- `interface XProps` declared immediately above the component; exported only when a sibling needs
  it.
- Refs are ordinary props (React 19). No `forwardRef` anywhere in the codebase.
- A component that is only markup is a single expression (`=> ( … )`), no function body.

## Memoization

**Memoize only when the identity is consumed** — by a `memo()` child or by a hook's dependency
array. Everything else stays a plain arrow.

In practice this means the codebase contains exactly two `useMemo`/`useCallback` calls, both in
`src/hooks/use-media-query.ts`, where the values feed `useSyncExternalStore`. There is no
`memo()` component and no memoized callback prop. Controller hooks return plain arrows and a
plain object literal — **never memoize a hook's return object**.

React Compiler is not enabled (`vite.config.ts` uses a plain `react()` plugin). If it is turned
on later, this rule becomes "rely on the compiler; memoize by hand only for hook dependencies".

## Dependency arrays

`react-hooks/exhaustive-deps` is **off** (`eslint.config.js`). Curate arrays by hand: list values
that actually change, omit stable refs (`navigate`, RHF's `setValue`/`setError`, module
constants). You own remembering to add a newly referenced changing value.

The rest of `eslint-plugin-react-hooks`'s recommended set is on — rules-of-hooks still applies.

## Imports

- `import type { … }` for type-only imports, enforced as an **error** by
  `@typescript-eslint/consistent-type-imports`.
- Path aliases over relative paths across folders: `@app`, `@api`, `@pages`, `@components`,
  `@lib`, `@hooks`, `@utils`, `@assets`, `@constants`, `@shared` (→ `src/types`), `@test`.
  Relative imports only within the same folder or its direct parent — that is how the api layer
  refers to `../axios` and `./companies.fixtures`.
- Import direction is enforced by `eslint-plugin-boundaries`:
  `ui → shared → sections → layouts → pages`. `lib/`, `utils/`, `constants/`, `api/`, `types/`
  and `hooks/` cannot import any component tier or `pages/`. The `never app/` clause is enforced
  for `ui`, `shared`, `sections` and `layouts` only — the foundation tiers and `pages/` may import
  `app/`, as `lib/auth/session.ts` and `api/process-backend/axios.ts` do.
- A domain is imported through its barrel (`@api/process-backend/companies`), not a deep file.

## Comments

- **Business logic only, at most two lines.** Why this rule exists, what the API does, what
  breaks if you change it. Never a restatement of the code.
- No file-header narration, no section banners inside a function, no JSDoc on obvious props.
- The section markers in a controller hook (`// state`, `// wiring`, …) are structure, not
  commentary — keep them.
- A deliberate deviation carries its reason inline. Every `eslint-disable` line in this codebase
  ends with `-- <reason>`; so does every `TODO(api)`.

Good examples to copy:

```ts
// An empty list or object is a successful response, not a failure: every list is
// empty for a newly created company.

// Wrong credentials get one message for both fields, so the API never reveals which accounts exist.

// Dates are calendar days in the shop's timezone, so parse at local midnight, never as UTC.
```

## Formatting

Prettier, config in `.prettierrc`: single quotes, trailing commas everywhere, 100-character
lines. `eslint-config-prettier` is last in the ESLint chain, so formatting is never a lint
concern. `yarn format` writes, `yarn format:check` verifies; lint-staged runs it on commit.

## Strict TypeScript

`tsconfig.app.json` adds `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`,
`noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch` and `verbatimModuleSyntax` on
top of `strict`. What each means for day-to-day code is in
[`types.md`](./types.md#strictness-the-compiler-already-enforces). No `any`, no non-null `!`
outside tests — use a type guard.

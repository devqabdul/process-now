# Pages

A page is **two files in one folder**: a component that renders, and a controller hook that
decides. The component reads everything off the hook and holds no logic beyond JSX branching.

```
src/pages/<group>/<page>/
  <page>-page.tsx        renders only
  use-<page>-page.ts     controller hook — state, data, callbacks
  <page>-page.test.tsx   co-located test
```

Real examples: `src/pages/dashboard/`, `src/pages/auth/login/`,
`src/pages/admin/companies-list/`, `src/pages/admin/create-company/`.
Files are kebab-case, component exports PascalCase, hook files `use-x-y.ts`.

## Hook body order

Always, in this order, with the section comments kept in the file:

```ts
export const useDashboardPage = (): UseDashboardPageResult => {
  // state      useState / useRef
  // wiring     useNavigate, useForm, useQueryClient, query hooks, other hooks
  // derived    values computed from state + wiring
  // callbacks  plain arrow functions
  // effects    every useEffect, grouped here
  return { ... };
};
```

Verify against `src/pages/auth/login/use-login-page.ts` — it uses all five sections.
`react-hooks/exhaustive-deps` is **off** (`eslint.config.js`): curate dependency arrays by hand,
listing only values that actually change.

## Return type

Every controller hook declares an explicit exported result interface —
`UseDashboardPageResult`, `UseLoginPageResult`, `UseCreateCompanyPageResult`,
`UseCompaniesListPageResult` — and the hook is annotated with it. The page destructures it in
one statement. Form pages return the whole `form: UseFormReturn<T>` plus `isSubmitting`
(from `formState.isSubmitting`), never a re-declared copy of RHF state.

## Zod schemas

- The schema lives **inline in the controller hook**, above the hook. Extract to
  `<page>-schema.ts` only past ~250 hook lines. Nothing has crossed that line yet.
- Forms import **`zod/mini`** (`import * as z from 'zod/mini'`). Only
  `src/app/config/env-schema.ts` uses the full `zod` build.
- The hook `export type`s the inferred input (`LoginFormInput`, `CreateCompanyFormInput`); the
  section components import that type from the hook file.
- Cross-field and conditional rules go in a `.check((ctx) => …)` block that pushes
  `{ code: 'custom', path: ['field'], message, input }` issues, rather than a tower of
  `superRefine`s. See `createCompanySchema` in
  `src/pages/admin/create-company/use-create-company-page.ts` (either-or phone/email) and
  `loginSchema` in `use-login-page.ts` (identifier kind).

## Form patterns

| Concern               | Pattern                                                                                                                                                                   |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Resolver              | `useForm({ resolver: zodResolver(schema), defaultValues, mode: 'onSubmit' })`                                                                                             |
| Submit                | `handleValidSubmit` is a named async arrow declared in the callbacks section; `handleSubmit` wraps it with `void form.handleSubmit(handleValidSubmit)(event)`             |
| Form element          | `<form noValidate onSubmit={handleSubmit}>` — the schema owns validation, the browser doesn't                                                                             |
| Payload shaping       | A module-level `toPayload(values)` trims, lower-cases and normalises before the service call                                                                              |
| Field errors from API | `safeApiError`'s `onError` maps `err.fields` onto `setError(field, …)`, falling back to `setError('root', …)`; see `isFieldName` in `use-create-company-page.ts`          |
| Submit button         | `<Button type="submit" loading={isSubmitting}>` with a changed label (`Create company` → `Creating company…`). `Button` sets `disabled` + `aria-busy` and shows a spinner |
| Never                 | A full-page loader on submit                                                                                                                                              |

## Page shell

- The page renders a `<PageHeader title subtitle actions />` (`@components/shared/page-header`),
  which owns the single `<h1>`. Login and the standalone pages render their own `<h1>` instead.
- The document title is React 19's hoisted `<title>` rendered inside the page:
  `<title>Dashboard · ProcessNow</title>`. There is no meta/head helper.
- Error and empty states are `EmptyState` inside a `Card`, each with a title, a sentence saying
  why it is empty and a way forward. Never a blank region.

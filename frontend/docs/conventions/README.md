# Conventions

Detailed code-pattern docs for the ProcessNow frontend. The high-level rules live in
[`CLAUDE.md`](../../CLAUDE.md); this folder is the detail. **Read the relevant file before working
in that area.**

> **The frontend calls the real API.** All nine domains fetch through the shared axios client via
> `unwrap(getThing())`, and the backend's DB-backed e2e suite passes. The two `*.fixtures.ts` files
> that remain are test data for `companies-list-page.test.tsx` and `dashboard-page.test.tsx`. See
> [`api-layer.md`](./api-layer.md).

| Doc                                                | Covers                                                                                                                                                 |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [`form-page-playbook.md`](./form-page-playbook.md) | **start here to build a page** — end-to-end recipe + build checklist (folder, hook order, schema, submit, errors, comments)                            |
| [`pages.md`](./pages.md)                           | page folder, controller hooks, hook body order, return types, zod schema placement, form patterns, page shell                                          |
| [`accessibility.md`](./accessibility.md)           | required-field marking, live regions, focus management, contrast floors, 44px targets, reduced motion, known gaps                                      |
| [`routing.md`](./routing.md)                       | React Router 8 data mode, lazy pages vs non-lazy layouts, the auth guards, the loading treatment (AppSplash / LoadingMark / RouteProgress / skeletons) |
| [`state.md`](./state.md)                           | server vs form vs local UI state, the shared stores in `src/lib/`, what is deliberately not global                                                     |
| [`api-layer.md`](./api-layer.md)                   | envelope, `isSuccess` negated guards, `safeApiError`, query-key factories, query vs direct call, the fixture seam                                      |
| [`components.md`](./components.md)                 | `ui/` → `shared/` → `sections/` → `layouts/` tiers, when something graduates, props conventions                                                        |
| [`design-system.md`](./design-system.md)           | tokens in `src/app/tailwind.css`, theme / accent / radius switches, `cn()` and tailwind-merge, motion, contrast floors                                 |
| [`libraries.md`](./libraries.md)                   | `src/lib/` adapters (`cn`, theme, layout-mode), app bootstrap in `src/app/`, `src/constants/`                                                          |
| [`types.md`](./types.md)                           | type placement ladder, filename rules, anti-patterns                                                                                                   |
| [`code-conventions.md`](./code-conventions.md)     | naming, arrow components, memoization, curated dependency arrays, `import type`, comment limits                                                        |
| [`testing-and-env.md`](./testing-and-env.md)       | Vitest + Testing Library + MSW setup, env-var table, git hooks, coverage and its gaps                                                                  |

Product and planning docs sit outside the frontend:
[`problem-statement.md`](../../../docs/problem-statement.md),
[`module-design.md`](../../../docs/module-design.md),
[`frontend-plan.md`](../../../docs/frontend-plan.md).
Where the plan and the code disagree, the code is what shipped — the plan is a record of intent.

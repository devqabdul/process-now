# CLAUDE.md

ProcessNow — order, billing and daily-production tracking for job-work businesses. A monorepo with two independent apps: [`frontend/`](frontend) (React PWA) and [`backend/`](backend) (NestJS API). Both are written and run together: the compose stack applies all three migrations and the DB-backed e2e suite passes, and the frontend calls the real API through its axios client. What's left is the unbuilt screens and a hosting decision.

**Read the app's own `CLAUDE.md` before working in it** — this file stays at the repo level.

| Working in        | Read                                                                                                                                                                        |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `frontend/`       | [`frontend/CLAUDE.md`](frontend/CLAUDE.md) → [`frontend/docs/conventions/`](frontend/docs/conventions)                                                                      |
| `backend/`        | [`backend/CLAUDE.md`](backend/CLAUDE.md) → [`backend/docs/conventions/`](backend/docs/conventions)                                                                          |
| Product questions | [`docs/problem-statement.md`](docs/problem-statement.md), [`docs/module-design.md`](docs/module-design.md)                                                                  |
| Stack decisions   | [`docs/frontend-plan.md`](docs/frontend-plan.md), [`docs/backend-plan.md`](docs/backend-plan.md) — each has a Sources section citing the docs the version choices came from |

## Rules that hold across both apps

**Businesses differ in data, not code.** A new company, a new service type or a new price is a row, not a deploy. Before adding a branch keyed on a company name, check whether it belongs in the data model. See [`docs/module-design.md`](docs/module-design.md).

**Every business row belongs to a company.** The API takes `companyId` from the session, never from the request body, query or URL, and every query filters by it. This is what makes it safe to go from two companies to ten. It is the single most important rule in the backend — see [`backend/docs/conventions/multi-tenancy.md`](backend/docs/conventions/multi-tenancy.md).

**Money is never a float.** `Decimal` in the database, strings on the wire, formatted with `Intl.NumberFormat('en-IN')` for display. Arithmetic happens server-side; the frontend's price preview is display only and the server recalculates.

**Bills are snapshots.** An order item copies its price and cost when it is created, so editing a service type never rewrites old bills.

**Don't invent data.** A count, a badge or a metric with nothing behind it does not ship — an honest empty state does. The notifications tray is the remaining placeholder; it carries a `TODO(api)` comment rather than a made-up number.

**Say what is decided and what is open.** The plan docs separate Decisions from Open questions. Hosting, for instance, is still open; don't write code or docs that assume it.

## Conventions shared by both apps

- Files and folders are kebab-case; exported components are PascalCase; hook files are `use-x-y.ts`
- Comments explain business logic only, at most 2 lines. Never restate what the code plainly does
- No new dependency without a reason that a few lines of code can't cover
- Conventional Commits, scopes `frontend` `backend` `docs` `repo` `deps` (see [README](README.md#contributing))
- Git hooks live at the repo root: secrets scan, static analysis and lint-staged on commit; commitlint on the message; typecheck, tests and build on push. **They cover the frontend only** — `lint-staged` globs `frontend/**` and `pre-push` runs `yarn --cwd frontend`, so backend code is never linted, formatted or tested by a hook. Run the backend's own checks by hand (CI covers both apps on a PR)

## Environment

This is a **personal project**. Its git identity is set per repository (personal account), while the machine's global git config belongs to the user's employer. Never change global config — `~/.ssh/*`, `git config --global`, shell profiles — as part of work here.

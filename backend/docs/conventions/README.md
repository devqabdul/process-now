# Conventions

Detailed code-pattern docs extracted from [`CLAUDE.md`](../../CLAUDE.md). **Read the relevant file before
working in that area.**

> ⚠️ **Company scoping is the rule this codebase exists to get right.** `companyId` comes from the JWT,
> never from the request; every query filters by it; another company's record returns 404, not 403. Read
> [`multi-tenancy.md`](./multi-tenancy.md) before writing any query. See
> [`CLAUDE.md` → Company scoping](../../CLAUDE.md#conventions--read-before-working-in-an-area).

The design docs in [`../../../docs/`](../../../docs) are the source of truth for _what_ is built — scope,
data model, pricing, endpoints, stack decisions. These docs cover _how_ to write it. Where the plans
leave something open (hosting), these docs say so rather than deciding.

| Doc                                            | Covers                                                                                                                                                        |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`modules.md`](./modules.md)                   | **start here to build a module** — end-to-end recipe (module, controller, service, DTOs, wiring, transaction boundaries, tests) + build checklist             |
| [`multi-tenancy.md`](./multi-tenancy.md)       | **the critical rule** — `companyId` from the JWT, the exact Prisma call patterns, 404 not 403, the e2e test that proves it                                    |
| [`api-layer.md`](./api-layer.md)               | envelope interceptor, exception filter + Prisma error mapping, global `ValidationPipe`, Swagger, camelCase on the wire, paging                                |
| [`database.md`](./database.md)                 | Prisma 7 specifics (config file, generated client, driver adapter, `.env`), migrations, seeding, `Decimal` money, `jsonb`, the hand-written check constraints |
| [`business-rules.md`](./business-rules.md)     | server-side pricing, order-item snapshots, forward-only status, per-company numbering, GST, amount due                                                        |
| [`auth.md`](./auth.md)                         | bcrypt, the httpOnly cookie, global guard + roles, session revocation, the single login-failure message, identifier rules                                     |
| [`code-conventions.md`](./code-conventions.md) | naming, file layout, ESM imports, DTO and service style, dependency injection, which error to throw, comment limits                                           |
| [`types.md`](./types.md)                       | where types live — DTOs, Prisma-generated types, shared shapes — and what must never reach the wire                                                           |
| [`testing-and-env.md`](./testing-and-env.md)   | Vitest unit + e2e setup, what must have a test, the env-var table, the root git hooks                                                                         |

# CLAUDE.md

ProcessNow API — NestJS 12 (ESM), Prisma 7 with `@prisma/adapter-pg`, Supabase PostgreSQL, TypeScript 6.
Multi-company from day one. Two clients: the Company Admin workspace and the Super Admin console.

**Status:** all eight build-order steps are written, but nothing has ever run against a real database —
no `DATABASE_URL` is configured, so the DB-backed e2e tests still skip and no migration has been applied
anywhere. Hosting is undecided. Expect the first real run to surface problems; see
[`README.md`](README.md).

Design docs are the source of truth and live outside this folder:
[problem statement](../docs/problem-statement.md) · [module design](../docs/module-design.md) (data
model, pricing, dashboard queries) · [backend plan](../docs/backend-plan.md) (stack, endpoints, rules).
**Don't contradict them, and don't decide what they leave open** — hosting is the one open decision.

## Conventions — read before working in an area

Detailed patterns live in [`docs/conventions/`](docs/conventions/README.md). This file stays high-level;
open the relevant doc before touching that area.

**Company scoping — the most important rule here.** `companyId` comes from the JWT via `@CompanyId()`,
**never** from the body, query or URL. Every service method takes it as its first argument and every
query filters by it: `findFirst({ where: { id, companyId } })` or
`findUniqueOrThrow({ where: { id, companyId } })`, never a bare `findUnique({ where: { id } })`. Another
company's record returns **404, not 403**, so the API doesn't confirm it exists.
`test/tenant-isolation.e2e-spec.ts` proves it. See
[`multi-tenancy.md`](docs/conventions/multi-tenancy.md).

**Response envelope.** Every response is `{ status_code, message, data }`, errors adding a flat `fields`
map. `EnvelopeInterceptor` wraps successes, `HttpExceptionFilter` shapes errors and maps Prisma codes
(`P2002` → 409, `P2025` → 404). Never hand-build an envelope in a controller — return the payload and
let the interceptor wrap it. Wire fields are camelCase; money is an exact decimal **string**. See
[`api-layer.md`](docs/conventions/api-layer.md).

**Thin controllers.** A controller declares the route, pulls `@CompanyId()` and a validated DTO, calls one
service method, returns the result. No Prisma calls, no business logic, no `try/catch`. Business logic
lives in the service; reusable pure logic (pricing, dates, identifiers) lives in `src/common/` with a
unit test and no Nest or Prisma imports. See [`modules.md`](docs/conventions/modules.md).

**Transactions.** Every multi-step write runs in `prisma.$transaction`: create order (counter + order +
items), return order (status + item amounts + bill), record payment (row lock + payment + `amount_paid`).
A service called from inside another's transaction takes the `Prisma.TransactionClient` as its first
argument — `BillingService.createForOrder(tx, companyId, …)`. See
[`business-rules.md`](docs/conventions/business-rules.md).

**Money.** `Decimal` everywhere — Prisma `@db.Decimal(12, 2)` columns, `Decimal` arithmetic, never
`number`, never float. Rounding is `toDecimalPlaces(2, ROUND_HALF_UP)` and only at the line and total
level. Money leaves the API as a string. Pieces and kilograms are never added together; the dashboard
sums quantities per unit. See [`business-rules.md`](docs/conventions/business-rules.md#money).

**Snapshots.** An order item copies `unitPrice`, `unitCost`, the chosen options **and `billOn`** from the
service type at creation time. Editing or deactivating a service type afterwards must never change an
existing order, bill or past dashboard figure. When you add a field that pricing reads, snapshot it too.
See [`business-rules.md`](docs/conventions/business-rules.md#snapshots).

**Naming.** Postgres is snake_case, code is camelCase — Prisma `@map`/`@@map` bridges the two, so no
manual translation anywhere. The envelope's `status_code` is the one deliberate snake_case field on the
wire, because the frontend's helpers expect it. Files are kebab-case: `orders.service.ts`,
`create-order.dto.ts`, `jwt-auth.guard.ts`. ESM means relative imports end in `.js`.

**Auth.** Password hashing is bcrypt (cost 10). The JWT lives in an `httpOnly`, `SameSite=Lax` cookie
named `access_token`, valid 24 hours and revocable through `users.token_version`. `JwtAuthGuard` is
global — mark exceptions `@Public()`, not the other way round — and `RolesGuard` enforces
`@Roles(['company_admin'])`. A failed login returns one message whichever half was wrong. See
[`auth.md`](docs/conventions/auth.md).

**Types.** Prefer what Prisma already generated (`Role`, `OrderStatus`, `Prisma.TransactionClient`) over
re-declaring it, and let inference do the rest. DTOs are classes, because class-validator and Swagger
read decorator metadata at runtime. Services return Prisma objects shaped by an explicit `select` —
which makes those objects security-relevant: `passwordHash` and `tokenVersion` must never reach the
wire, and `jsonb` columns are parsed, never cast. See [`types.md`](docs/conventions/types.md).

**Tests.** Vitest. The pricing function and tenant isolation must stay covered; everything else is
judgement. Unit specs sit beside their subject (`src/common/pricing.spec.ts`), e2e specs in `test/`
through `createApp()` so they exercise the same `setupApp()` the deployed app uses. DB-backed specs are
`describe.skipIf(!HAS_DB)` and **have never run** — no `DATABASE_URL` is configured yet. See
[`testing-and-env.md`](docs/conventions/testing-and-env.md).

**Commits.** Conventional Commits, enforced by commitlint at the repo root: `type(scope): subject`, scope
`backend`, subject in sentence case, header ≤ 100 characters — `fix(backend): scope the bill lookup to
the signed-in company`. Never commit without being asked.

| Area                                             | Doc                                                           |
| ------------------------------------------------ | ------------------------------------------------------------- |
| Building a module (start here)                   | [`modules.md`](docs/conventions/modules.md)                   |
| Company scoping (the critical rule)              | [`multi-tenancy.md`](docs/conventions/multi-tenancy.md)       |
| Envelope, filter, DTO validation, Swagger        | [`api-layer.md`](docs/conventions/api-layer.md)               |
| Prisma 7, migrations, seeding, Decimal, jsonb    | [`database.md`](docs/conventions/database.md)                 |
| Pricing, snapshots, status, numbering, GST       | [`business-rules.md`](docs/conventions/business-rules.md)     |
| Passwords, cookie, guards, login identifier      | [`auth.md`](docs/conventions/auth.md)                         |
| Naming, DI, DTO style, error types, comments     | [`code-conventions.md`](docs/conventions/code-conventions.md) |
| Type placement, and what must not reach the wire | [`types.md`](docs/conventions/types.md)                       |
| Vitest, required coverage, env vars, git hooks   | [`testing-and-env.md`](docs/conventions/testing-and-env.md)   |

## Commands

```bash
yarn start:dev                         # watch mode, http://localhost:1010
yarn build                             # nest build
yarn typecheck                         # tsc --noEmit
yarn lint[:fix]                        # eslint src test prisma
yarn format[:check]                    # prettier
yarn test[:watch|:cov]                 # vitest, *.spec.ts
yarn test:e2e                          # vitest, *.e2e-spec.ts (DB specs skip without DATABASE_URL)
yarn prisma migrate dev --name <x>     # new migration after a schema change
yarn migrate:deploy                    # apply migrations (release step)
yarn prisma db seed                    # only way to seed; migrate dev no longer does it
```

## Gotchas

- **ESM.** Relative imports need the `.js` extension: `import { AuthService } from './auth.service.js'`.
- **The Prisma client is generated into the source tree** at `src/generated/prisma/` (git-ignored) and
  imported from `../generated/prisma/client.js`, not from `@prisma/client`. Run `yarn prisma generate`
  after any schema change; `postinstall` does it on a fresh clone.
- **`.env` is not loaded automatically** in Prisma 7. `@nestjs/config` loads it for the app,
  `prisma.config.ts` calls `dotenv` for the CLI, `test/setup-env.ts` for e2e tests.
- **`@IsOptional()` is banned** — it skips every other validator on an explicit `null`. Use `@Optional()`
  from `src/common/validators.ts`, which only skips `undefined`.
- **Health checks are unprefixed.** Everything else is under `/api/v1`.

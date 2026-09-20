# Code conventions

The small rules. Area-specific patterns live in the other docs; this is what applies everywhere.

## Naming

| Thing                       | Convention                   | Example                                                         |
| --------------------------- | ---------------------------- | --------------------------------------------------------------- |
| Files and folders           | kebab-case                   | `service-types.service.ts`, `jwt-auth.guard.ts`                 |
| Nest building blocks        | `<name>.<kind>.ts`           | `orders.module.ts`, `orders.controller.ts`, `orders.service.ts` |
| DTO files                   | `<subject>.dto.ts`           | `order.dto.ts`, `create-company.dto.ts`                         |
| Unit specs                  | beside the subject           | `pricing.ts` → `pricing.spec.ts`                                |
| E2E specs                   | `test/<subject>.e2e-spec.ts` | `test/tenant-isolation.e2e-spec.ts`                             |
| Classes                     | PascalCase, suffixed by kind | `OrdersService`, `CreateOrderDto`, `RolesGuard`                 |
| Everything else in code     | camelCase                    | `companyId`, `nextOrderNo`, `billableQty`                       |
| Postgres tables and columns | snake_case                   | `order_items`, `next_bill_no`                                   |
| Constants                   | SCREAMING_SNAKE              | `AUTH_COOKIE`, `SESSION_TTL_SECONDS`, `MAX_MONEY`               |

Prisma `@map` / `@@map` bridges camelCase code and snake_case Postgres, so **nothing translates names by
hand**. The envelope's `status_code` is the one deliberate snake_case field on the wire, because the
frontend's helpers expect it.

## Imports

- **ESM: relative imports end in `.js`** — `import { AuthService } from './auth.service.js'`, even
  though the file is `.ts`. A missing extension is a runtime `ERR_MODULE_NOT_FOUND`, not a type error.
- The Prisma client comes from `../generated/prisma/client.js`, **never** `@prisma/client`. `Decimal`
  comes from `@prisma/client/runtime/client`.
- `import type` for anything used only as a type — `import type { Request } from 'express'`.
- No path aliases on the backend; relative paths only.

## Services and dependency injection

- Constructor injection with `private readonly`: `constructor(private readonly prisma: PrismaService) {}`.
- **`companyId` is the first argument** of every company-scoped method.
- `PrismaModule` is `@Global()` — inject `PrismaService` directly, never import the module.
- A `select` or `include` reused across methods is a module-level `const … as const` (optionally
  `satisfies Prisma.XInclude` for checking), not repeated inline.
- Small pure helpers used by one module can be module-level arrow consts below the class (`toView`,
  `withStatus`, `hasDuplicates`). Anything shared across modules moves to `src/common/`.
- Code in `src/common/` that is genuinely pure — `pricing.ts`, `dates.ts`, `identifier.ts` — must not
  import from Nest or Prisma, so it can be unit-tested without a container or a database.

## DTO style

- One `<module>.dto.ts` per module is the norm; split only when it gets unwieldy.
- class-validator decorators plus the shared helpers from `src/common/validators.ts` — prefer
  `@IsName()`, `@IsPhone()`, `@IsEmailAddress()`, `@IsGstNo()`, `@IsAmount()`, `@IsDateOnly()` over
  assembling the same stack of decorators again. They normalise as well as validate.
- **Never `@IsOptional()`** — it skips every other validator on an explicit `null`. Use `@Optional()`.
- Query DTOs extend `PageQueryDto` when the route lists rows, and need `@Type(() => Number)` on numeric
  params because query strings arrive as strings and implicit conversion is off.
- `@ApiProperty` where Swagger can't infer the type. Response DTOs, if written, are Swagger-only — the
  service returns Prisma objects. See [`types.md`](./types.md).
- **No `companyId` field on any DTO**, ever. See [`multi-tenancy.md`](./multi-tenancy.md).

## Errors

Throw Nest's built-in exceptions. Don't write custom HTTP exception classes; the one custom error in the
codebase, `PricingError`, is deliberately **not** an HTTP error — it comes from a pure function that
knows nothing about HTTP, and the calling service converts it.

| Situation                              | Throw                         | Status            |
| -------------------------------------- | ----------------------------- | ----------------- |
| Missing, or another company's, record  | `NotFoundException`           | 404               |
| Bad value in a named field             | `fieldError('amount', '…')`   | 422 with `fields` |
| Wrong state for this step              | `ConflictException`           | 409               |
| Duplicate                              | `ConflictException`           | 409               |
| No session, bad session                | `UnauthorizedException`       | 401               |
| Wrong role, or no company on the token | `ForbiddenException`          | 403               |
| Database unreachable                   | `ServiceUnavailableException` | 503               |

Prefer `fieldError()` over a bare `BadRequestException` whenever a specific input is at fault — the
frontend shows the message against the field. Let Prisma's own errors propagate where the mapping in
`HttpExceptionFilter` already says the right thing; don't wrap a `findUniqueOrThrow` in a `try/catch`
just to rethrow a 404.

**Never catch and swallow.** The two `catch {}` blocks that exist are documented in place and both have
a reason: logout clearing a cookie for an already-invalid token, and the readiness check refusing to
leak database detail on a public endpoint.

## Comments

For business logic and non-obvious trade-offs only. Concise — a line or two.

Write a comment when the code is correct for a reason a reader can't see: why a timeout is 20 seconds,
why a dummy hash is compared against, why a counter is read with `UPDATE … RETURNING`, why a status is
computed rather than stored. Never restate what the code plainly does, and no file-header narration.

`/** … */` on exported functions and non-obvious service methods; `///` on Prisma schema fields, which
carries into the generated client.

Mark a deliberate simplification with a `ponytail:` comment naming the ceiling and the upgrade path —
`// ponytail: move to a shared store before running a second replica`.

## Formatting

Prettier and ESLint decide; don't hand-format. `yarn lint:fix && yarn format` before a commit, since the
root hooks don't yet cover backend files (see [`testing-and-env.md`](./testing-and-env.md#git-hooks)).

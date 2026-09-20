# Types

Where a type lives, and what must never reach the wire.

## The placement ladder

Stop at the first rung that fits.

1. **Prisma generated it** → import it. `Role`, `OrderStatus`, `BillOn`, `DailyLog`, `Prisma.OrderInclude`,
   `Prisma.TransactionClient`, `Prisma.JsonValue` all come from `../generated/prisma/client.js`. Don't
   re-declare a union that already exists as a Prisma enum.
2. **TypeScript can infer it** → let it. A service method's return type comes from the Prisma call; an
   explicit annotation just goes stale. Only annotate when inference is wrong or genuinely unreadable.
3. **It describes a request body or query string** → a DTO class in the module's `dto/`. It must be a
   class, not an interface: class-validator and Swagger both read decorator metadata at runtime.
4. **One module uses it** → a type in that module's file, near what it describes.
5. **More than one module uses it** → `src/common/`, next to the code it belongs to —
   `AuthUser` in `common/types/auth-user.ts`, `CompanySettings` in `common/company-settings.ts`,
   `OptionGroup` / `SelectedOption` / `ChosenOption` in `common/pricing.ts`.

`src/common/types/` holds only cross-cutting types with no natural home. A type that belongs to a
function lives beside that function.

## `interface` or `type`

`interface` for object shapes (`AuthUser`, `CompanySettings`, `OptionGroup`); `type` for unions,
intersections and anything computed (`type Num = Decimal | number | string`). Not a strong rule —
consistency within a file matters more.

## Prisma types worth knowing

| Type                                        | Use                                                                                        |
| ------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `Prisma.TransactionClient`                  | The `tx` argument of a method called inside another's transaction                          |
| `Prisma.OrderInclude`, `Prisma.BillInclude` | `as const satisfies Prisma.XInclude` on a shared `include` — checks it without widening it |
| `Prisma.JsonValue`                          | Reading a `jsonb` column. **Parse it, don't cast it**                                      |
| `Prisma.InputJsonValue`                     | Writing a `jsonb` column                                                                   |
| `Prisma.XWhereInput`                        | A shared predicate, e.g. `notVoided = { voidedAt: null } satisfies Prisma.BillWhereInput`  |
| `Decimal`                                   | From `@prisma/client/runtime/client`, not from the generated client                        |

`as const satisfies …` is the pattern for shared `select` / `include` objects: `satisfies` type-checks
the object against Prisma's shape, `as const` keeps the literal types so the inferred result stays
precise.

## jsonb shapes are parsed, never cast

A `jsonb` column can hold anything — the seed script, a migration or `psql` can write it. Casting
`json as CompanySettings` turns a malformed row into a `TypeError` deep inside pricing, or silently drops
GST from every bill.

| Column                         | Parser                                       | On bad data                              |
| ------------------------------ | -------------------------------------------- | ---------------------------------------- |
| `companies.settings`           | `readSettings()`                             | Falls back to `DEFAULT_SETTINGS` per key |
| `service_types.options`        | `readOptionGroups()` (zod)                   | Throws                                   |
| `order_items.selected_options` | Written by `priceItem()` as `ChosenOption[]` | —                                        |

zod is used for exactly two things: the env schema and `readOptionGroups`. DTOs stay on class-validator
(Nest 12 also offers `StandardSchemaValidationPipe` for zod DTOs — **decided against** for this project).

## Response shapes

There is no DTO layer between the service and the wire. Services return Prisma objects, sometimes mapped
by a small local function (`toView`, `withStatus`), and `EnvelopeInterceptor` wraps them. Response DTO
classes, if written, exist **only** to document Swagger — never construct one at runtime.

The shape is therefore controlled by the Prisma `select` / `include`, which makes those objects
security-relevant, not just performance-relevant.

## What must never reach the wire

- **`passwordHash`.** `AuthService` selects it deliberately to compare against, then destructures it out
  before returning. Never let it survive into a response.
- **`tokenVersion`.** An internal revocation counter; it is stripped alongside `passwordHash`.
- **Another company's anything.** The `companyId` filter is what guarantees this; see
  [`multi-tenancy.md`](./multi-tenancy.md).
- **Raw exception text.** `HttpExceptionFilter` replaces anything that isn't an `HttpException` with
  `"Internal server error"`. Prisma errors are logged as code + `meta` only, because the full error
  echoes the query arguments — which on a user create includes the password hash.
- **Money as a JSON number.** `Decimal` is serialised with `.toString()`, so `"450.00"`, never `450`.
  A float loses paisa. See [`business-rules.md`](./business-rules.md#money).
- **Internal id sequences beyond what's needed.** Order and bill numbers are per-company, so they leak
  nothing about other companies; uuid v7 primary keys are fine to expose.

**Prefer an explicit `select` over returning the whole row.** A field added to the schema later then
stays internal until someone chooses to expose it, rather than appearing on the API by default.

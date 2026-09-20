# Database

Prisma 7.10 over Supabase PostgreSQL. Supabase is the **Postgres host and nothing else** — no Supabase
Auth, no Row Level Security. Tenant scoping is application code; see
[`multi-tenancy.md`](./multi-tenancy.md).

## Prisma 7 specifics

Four things differ from Prisma 6 and trip people up:

1. **The connection URL is not in `schema.prisma`.** It lives in `prisma.config.ts` at the project root
   as `datasource.url`. The schema's `datasource db` block declares only the provider.
2. **The client is generated into the source tree**, `src/generated/prisma/` (git-ignored), by
   `generator client { provider = "prisma-client", output = "../src/generated/prisma" }`. Import from
   `../generated/prisma/client.js`, **never** from `@prisma/client`. Prisma 7 emits ESM by default, which
   matches this project, so no `moduleFormat` is set. Run `yarn prisma generate` after a schema change;
   `postinstall` does it on a fresh clone.
3. **The client connects through a driver adapter.** `PrismaService` extends `PrismaClient` and passes
   `new PrismaPg({ connectionString, max, connectionTimeoutMillis, statement_timeout })` to `super()`.
   The adapter connects lazily, so `onModuleInit` runs `SELECT 1` — that query is what makes a bad
   `DATABASE_URL` fail at boot. It retries three times with backoff first, because a Supabase restart is
   seconds long and exiting immediately turns a blip into a failed deploy.
4. **`.env` is not loaded automatically.** `@nestjs/config` loads it for the app, `prisma.config.ts`
   calls `dotenv` for the CLI, and `test/setup-env.ts` does it for e2e tests.

`prisma.config.ts` passes `process.env.DATABASE_URL` rather than Prisma's `env()` helper on purpose:
`env()` throws when the variable is unset, which would break `prisma generate` on a fresh clone. Commands
that actually need the database fail on their own.

`PrismaModule` is `@Global()`, so no feature module imports it — just inject `PrismaService`.

### Connection mode

The app is a long-running server, so `DATABASE_URL` is the Supavisor **session pooler (port 5432)**, used
by both the app and the Prisma CLI. **Open:** if the API ends up on serverless hosting, `DATABASE_URL`
becomes the transaction pooler (port 6543, `?pgbouncer=true` — transaction mode has no prepared
statements) and a `DIRECT_URL` on 5432 is added for the CLI. Hosting is undecided; see
[module-design.md → Open decisions](../../../docs/module-design.md#open-decisions).

## Schema conventions

- **Postgres is snake_case, code is camelCase.** `@map` on every multi-word field, `@@map` on every
  model. Nothing translates names by hand.
- Ids are `String @id @default(uuid(7)) @db.Uuid` — uuid v7 sorts by creation time, so `orderBy: id`
  after a timestamp is a stable tiebreaker for cursor paging.
- Every business table has `companyId String @map("company_id") @db.Uuid` with a relation and an index.
  The one exception is `order_items`, which hangs off its order and is scoped through it
  (`where: { order: { companyId } }`).
  Compose the index with the column you filter on: `@@index([companyId, status])`,
  `@@index([companyId, returnedAt])`.
- Per-company uniqueness is a compound constraint: `@@unique([companyId, orderNo])`,
  `@@unique([companyId, billNo])`, `@@unique([companyId, logDate])`.
- Deletes are `onDelete: Restrict` except `order_items`, which cascade from their order. Financial rows
  are not deletable by accident.
- Use `///` doc comments on a field whose meaning isn't obvious from its name — they carry into the
  generated client.

## Money and quantities

**Money is `Decimal`, never `Float` and never `number`.**

| Kind              | Column                       | Why                                           |
| ----------------- | ---------------------------- | --------------------------------------------- |
| Money             | `Decimal @db.Decimal(12, 2)` | Exact to the paisa                            |
| Quantity          | `Decimal @db.Decimal(12, 3)` | Kilograms need three places; pieces are whole |
| Machine hours     | `Decimal @db.Decimal(6, 2)`  | —                                             |
| Electricity units | `Decimal @db.Decimal(10, 2)` | —                                             |

Arithmetic uses `Decimal` methods (`.plus`, `.times`, `.minus`), imported from
`@prisma/client/runtime/client`. Round only at the line and total level, with
`.toDecimalPlaces(2, Decimal.ROUND_HALF_UP)`. Write back with `.toFixed(2)` and return to the client with
`.toString()` — money leaves the API as an exact decimal **string**, never a JSON number.

## jsonb columns

Three columns are `Json`: `companies.settings`, `service_types.options`, `order_items.selected_options`.
Their keys are **camelCase**, because `settings` goes to the client as-is.

**Parse them, never cast them.** A row can be written by the seed script, a migration or `psql`, so a
`as CompanySettings` cast turns a malformed row into a `TypeError` deep inside pricing, or silently drops
GST from every bill. Use the parsers:

| Column                         | Parser                                               | Behaviour on bad data                    |
| ------------------------------ | ---------------------------------------------------- | ---------------------------------------- |
| `companies.settings`           | `readSettings()` (`src/common/company-settings.ts`)  | Falls back to `DEFAULT_SETTINGS` per key |
| `service_types.options`        | `readOptionGroups()` (`src/common/option-groups.ts`) | zod `.parse()` — throws                  |
| `order_items.selected_options` | Written by `priceItem()` as `ChosenOption[]`         | —                                        |

## Migrations

```bash
yarn prisma migrate dev --name <change>   # development: generates and applies
yarn migrate:deploy                       # deploy: applies only, once per release
```

Migrations are committed and forward-only. Never edit an applied migration — write a new one. The
release step runs `migrate:deploy` **once per deploy, not per replica**.

**Prisma can't express check constraints**, so two are hand-written at the end of the init migration and
must be re-added by hand if the migration is ever regenerated:

```sql
ALTER TABLE "users" ADD CONSTRAINT "users_phone_or_email_check"
  CHECK ("phone" IS NOT NULL OR "email" IS NOT NULL);
ALTER TABLE "users" ADD CONSTRAINT "users_role_company_check"
  CHECK (("role" = 'super_admin') = ("company_id" IS NULL));
```

The first backs the login rule (see [`auth.md`](./auth.md)); the second guarantees a company admin always
has a company and a super admin never does.

## Seeding

Seeding is configured in `prisma.config.ts` as `migrations.seed: "tsx prisma/seed.ts"` and runs **only**
through `yarn prisma db seed` — in Prisma 7, `migrate dev` and `migrate reset` no longer seed
automatically. The seed creates the super admin plus FuseNow and CrushNow with sample service types, all
using `SEED_PASSWORD`. It is development data, never a substitute for a migration.

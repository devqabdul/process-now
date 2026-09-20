# Backend Plan (POC)

Based on [problem-statement.md](problem-statement.md) and [module-design.md](module-design.md). The data model lives in module-design.md; this plan does not repeat it.

## Stack

Latest stable versions from the npm registry, checked 2026-09-19 against the official docs listed under [Sources](#sources). Pin with `^` ranges and commit the lockfile.

| Concern         | Package                                                                                                             | Version                                |
| --------------- | ------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| Runtime         | Node                                                                                                                | 24 LTS (24.21)                         |
| Package manager | Yarn (Berry) via Corepack                                                                                           | 4.18                                   |
| Language        | `typescript`                                                                                                        | **6.0.3**, see note 1                  |
| Framework       | `@nestjs/core`, `@nestjs/common`, `@nestjs/platform-express`, `@nestjs/cli`, `@nestjs/testing`                      | 12.0, ESM project, see note 2          |
| Config          | `@nestjs/config` + `zod` (env schema passed as `validationSchema`, app fails to start on bad env)                   | 12.0, 4.6                              |
| ORM             | `prisma`, `@prisma/client`, `@prisma/adapter-pg`, `pg`; `dotenv` and `tsx` for the Prisma CLI and seed              | **7.10**, 8.23, 18.0, 4.23, see note 3 |
| Database        | Supabase PostgreSQL                                                                                                 | used only as a Postgres host           |
| Validation      | `class-validator`, `class-transformer` + global `ValidationPipe` (`whitelist`, `forbidNonWhitelisted`, `transform`) | 0.15, 0.5                              |
| Auth            | `@nestjs/jwt`, `bcrypt`, `cookie-parser`                                                                            | 12.0, 6.0, 1.4, see note 5             |
| API docs        | `@nestjs/swagger` at `/docs`                                                                                        | 12.0                                   |
| Security        | `helmet`, `@nestjs/throttler` (login rate limit), CORS limited to `WEB_ORIGIN` with credentials                     | 8.3, 6.7                               |
| Tests           | `vitest`, `@vitest/coverage-v8`, `supertest`                                                                        | 4.1, 4.1, 7.2, see note 6              |
| Lint / format   | `eslint` 10.11 + `typescript-eslint` 8.70, `prettier` 3.9                                                           | see note 7                             |

**Version notes**

1. **TypeScript 6.0.3, not 7.0.** TypeScript 7.0.2 is out, but it has no programmatic compiler API yet (expected in 7.1). `typescript-eslint` 8.70 needs `typescript <6.1.0`, `@nestjs/cli` 12 bundles `typescript ~6.0.2` and doesn't run on 7 yet (nest-cli issues #3477, #3479), and `nest new` scaffolds `typescript ^6.0.2`. Move to 7 when both support it.
2. **Nest 12 is ESM.** All Nest 12 packages ship as ESM, and `nest new` now asks for ESM or CommonJS; ESM is the default and scaffolds Vitest and oxlint. This project uses ESM (`"type": "module"`, `"module": "nodenext"`), so relative imports need a `.js` extension (`./app.module.js`). Running the app needs Node 20.19+ / 22.12+; the CLI generators need Node 22.22.3+ or 24.15+, so Node 24.21 covers both. Express is 5 (`@nestjs/platform-express` 12 depends on `express` 5.2). `ValidationPipe` with class-validator, global guards via `APP_GUARD`, interceptors and exception filters work as before. Nest 12 also adds `StandardSchemaValidationPipe` for zod DTOs; this plan keeps class-validator DTOs.
3. **Prisma 7.10, not 8.** npm's `latest` tag for `prisma` points at `8.0.0-rc.15`, but Prisma's release-status page calls 8 a release candidate whose API may still change, with GA expected October 2026. `@prisma/client` and `@prisma/adapter-pg` are at 7.10 stable, so all three use 7.10. Prisma 7 changes the setup:
   - The connection URL moves out of `schema.prisma` into `prisma.config.ts` (`datasource.url`), at the project root.
   - The client is generated into the source tree (`generator client { provider = "prisma-client", output = "../src/generated/prisma" }`) and imported from `./generated/prisma/client.js`. Prisma 7 generates ESM by default, which matches the ESM Nest project, so no `moduleFormat` is set. (The docs.nestjs.com Prisma recipe sets `moduleFormat = "cjs"`; that applies only to CommonJS Nest projects.)
   - The client connects through a driver adapter: `new PrismaClient({ adapter: new PrismaPg({ connectionString }) })`. `PrismaService` extends `PrismaClient` and passes the adapter to `super()`, as in Prisma's NestJS guide.
   - `.env` is not loaded automatically. `@nestjs/config` loads it for the app; `prisma.config.ts` starts with `import "dotenv/config"` for the CLI.
   - Seeding is configured in `prisma.config.ts` as `migrations.seed: "tsx prisma/seed.ts"` and runs only through `prisma db seed`; `migrate dev` / `migrate reset` no longer seed automatically.
4. **Supabase connections:** the API is a long-running server, so it follows Supabase's "server-based" setup: one `DATABASE_URL` pointing at the Supavisor **session** pooler (port 5432), used by both the app (through the adapter) and the Prisma CLI. The direct connection (also 5432) is IPv6-only unless the project buys the IPv4 add-on, so the session pooler is the default. If the API ends up on serverless hosting (still open, see module-design.md), switch to Supabase's serverless setup: `DATABASE_URL` = transaction pooler (port 6543) with `?pgbouncer=true`, which transaction mode needs because it doesn't support prepared statements, plus `DIRECT_URL` (port 5432) for the CLI in `prisma.config.ts`.
5. **Auth without Passport.** The main NestJS authentication chapter uses a plain guard: a global `APP_GUARD` that skips `@Public()` routes and calls `JwtService.verifyAsync()`. Passport is covered only in a separate, optional recipe. This plan follows the main chapter: the guard reads the token from `req.cookies` (populated by `cookie-parser`), so `@nestjs/passport`, `passport` and `passport-jwt` aren't needed. `bcrypt` 6 ships prebuilt binaries for macOS, Linux and Windows on x64 and arm64, and the Nest docs recommend `bcrypt` or `argon2`, so there's no need for `bcryptjs`.
6. **Vitest, not Jest.** `nest new` for an ESM project scaffolds Vitest (`vitest.config.ts`, `vitest.config.e2e.ts`) with `vitest ^4.1.2`. Vitest 5.0.1 is the latest release, but the Nest 12 scaffold still generates 4.1; move when the Nest schematics do. E2E tests use `import request from 'supertest'` (default import).
7. **ESLint 10 on the backend.** The frontend stays on ESLint 9.39 because `eslint-plugin-jsx-a11y` doesn't support 10. The backend doesn't use that plugin, and `typescript-eslint` 8.70 accepts `eslint ^10`, so the backend uses 10.11. `nest new` now scaffolds oxlint instead of ESLint; replace it with ESLint so both apps share the `typescript-eslint` setup.

## Folder structure

```
backend/
  prisma.config.ts         loads .env (dotenv), schema path, migrations path + seed command, DATABASE_URL for the CLI
  vitest.config.ts         unit tests (from `nest new`)
  vitest.config.e2e.ts     e2e tests (from `nest new`)
  prisma/
    schema.prisma
    migrations/
    seed.ts                super admin + FuseNow + CrushNow with sample service types
  src/
    main.ts                helmet, cookie-parser, CORS, global pipe, Swagger
    app.module.ts
    generated/prisma/      Prisma client output (git-ignored, created by `prisma generate`)
    config/
      env.ts               zod schema for DATABASE_URL, JWT_SECRET, WEB_ORIGIN, PORT (passed to ConfigModule as validationSchema)
    prisma/
      prisma.module.ts     global module
      prisma.service.ts    extends PrismaClient with the PrismaPg adapter; connects on module init
    common/
      guards/              jwt-auth.guard.ts (global; reads the cookie, verifies with JwtService), roles.guard.ts
      decorators/          current-user.decorator.ts, roles.decorator.ts, public.decorator.ts
      interceptors/        envelope.interceptor.ts
      filters/             http-exception.filter.ts (also maps Prisma P2002 → 409, P2025 → 404)
      types/               auth-user.ts ({ userId, role, companyId })
    auth/  companies/  settings/  vendors/  service-types/
    orders/  billing/  daily-logs/  dashboard/
  test/
    tenant-isolation.e2e-spec.ts
```

## Module structure

Every feature module has the same files.

### Template (the Orders module as the example)

```
src/orders/
  orders.module.ts
  orders.controller.ts         routes only: DTO in, service call, result out
  orders.service.ts            business logic; every query filtered by companyId
  pricing.ts                   pure pricing function, no Nest or Prisma imports
  pricing.spec.ts
  dto/
    create-order.dto.ts        vendorId, items[] (serviceTypeId, selectedOptions, qtyIn)
    return-order.dto.ts        items[] (orderItemId, qtyOut)
    list-orders-query.dto.ts   status?, vendorId?, q?
    order-response.dto.ts      Swagger response shape
```

Rules:

- **Controllers** stay thin: no Prisma calls and no business logic.
- **Services** take `companyId` as their first argument (from `@CurrentUser()`), e.g. `findOne(companyId, id)`.
- **Multi-step writes** (create order, return order + bill, record payment) run in `prisma.$transaction`.
- **DTOs** use class-validator decorators and `@ApiProperty` for Swagger. Response DTOs are Swagger-only.
- **Modules** export their service only when another module needs it (e.g. `ServiceTypesModule` exports `ServiceTypesService` for `OrdersModule`).

### All modules

| Module          | Routes             | Service responsibilities                                                                                | DTOs                                                                  | Depends on             |
| --------------- | ------------------ | ------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- | ---------------------- |
| `auth`          | login, logout, me  | Find the user by phone or email, check password (bcrypt), sign JWT, set and clear the cookie.           | login                                                                 | prisma                 |
| `companies`     | `/admin/companies` | Create company + first admin in one transaction; list                                                   | create-company                                                        | prisma                 |
| `settings`      | `/settings`        | Read and update company name, GST number, `settings` JSON                                               | update-settings                                                       | prisma                 |
| `vendors`       | `/vendors`         | List with search, create, update                                                                        | create-vendor, update-vendor, list-vendors-query                      | prisma                 |
| `service-types` | `/service-types`   | CRUD; validate the `options` JSON shape; deactivate instead of delete                                   | create-service-type, update-service-type, option-group, option-choice | prisma                 |
| `orders`        | `/orders`          | Create with server-side pricing and snapshots, list, detail, start, return                              | see template                                                          | service-types, billing |
| `billing`       | `/bills`           | Create bill from a returned order (called by orders), list with computed status, detail, record payment | record-payment, list-bills-query                                      | prisma                 |
| `daily-logs`    | `/daily-logs`      | List by date range; upsert by date                                                                      | upsert-daily-log, list-daily-logs-query                               | prisma                 |
| `dashboard`     | `/dashboard`       | Aggregate queries for one date (Prisma `groupBy` / `aggregate`, raw SQL only if needed)                 | dashboard-query                                                       | prisma                 |

## Multi-company safety (the most important rule)

1. On login, the JWT stores `{ userId, role, companyId }`.
2. A global `JwtAuthGuard` checks every route except those marked `@Public()`. `RolesGuard` checks `@Roles('super_admin' | 'company_admin')`.
3. Services receive `companyId` from `@CurrentUser()`. It is **never** read from the body, query or URL.
4. Every query includes `companyId`: `findFirst({ where: { id, companyId } })`, not `findUnique({ where: { id } })`.
5. A record from another company returns **404**, not 403, so the API doesn't reveal that it exists.
6. One e2e test proves it: Company A's admin requests Company B's order and gets 404.

## Endpoints

All company endpoints need the `company_admin` role and are scoped to that admin's company.

### Health (public, unprefixed)

| Method | Path            | Notes                                     |
| ------ | --------------- | ----------------------------------------- |
| GET    | `/health/live`  | Process is up; touches nothing            |
| GET    | `/health/ready` | Can reach the database; 503 when it can't |

### Auth

| Method | Path             | Notes                                                                                               |
| ------ | ---------------- | --------------------------------------------------------------------------------------------------- |
| POST   | `/auth/login`    | `identifier` (phone or email) + password → sets httpOnly cookie. Rate-limited.                      |
| POST   | `/auth/logout`   | Clears the cookie and revokes the session (`token_version`)                                         |
| PATCH  | `/auth/password` | `currentPassword`, `newPassword`; revokes other sessions                                            |
| GET    | `/auth/me`       | `{ user: { id, name, role, phone, email, company: { id, name } \| null } }`; login returns the same |

### Super Admin

| Method | Path                                  | Notes                                                                    |
| ------ | ------------------------------------- | ------------------------------------------------------------------------ |
| GET    | `/admin/companies`                    | List companies                                                           |
| POST   | `/admin/companies`                    | Creates the company **and** its first Company Admin in one transaction   |
| GET    | `/admin/companies/:id`                | One company with its admin                                               |
| PATCH  | `/admin/companies/:id`                | Name, GST number, number prefix, `isActive` (false suspends every login) |
| PATCH  | `/admin/companies/:id/admin`          | The admin's name, phone, email, `isActive`                               |
| PATCH  | `/admin/companies/:id/admin-password` | Sets the admin's password and signs out their sessions                   |

### Company

| Method      | Path                          | Notes                                                                                                                                                                                                      |
| ----------- | ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET / PATCH | `/settings`                   | Company name, GST number, number prefix, `settings` (electricity rate, GST rate)                                                                                                                           |
| GET / POST  | `/vendors`                    | List (search by `q`), create                                                                                                                                                                               |
| GET         | `/vendors/:id`                | One vendor                                                                                                                                                                                                 |
| PATCH       | `/vendors/:id`                | Edit, or set `isActive: false` to retire it                                                                                                                                                                |
| GET / POST  | `/service-types`              | List, create                                                                                                                                                                                               |
| GET         | `/service-types/:id`          | One service type (for the editor)                                                                                                                                                                          |
| PATCH       | `/service-types/:id`          | Edit, or set `active: false`. No hard delete: old orders reference it.                                                                                                                                     |
| GET         | `/orders`                     | Filter by `status`, `vendorId`, `q`                                                                                                                                                                        |
| POST        | `/orders`                     | Vendor + items (service type, chosen options, quantity in). **Server computes prices.**                                                                                                                    |
| GET         | `/orders/:id`                 | With items and bill                                                                                                                                                                                        |
| POST        | `/orders/:id/start`           | received → processing                                                                                                                                                                                      |
| POST        | `/orders/:id/return`          | Quantity out per item → sets amounts, status `returned`, creates the bill. One transaction.                                                                                                                |
| POST        | `/orders/:id/cancel`          | `reason`; only before the order is returned                                                                                                                                                                |
| GET         | `/bills`                      | Filter `status=due\|paid\|voided`; voided bills are hidden otherwise                                                                                                                                       |
| GET         | `/bills/:id`                  | With items and payments                                                                                                                                                                                    |
| POST        | `/bills/:id/void`             | `reason`; refused once the bill has payments                                                                                                                                                               |
| DELETE      | `/bills/:billId/payments/:id` | Removes a payment recorded in error and restores the amount due                                                                                                                                            |
| POST        | `/bills/:id/payments`         | Amount, method (`cash`, `upi`, `bank`, `cheque`, `other`). Rejects an amount above what's due.                                                                                                             |
| GET         | `/daily-logs`                 | `from`, `to`                                                                                                                                                                                               |
| GET         | `/daily-logs/:date`           | One day, or `null` when nothing is logged                                                                                                                                                                  |
| PUT         | `/daily-logs/:date`           | Create or update that day's entry (upsert)                                                                                                                                                                 |
| GET         | `/dashboard`                  | `date` (defaults to today, IST) → `pendingOrders`, `amountToCollect`, `itemsProcessed[]` (per unit), `machineHours`, `electricityUnits`, `electricityCost`, `earnings`, `estimatedCost`, `estimatedProfit` |

## Paths, paging and sessions

- Every route is served under **`/api/v1`**; the two health checks are not, so platform probes can find them.
- List endpoints take `limit` (default 50, max 100) and `cursor` (the id of the last row of the previous page).
- The session cookie is `SameSite=Lax` and lasts 24 hours. It is revocable: `users.token_version` is checked on
  every request, so logout and a password change take effect immediately.
- Money is returned as exact decimal strings. Pieces and kilograms are never added together.

## Response format

The frontend's envelope helpers (`isSuccess`, `safeApiError`) expect every response to have one shape:

```json
{ "status_code": 200, "message": "OK", "data": {} }
```

- A global interceptor (`common/interceptors/envelope.interceptor.ts`) wraps successful responses.
- A global exception filter (`common/filters/http-exception.filter.ts`) returns errors in the same shape with a `fields` object for validation errors, e.g. `{ "status_code": 422, "message": "…", "fields": { "phone": "…" } }`.
- Field names inside `data` stay camelCase.

## Business rules

- **Pricing** lives in one pure function, `orders/pricing.ts` (the formula is in module-design.md), and has a unit test. The server loads the service type from the DB and **ignores any price the client sends**. It rejects chosen options that aren't in the service type.
- **Snapshots:** when an order is created, the chosen options, `unit_price` and `unit_cost` are copied onto the order item.
- **Status only moves forward:** received → processing → returned. Anything else returns 409.
- **Order and bill numbers** are per company, taken from `next_order_no` / `next_bill_no` with an atomic `UPDATE … RETURNING` inside the same transaction. That avoids duplicate numbers when two requests arrive at once.
- **Money** uses Prisma `Decimal` and is returned as a string.
- **GST:** `gst_amount` is set only when the company has a GST number. The rate is `settings.gstRate` (default 18).
- **Dates:** a business day is an IST day (`common/dates.ts`). Daily logs can't be entered for future days.
- **Returns:** quantity out can't exceed quantity in; every item of the order needs one.
- **Amount due** = bill total − sum of payments. A bill with nothing due counts as `paid`. Status is computed, not stored.

## Environment

```
DATABASE_URL=   # Supabase session pooler, port 5432 (app via @prisma/adapter-pg, and Prisma CLI)
JWT_SECRET=     # 32+ characters
WEB_ORIGIN=     # for CORS
PORT=
NODE_ENV=       # required, no default: 'production' turns on the Secure cookie and turns off /docs
TRUST_PROXY=    # proxy hops in front of the app; wrong value = one shared rate-limit bucket
DB_POOL_MAX=    # Postgres connections per instance
```

**Hosting requirement.** The session cookie is `SameSite=Lax`, so the PWA and the API must share a
registrable domain (`app.example.com` + `api.example.com`). Hosting them on unrelated domains needs
`SameSite=None; Secure` **and** CSRF protection, which this codebase does not have.

All variables are validated by `src/config/env.ts` on startup. On serverless hosting, `DATABASE_URL` becomes the transaction pooler (port 6543, `?pgbouncer=true`) and `DIRECT_URL` (port 5432) is added for the CLI (see note 4).

## Build order

All written (2026-09-19). The DB e2e tests (`test/tenant-isolation`, `test/order-flow`) run once `DATABASE_URL` is set.

Matches the frontend plan, so each module is built just before its screen:

1. ✅ Scaffold: Nest app (ESM, Vitest), env schema, Prisma config + schema + first migration, seed, PrismaService, envelope interceptor, exception filter, global pipe, Swagger, helmet, CORS
2. ✅ Auth: login, logout, me, guards, decorators, tenant-isolation e2e test
3. ✅ Super Admin: companies
4. ✅ Settings, vendors, service types
5. ✅ Orders + pricing function and its test
6. ✅ Billing: return → bill, payments
7. ✅ Daily logs
8. ✅ Dashboard

## Login

Users log in with a phone number **or** an email, plus a password. Most users will use a phone number.

- `users.phone` and `users.email` are both nullable and unique. A DB check constraint requires at least one of them; it's added by hand to the first migration because Prisma can't express it.
- Email is trimmed and lowercased before saving and before lookup. Phone is stored as 10 digits: spaces, dashes and a leading `+91` or `0` are removed.
- `POST /auth/login` takes `{ identifier, password }`. An identifier that contains `@` is looked up as an email; otherwise it's treated as a phone number.
- A failed login returns the same 401 whether the user doesn't exist or the password is wrong.
- Creating a company's first admin (`POST /admin/companies`) needs a phone, an email, or both.

## Decisions

1. **Login ID:** phone or email (see [Login](#login)).
2. **Order and bill numbers:** stored as per-company integers; shown with the company's
   optional `number_prefix` (`FN` → `FN-0001`, no prefix → `1`). The API returns the formatted
   string, so a search accepts `FN-0012`, `0012` or `12`.
3. **GST rate:** one rate per company, `settings.gstRate` (e.g. `18`).

## Sources

Checked 2026-09-19. Versions, dist-tags, peer dependencies and engines also confirmed with `npm view`.

| Package / topic                                                                 | URL(s)                                                                                                                                                                                                                                   |
| ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| NestJS 12 (ESM, Node minimums, Vitest/oxlint defaults, config, class-validator) | https://docs.nestjs.com/migration-guide ; `nest new` templates in `@nestjs/schematics` 12.0.3: https://github.com/nestjs/schematics/tree/master/src/lib/application/files                                                                |
| ValidationPipe, APP_GUARD, Swagger                                              | https://docs.nestjs.com/techniques/validation ; https://docs.nestjs.com/security/authentication ; https://docs.nestjs.com/openapi/introduction                                                                                           |
| `@nestjs/config` + zod                                                          | https://docs.nestjs.com/techniques/configuration#schema-validation ; https://standardschema.dev                                                                                                                                          |
| Auth (plain guard vs Passport), cookies, hashing                                | https://docs.nestjs.com/security/authentication ; https://docs.nestjs.com/recipes/passport ; https://docs.nestjs.com/techniques/cookies ; https://docs.nestjs.com/security/encryption-and-hashing ; https://www.npmjs.com/package/bcrypt |
| `@nestjs/throttler`, `helmet`                                                   | https://docs.nestjs.com/security/rate-limiting ; https://docs.nestjs.com/security/helmet                                                                                                                                                 |
| Vitest with Nest                                                                | https://docs.nestjs.com/recipes/swc#vitest                                                                                                                                                                                               |
| Prisma 7 vs 8 status                                                            | https://www.prisma.io/docs/prisma-orm/release-status ; https://github.com/prisma/prisma/releases                                                                                                                                         |
| Prisma 7 setup (config, generator, adapter, dotenv, ESM, seed)                  | https://www.prisma.io/docs/guides/upgrade-prisma-orm/v7 ; https://www.prisma.io/docs/orm/v7/prisma-schema/overview/generators ; https://www.prisma.io/docs/orm/v7/prisma-migrate/workflows/seeding                                       |
| Prisma + NestJS                                                                 | https://www.prisma.io/docs/guides/v7/frameworks/nestjs ; https://docs.nestjs.com/recipes/prisma                                                                                                                                          |
| Supabase + Prisma connections                                                   | https://supabase.com/docs/guides/database/prisma ; https://supabase.com/docs/guides/database/connecting-to-postgres ; https://www.prisma.io/docs/orm/v7/prisma-client/setup-and-configuration/databases-connections/pgbouncer            |
| TypeScript 7                                                                    | https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/ ; https://github.com/nestjs/nest-cli/issues/3479 ; https://github.com/nestjs/nest-cli/issues/3477                                                                   |
| Node 24 LTS, Corepack                                                           | https://nodejs.org/dist/index.json ; https://nodejs.org/docs/latest-v24.x/api/corepack.html                                                                                                                                              |

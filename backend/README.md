# ProcessNow API

> **ProcessNow API** — the NestJS backend for [ProcessNow](../README.md), order, billing and daily-production tracking for job-work businesses. Multi-company from day one: a new company is a row, not a deploy.

[![Version](https://img.shields.io/badge/version-0.0.1-blue.svg)](package.json)
[![NestJS](https://img.shields.io/badge/NestJS-12.x%20ESM-E0234E.svg?logo=nestjs)](https://nestjs.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0.3-3178C6.svg?logo=typescript)](https://www.typescriptlang.org)
[![Prisma](https://img.shields.io/badge/Prisma-7.10-2D3748.svg?logo=prisma)](https://www.prisma.io)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Supabase-4169E1.svg?logo=postgresql)](https://supabase.com)
[![Private](https://img.shields.io/badge/access-private-lightgrey.svg)](#)

> ⚠️ **Not running yet.** The code for all eight build-order steps is written, but **nothing here has ever run against a real database** — `DATABASE_URL` has not been pointed at a Supabase project, so the DB-backed e2e tests still skip and no migration has been applied anywhere. There is **no deployment**: hosting is the one open decision in the plans. Treat everything below as the intended shape, verified by reading, not by running.

| #   | Build-order step                                                                                                                                                                           | Code    | Verified against a DB    |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------- | ------------------------ |
| 1   | Scaffold — Nest app (ESM, Vitest), env schema, Prisma config + schema + first migration, seed, `PrismaService`, envelope interceptor, exception filter, global pipe, Swagger, helmet, CORS | written | no                       |
| 2   | Auth — login, logout, me, guards, decorators, tenant-isolation e2e test                                                                                                                    | written | no                       |
| 3   | Super Admin — companies                                                                                                                                                                    | written | no                       |
| 4   | Settings, vendors, service types                                                                                                                                                           | written | no                       |
| 5   | Orders + the pricing function and its test                                                                                                                                                 | written | pricing unit test passes |
| 6   | Billing — return → bill, payments                                                                                                                                                          | written | no                       |
| 7   | Daily logs                                                                                                                                                                                 | written | no                       |
| 8   | Dashboard                                                                                                                                                                                  | written | no                       |

**First run after this commit:** point `DATABASE_URL` at a Supabase project, `yarn migrate:deploy`, `yarn prisma db seed`, then `yarn test:e2e` — that is the first time `test/tenant-isolation.e2e-spec.ts` and `test/order-flow.e2e-spec.ts` execute at all.

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Available Scripts](#available-scripts)
- [Project Structure](#project-structure)
- [Architecture](#architecture)
- [Feature Modules](#feature-modules)
- [Code Style & Conventions](#code-style--conventions)
- [Quality Gates](#quality-gates)
- [Deploy](#deploy)
- [Contributing](#contributing)
- [Reference](#reference)

---

## Overview

A single NestJS service over one Supabase PostgreSQL database. Every business row belongs to a company, and the company is taken from the caller's session token — never from the request. That one rule is what lets the system go from two companies to ten or more without an architecture change.

**Who calls it:** two clients, both in [`frontend/`](../frontend).

| Client                      | Role                                                                                       | Routes it uses                                                                              |
| --------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------- |
| **Company Admin workspace** | The single login per company — service types, vendors, orders, bills, daily log, dashboard | `/settings`, `/vendors`, `/service-types`, `/orders`, `/bills`, `/daily-logs`, `/dashboard` |
| **Super Admin console**     | Creates companies and their first admin                                                    | `/admin/companies`                                                                          |

Vendors bring material and receive goods and a bill, but **have no login**. Staff roles, vendor logins and a full Super Admin panel are deliberately out of scope.

**Key capabilities:**

- Cookie-based authentication with a 10-digit mobile number or an email, two roles, and revocable sessions
- Company-scoped CRUD for vendors and service types, with per-company pricing held as data
- Orders with **server-side pricing** — the client never sends a price — and per-item snapshots
- The return flow in one transaction: quantities out, line amounts, order status, and the bill
- Bills with computed due/paid status, payments under a row lock, and voiding
- A daily log of machine hours and electricity units, one entry per company per day
- A dashboard aggregating one IST business day: pending orders, amount to collect, items processed per unit, machine hours, electricity cost, earnings, estimated cost and profit
- One response envelope, one error shape, numbered paging with totals, and Swagger outside production

---

## Tech Stack

Versions checked 2026-09-19 against the official docs, with the reasoning and sources in [backend-plan.md](../docs/backend-plan.md#stack). Pinned with `^` ranges (Prisma and TypeScript tighter) and a committed lockfile.

| Category            | Choice                                           | Notes                                                                             |
| ------------------- | ------------------------------------------------ | --------------------------------------------------------------------------------- |
| **Runtime**         | Node                                             | 24 LTS (24.21) — `.nvmrc`, enforced via `engines`                                 |
| **Package manager** | Yarn (Berry) via Corepack                        | 4.18, `packageManager` pin                                                        |
| **Language**        | TypeScript                                       | **6.0.3, not 7** — see below                                                      |
| **Framework**       | NestJS                                           | 12, **ESM** (`"type": "module"`, `"module": "nodenext"`)                          |
| **HTTP**            | `@nestjs/platform-express`                       | Express 5                                                                         |
| **Config**          | `@nestjs/config` + zod 4                         | env schema as `validationSchema`; bad env stops the boot                          |
| **ORM**             | Prisma                                           | **7.10, not the 8 RC** — see below; client generated into `src/generated/prisma/` |
| **DB driver**       | `@prisma/adapter-pg` + `pg`                      | driver adapter, pool sized by `DB_POOL_MAX`                                       |
| **Database**        | Supabase PostgreSQL                              | Postgres host only — **no Supabase Auth, no RLS**                                 |
| **Validation**      | class-validator + class-transformer              | global `ValidationPipe`, `whitelist` + `forbidNonWhitelisted`                     |
| **Auth**            | `@nestjs/jwt`, `bcrypt` 6, `cookie-parser`       | plain global guard — **no Passport**                                              |
| **API docs**        | `@nestjs/swagger`                                | `/docs` (outside the version prefix), non-production only                         |
| **Security**        | `helmet`, `@nestjs/throttler`                    | CORS limited to `WEB_ORIGIN` with credentials                                     |
| **Testing**         | Vitest 4 + supertest                             | `@vitest/coverage-v8`                                                             |
| **Linting**         | ESLint 10 (flat config) + typescript-eslint 8.70 | backend only; the frontend stays on ESLint 9                                      |
| **Formatting**      | Prettier                                         | 3.x                                                                               |
| **Git hooks**       | Husky + lint-staged + CommitLint                 | configured at the **repo root**                                                   |

Two pins that look out of date and are not:

- **TypeScript 6.0.3, not 7.0.** TypeScript 7 is released but has no programmatic compiler API until 7.1. `@nestjs/cli` 12 bundles `typescript ~6.0.2` and does not run on 7 (nest-cli #3477, #3479), and `typescript-eslint` 8.70 requires `typescript <6.1.0`. Move to 7 when both support it.
- **Prisma 7.10, not 8.** npm's `latest` tag for `prisma` points at `8.0.0-rc.15`, which Prisma itself calls a release candidate whose API may still change, with GA expected October 2026. `@prisma/client` and `@prisma/adapter-pg` are stable at 7.10, so all three stay there.

Because Nest 12 is ESM, **relative imports carry a `.js` extension** — `import { AppModule } from './app.module.js'`, even from a `.ts` file.

---

## Prerequisites

| Requirement    | Minimum | Notes                                                                              |
| -------------- | ------- | ---------------------------------------------------------------------------------- |
| **Node.js**    | 24.15   | `engines: ">=24.15 <25"`; `.nvmrc` pins 24. The Nest 12 CLI generators need 24.15+ |
| **Yarn**       | 4.18    | Yarn Berry via Corepack (`packageManager` pin); run `npm install -g corepack` once |
| **PostgreSQL** | 15+     | A Supabase project. **Open:** none is provisioned yet                              |
| **Git**        | 2.x     | Required for the Husky hooks at the repo root                                      |

Optional, skipped with a warning if absent: **gitleaks** and **semgrep** power the pre-commit scans — `brew install gitleaks`, `pip install semgrep`.

---

## Getting Started

```bash
# 1. Install dependencies (postinstall runs `prisma generate`)
yarn install

# 2. Install the repo-root git hooks, once per clone
yarn --cwd .. install

# 3. Configure environment
cp .env.example .env              # fill DATABASE_URL, JWT_SECRET, SEED_PASSWORD

# 4. Create the schema, then load development data
yarn migrate:deploy               # or: yarn prisma migrate dev
yarn prisma db seed               # the only way to seed — migrate dev no longer does it

# 5. Start the dev server
yarn start:dev                    # http://localhost:1010, docs at /docs
```

Seeded logins (password = `SEED_PASSWORD`): super admin `9000000000`, FuseNow admin `9000000001`, CrushNow admin `9000000002`.

For a company that looks lived-in, `yarn seed:demo` adds **Shree Ganesh Fusing Works** (admin Rakesh Patel, `9876500001` / `rakesh@shreeganesh.demo`, password = `SEED_PASSWORD`): two months of orders in every state, GST bills, part and full payments, a voided bill, three accounts, expenses and daily logs — about ₹5 lakh billed a month, priced with the API's own pricing functions. It leaves an existing demo company alone; `yarn seed:demo --reset` deletes it and seeds it again. Today's daily log is left empty on purpose, so the dashboard's prompt shows.

> Steps 4 and 5 have not been run against a real database yet. Expect to fix things the first time.

---

## Environment Variables

Every variable is validated by `src/config/env.ts` (zod, passed to `ConfigModule` as `validationSchema`), so a bad or missing value stops the app at boot rather than at the first request. Copy `.env.example` → `.env`.

**Required:**

| Variable       | Description                                                                                                                                                                      |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL` | Postgres URL — the Supabase **session** pooler, port 5432. Used by the app _and_ the Prisma CLI                                                                                  |
| `JWT_SECRET`   | 32+ characters — `openssl rand -base64 48`                                                                                                                                       |
| `WEB_ORIGIN`   | Frontend origin, for CORS with credentials. Must share a registrable domain with this API                                                                                        |
| `NODE_ENV`     | `development \| test \| production`. **No default on purpose**: `production` is what turns on the `Secure` cookie flag and turns off Swagger, and a silent default would drop it |

**Optional:**

| Variable        | Default | Description                                                                                                     |
| --------------- | ------- | --------------------------------------------------------------------------------------------------------------- |
| `PORT`          | `1010`  | Listen port                                                                                                     |
| `TRUST_PROXY`   | `0`     | Proxy hops in front of the app (Express `trust proxy`). Wrong value = every client shares one rate-limit bucket |
| `DB_POOL_MAX`   | `10`    | Postgres connections per instance; divide the database's cap by replica count                                   |
| `SEED_PASSWORD` | —       | Seed only: the password given to every seeded user. 8+ characters                                               |

### The Supabase connection rule

The API is a **long-running server**, so it follows Supabase's server-based setup: one `DATABASE_URL` pointing at the Supavisor **session pooler (port 5432)**, used by both the app (through `@prisma/adapter-pg`) and the Prisma CLI. The direct connection is also on 5432 but is IPv6-only unless the project buys the IPv4 add-on, so the session pooler is the default.

**TLS is not automatic.** `node-postgres` only negotiates TLS when the URL asks for it, so the connection string must end in `?sslmode=require` — without it the connection is attempted in the clear. If certificate verification fails on your network, `sslmode=no-verify` still encrypts but skips the chain check; prefer fixing the chain.

The **transaction pooler (port 6543) is only for serverless hosting.** If the API ends up serverless — still open — switch `DATABASE_URL` to port 6543 with `?pgbouncer=true` (transaction mode has no prepared statements) and add a `DIRECT_URL` on 5432 for the CLI in `prisma.config.ts`.

---

## Available Scripts

| Script                                      | What it does                                                                 |
| ------------------------------------------- | ---------------------------------------------------------------------------- |
| `yarn start:dev`                            | Watch mode on port 1010                                                      |
| `yarn start` / `start:debug` / `start:prod` | Run once / with the inspector / from `dist/`                                 |
| `yarn build`                                | `nest build`                                                                 |
| `yarn typecheck`                            | `tsc --noEmit`                                                               |
| `yarn lint` / `lint:fix`                    | ESLint over `src test prisma`                                                |
| `yarn format` / `format:check`              | Prettier                                                                     |
| `yarn test` / `test:watch` / `test:cov`     | Vitest unit specs (`*.spec.ts`)                                              |
| `yarn test:e2e`                             | Vitest e2e specs (`*.e2e-spec.ts`); DB specs **skip** without `DATABASE_URL` |
| `yarn migrate:deploy`                       | `prisma migrate deploy` — the release step                                   |
| `yarn prisma migrate dev --name <x>`        | New migration after a schema change                                          |
| `yarn prisma db seed`                       | Run `prisma/seed.ts`                                                         |
| `yarn seed:demo [--reset]`                  | Run `prisma/seed-demo.ts`: the demo company with two months of history       |

There is no `yarn verify` here; the root `yarn verify` covers the frontend only. Run `yarn typecheck && yarn lint && yarn test` before pushing backend changes.

---

## Project Structure

```
backend/
  prisma.config.ts           dotenv, schema + migrations path, seed command, DATABASE_URL for the CLI
  vitest.config.ts           unit tests (*.spec.ts)
  vitest.config.e2e.ts       e2e tests (*.e2e-spec.ts)
  Dockerfile
  prisma/
    schema.prisma
    migrations/              incl. two hand-written CHECK constraints Prisma can't express
    seed.ts                  super admin + FuseNow + CrushNow with sample service types
  src/
    main.ts                  bootstrap — trust proxy, CORS, Swagger, keep-alive timeouts
    setup-app.ts             prefix, helmet, cookie-parser, global pipe/interceptor/filter
    app.module.ts            modules + the three global guards
    generated/prisma/        Prisma client output — git-ignored, made by `prisma generate`
    config/env.ts            zod env schema
    prisma/                  prisma.module.ts (@Global), prisma.service.ts
    common/
      guards/                jwt-auth.guard.ts, roles.guard.ts
      decorators/            current-user.decorator.ts (@CurrentUser, @CompanyId), roles, public
      interceptors/          envelope.interceptor.ts
      filters/               http-exception.filter.ts — incl. the Prisma error mapping
      dto/list-query.dto.ts  shared paging, search and sort
      types/auth-user.ts
      pricing.ts  dates.ts  identifier.ts  company-settings.ts  option-groups.ts  validators.ts
    auth/  companies/  settings/  vendors/  service-types/
    orders/  billing/  daily-logs/  dashboard/  health/
  test/                      *.e2e-spec.ts + helpers.ts, setup-env.ts
```

Every feature module holds the same four things: `<name>.module.ts`, `<name>.controller.ts`, `<name>.service.ts` and `dto/`. See [`docs/conventions/modules.md`](docs/conventions/modules.md).

### Dependency direction

```
dashboard → billing → orders → service-types / vendors → companies
```

A module exports its service only when another module needs it. `PrismaModule` is `@Global()`, so nothing imports it. Logic that would close a cycle belongs in `src/common/` as a pure function.

---

## Architecture

### Request flow

```
request
  → /api/v1 prefix          (health checks excluded, so platform probes find them)
  → helmet, cookie-parser, CORS (WEB_ORIGIN, credentials)
  → JwtAuthGuard            global; skipped only on @Public() routes
  → RolesGuard              enforces @Roles(['company_admin' | 'super_admin'])
  → ThrottlerGuard          300/min floor; login is tightened to 5/min
  → ValidationPipe          whitelist + forbidNonWhitelisted + transform → 422 with `fields`
  → controller              thin: @CompanyId() + DTO in, one service call, result out
  → service                 business logic; every query filtered by companyId
  → PrismaService           PrismaClient + PrismaPg adapter
  → EnvelopeInterceptor     wraps the result as { status_code, message, data }
  → HttpExceptionFilter     shapes every error, maps Prisma codes
```

All global wiring lives in `src/setup-app.ts`, which `main.ts` **and the e2e tests** both call — so a test exercises the same pipe, interceptor and filter as the deployed app.

### Multi-company scoping

The rule this codebase exists to get right. Scoping happens **in NestJS**, not in Supabase Row Level Security.

1. The JWT carries `{ userId, role, companyId, tokenVersion }`.
2. `@CompanyId()` reads it off `req.user`; it is **never** read from the body, query or URL.
3. Every service method takes `companyId` as its first argument.
4. Every query filters by it — `findFirst({ where: { id, companyId } })` or `findUniqueOrThrow({ where: { id, companyId } })`, **never** a bare `findUnique({ where: { id } })`.
5. Another company's record returns **404, not 403**, so the API never confirms it exists.
6. `test/tenant-isolation.e2e-spec.ts` proves it: Company A's admin asking for Company B's order gets a 404.

Full detail and the exact Prisma call patterns: [`docs/conventions/multi-tenancy.md`](docs/conventions/multi-tenancy.md).

### The response envelope

One shape for every response, because the frontend's `isSuccess` and `safeApiError` helpers depend on it. Fields inside `data` are camelCase; **money is an exact decimal string**, never a float.

```json
{
  "status_code": 200,
  "message": "OK",
  "data": { "id": "018f…", "total": "450.00" }
}
```

Errors drop `data` and add a flat `fields` map for validation failures:

```json
{
  "status_code": 422,
  "message": "Validation failed",
  "fields": { "items.0.qtyOut": "Can't return more than 15 received" }
}
```

Prisma errors are mapped rather than leaked: `P2002` → 409, `P2025` → 404, `P2003` → 409, `P2000` → 422, `P2028` → 503. Anything unrecognised is a 500 with `"Internal server error"` and a log line carrying the method, path, `userId` and `companyId`. See [`docs/conventions/api-layer.md`](docs/conventions/api-layer.md).

### Transactions

Every multi-step write is one `prisma.$transaction`:

| Flow                           | Steps                                                                        |
| ------------------------------ | ---------------------------------------------------------------------------- |
| `OrdersService.create`         | increment `next_order_no` (row lock) → create order + items                  |
| `OrdersService.returnOrder`    | conditional status update → per-item `qtyOut` + `amount` → create bill       |
| `BillingService.recordPayment` | `SELECT … FOR UPDATE` on the bill → create payment → increment `amount_paid` |
| `CompaniesService.create`      | nested create — company and its first admin, or neither                      |

A service called from inside another module's transaction takes the `Prisma.TransactionClient` first and never opens its own. Order and bill numbers come from per-company counters incremented with `UPDATE … RETURNING` inside the same transaction, which is what stops two simultaneous requests getting the same number.

---

## Feature Modules

| Module            | Scope                                                                                                              |
| ----------------- | ------------------------------------------------------------------------------------------------------------------ |
| **Auth**          | Login by mobile or email, logout, `me`, password change; JWT in an httpOnly cookie; revocation via `token_version` |
| **Companies**     | Super Admin only — list companies, create a company **and** its first admin in one transaction                     |
| **Settings**      | Company name, GST number, and the `settings` JSON (electricity rate, GST rate)                                     |
| **Vendors**       | List with search, create, edit. No delete                                                                          |
| **Service types** | Per-company pricing config — unit, base price, base cost, `bill_on`, option groups. Deactivated, never deleted     |
| **Orders**        | Create with server-side pricing and snapshots, list with filters, detail, start, return, cancel                    |
| **Billing**       | Bill created from a returned order, computed due/paid status, payments under a row lock, voiding                   |
| **Daily logs**    | One entry per company per day — machine hours, electricity units. No future dates                                  |
| **Dashboard**     | Read-only aggregates for one IST business day across the modules above                                             |
| **Health**        | `/health/live` (process only) and `/health/ready` (database), both unprefixed and public                           |

The pricing formula, the snapshot rule, forward-only status, numbering, GST and amount due are all in [`docs/conventions/business-rules.md`](docs/conventions/business-rules.md).

### Endpoints

Everything is served under **`/api/v1`**; the two health checks are not, so platform probes can find them. List endpoints take `page` (default 1) and `pageSize` (15, 25, 50 or 100; default 15) and return `{ items, total, page, pageSize }`. Company routes require the `company_admin` role and are scoped to that admin's company.

| Method      | Path                  | Role          | Notes                                                                                 |
| ----------- | --------------------- | ------------- | ------------------------------------------------------------------------------------- |
| GET         | `/health/live`        | public        | Process is up; touches nothing                                                        |
| GET         | `/health/ready`       | public        | Can reach the database; 503 when it can't                                             |
| POST        | `/auth/login`         | public        | `identifier` (10-digit mobile or email) + `password` → sets the cookie. 5/min         |
| POST        | `/auth/logout`        | public        | Clears the cookie and revokes the session                                             |
| GET         | `/auth/me`            | any           | `{ user: { id, name, role, company } }` — the same shape login returns                |
| PATCH       | `/auth/password`      | any           | `currentPassword`, `newPassword`; revokes other sessions                              |
| GET / POST  | `/admin/companies`    | super_admin   | Create makes the company **and** its first admin in one transaction                   |
| GET / PATCH | `/settings`           | company_admin | Name, GST number, `settings` (electricity rate, GST rate)                             |
| GET / POST  | `/vendors`            | company_admin | List (search by `q`), create                                                          |
| PATCH       | `/vendors/:id`        | company_admin | Edit                                                                                  |
| GET / POST  | `/service-types`      | company_admin | List, create                                                                          |
| GET / PATCH | `/service-types/:id`  | company_admin | Read, edit, or `active: false`. No hard delete — old orders reference it              |
| GET         | `/orders`             | company_admin | Filter by `status`, `vendorId`, `q` (vendor name or order number)                     |
| POST        | `/orders`             | company_admin | Vendor + items. **The server computes every price**                                   |
| GET         | `/orders/:id`         | company_admin | With items and bill                                                                   |
| POST        | `/orders/:id/start`   | company_admin | received → processing                                                                 |
| POST        | `/orders/:id/return`  | company_admin | Quantity out per item → amounts, status `returned`, creates the bill. One transaction |
| POST        | `/orders/:id/cancel`  | company_admin | `reason`; only before the order is returned                                           |
| GET         | `/bills`              | company_admin | Filter `status=due \| paid \| voided`                                                 |
| GET         | `/bills/:id`          | company_admin | With items and payments                                                               |
| POST        | `/bills/:id/void`     | company_admin | `reason`; refused once the bill has payments                                          |
| POST        | `/bills/:id/payments` | company_admin | `amount`, `method`. Rejects an amount above what's due                                |
| GET         | `/daily-logs`         | company_admin | `from`, `to`                                                                          |
| PUT         | `/daily-logs/:date`   | company_admin | Create or update that day's entry                                                     |
| GET         | `/dashboard`          | company_admin | `date` (defaults to today, IST) → the day's figures                                   |

---

## Code Style & Conventions

Detailed, area-specific patterns live in [`docs/conventions/`](docs/conventions/README.md). Highlights:

- **`companyId` from the token, never the request.** Every query filters by it; a foreign record is a 404.
- **Thin controllers** — route, `@CompanyId()`, DTO, one service call. No Prisma, no logic, no `try/catch`.
- **Services take `companyId` first**; pure logic (pricing, dates, identifiers) lives in `src/common/` with no Nest or Prisma imports.
- **Money is `Decimal`** end to end and leaves the API as a string. Pieces and kilograms are never added together.
- **Snapshot anything pricing reads** onto the order item — `unitPrice`, `unitCost`, `selectedOptions`, `billOn`.
- **Kebab-case files**, camelCase code, snake_case Postgres bridged by Prisma `@map`/`@@map`.
- **ESM**: relative imports end in `.js`.
- **`@IsOptional()` is banned** — use `@Optional()` from `src/common/validators.ts`, which doesn't skip validation on an explicit `null`.
- **Comments** are for business logic and non-obvious trade-offs only — concise, and never a restatement of the code.

[`CLAUDE.md`](CLAUDE.md) is the authoritative source of truth for conventions.

---

## Quality Gates

Husky lives at the **repo root** and is installed by `yarn install` there, not here.

1. **Gitleaks** — secrets scan on staged changes (skipped with a warning if not installed)
2. **Semgrep** — static analysis on staged `.ts` files (skipped if not installed)
3. **lint-staged** — ESLint `--fix` + Prettier on staged code
4. **CommitLint** (`commit-msg`) — Conventional Commits
5. **pre-push** — typecheck, tests and build

> ⚠️ **Gap:** the root `lint-staged` globs and the `pre-push` hook currently target `frontend/` only, so backend files commit and push **without** lint, typecheck or tests. Until that is fixed, run `yarn typecheck && yarn lint && yarn test` here by hand.

---

## Deploy

**Hosting is undecided** — the one open question in [module-design.md](../docs/module-design.md#open-decisions). It is not a detail: it decides the Supabase connection mode (session pooler for a long-running server, transaction pooler + `DIRECT_URL` for serverless) and it must satisfy the cookie constraint below.

```bash
docker build -t process-now-api .
yarn migrate:deploy          # release step: once per deploy, not per replica
```

**Requirements of whatever target is chosen:**

| Requirement                                                           | Why                                                                                                                                                                                                                                         |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Shared registrable domain** — `app.example.com` + `api.example.com` | The session cookie is `SameSite=Lax`. On unrelated domains the browser accepts the login cookie and never sends it back, so every later request 401s. `SameSite=None; Secure` would need CSRF protection, which this codebase does not have |
| **`TRUST_PROXY`** set to the number of proxies in front of the app    | At 0 behind a load balancer every client looks like the proxy, so five failed logins lock out everyone                                                                                                                                      |
| **`DB_POOL_MAX`** = the database's connection cap ÷ replicas          | The pooler will refuse connections otherwise                                                                                                                                                                                                |
| **Readiness → `/health/ready`, liveness → `/health/live`**            | Pointing the restart probe at the database check turns a brief Supabase blip into a restart of every replica                                                                                                                                |
| **A shared throttler store** before a second replica                  | The rate-limit store is per-instance today, so N replicas mean N× the limit                                                                                                                                                                 |
| **`migrate:deploy` as a release step**                                | Running it per replica races the migration                                                                                                                                                                                                  |

**Security headers and cookie flags to confirm on the deployed origin.** `helmet()` sets several of these by default and `NODE_ENV=production` sets the cookie flags, but none has been checked against a real response yet, and CSP and Permissions-Policy in particular need deliberate values:

| Header / flag                                 | Note                                                                             |
| --------------------------------------------- | -------------------------------------------------------------------------------- |
| `Content-Security-Policy`                     | Needs a deliberate policy; helmet's default is restrictive and can break `/docs` |
| `Strict-Transport-Security`                   | HTTPS only — set at the edge if TLS terminates there                             |
| `X-Frame-Options` / `frame-ancestors`         | The API is never framed                                                          |
| `X-Content-Type-Options: nosniff`             | helmet default                                                                   |
| `Referrer-Policy`                             | helmet default                                                                   |
| `Permissions-Policy`                          | Not set by helmet's defaults                                                     |
| `X-Robots-Tag: noindex`                       | The API and `/docs` must not be indexed                                          |
| Cookie `httpOnly` + `Secure` + `SameSite=Lax` | `Secure` depends on `NODE_ENV=production` — verify it on a real response         |

Swagger is served at `/docs` — outside the version prefix, like the health checks, so a bookmark survives a version bump — and **only outside production**: the document describes every route, DTO and validation rule, including how to create an admin.

---

## Contributing

### Branch naming

**Still open** — no convention has been agreed. Until one is, use a short descriptive branch name and say so in the PR.

### Conventional Commits

Enforced by CommitLint + Husky at the repo root.

```
type(scope): short description

[optional body]

[optional footer]
```

Types: `feat` `fix` `docs` `style` `refactor` `perf` `test` `build` `ci` `chore` `revert`.
Scopes: `frontend` `backend` `docs` `repo` `deps`. Subject in sentence case, header ≤ 100 characters.

```
feat(backend): add the bill void endpoint
fix(backend): scope the bill lookup to the signed-in company
```

### Pull request process

1. Branch from the default branch and pull first.
2. Make changes following [`CLAUDE.md`](CLAUDE.md) and [`docs/conventions/`](docs/conventions/README.md).
3. Run the checks the hooks don't cover here: `yarn typecheck && yarn lint && yarn test`.
4. Commit in the conventional format, then open a PR using [the template](../.github/PULL_REQUEST_TEMPLATE.md).

### Code owners

All files require approval from at least one code owner.

| Owner | GitHub handle |
| ----- | ------------- |
| Abdul | @devqabdul    |

---

## Reference

- [`CLAUDE.md`](CLAUDE.md) — authoritative backend conventions (source of truth for _how_).
- [`docs/conventions/`](docs/conventions/README.md) — detailed, area-specific patterns.
- [`../docs/problem-statement.md`](../docs/problem-statement.md) — what this solves, and what is deliberately out of scope.
- [`../docs/module-design.md`](../docs/module-design.md) — the data model, the pricing model, dashboard queries, decisions and the open question.
- [`../docs/backend-plan.md`](../docs/backend-plan.md) — stack with pinned versions and sources, module structure, every endpoint, business rules, build order.
- [`../docs/frontend-plan.md`](../docs/frontend-plan.md) — what the frontend expects from this API.

---

<div align="center">
  <sub>ProcessNow — order, billing and daily-production tracking for job-work businesses.</sub>
</div>

# Testing and environment

Vitest, not Jest: `nest new` for an ESM project scaffolds Vitest. Vitest 5 is out, but the Nest 12
scaffold still generates 4.1 — move when the schematics do.

## Two configs

| Config                 | Matches            | Setup               | Notes                                                                     |
| ---------------------- | ------------------ | ------------------- | ------------------------------------------------------------------------- |
| `vitest.config.ts`     | `**/*.spec.ts`     | none                | Pure unit tests. `yarn test`                                              |
| `vitest.config.e2e.ts` | `**/*.e2e-spec.ts` | `test/setup-env.ts` | `fileParallelism: false`, 30 s test / 60 s hook timeouts. `yarn test:e2e` |

E2E files run **one at a time** because they share one database. `globals: true` in both, so `describe`,
`it` and `expect` need no import.

## What must have a test

Two things are not optional:

- **The pricing function** (`src/common/pricing.spec.ts`). It decides what a vendor is charged. The
  cases that must stay: FuseNow's 15 pieces with front and side = 450, CrushNow's 100 kg in / 95 kg out
  billed on out = 760, exact decimals with half-up rounding, and GST added only when a rate is given.
- **Tenant isolation** (`test/tenant-isolation.e2e-spec.ts`). Add a case whenever you add a
  company-scoped resource. See [`multi-tenancy.md`](./multi-tenancy.md#the-test-that-proves-it).

Everything else is judgement. What exists today: `dates.spec.ts` and `identifier.spec.ts` for the other
pure helpers, `guards.e2e-spec.ts` for auth and validation behaviour, `app.e2e-spec.ts` for the envelope
and error shapes, and `order-flow.e2e-spec.ts` for the order → return → bill → payment path plus
snapshotting, cancelling, voiding, password change, paging and concurrent numbering.

Unit specs sit **beside their subject**; e2e specs live in `test/`.

## E2E setup

Specs build the app through `createApp()` in `test/helpers.ts`, which compiles `AppModule` and calls the
same `setupApp()` that `main.ts` uses — so a test exercises the real prefix, pipe, interceptor, filter
and guards. Hit paths through `api('/orders')`, which prepends `/api/v1`, and use
`request.agent(app.getHttpServer())` so the session cookie persists across requests.

```ts
describe.skipIf(!HAS_DB)('tenant isolation (e2e, DB)', () => {
  let app: INestApplication;
  beforeAll(async () => {
    app = await createApp();
    /* … */
  });
  afterAll(async () => {
    await deleteCompanies(prisma, ids);
    await app.close();
  });
});
```

Rules:

- **`describe.skipIf(!HAS_DB)` on every spec that touches the database.** `test/setup-env.ts` sets
  `E2E_HAS_DB` from `DATABASE_URL` and substitutes a placeholder URL so the module still compiles — the
  no-DB specs (guards, validation, envelope) run on a bare clone.
- **Clean up after yourself.** `deleteCompanies(prisma, ids)` in `afterAll` deletes children first.
  Tests share one database.
- **Don't collide with the seed.** `randomPhone()` generates an `8…` number; seeded users are
  `9000000000–2`.
- Build fixtures straight through Prisma (`createCompany`), not through the API — you're testing the
  route under test, not the setup.
- Tests hash passwords at bcrypt cost 4 to stay fast. Production code never lowers it.

> **Status:** the DB-backed e2e specs have **never run** — no `DATABASE_URL` has been configured. The
> first run against a real Supabase project is also their first execution.

## Environment variables

Validated by `src/config/env.ts` (zod) and passed to `ConfigModule` as `validationSchema`, so a bad or
missing value stops the app at boot rather than at the first request. Copy `.env.example` → `.env`.

**Required:**

| Variable       | Validation                          | Description                                                                                                                                 |
| -------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL` | `postgres` / `postgresql` URL       | The Supabase **session** pooler, port 5432. Used by the app _and_ the Prisma CLI                                                            |
| `JWT_SECRET`   | 32+ characters                      | `openssl rand -base64 48`                                                                                                                   |
| `WEB_ORIGIN`   | URL                                 | Frontend origin, for CORS with credentials                                                                                                  |
| `NODE_ENV`     | `development \| test \| production` | **No default on purpose**: `production` is what turns on the `Secure` cookie flag and turns off Swagger, and a silent default would drop it |

**Optional:**

| Variable        | Default | Description                                                                             |
| --------------- | ------- | --------------------------------------------------------------------------------------- |
| `PORT`          | `1010`  | Listen port                                                                             |
| `TRUST_PROXY`   | `0`     | Proxy hops in front of the app. Wrong value = every client shares one rate-limit bucket |
| `DB_POOL_MAX`   | `10`    | Postgres connections per instance; divide the database's cap by replica count           |
| `SEED_PASSWORD` | —       | Seed only: the password given to every seeded user. 8+ characters                       |

**`.env` is not loaded automatically** in Prisma 7 — three separate loaders cover the three contexts:
`@nestjs/config` for the app, `dotenv` in `prisma.config.ts` for the CLI, and `test/setup-env.ts` for
e2e tests. Adding a variable means adding it to `env.ts`, `.env.example` and both tables above.

## Git hooks

Husky lives at the **repo root** and is installed by `yarn install` there, not in `backend/`.

| Hook       | Runs                                                                                                |
| ---------- | --------------------------------------------------------------------------------------------------- |
| pre-commit | gitleaks (secrets), semgrep (static analysis), then lint-staged — ESLint + Prettier on staged files |
| commit-msg | commitlint — Conventional Commits, scope `backend`, subject in sentence case, header ≤ 100 chars    |
| pre-push   | typecheck, tests and build                                                                          |

gitleaks and semgrep are optional locally: the hook warns and skips if they aren't installed
(`brew install gitleaks`, `pip install semgrep`).

> ⚠️ **Gap:** the root `lint-staged` globs and the `pre-push` hook currently target `frontend/` only, so
> backend files commit and push **without** lint, typecheck or tests. Until that is fixed, run
> `yarn typecheck && yarn lint && yarn test` here by hand before pushing.

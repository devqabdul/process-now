# Backend Docker image

Multi-stage build: Yarn 4 install → `prisma generate` + `nest build` → a runtime
stage with production dependencies only, running `node dist/main.js` as the `node`
user under `dumb-init`.

> **Unverified.** This image has never been built: the Docker daemon was unreachable
> on the machine that wrote the Dockerfile. The install commands and the built
> `dist/` were checked by running them outside Docker — the app boots against a
> production-only dependency set and maps `/health/live` — but the layer order and
> the final image are untested. Build it once before trusting it.

## Build and run

```bash
# from backend/
docker build -t process-now-backend .
docker run --rm -p 1010:1010 \
  -e DATABASE_URL='postgresql://…' \
  -e JWT_SECRET="$(openssl rand -base64 48)" \
  -e WEB_ORIGIN='http://localhost:9090' \
  -e NODE_ENV=production \
  process-now-backend
```

No build args. Everything is runtime configuration — see [`.env.example`](../.env.example)
for the full list (`DATABASE_URL`, `JWT_SECRET`, `WEB_ORIGIN`, `PORT`, `NODE_ENV`,
`TRUST_PROXY`, `DB_POOL_MAX`).

Or the whole stack with a local Postgres, from the repo root:
`docker compose up --build`.

## Migrations are a release step

`prisma migrate deploy` is **not** run when the container starts — every replica
would race the others for the migration lock. Run it once per release, before the
new image takes traffic. The runtime image has no Prisma CLI (it is a
devDependency), so use the `build` stage, which does:

```bash
docker build --target build -t process-now-backend-migrate .
docker run --rm -e DATABASE_URL='postgresql://…' process-now-backend-migrate yarn migrate:deploy
```

Locally: `docker compose --profile migrate run --rm migrate`.

## Caveats

**The app exits if the database is unreachable.** Prisma opens its pool on module
init, so the container dies at start until `DATABASE_URL` is right — and every query
500s until the migrations have been applied. That is the intended behaviour, not a
bug in the image.

**`DATABASE_URL` is the Supabase session pooler** (port 5432) for this long-running
server. If the API ever moves to serverless hosting it becomes the transaction pooler
(port 6543, `?pgbouncer=true`) plus a separate `DIRECT_URL` for the CLI — see
[`docs/backend-plan.md`](../../docs/backend-plan.md).

**Two Yarn quirks the Dockerfile works around**, both verified by reproducing the
failure locally:

- The dependency layer installs with `--mode=skip-build`. `package.json` has
  `postinstall: prisma generate`, and `prisma/schema.prisma` has not been copied at
  that point, so a plain install fails. `prisma generate` runs explicitly in the
  build stage instead.
- The runtime layer deletes `scripts.postinstall` from its copy of `package.json`
  before `yarn workspaces focus --production --all`. Otherwise the same hook runs
  with the Prisma CLI already pruned and exits 127 (`command not found: prisma`).
  `YARN_ENABLE_SCRIPTS=false` does not prevent it — that only disables
  _dependencies'_ build scripts, not the workspace's own.

**Health probes.** `/health/live` (no database, safe for liveness) and
`/health/ready` (checks the database). Both sit outside the `api/v1` prefix. The
`HEALTHCHECK` uses `/health/live` on purpose: a database blip must not restart every
replica.

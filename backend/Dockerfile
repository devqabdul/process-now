# syntax=docker/dockerfile:1
#
# ProcessNow backend — NestJS 12 (ESM) + Prisma 7 on Node 24.
#
# UNVERIFIED: this file has never been built. The Docker daemon was unreachable on
# the machine that wrote it, so the layer order, the two Yarn invocations and the
# dist/ layout were checked by running the same commands outside Docker, not by
# `docker build`. Build it once before trusting it.
#
# Migrations are NOT run here. `yarn migrate:deploy` is a release step, run once
# against the database before the new image rolls out — see docker/README.md. If it
# ran on container start every replica would race the others for the migration lock.
#
# Base image pinned to a major version so patch updates arrive on rebuild; bump
# `node:24` when .nvmrc moves.

# --- deps ---------------------------------------------------------------------
# Debian slim, not alpine: bcrypt 6 ships a glibc prebuild for linux, so nothing
# has to be compiled here.
FROM node:24-slim AS deps
WORKDIR /app
RUN corepack enable
COPY package.json yarn.lock .yarnrc.yml ./
# --mode=skip-build is required, not a speed-up: package.json has
# `postinstall: prisma generate`, and prisma/schema.prisma has not been copied yet,
# so an ordinary install fails here. `prisma generate` runs explicitly below.
RUN --mount=type=cache,target=/root/.yarn/berry/cache,sharing=locked \
    yarn install --immutable --mode=skip-build

# --- build --------------------------------------------------------------------
FROM deps AS build
COPY . .
# Prisma 7 with a driver adapter generates plain TypeScript into src/generated/prisma
# (no query-engine binary), so `nest build` compiles it into dist like any other source.
RUN yarn prisma generate && yarn build

# --- runtime ------------------------------------------------------------------
FROM node:24-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app
# dumb-init reaps zombies and forwards SIGTERM, so Nest's shutdown hooks run on
# `docker stop` and on a Kubernetes pod eviction without relying on --init.
RUN apt-get update \
    && apt-get install -y --no-install-recommends dumb-init \
    && rm -rf /var/lib/apt/lists/*
RUN corepack enable
COPY package.json yarn.lock .yarnrc.yml ./
# `workspaces focus --production` would run the postinstall hook and fail: the prisma
# CLI is a devDependency and is gone by then (verified: exit 127, "command not found:
# prisma"). Dropping the hook from the image's copy of package.json is the fix —
# the generated client is copied in from the build stage instead.
RUN --mount=type=cache,target=/root/.yarn/berry/cache,sharing=locked \
    node -e "const f='package.json',p=JSON.parse(require('fs').readFileSync(f));delete p.scripts.postinstall;require('fs').writeFileSync(f,JSON.stringify(p,null,2))" \
    && yarn workspaces focus --production --all
COPY --from=build /app/dist ./dist
# Shipped for reference and for a migration run started from this image's source
# tree; nothing at runtime reads them.
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/prisma.config.ts ./prisma.config.ts
USER node
ENV PORT=1010
EXPOSE 1010
# /health/live is excluded from the api/v1 prefix (src/setup-app.ts) and does not
# touch the database on purpose — a DB blip must not restart every replica.
HEALTHCHECK --interval=30s --timeout=3s --start-period=15s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||1010)+'/health/live').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main.js"]

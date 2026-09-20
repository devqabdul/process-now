# syntax=docker/dockerfile:1
#
# ProcessNow frontend — static PWA served by nginx.
#
# IMPORTANT: this image is environment-specific. Vite substitutes VITE_* at BUILD
# time, so the API URL is baked into the JavaScript. Staging and production need
# two different images built from the same commit with different --build-arg values.
# There is no runtime configuration to change afterwards.
#
# Base images are pinned to a major version so patch updates arrive on rebuild.
# Bump `node:24` when the repo's .nvmrc moves, and `nginx-unprivileged:1` only when
# nginx ships a new major (the security headers in docker/nginx.conf are the thing
# to re-read at that point).

# --- deps ---------------------------------------------------------------------
# Debian slim, not alpine: Vite 8 (rolldown), Tailwind v4 (lightningcss) and their
# friends all resolve native glibc bindings here without a musl fallback.
FROM node:24-slim AS deps
WORKDIR /app
RUN corepack enable
# .yarnrc.yml must be copied: without it Yarn Berry falls back to nodeLinker: pnp
# inside the image while CI and local use node-modules, so the shipped bundle would
# come out of a different resolution strategy than anything that was tested.
COPY package.json yarn.lock .yarnrc.yml ./
# Cache mount keeps Yarn's global cache across builds; the install layer itself is
# still cached on package.json + yarn.lock alone.
RUN --mount=type=cache,target=/root/.yarn/berry/cache,sharing=locked \
    yarn install --immutable

# --- build --------------------------------------------------------------------
FROM deps AS build
# Defaults are the LOCAL values, so `docker build` with no args produces a working
# image for local use and for CI to prove this file compiles. Any real deployment
# MUST pass both: src/app/config/env-schema.ts rejects a plaintext API URL unless
# VITE_APP_ENV=local, so a mismatched pair fails the build rather than shipping.
ARG VITE_API_BASE_URL=http://localhost:1010/api/v1
ARG VITE_APP_ENV=local
# Vite's loadEnv() prefers prefixed process.env over any .env file, which is why
# these win even though .env* is excluded by .dockerignore.
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL \
    VITE_APP_ENV=$VITE_APP_ENV
COPY . .
RUN yarn build
# The CSP's script hashes are derived from the HTML that was just built, so an edit
# to an inline script can't leave a stale hash behind. Fails the build if the
# placeholder is gone, rather than shipping an unfilled CSP.
RUN VITE_API_BASE_URL="$VITE_API_BASE_URL" node docker/render-nginx-conf.mjs build/index.html docker/nginx.conf /nginx.conf

# --- runtime ------------------------------------------------------------------
# nginx-unprivileged already runs as uid 101 on port 8080.
FROM nginxinc/nginx-unprivileged:1-alpine AS runtime
# vite.config.ts sets build.outDir = 'build' (not the Vite default 'dist').
COPY --from=build /app/build /usr/share/nginx/html
COPY --from=build /nginx.conf /etc/nginx/conf.d/default.conf
# Restated so the non-root guarantee is visible in THIS file and to static scanners.
USER 101
EXPOSE 8080
# Plain HTTP on loopback is correct: nothing to encrypt inside the container, TLS
# terminates at the load balancer.
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget -qO- 127.0.0.1:8080/healthz >/dev/null || exit 1
CMD ["nginx", "-g", "daemon off;"]

# Frontend Docker image

Multi-stage build: Yarn 4 install → `yarn build` → static files served by
[`nginxinc/nginx-unprivileged`](https://hub.docker.com/r/nginxinc/nginx-unprivileged)
on port **8080** as uid 101.

## Build and run

```bash
# from frontend/
docker build -t process-now-frontend .
docker run --rm -p 9090:8080 process-now-frontend     # http://localhost:9090
```

Or the whole stack, from the repo root: `docker compose up --build`.

## Build args

| Arg                 | Default                        | Notes                                              |
| ------------------- | ------------------------------ | -------------------------------------------------- |
| `VITE_API_BASE_URL` | `http://localhost:1010/api/v1` | Backend URL including the `/api/v1` prefix         |
| `VITE_APP_ENV`      | `local`                        | `local` · `development` · `staging` · `production` |

```bash
docker build \
  --build-arg VITE_API_BASE_URL=https://api.example.com/api/v1 \
  --build-arg VITE_APP_ENV=production \
  -t process-now-frontend:1.2.3 .
```

The defaults are the local ones, so `docker build` with no args produces a working
local image — that is also what CI builds to prove the Dockerfile still compiles.

## Caveats

**One image per environment.** Vite substitutes `VITE_*` at build time, so the API
URL is compiled into the JavaScript. Staging and production need two images built
from the same commit with different `--build-arg` values; there is no runtime
setting to change afterwards.

**The build validates the pair.** `src/app/config/env-schema.ts` rejects a plaintext
`VITE_API_BASE_URL` unless `VITE_APP_ENV=local`, so a mismatched pair fails the build
instead of shipping.

**The CSP blocks the API until you edit it.** `nginx.conf` ships
`connect-src 'self'` because the API host is not chosen yet. The API is a separate
origin, so every request is blocked until it is added:

```nginx
connect-src 'self' https://api.example.com;
```

**`nginx.conf` is a template, not a finished config.** `script-src` carries
`__INLINE_SCRIPT_HASHES__`, which
[`render-nginx-conf.mjs`](render-nginx-conf.mjs) replaces during the build with one
`sha256-` per inline `<script>` in the built `index.html` — today the theme
no-flash script and vite-plugin-pwa's service-worker registration. They are derived
rather than hand-pinned so that editing either script cannot break the page in
production only. Two consequences: don't point nginx at this file directly, and if
you remove the placeholder the build fails instead of shipping an unfilled CSP.

```bash
node docker/render-nginx-conf.mjs --selftest   # checks the hashing and the guard
```

**No brotli.** The stock nginx image has no `ngx_brotli` module, so adding it means
building a custom nginx. Gzip is on; a CDN or load balancer in front usually
compresses anyway.

**TLS terminates elsewhere.** The container speaks plain HTTP. `Strict-Transport-Security`
is sent regardless (browsers ignore it over HTTP) and only takes effect once
something in front serves HTTPS.

## Caching

Set in one place — a `map` on `$uri` in `nginx.conf` — because an `add_header`
inside a `location` silently drops every header inherited from `server`, security
headers included.

| Path                                                                             | `Cache-Control`                       |
| -------------------------------------------------------------------------------- | ------------------------------------- |
| `/assets/*` (content-hashed js, css, fonts, img)                                 | `public, max-age=31536000, immutable` |
| `/workbox-<hash>.js`                                                             | `public, max-age=31536000, immutable` |
| everything else — `index.html`, `sw.js`, `registerSW.js`, `manifest.webmanifest` | `no-cache`                            |

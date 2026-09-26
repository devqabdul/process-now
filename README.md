# ProcessNow

> **ProcessNow** — order, billing and daily-production tracking for job-work businesses: companies that take material from vendors, process it on their machines and return it. A React PWA and a NestJS API in one repository.

[![Version](https://img.shields.io/badge/version-0.0.1-blue.svg)](frontend/package.json)
[![React](https://img.shields.io/badge/React-19.x-61DAFB.svg?logo=react)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-8.x-646CFF.svg?logo=vite)](https://vite.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6.svg?logo=typescript)](https://www.typescriptlang.org)
[![NestJS](https://img.shields.io/badge/NestJS-12.x-E0234E.svg?logo=nestjs)](https://nestjs.com)
[![Private](https://img.shields.io/badge/access-private-lightgrey.svg)](#)

> **Status:** both apps are written and run together. The compose stack brings up Postgres, the API and the frontend; all three migrations apply and the DB-backed e2e suite passes 32/32. The frontend calls the real API — every API domain goes through the axios client, and route middleware guards the app. What's left is the unbuilt screens and a hosting decision; see [Current State](#current-state).

---

## Table of Contents

- [Overview](#overview)
- [Repository Layout](#repository-layout)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Available Scripts](#available-scripts)
- [Architecture](#architecture)
- [Current State](#current-state)
- [Documentation](#documentation)
- [Quality Gates](#quality-gates)
- [Deploy](#deploy)
- [Contributing](#contributing)
- [Reference](#reference)

---

## Overview

Job-work businesses take material from vendors, process it, and return it. Two run on ProcessNow:

- **FuseNow** fuses cloth. A vendor brings 15 sherwani pieces; FuseNow fuses the front and side panels and returns them.
- **CrushNow** crushes plastic. A vendor brings 100 kg of scrap; CrushNow returns 95 kg of crushed material.

The shape is identical — material in, processed, material out, bill raised — but the services, units and prices differ per company. ProcessNow models that difference as **data, not code**, so a new company is a row rather than a deploy.

**Who uses it:** shop-floor company admins, mostly on a phone, and a platform Super Admin who onboards companies.

**Key capabilities:**

- One sign-in for every role, by email or mobile number, routed to the right workspace
- Company dashboard: pending orders, amount to collect, items processed, machine hours, electricity units, earnings and estimated profit, for any chosen day
- Configurable service types: each company defines its own services, units, prices and costs — the same model covers per-piece fusing and per-kilo crushing
- Orders through their lifecycle (received → processing → returned), billed from a price snapshot taken at creation
- Platform console: create a company and its first admin
- Mobile-first PWA with light and dark themes

---

## Repository Layout

| Folder                  | What                                       | Stack                                          |
| ----------------------- | ------------------------------------------ | ---------------------------------------------- |
| [`frontend/`](frontend) | The web app (PWA)                          | React 19 · Vite 8 · TypeScript 6 · Tailwind v4 |
| [`backend/`](backend)   | The API                                    | NestJS 12 · Prisma 7 · Supabase PostgreSQL     |
| [`docs/`](docs)         | Problem statement, data model, build plans | —                                              |
| [`.design/`](.design)   | Exported design screens, for reference     | —                                              |

`frontend/` and `backend/` are independent projects, each with its own `package.json`, README, `CLAUDE.md`, `.env.example` and `.nvmrc`. The root holds only shared git tooling.

---

## Prerequisites

| Requirement | Minimum | Notes                                                        |
| ----------- | ------- | ------------------------------------------------------------ |
| **Node.js** | 24.x    | Pinned per app in `.nvmrc`                                   |
| **Yarn**    | 4.x     | Yarn Berry via Corepack — run `npm install -g corepack` once |
| **Git**     | 2.x     | Required for the Husky hooks                                 |

Optional, and skipped with a warning if absent: **gitleaks** and **semgrep** power the pre-commit scans — `brew install gitleaks`, `pip install semgrep`.

---

## Getting Started

```bash
# 1. Repo-root tooling (installs the git hooks)
yarn install

# 2. The frontend
cd frontend
yarn install
cp .env.example .env.local
yarn dev                      # http://localhost:9090
```

Open `/login` (sign-in fails until the API is running), `/` for the company workspace, or `/admin/companies` for the platform console.

```bash
# 3. The backend
cd ../backend
yarn install
cp .env.example .env           # set DATABASE_URL (Supabase session pooler), JWT_SECRET and SEED_PASSWORD
yarn prisma migrate deploy && yarn prisma db seed
yarn start:dev                 # http://localhost:1010, Swagger at /api/v1/docs
```

`.env.example` ships `SEED_PASSWORD` empty and `yarn prisma db seed` refuses to run without it — set it to 8+ characters before seeding. `WEB_ORIGIN` must match where the browser loads the frontend from (`http://localhost:9090` for `yarn dev`), or every API call is blocked by CORS.

See [`backend/README.md`](backend/README.md) for the full variable list and the seeded logins.

Prefer one command? [`docker-compose.yml`](docker-compose.yml) runs the whole stack with these values already set:

```bash
docker compose up -d --build
docker compose --profile migrate run --rm migrate   # once, before expecting anything to work
```

---

## Available Scripts

Run from the repository root:

| Command        | What it does                                 |
| -------------- | -------------------------------------------- |
| `yarn install` | Installs the hook tooling and sets up Husky  |
| `yarn verify`  | Frontend typecheck, lint and tests in one go |

Per-app scripts are documented in [`frontend/README.md`](frontend/README.md) and [`backend/README.md`](backend/README.md).

---

## Architecture

```
Company Admin (phone)  ─┐
                        ├─►  frontend (React PWA)  ──►  backend (NestJS)  ──►  PostgreSQL
Super Admin (desktop)  ─┘         :9090, calls the          :1010, /api/v1        Supabase (hosted)
                                  API over axios            httpOnly cookie       postgres:17 (local)
```

**Multi-company from day one.** Every business row carries a `company_id`. The API takes it from the session cookie — never from the request body, query or URL — and every query filters by it. That is what makes going from two companies to ten a configuration change rather than a rewrite.

**Pricing lives in data.** A service type defines its unit, price, cost and optional add-ons; the order item copies price and cost when it is created. Editing a service type never rewrites an old bill.

**Money is never a float.** `Decimal` in the database, strings on the wire, formatted for display with `Intl.NumberFormat('en-IN')`. Arithmetic is server-side; the frontend's live price preview is display only.

See [`docs/module-design.md`](docs/module-design.md) for the data model and the dashboard figures.

---

## Current State

| Area              | State                                                                                                                                                                                                                                                                                                  |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Sign in           | Email or mobile, then password; routes by role                                                                                                                                                                                                                                                         |
| Company dashboard | Eight metrics, date switcher, pending-orders list, daily-log prompt                                                                                                                                                                                                                                    |
| Super Admin       | Companies list with search; create company with its first admin                                                                                                                                                                                                                                        |
| Workspace shell   | Scoped menu, ⌘K screen search, layout switch, dark mode, logout, mobile bottom tabs                                                                                                                                                                                                                    |
| Auth              | Route middleware in `frontend/src/app/router/middleware.ts` — `guestOnly` on `/login`, `requireRole` on `/` and `/admin` (`requireAuth` is exported for routes that need any signed-in user). Identity from `useMe()`; a 401 interceptor plus `SessionListener` clear the cache and return to `/login` |
| Frontend ↔ API    | All nine API domains call the real client; fixtures survive only as test data in two test files                                                                                                                                                                                                        |
| Backend           | Eleven feature and infrastructure modules (plus `app.module.ts`), three migrations, a seed and e2e tests; the DB-backed e2e suite passes 32/32 against the compose Postgres                                                                                                                            |

**Not built:** the Orders, Bills, Vendors, Service types, Daily log and Settings **screens** — their menu items open a "coming soon" page, though the API endpoints behind them exist.

**Placeholders:** the notifications tray in the workspace shell renders nothing real (the header dropdown is now a vendor quick-jump), and logout doesn't yet call the API. Counts move; grep for what's left rather than trusting a number here:

```bash
grep -rn 'TODO(api)\|TODO(auth)' frontend/src backend/src
```

---

## Documentation

**Product and planning** — [`docs/`](docs)

| Document                                          | Answers                                                                                             |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| [problem-statement.md](docs/problem-statement.md) | What this solves, for whom, and what's out of scope                                                 |
| [module-design.md](docs/module-design.md)         | Data model, pricing model, dashboard figures                                                        |
| [frontend-plan.md](docs/frontend-plan.md)         | Frontend stack, structure, screens, sources — written pre-build; unbuilt parts are marked as intent |
| [backend-plan.md](docs/backend-plan.md)           | Backend stack, endpoints, business rules, sources                                                   |

**Working in the code**

- [`frontend/README.md`](frontend/README.md) · [`frontend/CLAUDE.md`](frontend/CLAUDE.md) · [`frontend/docs/conventions/`](frontend/docs/conventions)
- [`backend/README.md`](backend/README.md) · [`backend/CLAUDE.md`](backend/CLAUDE.md) · [`backend/docs/conventions/`](backend/docs/conventions)
- [`CLAUDE.md`](CLAUDE.md) — rules that hold across both apps

---

## Quality Gates

Husky hooks, installed by `yarn install` at the root:

| Hook           | Runs                                                                                                           |
| -------------- | -------------------------------------------------------------------------------------------------------------- |
| **pre-commit** | gitleaks (secrets scan) → semgrep (static analysis on staged TS/TSX) → lint-staged (ESLint `--fix` + Prettier) |
| **commit-msg** | commitlint — Conventional Commits                                                                              |
| **pre-push**   | Frontend typecheck → tests → build                                                                             |

**The hooks cover the frontend only.** Root `lint-staged` globs `frontend/src/**` and `frontend/**` (plus Markdown), and `pre-push` runs `yarn --cwd frontend` typecheck, test and build. Backend code is never linted, formatted or tested by a hook — run `yarn --cwd backend lint`, `format`, `test` and `test:e2e` by hand until CI or a hook picks it up. [`.github/workflows/ci.yml`](.github/workflows/ci.yml) does cover both apps on a pull request.

**The semgrep step has never fired** — semgrep isn't installed on the machine this was built on, and the hook skips with a warning when the binary is missing. Don't treat it as a working gate: it pipes repo-root-relative paths (`frontend/src/foo.ts`) into a command run with `cwd=frontend`, so with semgrep installed it would look for `frontend/frontend/src/foo.ts`, find nothing and abort the commit. Fix the path handling before relying on it.

---

## Deploy

**Hosting is not yet chosen**, so there is no deploy step anywhere in this repository. The container side is done, though: both images build and run, [`docker-compose.yml`](docker-compose.yml) runs the whole stack locally, and the release workflow publishes both images to GHCR. Where those images then run is the open question. When it is answered, these still apply:

- Session cookie from the API: `HttpOnly; Secure; SameSite=Lax`
- HTTPS end to end — the frontend build refuses a plaintext API URL outside local development
- `prisma migrate deploy` runs once per release, before the new image takes traffic — never on container start
- The frontend's `Content-Security-Policy` allows `connect-src 'self'` only; the API's origin has to be added to it

### Docker

| Image    | Built from                                   | Serves                                | Details                                                  |
| -------- | -------------------------------------------- | ------------------------------------- | -------------------------------------------------------- |
| frontend | [`frontend/Dockerfile`](frontend/Dockerfile) | nginx on 8080, non-root (uid 101)     | [`frontend/docker/README.md`](frontend/docker/README.md) |
| backend  | [`backend/Dockerfile`](backend/Dockerfile)   | `node dist/main.js` on 1010, non-root | [`backend/docker/README.md`](backend/docker/README.md)   |

```bash
docker compose up -d --build                      # both apps + postgres:17
docker compose --profile migrate run --rm migrate # once, before the first boot
```

Both images have been built and run: the migrate profile applied all three migrations, the API serves `/health/live`, `/health/ready` and Swagger at `/api/v1/docs`, and the frontend image was checked serving its nginx security headers (CSP, HSTS, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`).

[`docker-compose.yml`](docker-compose.yml) is for local use only — the real database is Supabase.

**The frontend image is environment-specific.** `VITE_*` values are compiled into the bundle, so staging and production need two images built from the same commit with different `--build-arg` values. The backend image is configured entirely at runtime.

### Releases

[`.github/workflows/release.yml`](.github/workflows/release.yml) runs [release-please](https://github.com/googleapis/release-please) on every push to `main`. It reads the Conventional Commits and keeps a release PR up to date with the next version and the changelog. `separate-pull-requests` is on, so `frontend/` and `backend/` get **one release PR each**; merging one tags that component, creates its GitHub release, and pushes its image to GHCR as `<version>` and `latest`.

|                      |                                                                                                                                                              |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Versioned separately | `frontend/` and `backend/` — attributed by the paths a commit touches                                                                                        |
| Config               | [`.github/release-please-config.json`](.github/release-please-config.json), [`.github/.release-please-manifest.json`](.github/.release-please-manifest.json) |
| Images               | `ghcr.io/<owner>/<repo>/frontend`, `ghcr.io/<owner>/<repo>/backend`                                                                                          |
| Credentials          | `GITHUB_TOKEN` only                                                                                                                                          |

The frontend publish job fails on purpose until the `VITE_API_BASE_URL` and `VITE_APP_ENV` repository variables are set — rather than publish an image that silently points at `localhost`.

[`.github/workflows/ci.yml`](.github/workflows/ci.yml) covers pull requests and pushes to `main`: typecheck, lint, tests and build for each app, a non-blocking dependency audit, and a Docker build of both images on pull requests.

---

## Contributing

### Branch naming

Not yet settled. Pick a convention before the first shared branch.

### Conventional Commits

Enforced by CommitLint.

```
type(scope): short description

[optional body]

[optional footer]
```

Types: `feat` `fix` `docs` `style` `refactor` `perf` `test` `build` `ci` `chore` `revert`
Scopes: `frontend` `backend` `docs` `repo` `deps`

```
feat(frontend): add the pending orders table to the dashboard
fix(backend): scope the bill lookup to the signed-in company
```

### Pull request process

1. Branch, make the change following the conventions in the relevant app's `CLAUDE.md`
2. `yarn verify` at the root
3. Commit with a conventional message and open a PR using [the template](.github/PULL_REQUEST_TEMPLATE.md)

### Code owners

| Owner | GitHub handle |
| ----- | ------------- |
| Abdul | @devqabdul    |

---

## Reference

- [`CLAUDE.md`](CLAUDE.md) — repo-level rules, and where to read next for each app
- [`docs/`](docs) — the product contract between the two apps; when code and docs disagree, one of them is a bug
- [`.design/`](.design) — exported design screens and the design philosophy

---

<div align="center">
  <sub>ProcessNow</sub>
</div>

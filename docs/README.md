# Docs

Product and planning documents. Code-level conventions live with each app: [`frontend/docs/conventions/`](../frontend/docs/conventions) and [`backend/docs/conventions/`](../backend/docs/conventions).

| Document                                     | What it answers                                                                                                              |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| [problem-statement.md](problem-statement.md) | What ProcessNow solves, for whom, the actors, the order flow, and what the POC deliberately leaves out                       |
| [module-design.md](module-design.md)         | The data model, how one pricing model covers both FuseNow and CrushNow, the dashboard figures, and the decisions behind them |
| [frontend-plan.md](frontend-plan.md)         | Frontend stack with pinned versions and the reason for each, folder and module structure, screens, conventions, sources      |
| [backend-plan.md](backend-plan.md)           | Backend stack, multi-company safety, every endpoint, the response envelope, business rules, build order, sources             |

## How to read them

Start with **problem-statement.md** for the shape of the business, then **module-design.md** for the data model — most questions about "where does this number come from" are answered there. The two plan docs are the stack decisions, each with a **Sources** section citing the official docs a version choice came from, and an **Open questions** section.

The plan docs were written on 2026-09-19, **before** either app was built. They are a record of intent — where a plan and the code disagree, the code wins. `frontend-plan.md` marks its not-yet-built sections as such.

## Keeping them true

These documents are the contract between the two apps: the envelope shape, the field names, the pricing rules and the metric definitions all live here. When code and docs disagree, one of them is a bug — fix both in the same commit.

Versions and their reasons were checked against the official documentation on 2026-09-19. Two pins are deliberate and will need revisiting:

- **TypeScript 6, not 7** (both apps pin `6.0.3`) — `typescript-eslint` doesn't support 7 yet, and the Nest CLI breaks on it
- **ESLint 9 on the frontend, 10 on the backend** — `eslint-plugin-jsx-a11y` hasn't released ESLint 10 support, so the frontend is held at 9 even though 9 is past end-of-life; the backend doesn't use that plugin and runs 10

## Design

The screens come from a Claude Design project. Exported copies are in [`../.design/`](../.design) — `login.html`, `company-admin.html` (its trailing script is truncated by the export limit), `super-admin.html` and the design philosophy. They're reference material, not build inputs.

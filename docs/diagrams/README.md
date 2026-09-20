# Diagrams

Two self-contained HTML files (inline SVG, no build step). Open them in a browser, or embed the `<svg>` node elsewhere.

| File                                           | What it shows                                                                                                                                                                                                          |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`architecture.html`](architecture.html)       | The system as it exists today: two admin personas → React PWA → nginx + NestJS API → company-scoped queries → PostgreSQL, with the browser/server trust boundary drawn and the hosting platform deliberately left out. |
| [`order-lifecycle.html`](order-lifecycle.html) | The business process across three actors (vendor, company admin, API): material in → order created → price snapshotted → processing → quantity out → bill in the same transaction → payments.                          |

Each page carries the diagram plus three cards; the third card on each is always **what was cut**, so nothing important is silently missing.

## When to update

**`architecture.html`** — when a box or a line in it changes:

- the hosting decision lands (the callout and the "Still open" card come off)
- a port, prefix or origin moves (`:1010`, `/api/v1`, `:8080`/`:9090`, the CSP's `connect-src`)
- the guard chain gains or loses a guard, or the session stops being an `httpOnly` cookie
- the tenant rule changes — if `companyId` ever stops coming from the session, the focal node is wrong and so is the headline
- a major version in a sublabel moves (React, Prisma, Postgres)

Adding a feature module does **not** need an edit; the diagram says "ten feature modules" and that count is the only thing to check.

**`order-lifecycle.html`** — when the process changes, not when the code does:

- a new order status, or the forward-only rule relaxing
- the price/cost snapshot moving (it is the focal node — if snapshotting stops, redraw)
- the bill no longer being created in the return transaction
- billing gaining a third `billOn` mode, or payments gaining a shape partial payments don't cover

Sources of truth: [`../problem-statement.md`](../problem-statement.md) and [`../module-design.md`](../module-design.md). If those two disagree with the diagram, the diagram is wrong.

## How to regenerate

Both were produced with the **`diagram-design`** skill (v2.6), styled from a named profile rather than the skill's shipped defaults.

- **Profile:** `processnow` — the full style guide lives here in the repo at [`processnow-profile.md`](processnow-profile.md). Its tokens are pasted from `frontend/src/app/tailwind.css`, so the diagrams and the app share one palette.
- **Marker:** `.diagram-design` at the repo root contains exactly `profile: processnow`. The skill reads that before every generation and resolves the profile instead of running its first-run style gate.
- **Library link:** the skill looks profiles up in `~/.diagram-design/profiles/`, so `~/.diagram-design/profiles/processnow.md` is a **symlink** to the copy in this repo. On a new machine, recreate it:

  ```bash
  mkdir -p ~/.diagram-design/profiles
  ln -sfn "$PWD/docs/diagrams/processnow-profile.md" ~/.diagram-design/profiles/processnow.md
  ```

To redraw: ask for the diagram with the `diagram-design` skill from the repo root. It picks up the marker on its own. `architecture.html` is the skill's **architecture** type at the `doc-inline` size; `order-lifecycle.html` is the **process** type, whose geometry is parametric (3 lanes × 7 steps → `viewBox 0 0 952 356`).

Verify any regenerated file with the skill's own checker:

```bash
python3 <skill-dir>/scripts/self_check.py docs/diagrams/architecture.html
```

## House rules the profile enforces

- **Amber is editorial, not a status colour.** One focal element per diagram — the tenant scope in the architecture, the price snapshot in the lifecycle. Fills use `#f59052`; strokes and amber text use `#985311`, which is the only one of the two that passes contrast on the canvas.
- **JetBrains Mono is for values only** — ports, paths, field names, `WHERE companyId`. Names, lane labels, legend keys and eyebrows are Inter. The skill treats blanket mono as an anti-pattern and this is how the brand font survives that rule.
- **Nothing is invented.** Every claim in both diagrams was checked against the repo. If it could not be confirmed, it was left out.

# Components

Four tiers under `src/components/`. The import direction is one way and is enforced by
`eslint-plugin-boundaries` (`eslint.config.js`):

```
ui → shared → sections → layouts → pages
```

A tier may import anything to its left, never to its right, and never `app/`.
`lib/`, `utils/`, `constants/`, `api/`, `types/` and `hooks/` may not import any component tier
or `pages/`.

The `never app/` half applies to **these four tiers only** — that is how `eslint.config.js` writes
it. There is no policy row for `pages/`, and the foundation tiers may import `app/`; two do, by
design (`lib/auth/session.ts` → the `queryClient` singleton, `api/process-backend/axios.ts` →
`env`).

| Tier        | Role                                                                          | Today                                                                                                                                                                                                              |
| ----------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `ui/`       | Base primitives. No product knowledge, no data types, no routing.             | `avatar` (Avatar + LetterTile), `badge`, `button`, `card`, `data-table`, `field-error`, `field-label`, `icon-button`, `input-shell`, `search-input`, `skeleton`, `spinner`                                         |
| `shared/`   | Cross-page building blocks. May use `ui/`, router links and app-level libs.   | `app-splash`, `brand-lockup`, `empty-state`, `load-error`, `loading-mark`, `logout-button`, `page-header`, `process-mark`, `route-progress`, `stat-tile`, `theme-toggle`, `toast`                                  |
| `sections/` | Page-bound components, grouped to mirror `src/pages/`. May know domain types. | `admin/` (companies-table, company-card, form-field), `auth/` (identify-step, password-step), `dashboard/` (date-switcher, pending-orders-table, stat-grid); empty folders stand ready for the six unbuilt screens |
| `layouts/`  | Outer shells that host an `<Outlet/>` and the app chrome.                     | `auth-layout`, `auth-fallback`, `workspace-shell` + its parts (bottom-nav, command-palette, company-chip, menu-sheet, notifications) and `use-dismissable`                                                         |

Nothing is hand-written on top of a component library: there is no Radix, no Base UI, no
shadcn/ui and no `class-variance-authority`. Primitives are plain React with Tailwind classes
composed through `cn()`. Variants are a `Record<Variant, string>` lookup at module scope — see
`VARIANTS` / `SIZES` in `ui/button.tsx` and `TONES` in `ui/badge.tsx`. The one exception is
`ui/data-table.tsx`, which is built on TanStack Table (headless — it ships no markup of its own).

## Tables

**`ui/data-table.tsx` is the only table in the codebase.** Never hand-roll a `<table>`; a new
screen adds column definitions, not markup. It is built on **TanStack Table v9**
(`@tanstack/react-table`), which owns the column model, the row model and sorting state; the
component owns every element, class and ARIA attribute.

Columns are TanStack column definitions, authored with `createColumnHelper` typed against the
table's registered features:

```tsx
import { createColumnHelper } from '@tanstack/react-table';

import { DataTable, type DataTableFeatures } from '@components/ui/data-table';

const helper = createColumnHelper<DataTableFeatures, CompanyRow>();

const columns = helper.columns([
  helper.accessor('name', {
    header: 'Company',
    enableSorting: true,
    sortFn: 'text',
    // meta.className lands on the <th> and every <td> of the column (width, alignment).
    meta: { className: 'w-[32%]' },
    cell: ({ row }) => <LetterTile name={row.original.name} />,
  }),
  helper.display({
    id: 'gst',
    header: 'GST number',
    cell: ({ row }) => <GstMarker gstNo={row.original.gstNo} />,
  }),
]);
```

- **`helper.accessor`** for a column with a value behind it (sortable, filterable later);
  **`helper.display`** for one that only renders — a display column has no accessor, so it can
  never sort.
- **`meta.className`** is where per-column layout lives. Its type is `DataTableColumnMeta`,
  declared on the `columnMeta` slot of `dataTableFeatures`, so it is checked, not `any`.
- The component's own props stay small: `rows`, `rowKey`, `label` (the `sr-only` `<caption>` and
  the scroll region's `aria-label`), `loading`, `skeletonRows`, `empty`, `className`,
  `tableClassName`.

**Sorting is opt-in per column.** `defaultColumn` sets `enableSorting: false`, so a column sorts
only when it says `enableSorting: true`. A sortable header renders a real `<button>` inside the
`<th>`, the `<th>` carries `aria-sort` (`none` / `ascending` / `descending`), and a chevron shows
the state. Name the sort function explicitly (`sortFn: 'text'`) — only the functions registered in
the `sortFns` slot are in the bundle, and `'auto'` warns in dev when it picks one that isn't.
Sort it where sorting answers a question the user has (the companies list: name, created date);
don't sort a five-row preview.

**Nothing else is enabled.** Filtering, pagination and virtualisation are registered the same way
when a screen needs them — a feature plus its row model in `dataTableFeatures`
(`columnFilteringFeature` + `createFilteredRowModel()`, `rowPaginationFeature` +
`createPaginatedRowModel()`), then the controls rendered in the component. Add them with the first
screen that has too many rows, not before.

## Row actions

Every list row carries the same control: a `ui/menu.tsx` ⋮ button labelled `Actions for {name}`,
never a bare icon button. Companies, vendors and service types all offer **Edit** (or Change
password) plus **Deactivate / Activate**, with the destructive item in `tone="danger"` so it
reads as destructive before it is clicked.

**Deactivating is not deleting, and the copy has to say so.** Nothing in this app is destroyed
from a list — a row is retired, its history intact, and the toast says which: "their past orders
and bills are untouched", "orders already placed keep their price". Retired rows carry an
`Inactive` badge next to the name.

How much ceremony the action gets depends on what it costs:

| Action                                      | Confirmation                                                                                 |
| ------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Deactivate a **company**                    | `SlideToConfirm` in a dialog — it locks every user of that company out on their next request |
| Deactivate a **vendor** or **service type** | None. It hides them from new work and reverses in one click                                  |
| Activate anything                           | None, ever                                                                                   |

A missing `isActive` reads as active (`isActive === false` is the test, not `!isActive`), so a
field the API stops sending cannot brand every row on the screen as retired.

## Modals and sheets

**Every form and confirmation modal is `ui/dialog.tsx`** — new vendor, change password,
deactivate company. A screen never writes its own `<dialog>` for one, because a screen that lays
out its own buttons drifts from the rest within a release. The shell fixes the anatomy, top to
bottom:

| Slot                    | What goes in it                                                                           |
| ----------------------- | ----------------------------------------------------------------------------------------- |
| `icon`                  | Optional, left of the heading. Destructive dialogs use it to say so before a word is read |
| `title` + `description` | The heading, and one sentence on what happens and what survives                           |
| `children`              | The body — fields, an error line, or nothing                                              |
| `action`                | **The one committing control, full width**: a submit `Button`, or a `SlideToConfirm`      |
| Cancel                  | Rendered by the shell, centred under the action. Not a competing button                   |

So the deactivate dialog and the change-password dialog are the same shape, differing only in
their action — a slider in one, a submit button in the other. `Dialog` renders a `<form noValidate>`: pass
`onSubmit` and the action can be `type="submit"`; leave it off and the form just swallows Enter.
**`noValidate` is not optional** — a `required` field without it makes the browser block the
submit and raise its own tooltip, so the handler never runs and the designed error never shows.

**`ui/slide-to-confirm.tsx`** is for a destructive confirmation worth a deliberate gesture. It is
a real `<input type="range">` wearing a pill, so dragging, touch and the slider role come from the
platform and a keyboard still reaches it — arrows nudge, End confirms. Two rules it enforces: a
drag released before 96% springs back and fires nothing, and a press that does not land on the
knob is ignored, so the control can never be completed with a single tap at the far end.

**`ui/side-sheet.tsx`** is a modal panel that slides in from the right with the screen behind it
still visible — for a task that belongs to the list it covers. `/admin/companies/new` is the
example: it is a **child route** of the companies list, so on `lg:` and up the list stays mounted
behind the sheet, and below `lg:` the child replaces the list and is an ordinary full page. The
list passes `useOutlet({ inSheet })` and the page hides its own `PageHeader` when the sheet is
already carrying one. Menus, dialogs and sheets never invent focus traps: they are native
`<dialog>` elements, so Escape, the backdrop and the trap are the browser's.

The two remaining raw `<dialog>`s are deliberate, because neither has a heading-body-action
shape: the ⌘K command palette (`workspace-command-palette.tsx`) and the phone account sheet
(`workspace-menu-sheet.tsx`). Anything that asks a question or takes a form belongs in `Dialog`.

**`shared/toast.tsx`** carries a _success_ message after the form that caused it is gone — a
dialog that closed, a row acted on. Failures never go in a toast; they belong in the form, next
to the field that broke. It takes `message` + `onDismiss` from the page that raised it: there is
no provider and no queue, and it auto-dismisses after six seconds with a close button for anyone
who needs longer.

**Popups escape their container.** `ui/menu.tsx` positions its popup `fixed`, measured from the
trigger when it opens, because an `absolute` popup inside the table is clipped by the scroll
container and drags a horizontal scrollbar into view. A `z-index` cannot fix that — an overflow
clip ignores it. The z scale: `z-30` sticky header and phone tab bar, `z-40` toast, `z-50` menus
and the skip link; native `<dialog>` sits above all of it in the top layer.

## Graduating between tiers

- A section used by a **second** page group moves to `shared/`.
- A `shared/` component that loses its product knowledge (no domain types, no router, no app libs)
  and is used by other primitives moves to `ui/`.
- Moving down a tier is the only way to widen a component's audience. Never import sideways
  (`sections/admin` must not import `sections/dashboard`) — extract to `shared/` instead.

## Props conventions

- Arrow-function components with a destructured props object and an `interface XProps` declared
  just above. Exported only when a sibling needs it (`DataTableFeatures`, `CompanyRow`,
  `BadgeTone`).
- `className?: string` last, merged with `cn()` so a caller can override. `style` only where a
  caller must set an inline `animationDelay` for a staggered skeleton.
- Refs are plain props (React 19): `ref: RefObject<HTMLDialogElement | null>` on
  `WorkspaceMenuSheet`. No `forwardRef`.
- `exactOptionalPropertyTypes` is on, so an optional prop is spread conditionally rather than
  passed as `undefined`: `{...(className ? { className } : {})}` in `shared/theme-toggle.tsx`.
- Loading is a sibling export, not a prop: `StatTile` / `StatTileSkeleton`,
  `CompanyCard` / `CompanyCardSkeleton`. The skeleton reuses the loaded component's wrapper and
  rows so nothing shifts when data arrives.
- Icon-only buttons go through `ui/icon-button.tsx`, whose props type **requires** `aria-label`.

## Failed reads

A read that fails has one shape: **`shared/load-error.tsx`**. `LoadError` takes an `icon`, a
`title`, a `description` and an `onRetry` (plus an optional `isRetrying`), and renders an
`EmptyState` inside a `Card` with a Retry `Button`. `dashboard-page.tsx` and
`companies-list-page.tsx` both use it, each with its own icon and copy; the controller hook
supplies `isError`, `retry` (a `refetch`) and, on the dashboard, `isRetrying`. Don't clone its
behaviour into a page — the point is that every failure reads the same.

## Known gaps

- `ui/data-table.tsx` renders every row; only sorting is registered, so there is no filtering,
  pagination or virtualisation yet. Fine for the current fixture sizes, not for a real orders
  list — see [Tables](#tables) for where each one attaches.

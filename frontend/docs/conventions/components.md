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

| Tier        | Role                                                                          | Today                                                                                                                                                                                                                                                   |
| ----------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ui/`       | Base primitives. No product knowledge, no data types, no routing.             | `avatar` (Avatar + LetterTile), `badge`, `button`, `card`, `column-picker`, `data-table`, `export-button`, `field-error`, `field-label`, `filter-chip`, `icon-button`, `input-shell`, `load-more`, `pagination`, `search-input`, `skeleton`, `spinner`  |
| `shared/`   | Cross-page building blocks. May use `ui/`, router links and app-level libs.   | `app-splash`, `brand-lockup`, `card-list`, `date-range-chip`, `date-range-fields`, `empty-state`, `load-error`, `loading-mark`, `logout-button`, `page-header`, `process-mark`, `route-progress`, `stat-tile`, `table-toolbar`, `theme-toggle`, `toast` |
| `sections/` | Page-bound components, grouped to mirror `src/pages/`. May know domain types. | `admin/` (companies-table, company-card, form-field), `auth/` (identify-step, password-step), `dashboard/` (date-switcher, pending-orders-table, stat-grid); empty folders stand ready for the six unbuilt screens                                      |
| `layouts/`  | Outer shells that host an `<Outlet/>` and the app chrome.                     | `auth-layout`, `auth-fallback`, `workspace-shell` + its parts (bottom-nav, command-palette, company-chip, menu-sheet, notifications) and `use-dismissable`                                                                                              |

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
- **`meta`** is typed per table (declared on TanStack's `ColumnMeta` in `data-table.tsx`):
  `className` (layout for the `<th>` and every `<td>`), `label` (the Columns picker and CSV
  header; defaults to a string `header`), `exportValue: (row) => string | number | null` (the CSV
  cell — a column without one is left out of the export) and `hideable` (default `true`; pass
  `false` for the identity column a row is known by).
- Props: `rows`, `rowKey`, `label` (the `sr-only` `<caption>` and the scroll region's
  `aria-label`), `loading`, `skeletonRows`, `refreshing`, `error`, `empty`, `columnVisibility` +
  `onColumnVisibilityChange`, `sorting` + `onSortingChange`, `summary`, `footer`, `className`,
  `tableClassName`.

**Sorting is opt-in per column.** `defaultColumn` sets `enableSorting: false`, so a column sorts
only when it says `enableSorting: true`. A sortable header renders a real `<button>` inside the
`<th>`, the `<th>` carries `aria-sort` (`none` / `ascending` / `descending`), and an arrow shows
the state. Two modes:

- **Client-side** (no `sorting` prop): TanStack sorts the rows it was given. Name the sort function
  explicitly (`sortFn: 'text'`) — only the functions in the `sortFns` slot are in the bundle.
- **Server-side** (`sorting` + `onSortingChange`): `manualSorting` — rows render in the order the
  API returned, and a header click only reports the next sort (single column, asc → desc → none).
  `utils/sort-param.ts` maps it to the API's `sort` string and back
  (`[{ id: 'name', desc: true }]` ⇄ `'-name'`). A paged list must sort server-side; sorting one
  page locally reorders 15 rows out of thousands and lies about the rest.

### The table kit

A list screen is assembled from these, not written:

| Piece                       | Role                                                                                                          |
| --------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Piece                       | Role                                                                                                          |
| --------------------------- | ------------------------------------------------------------------------------------------------------        |
| `ui/data-table`             | The table; `summary` slot over the rows, `footer` slot for `Pagination`                                       |
| `ui/pagination`             | "Lines per page" (15/25/50/100) + `‹ 1 2 … 5 ›`; renders nothing at ≤ 15 rows                                 |
| `shared/card-list`          | The phone twin of the table: `renderItem` per card, same states, `summary`, `footer` for `LoadMore`           |
| `ui/load-more`              | "Load more" + "Showing 30 of 128"; "All 128 shown" once everything is in                                      |
| `shared/table-toolbar`      | The one filter row: search, chips (its `children`), Clear all, Columns, Export; a Filters sheet on phones     |
| `ui/filter-chip`            | `[Category ▾]` → `[Category: Rent, Salary ▾ ✕]` → `[Category: 3 selected ▾ ✕]`; `multiple={false}` for radios |
| `shared/date-range-chip`    | `[📅 Last 30 days ▾]`: presets from `utils/date-presets.ts`, or "Custom range…" (`DateRangeFields`)           |
| `ui/column-picker`          | "Columns" + checkboxes for hideable columns; `pickerColumns(columns, visibility)` builds its list             |
| `ui/export-button`          | Bordered Download icon ("Export CSV"), spinner while the caller's `onExport()` runs                           |
| `utils/csv`                 | `toCsv(headers, rows)` + `downloadCsv(filename, csv)`; `exportRows(columns, rows)` feeds it                   |
| `hooks/use-persisted-state` | `localStorage` per key, every read and write in `try`/`catch`, for column visibility                          |

**One filter row, the same on every list.** `[🔍 Search…] [📅 Last 30 days ▾] [Account ▾] [Category ▾]
Clear all … [Columns] [⤓]`. From `lg:` the search is an open `w-64` field; below it, the icon that
expands. The screen passes its chips as `TableToolbar` children plus `activeFilters` (chips holding a
value) and `onClearAll`; **Clear all** shows only while a chip or the search is set. The page's one
solid button is its primary action (Add expense, New vendor) — Export is a secondary icon at the
row's end, and like Columns (≥ 7 columns, `lg:` only) it shows only when there are rows.

**Chip states.** Inactive: the label and ▾, no ✕. Active: `border-primary bg-surface-muted`, the
values ("Category: Rent, Salary", then "3 selected") and a ✕ that clears just that chip. A
single-value filter (an account) passes `multiple={false}`: radios, no Select all, picking closes.

**Dates are a chip too.** `DateRangeChip` offers Today, Yesterday, This week (Monday first), This
month, Last month, Last 30 days, This year, and "Custom range…" (the 1-year clamp lives in
`DateRangeFields`). The URL keeps only `from`/`to`; the chip derives the preset from them
(`matchPreset`), and a custom range reads "26 Aug – 25 Sep". Last 30 days is the default: it stays
out of the URL (`useListParams().setRange`) and shows inactive.

**Summary strip, not a total block.** `summary` renders one line at the top of the table card (and
above the cards on phones), only while there are rows: "**₹2,000** spent · 1 expense · 28 Aug –
26 Sep", "₹X in · ₹Y out · period" on a statement, "12 vendors" elsewhere (`utils/format/count.ts`).
Money comes from the API's `sum`, never from adding up a page.

**Pagination only when there is a second page's worth.** `Pagination` renders nothing at ≤ 15 rows
(the smallest page size) and `DataTable`'s footer hides with it (`empty:hidden`); the summary
carries the count, so there is no "Total N".

**Phones fold the filters into a sheet.** Below `lg:` the row is `[Filters (n)] [🔍] … [⤓]`; Filters
opens a `Dialog` with `bottom` (docked to the bottom edge) holding the same chips stacked, Clear
all, and "Show results". A chip popover's Escape closes only the popover, not the sheet.

**Dates are sans with `tabular-nums`**, in tables and cards alike; `font-mono` is for money and
identifiers (order and bill numbers).

**Pages vs load more.** The desktop table pages (`Pagination` in `footer`) — a person scanning
orders wants "page 3 of 9" and a stable place to come back to. Phone cards append (`CardList` +
`LoadMore`) — there is no room for page numbers, and a thumb scrolls. Both read the same
`{ items, total, page, pageSize }` from the API.

**Four states, never confused:**

| State        | When                                                   | What renders                                                                 |
| ------------ | ------------------------------------------------------ | ---------------------------------------------------------------------------- |
| `loading`    | First load, nothing to show yet                        | Skeleton rows shaped like the real ones                                      |
| `refreshing` | A later fetch — page, sort, filter (`placeholderData`) | The old rows stay, dimmed, `aria-busy`, a 2px progress line under the header |
| `error`      | The read failed                                        | The node in the body, like `empty`                                           |
| `empty`      | It worked and there is nothing                         | The empty node                                                               |

Swapping rows for skeletons on every page change makes the table jump; `refreshing` keeps it still.

**Virtualisation above 100 rows** (`VIRTUALIZE_THRESHOLD`). Past it, `DataTable` and `CardList`
render only the rows in view through `@tanstack/react-virtual`'s **window** virtualizer — the page
stays the scroller, so there is no fixed-height box inside a scrolling page. The table keeps real
`<table>` semantics: spacer `<tr>`s above and below, `aria-rowcount` on the table and
`aria-rowindex` on each row so a screen reader still hears "row 240 of 501". Below the threshold
every row renders; a paged screen (15–100 rows) never virtualises.

**Column visibility** is controlled: the screen owns a `ColumnVisibilityState`
(`{ gst: false }`), usually through `usePersistedState('pn.table.<screen>.columns', {})`, passes
it to `DataTable` and builds the picker from `pickerColumns(columns, visibility)`. It is a
per-browser preference, not a server setting; a blocked or corrupt `localStorage` falls back to
showing everything.

**CSV export exports every matching row**, not the page on screen: `onExport` pages through the
API with the current `q`, `sort` and filters, then `downloadCsv(name, toCsv(...exportRows(...)))`.
Columns come from `meta.exportValue`, hidden ones included — hiding a column is a screen
preference, not a data filter. Money is exported as the API's decimal string, never a formatted
`₹1,23,456`. `toCsv` prefixes a string starting `=`, `+`, `-`, `@`, tab or CR with `'` so a vendor
named `=HYPERLINK(…)` can't run as a formula in Excel; `downloadCsv` writes a UTF-8 BOM so Excel
reads ₹ and Indic names.

**Popovers** (`FilterChip`, `DateRangeChip`, `ColumnPicker`) share `hooks/use-popover.ts`: `fixed`, measured from
the trigger like `ui/menu.tsx`, closing on Escape (focus back to the trigger), an outside press, a
page scroll or a resize. The popup is `role="dialog"` holding a `<fieldset>` of real
`<input type="checkbox">` — `aria-haspopup="dialog"`, because a listbox may only contain options,
not checkboxes.

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

**Numbers read back in words.** Every money or quantity input shows what was typed, grouped and in
words, under the field: `help={<AmountWords value={price} money />}` on `FormField` ("₹1,25,000 ·
One Lakh Twenty Five Thousand Rupees"; `unit="kg"` for quantities). The words come from
`utils/format/number-words.ts` (`to-words`), which groups the Indian way (lakh, crore) by default;
`NUMBER_SYSTEM` switches the whole app to thousand/million, and money stays in rupees either way.
Watch the field with `useWatch`, not `watch()`.

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

**Create and edit forms pass `sheet`** (vendor, service type, bank account, expense). The anatomy
is unchanged, but from `lg:` up the dialog docks to the right edge at full height with the action
pinned to the bottom, so the list it adds to stays in view. Phones keep the centred card.
Confirmations never pass it.

**Every delete is `shared/confirm-delete-dialog.tsx`** — the `Dialog`'s `centered` layout: the
bin illustration (`shared/delete-illustration.tsx`) over a centred question ("Delete this
expense?"), what goes and what survives, "This action cannot be undone.", then Cancel
(`danger-outline`) beside a red **Delete**, both pills. A screen passes the title, the description
and the error; it never lays out its own delete modal.

**`ui/slide-to-confirm.tsx`** is for a destructive action that isn't a delete but deserves a deliberate gesture (deactivating a company). It is
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

- The table kit is built but no screen is wired to it yet; paging, filtering and export happen
  server-side, so TanStack's filtering and pagination features stay unregistered on purpose.
- Virtualised table rows are estimated at their fixed 56px, not measured; a column whose cells
  wrap onto two lines would make the spacer heights drift.

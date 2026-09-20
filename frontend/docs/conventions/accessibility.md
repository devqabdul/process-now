# Accessibility

The rules this codebase holds itself to, from the checklist audit. They are specific and
checkable; where something is not covered, it says so under [Known gaps](#known-gaps).

`eslint-plugin-jsx-a11y`'s recommended set runs over `src/`. Every `eslint-disable` in the codebase
carries a `-- <reason>`; that is the budget, and adding one means writing the reason.
`grep -rn "eslint-disable" src/` is the current count — don't quote a number here, it goes stale.

## Semantics

- A clickable thing is a `<button>`, a navigation is `<NavLink>`/`<a>`, a field is an `<input>`.
  Never a styled `<div>` acting as a control.
- Decorative icons carry `aria-hidden="true"`. Every lucide icon in the codebase has it.
- Icon-only buttons go through `ui/icon-button.tsx`, whose props type **requires** `aria-label`.
  The compiler enforces it.
- One `<h1>` per page. `shared/page-header.tsx` renders it; the login steps, `NotFoundPage` and
  `RouteErrorBoundary` render their own.
- Landmarks: one `<main id="main">` in `WorkspaceShell`, `<nav aria-label="Main">` on each nav
  (only one is visible per breakpoint), `<header>`, `<aside>`. A "Skip to content" link is the
  first focusable element in the shell.
- `<html lang="en">` and a `<title>` per page (React 19 hoists the page's `<title>`).

## Required fields

- A field the schema requires carries the `required` attribute: company name, admin name,
  password, and both login inputs. An optional field does not.
- **An either-or pair is not marked required.** The mobile/email pair in
  `create-company-page.tsx` is wrapped in a `<fieldset>` whose `<legend className="sr-only">`
  carries the rule ("Add a mobile number or an email — the admin signs in with one of them"), and
  neither input is `required`. The schema enforces the rule and reports it on the first field.
- Field errors wire `aria-invalid` on the input and `aria-describedby` to the message node.
  `ui/field-error.tsx` renders that node with `role="alert"` and reserves a minimum line height so
  the layout doesn't jump when an error appears.

## Live regions

| Region                                         | Where                                                                      |
| ---------------------------------------------- | -------------------------------------------------------------------------- |
| `role="alert"` per-field error                 | `ui/field-error.tsx`                                                       |
| `role="alert"` form-level error                | `errors.root?.message` block in `create-company-page.tsx`                  |
| `role="status" aria-live="polite"` page wait   | `shared/loading-mark.tsx` — "Opening Orders…" while a page chunk loads     |
| `role="status"` result count                   | `companies-list-page.tsx` — **always mounted**, `empty:sr-only` when blank |
| `role="status"` success card                   | `create-company-page.tsx` after a company is created                       |
| `role="progressbar" aria-label="Loading page"` | `shared/route-progress.tsx`                                                |
| `aria-busy`                                    | `ui/button.tsx` while loading, `ui/data-table.tsx` while loading           |

A sortable `DataTable` column puts a real `<button>` in the `<th>` and reflects the state in
`aria-sort` on the `<th>` itself (`none` / `ascending` / `descending`), with a chevron for sighted
users. The table's scroll wrapper is a `tabIndex={0}` `role="region"` so a keyboard can reach it
(WCAG 2.1.1), and the `label` prop is both its `aria-label` and the table's `sr-only` `<caption>`.

The mounted-before-it-changes rule matters: a live region inserted at the same moment as its text
is often not announced. `companies-list-page.test.tsx` asserts the count region exists while the
list is still loading.

## Focus management

- After a navigation, `WorkspaceShell` focuses `<main tabIndex={-1}>` so tabbing restarts inside
  the new page. A `navigated` ref skips the first render, so the initial load doesn't steal focus.
- When a submit replaces the form with a success card, focus follows it: `successHeadingRef` +
  `tabIndex={-1}` on the heading, moved in an effect keyed on `createdName`.
- A failed submit focuses the offending field — `setFocus` in `use-login-page.ts`,
  `{ shouldFocus: index === 0 }` on the first server field error in `use-create-company-page.ts`.
- `useDismissable` (top-bar dropdown and notifications panel) closes on Escape and returns focus
  to its trigger.
- The command palette and the account sheet are native `<dialog>` elements opened with
  `showModal()`, so the browser owns the focus trap and Escape.
- Focus is always visible: a 2px `outline` on `:focus-visible` for buttons, links and
  `[role="button"]` in the base layer; form fields draw their own ring via
  `focus-within:shadow-focus`.

## Contrast

Floors, measured values and the two traps the audit turned up are in
[`design-system.md`](./design-system.md#contrast-floors). In short: readable text ≥ 4.5:1,
interactive borders ≥ 3:1 (WCAG 1.4.11), and `--pn-fg-faint` / `--pn-line-input` are decorative
only — never text, never a form-field border.

## Touch targets

44px minimum on phones, shrinking only from `lg:` up where a pointer is likely:

| Component                 | Phone            | Desktop       |
| ------------------------- | ---------------- | ------------- |
| `IconButton`              | `size-11` (44px) | `lg:size-8.5` |
| `Button` size `sm`        | `h-11`           | `lg:h-9.5`    |
| `SearchInput`             | `h-11`           | `lg:h-9.5`    |
| Bottom-nav tab            | `min-h-16`       | hidden        |
| "View all" link in a card | `h-11`           | `lg:h-auto`   |

`InputShell` is 52px (`h-13`) everywhere. The shell also respects the notch:
`pt-[env(safe-area-inset-top)]` on the header, `pb-[env(safe-area-inset-bottom)]` on the bottom
nav, and `<meta name="viewport" … viewport-fit=cover>`.

## Reduced motion

A global block in `src/app/tailwind.css` collapses every animation and transition to 0.01ms under
`@media (prefers-reduced-motion: reduce)`. Nothing needs to opt in. The only autoplaying motion —
the login panel's drifting gradients and the pulse dots — is inside that block's reach and is
`aria-hidden` anyway.

## Known gaps

- **Fixed px type scale.** Sizes are arbitrary values (`text-[12.5px]`) taken from the design
  file. They don't respond to the browser's font-size preference.
- **No automated a11y testing.** No axe, no CI contrast check; the ratios in `tailwind.css` are
  hand-measured comments. The component tests assert names, roles and `required`, nothing more.
- **`autoFocus` on the login password input** (one documented disable). Deliberate: the step
  exists only to take that input.
- **Command-palette options are `<li role="option">` with click handlers** and no key handlers of
  their own; the `role="combobox"` input owns the keyboard (↑/↓ moves, Enter opens). Mouse users
  get the click, keyboard users get the combobox — but the list items themselves are not
  independently focusable.
- **No skip link on the login page** — it has one field and no chrome to skip.
- **`LoadError` is not a live region.** A failed read swaps the content for an `EmptyState` with a
  Retry button; it is reachable and readable, but nothing announces the swap. The wait before it
  (`LoadingMark`) is announced, so a screen-reader user hears the loading and then silence.

# Design system

Everything lives in one file: [`src/app/tailwind.css`](../../src/app/tailwind.css). It imports
Tailwind v4, declares the tokens as CSS variables, maps them into `@theme inline` so Tailwind
generates utilities from them, and adds the keyframes and two base/component layers. There is no
`tailwind.config.js` and no SCSS or CSS-in-JS anywhere.

The source of truth for the values is the ProcessNow design project (Brand, Login, Company Admin,
Super Admin); local snapshots sit in `../../../.design/` alongside `DESIGN-PHILOSOPHY.md`.

## Rule: tokens only

Components use the utilities the tokens generate — `bg-surface`, `text-fg-muted`, `border-line`,
`rounded-12`, `shadow-popover` — **never a raw hex value**. The handful of arbitrary colour values
in the codebase are all `rgba()` overlays and gradients that reference a token
(`bg-[linear-gradient(90deg,transparent,var(--pn-primary),transparent)]` in `route-progress.tsx`,
the `backdrop:bg-[rgba(17,20,23,0.32)]` dialog scrims). If you need a new colour, add a token.

## Token families

| Family      | Tokens                                                                                                           | Notes                                                              |
| ----------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Surfaces    | `canvas`, `canvas-hover`, `surface`, `surface-subtle`, `surface-hover`, `surface-muted`, `surface-strong`        | `canvas` is the workspace background, `surface` is cards and panes |
| Lines       | `line`, `line-input`, `line-field`, `line-subtle`, `line-strong`                                                 | `line-field` is the only contrast-carrying border — see below      |
| Text        | `fg`, `fg-secondary`, `fg-muted`, `fg-subtle`, `fg-faint`, `placeholder`                                         | `fg-faint` is **decorative only**                                  |
| Action      | `primary`, `primary-hover`, `primary-fg`, `link`, `link-hover`, `focus`, `focus-ring`                            | `primary` is ink by default; accent presets override it            |
| Status      | `success`, `warning`, `danger`, `info`, `violet` — each with `-solid` / `-bright` / `-soft` / `-softer` variants | Text tone on the matching `-soft` background                       |
| Brand panel | `brand-bg`, `brand-fg`, `brand-muted`, `brand-faint`, `brand-line`                                               | Always dark, in both themes (login panel, banners)                 |
| Skeleton    | `skeleton`, `skeleton-shine`                                                                                     | Consumed by the `.shimmer` component class                         |
| Elevation   | `shadow-card`, `-raise`, `-button`, `-popover`, `-dialog`, `-modal`, `-sheet`, `-focus`                          | `shadow-focus` is the 4px focus ring                               |

### Radius

The scale is keyed by the design's **px values**, so a class reads 1:1 with the design file:
`rounded-6` … `rounded-20` (6, 7, 8, 9, 10, 11, 12, 13, 14, 16, 18, 20). The number is a name,
not a pixel promise — the `sm` and `lg` presets remap every key.

### Motion

150–250ms, one easing curve (`--ease-out-expo`) for entrances. Named animations:
`animate-rise`, `animate-fade-in`, `animate-pop`, `animate-shake`, `animate-modal-in`,
`animate-toast-in`, `animate-sheet-in`, `animate-palette-in`, `animate-drift`,
`animate-pulse-dot`, `animate-shimmer`, `animate-routebar`, `animate-mark-spin` (the turning
mark in `AppSplash` and `LoadingMark`). All keyframes are in the same file.

The shimmer sweep is a pseudo-element animated with `transform` so it stays on the compositor;
callers stagger rows with an inline `animationDelay`, which the pseudo-element inherits.

## The three switches

All three are attributes on `<html>`:

| Attribute                            | Values                    | Set by                                                                        |
| ------------------------------------ | ------------------------- | ----------------------------------------------------------------------------- |
| `data-theme="dark"` (absent = light) | `dark`                    | `setTheme()` in `src/lib/theme/theme.ts`; applied in `main.tsx` before render |
| `data-accent`                        | `amber`, `teal`, `indigo` | **nothing yet** — CSS only, no UI                                             |
| `data-radius`                        | `sm`, `lg`                | **nothing yet** — CSS only, no UI                                             |

Theme is stored in `localStorage` under `pn.colorMode` (the same key the design files use) and
read through `useTheme()`, a `useSyncExternalStore` over `<html>` so every toggle in the tree
renders the same value. `setTheme` adds a `theme-switching` class for ~250ms so light↔dark
cross-fades; the transition is deliberately **not** permanent, because a permanent
`:root[data-theme='dark'] *` transition made every hover recalculate styles across the tree.

The accent and radius presets are a known gap: the CSS is written and the dark palette is
complete, but no component sets the attributes. Wiring them is a settings-screen job.

## `cn()` and tailwind-merge

`src/lib/cn.ts` is `clsx` + `extendTailwindMerge`. The `extend.theme` block **lists every colour
group, every radius key and every shadow name**. This is not optional: without it tailwind-merge
cannot tell `text-fg-muted` (a colour) from `text-sm` (a size) and will drop one of them when both
appear. **Add a token to `tailwind.css` → add it to `cn.ts` in the same change.**

## Typography

`--font-sans` is Inter Variable, `--font-mono` is JetBrains Mono Variable, both self-hosted via
`@fontsource-variable/*` and imported in `main.tsx` **before** `tailwind.css` so the `@font-face`
rules land above the theme layer. No round trip to Google, no user IP leaving the app.

Mono is used deliberately, not decoratively: panel headings (`CardTitle`), table headers, stat
values, dates, GST numbers, keyboard hints — anything that reads as data.

**Known gap:** there is no type scale token set. Sizes are written as fixed pixel arbitrary values
(`text-[12.5px]`, `text-[13.5px]`) straight from the design file. They do not scale with the
browser's font-size preference, and there is no single place to change them.

## Role accents

The workspace says which login you are in before you read a word: the ProcessNow mark tile and
the account avatar take their colour from the signed-in role. The **API decides which accent a
role wears** — `/auth/me` returns `roleMeta.accent` as one of our own token names (`brand` for
super_admin, `warning` for company_admin), never a hex — and `constants/roles.ts` decides what
that name looks like, through `accentTile()` (the mark's tile) and `accentAvatar()` (behind
initials). It rides along with the session rather than costing a `/roles` round trip on every
page load, and a company admin has no business being told which roles exist. Adding a role
server-side needs no deploy here; adding an _accent_ does, and an unknown one falls back to
`brand` rather than rendering an empty tile.

## Contrast floors

The recent accessibility pass fixed the floors below and recorded the measured ratio in a comment
next to each token. Keep them when you touch a colour, and record the new ratio the same way.

| Use                                         | Floor | Examples from the file                                                                                                                                               |
| ------------------------------------------- | ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Any text a user has to read                 | 4.5:1 | `--pn-fg-subtle` 5.22:1 on surface, 4.57:1 on canvas; `--pn-placeholder` 5.22:1 light, 5.26:1 dark                                                                   |
| Status text on its own `-soft` background   | ~5:1  | success 5.90:1, warning 5.15:1, info 5.87:1 (light); the dark theme swaps to the `-bright` end — success 5.76:1, warning 8.43:1, info 6.36:1, `danger-strong` 6.17:1 |
| Interactive borders (WCAG 1.4.11, non-text) | 3:1   | `--pn-line-field` 3.09:1 light, 3.21:1 dark                                                                                                                          |
| Decorative only — never text                | —     | `--pn-fg-faint`, `--pn-line-input`                                                                                                                                   |

Two traps the pass turned up, both now encoded in the file's comments:

1. `--pn-fg-faint` reads fine but fails as text. Hints, counts and captions use `--pn-fg-subtle`.
2. `--pn-line-input` is decorative; a form field's border must be `--pn-line-field`.

The ratios are hand-measured and recorded in comments. There is no automated contrast check in CI.

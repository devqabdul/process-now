<!-- diagram-design-profile
name: ProcessNow
slug: processnow
source-url: none
created: 2026-09-20
updated: 2026-09-20
notes: Tokens pasted from frontend/src/app/tailwind.css. Canonical copy lives in this repo; the profile library symlinks to it.
-->

# Style Guide

**The single source of truth for colors, typography, and tokens.** Every diagram draws from this — not from hex values inlined in other reference files. If you want to change the visual skin of Diagram Design, change this file.

This copy is the **ProcessNow** skin — canvas paper, ink primary, amber accent, graphite muted, teal links — pasted from `frontend/src/app/tailwind.css` (the app's own token file). Swap these values and every new diagram inherits the new skin without touching any type-specific logic.

To generate your own from a website URL, see [`onboarding.md`](onboarding.md).

---

## Tokens

### Semantic roles

Every token is referred to by **semantic role**, not by its hex value. Type references (`type-*.md`) and SKILL.md say `accent`, not `#f7591f`.

| Role          | Purpose                                 | Default (light)           | Default (dark)           |
| ------------- | --------------------------------------- | ------------------------- | ------------------------ |
| `paper`       | Page background, default node fill      | `#eef0f2` (canvas)        | `#0e1116`                |
| `paper-2`     | Diagram container bg, secondary fill    | `#e6e9ec` (canvas-hover)  | `#15191f`                |
| `ink`         | Primary text, primary stroke            | `#111417` (ink / primary) | `#e6e9ee`                |
| `ink-strong`  | High-contrast text on warm accent fills | `#111417`                 | `#111417`                |
| `muted`       | Secondary text, default arrow stroke    | `#3c424c` (graphite)      | `#c8cfd8`                |
| `soft`        | Sublabels, boundary labels              | `#5f6672` (fg-muted)      | `#a3abb6`                |
| `rule`        | Hairline borders                        | `rgba(17,20,23,0.12)`     | `rgba(230,233,238,0.12)` |
| `rule-solid`  | Stronger borders, baselines             | `#d4d8dd` (line-strong)   | `#3b4453`                |
| `accent`      | Focal / 1–2 max per diagram             | `#f59052` (amber)         | `#f8b183`                |
| `accent-tint` | Fill for accent-bordered boxes          | `rgba(245,144,82,0.12)`   | `rgba(248,177,131,0.14)` |
| `link`        | HTTP/API calls, external arrows         | `#17756c` (teal)          | `#4db6a5`                |

> **Brand palette source:** every value above is lifted from `frontend/src/app/tailwind.css` in the ProcessNow repo — `--pn-canvas`, `--pn-surface`, `--pn-line*`, `--pn-fg*`, `--pn-primary`, `--pn-warning-solid`, `--pn-link`. `rule` is ink at 12% rather than the flat `--pn-line #e8eaed`, which disappears against the `#eef0f2` canvas at hairline weight. Nothing here is invented: see the `Custom tokens` section below for the two roles the app palette doesn't name.

> **Note:** The pre-baked example HTML files in `assets/` were built under an earlier skin. Regenerating them against the current `style-guide.md` is a v5.1 task. New diagrams the skill produces will use the tokens above.

### Inversion rule (light → dark)

Any `rgba(17,20,23, X)` in light becomes `rgba(230,233,238, X)` in dark. Same opacities, RGB flipped. The accent gets a slight hue-shift brighter to read on dark paper.

### Series palette (multi-series chart types only)

A small set of desaturated, editorial-tone colors for chart types that genuinely need to distinguish multiple overlapping entities (currently: **radar**). The "1-focal" rule still holds — `accent` is reserved for the focal series; the palette below covers the rest.

| Token      | Light                  | Dark      | Notes            |
| ---------- | ---------------------- | --------- | ---------------- |
| `series-1` | `#7c8f6f` (sage)       | `#9caf8f` | Non-focal series |
| `series-2` | `#5e7a9b` (dusty-blue) | `#82a0c0` | Non-focal series |
| `series-3` | `#b8915a` (mustard)    | `#d3ad7a` | Non-focal series |
| `series-4` | `#9c6b50` (rust-brown) | `#b88670` | Non-focal series |
| `series-5` | `#6e6479` (slate)      | `#8d8298` | Non-focal series |

Fills sit at `0.18` opacity light, `0.22` dark; strokes use the full color. **Don't backfill these tokens to non-chart types** — architecture, swimlane, etc. continue to use muted-ink variants. The series palette is opt-in for diagrams where overlapping shapes demand distinguishable color, not a license to add color elsewhere.

### Terminal skin (opt-in alternate)

A self-contained palette for the terminal-window primitive (see [primitive-terminal.md](primitive-terminal.md)) — a CLI-chrome register for dev-tool posts and technical social cards. It does not replace the default skin above and isn't affected by onboarding; it's a second, fixed skin you opt into per-diagram.

| Token                  | Hex                    | Purpose                                                          |
| ---------------------- | ---------------------- | ---------------------------------------------------------------- |
| `terminal-page`        | `#0a0a0a`              | Page background behind the window                                |
| `terminal-paper`       | `#141414`              | Window body, node fill                                           |
| `terminal-bar`         | `#1b1b1b`              | Titlebar strip                                                   |
| `terminal-border`      | `#2b2b2b`              | Window border, hairlines                                         |
| `terminal-ink`         | `#f5f5f5`              | Primary text, primary stroke (same white-smoke as default `ink`) |
| `terminal-muted`       | `#9a9a9a`              | Secondary text, sublabels, ring stroke                           |
| `terminal-soft`        | `#5c5c5c`              | Tertiary — inactive dots, spokes                                 |
| `terminal-accent`      | `#ff5a36`              | The one accent — focal station, prompt sign, active dot          |
| `terminal-accent-tint` | `rgba(255,90,54,0.12)` | Fill for accent-bordered boxes                                   |

**1-accent rule still holds.** Everything that isn't `terminal-ink` or `terminal-muted`/`terminal-soft` should be `terminal-accent` — never introduce a second hue.

---

## Typography

| Role          | Family                    | Size    | Weight                         | Usage                                                       |
| ------------- | ------------------------- | ------- | ------------------------------ | ----------------------------------------------------------- |
| `title`       | Instrument Serif          | 1.75rem | 400                            | Page H1                                                     |
| `node-name`   | Inter                     | 12px    | 600                            | Human-readable labels                                       |
| `sublabel`    | JetBrains Mono            | 9px     | 400                            | **Technical values only** — port, path, command, field type |
| `eyebrow`     | Inter                     | 7–8px   | 500, tracked 0.18em, uppercase | Zone labels, type tags, axis labels                         |
| `arrow-label` | Inter                     | 8px     | 500, tracked 0.06em, uppercase | Arrow annotations (mono only when the label _is_ a value)   |
| `callout`     | Instrument Serif _italic_ | 14px    | 400                            | Editorial asides only                                       |

**Why the mono slots moved to Inter.** ProcessNow's mono is JetBrains Mono, which SKILL.md §4 bans as a blanket "dev font". The ban and the brand are reconciled by narrowing, not substituting: JetBrains Mono appears **only** where the string is a machine value a reader could copy — `:1010`, `/api/v1`, `WHERE companyId`, `DB`, `FL`. Eyebrows, lane names, step labels and legend keys are _names_, so they take Inter at 500, uppercase and tracked, which keeps the same editorial register without the cliché.

### Font stack

```html
<link
  href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500;600&family=Noto+Serif:ital@0;1&display=swap"
  rel="stylesheet"
/>
```

Both app families are on Google Fonts, so they are **exact**, not fallbacks: the app self-hosts them via `@fontsource-variable/inter` and `@fontsource-variable/jetbrains-mono` at the same weights. The Noto CJK faces are dropped from the link — ProcessNow's UI is English and Hindi-market Latin; re-add them from the shipped default if a diagram ever carries Hangul or Han.

### Korean labels

Geist and Instrument Serif carry no Hangul. A Korean `<text>` element extends its own family — never swap the skin:

```svg
<text font-family="'Geist', 'Noto Sans KR', 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif">결제 서비스</text>
```

Both Noto faces ship in the font link above, so the web font resolves before any locally installed one and the same file renders identically on macOS, Windows, and a reviewer's browser. The local families follow it for offline viewing. Page titles need the serif equivalent — `'Instrument Serif', 'Noto Serif KR', serif` — or a mixed Latin/Korean title resolves Hangul through the platform's generic serif and the two halves disagree. Google's `css2` endpoint slices Korean by unicode-range, so a diagram with a handful of Korean labels downloads only the slices it touches. The four templates carry both faces because a new diagram may contain Hangul; the shipped Latin-only examples keep the shorter link, since a file with no Hangul has nothing to resolve.

**Width budget.** Measure per character, not per script: **every Unicode wide or full-width character costs 1em, every other character costs its face's Latin advance** (0.60em sans, 0.62em mono), and nonspacing/enclosing marks cost nothing. Sum over the string and multiply by the font size for the text width, then add padding and round the box up to the next multiple of 4. `verify-treemap.py` enforces exactly this text width for treemap cell labels; the padding and rounding are authoring convention, and no other type carries an automatic check, so on those the budget is yours to hold.

Counting by script is the trap. `주문 v2.1` is two full-width syllables and five narrow characters; a formula that tallies Hangul, Latin letters, and spaces silently drops `2`, `.`, and `1` and sizes the box for four of its seven characters. Every rendered character costs something — measure per character, never per script.

Three rules follow from Hangul metrics:

- **Sublabels stay Latin.** Ports, protocols, field types, and URLs are Latin anyway — keep `Geist Mono` there and don't translate them. Hangul in a 9px mono sublabel is unreadable and has no mono face to fall back to.
- **Floor of 12px.** Hangul goes muddy below 12px. If a Korean name doesn't fit at 12px, cut the name — don't shrink the type.
- **Arrow labels, eyebrows, and legend text switch register.** Those slots are 7–8px Geist Mono, uppercase and tracked, which Hangul has neither a face nor legibility for. A Korean label in one of those slots becomes 12px sans at weight 500 with no tracking and no uppercase transform, and its mask rect grows to match (16px tall, width from the budget above, still rounded to a multiple of 4). Latin labels in the same diagram keep the mono treatment.

**Load-bearing rule:** Mono is for _technical_ content (ports, commands, URLs, field types). Names go in Geist sans. Page title is Instrument Serif. Italic Instrument Serif is reserved for annotation callouts (see [primitive-annotation.md](primitive-annotation.md)). **Never JetBrains Mono** as a blanket "dev" font.

### Traditional Chinese labels

Geist and Instrument Serif carry no Han. A Traditional Chinese `<text>` element extends its own family — never swap the skin:

```svg
<text font-family="'Geist', 'Noto Sans TC', 'PingFang TC', 'Microsoft JhengHei', sans-serif">請求項比對</text>
```

Both Noto TC faces ship in the font link above, so the web font resolves before any locally installed one and the same file renders identically on macOS, Windows, and a reviewer's browser. The local families follow it for offline viewing. Page titles need the serif equivalent — `'Instrument Serif', 'Noto Serif TC', serif` — or a mixed Latin/Han title resolves Han through the platform's generic serif and the two halves disagree. Google's `css2` endpoint slices Chinese by unicode-range, so a diagram with a handful of Chinese labels downloads only the slices it touches.

**Width budget.** The per-character contract above is unchanged: every Unicode wide or full-width character costs 1em, every other character costs its face's Latin advance, and nonspacing marks cost nothing. Full-width punctuation — `（）「」，。：` — is wide and costs 1em as well, which is the part most often dropped.

Counting by script is the trap. `請求項 v2.1` is three full-width characters and five narrow ones; a formula that tallies Han and Latin letters silently drops `2`, `.`, and `1` and sizes the box for six of its nine characters.

Three rules follow from Han metrics, mirroring the Hangul ones:

- **Sublabels stay Latin.** Ports, protocols, field types, and URLs are Latin anyway — keep `Geist Mono` there and don't translate them. Han in a 9px mono sublabel is unreadable and has no mono face to fall back to. A sublabel that is prose rather than a value may be Chinese, but it then switches register by the third rule below.
- **Floor of 12px.** Han packs more strokes than Hangul into the same em box, so the 12px floor binds at least as hard here. If a Chinese name doesn't fit at 12px, cut the name — don't shrink the type.
- **Arrow labels, eyebrows, and legend text switch register.** Those slots are 7–8px Geist Mono, uppercase and tracked, which Han has neither a face nor legibility for. A Chinese label in one of those slots becomes 12px sans at weight 500 with no tracking and no uppercase transform, and its mask rect grows to match (16px tall, width from the budget above, still rounded to a multiple of 4). Latin labels in the same diagram keep the mono treatment.

Simplified Chinese takes the same three rules with the Simplified stack (`'Noto Sans SC'`, `'PingFang SC'`, `'Microsoft YaHei'`). That face does not ship in the link, so Simplified labels still resolve through whatever the viewer has locally.

### Cyrillic labels

Geist and Geist Mono ship Cyrillic (`cyrillic` and `cyrillic-ext` on Google Fonts), so names, sublabels, arrow labels, eyebrows, and legend text in Bulgarian, Russian, Ukrainian, or Serbian keep the Latin treatment: same faces, sizes, tracking, and uppercase. There is no register switch: Hangul and Han switch register because Geist Mono has no face for them, and Geist Mono does cover Cyrillic.

Instrument Serif carries no Cyrillic. A page title extends its family — `'Instrument Serif', 'Noto Serif', serif` — or a mixed Latin/Cyrillic title resolves Cyrillic through whatever face comes next and the two halves disagree. Noto Serif ships in the font link above, upright and italic, so an italic callout in Cyrillic takes the same stack.

**Noto Serif goes ahead of the CJK serifs.** When a stack also lists `'Noto Serif KR'` or `'Noto Serif TC'`, put `'Noto Serif'` ahead of them. Google Fonts slices Cyrillic into those faces as well, so a stack that reaches a CJK face first draws its Cyrillic from it. That is why the templates put `'Noto Serif'` between `'Instrument Serif'` and `'Noto Serif KR'`; Noto Serif has no Hangul or Han, so Korean and Chinese titles pass straight through it.

**Width budget.** The per-character contract above is unchanged: every character costs its face's Latin advance (0.60em sans, 0.62em mono). It fits Geist Mono exactly and Geist sans only on average. Geist Mono is monospaced: a Cyrillic glyph advances exactly as far as a Latin one, so sublabels, arrow labels, eyebrows, legend text, and their mask rects are sized as for Latin. Geist sans is not. Its wide Cyrillic letters, capitals and lowercase alike (such as `Ж Ш Щ Ю Ы`, `ж ш щ ы ю`), run well past the 0.60em average: `Шкаф ODF-2` at 12px is budgeted at 72px and draws at about 76. Rounding the box up to a multiple of 4 recovers at most 3px, so it is not the remedy. Leave the overshoot in the box padding and measure a Cyrillic sans name in the browser — `verify-treemap.py` holds the budget, not the drawn width, so it will not catch the overshoot.

Counting by script is still the trap. `Шкаф ODF-2` is four Cyrillic letters, a space, three Latin letters, a hyphen, and a digit; a formula that tallies Cyrillic letters, Latin letters, and spaces silently drops `-` and `2` and sizes the box for eight of its ten characters.

**Preserve printed labels.** A label the reader matches against a physical thing — a cabinet, a splice closure, a port map — carries the exact printed string. Don't transliterate it and don't re-case it; if one has to sit in an uppercase slot such as an eyebrow, drop the transform for that label rather than re-case the printed string. `Шкаф ODF-2` stays `Шкаф ODF-2`, not `Shkaf ODF-2`.

---

## Stroke, radius, spacing

| Token            | Value | Use                                                      |
| ---------------- | ----- | -------------------------------------------------------- |
| `stroke-thin`    | `0.8` | Tag-box outlines, leaf nodes                             |
| `stroke-default` | `1`   | Most strokes                                             |
| `stroke-strong`  | `1.2` | Emphasis strokes                                         |
| `radius-sm`      | `4`   | Small tags                                               |
| `radius-md`      | `6`   | Node boxes                                               |
| `radius-lg`      | `8`   | Containers, rings                                        |
| `grid`           | `4`   | Every coord, size, and gap is divisible by 4 (hard rule) |

---

## Node type → treatment

Semantic role combinations — reference these by name in type specs.

| Type              | Fill                       | Stroke                       |
| ----------------- | -------------------------- | ---------------------------- |
| `focal` (1–2 max) | `accent-tint`              | `accent`                     |
| `backend`         | `#ffffff` (`--pn-surface`) | `ink`                        |
| `store`           | `ink @ 0.05`               | `muted`                      |
| `external`        | `ink @ 0.03`               | `ink @ 0.30`                 |
| `input`           | `muted @ 0.10`             | `soft`                       |
| `optional`        | `ink @ 0.02`               | `ink @ 0.20` dashed `4,3`    |
| `security`        | `accent @ 0.05`            | `accent @ 0.50` dashed `4,4` |

---

## Custom tokens

Two roles the semantic table doesn't name, plus the status ramp. Added under onboarding option (d) — paste tokens.

| Token                                     | Light                                         | Dark                                          | Purpose                                                                                                                                                                                                                                                                               |
| ----------------------------------------- | --------------------------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `accent-ink`                              | `#985311` (`--pn-warning`)                    | `#f8b183`                                     | The amber that carries **line and letter**. `accent #f59052` is ~2.1:1 on `paper`, so it fills (node tints, chips) but never draws: focal borders, accent arrows, accent markers and every amber word use `accent-ink` at ~5.1:1. Same hue, so the pair reads as one accent, not two. |
| `surface`                                 | `#ffffff` (`--pn-surface`)                    | `#15191f`                                     | The `backend` node fill and the editorial card background.                                                                                                                                                                                                                            |
| `success` / `warning` / `danger` / `info` | `#14675c` / `#985311` / `#e5484d` / `#1d58b8` | `#4db6a5` / `#f8b183` / `#f8787c` / `#6ea8f8` | Status only — an outcome the diagram is asserting, never decoration. Not part of the 2-accent budget because they are never focal.                                                                                                                                                    |

The app's teal is `link` (it is literally `--pn-link`), so API and cross-origin arrows are on-brand without spending the accent.

## Customizing the skin

Four options:

1. **Run onboarding** — see [`onboarding.md`](onboarding.md). Drop a URL; the skill extracts the palette + fonts and rewrites this file.
2. **Edit by hand** — change the hex values in the tables above. Run the pre-output taste gate afterward to verify the accent still reads as "focal" against the new paper color.
3. **Brand handoff** — paste your existing design-token JSON into a new section here and map its tokens to the semantic roles above.
4. **Client profiles** — save and switch named skins, or bind one to a project, using [`profiles.md`](profiles.md).

### Constraints (don't break these)

- **Contrast**: `ink` must hit WCAG AA on `paper`. `muted` must hit AA on `paper` for 11px+ text.
- **One accent**: pick one color for `accent`. Two accents erases the focal signal.
- **No rainbow palette**: if your brand ships 8 colors, pick 3 (paper, ink, accent). The rest become `muted` variants.
- **Serif + sans + mono**: three families, not more. If brand typography is all sans, keep Instrument Serif for `title` and `callout` anyway — the contrast is load-bearing.
- **Paper is warm-neutral, not pure white**: pure white turns the design sterile. Pick a cream, bone, or light grey with a hint of warmth.
- **Dot pattern is optional, not default**: the 22×22 dot pattern is an opt-in "dotted paper" variant (good for long-form editorial hero diagrams). The default background is a clean `paper` fill, no pattern. When the pattern is enabled, it should sit at ~10% opacity of `ink` on `paper` — visible but quiet.
- **Container is clean by default**: the diagram sits directly on the page paper, no secondary container background or border. A framed variant (`paper-2` bg + `rule` border + 8px radius + padding) is available as an opt-in for card-heavy layouts, but don't reach for it by default — the extra chrome fights the figure.

# ProcessNow — Global Design Philosophy (copied from the design project's CLAUDE.md)

Applies to every ProcessNow screen. Usability before aesthetics.

## Every screen answers

Where am I · What can I do · What should I do next · What changed · Is the system working.

## Micro-interactions

Design hover, pressed, disabled, focus, checked, active-nav, expand/collapse, drag, toast, dialog and tooltip states. Nothing abrupt — transitions 150–250ms.

## Buttons

States: default, hover, pressed, focus, loading, disabled, success, error. On click: disable, inline spinner, label change (Save → Saving… → Saved ✓). Never allow double submission.

## Loading

Order of preference: optimistic UI → skeleton → progressive → inline → full-page (last resort).
Dashboard = skeleton cards. Form save = button spinner. Table = skeleton rows. Tab switch = keep previous content until new data is ready. Never block the page for a small action.

## Empty states

Never blank. Explain why it's empty, what to do next, and give a CTA.

## Errors

Human, specific, recoverable — "Unable to save order. Check your connection and try again." with Retry / Refresh / Contact support. Never "Something went wrong."

## Success

Acknowledge every completed action, preferably a lightweight toast: ✓ Order created.

## Forms

Reduce typing: autocomplete, searchable dropdowns, date pickers, smart defaults, masks, auto-format. Validate while typing, not only on submit. Auto-scroll to the first error.

## Visual

Minimal, professional, generous whitespace, rounded corners, consistent spacing, accessible contrast, responsive.

## Accessibility

Keyboard first, visible focus, ARIA labels, screen-reader support, high contrast, touch-friendly targets (≥44px on mobile).

## Design system

Buttons, inputs, tables, cards, dialogs, dropdowns, badges, tags, tabs, pagination, loaders, toasts, modals behave identically everywhere unless there's a strong UX reason.

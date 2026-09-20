# State

Split rule: network data → server state, form values → RHF, everything else → local `useState`.
No duplicates, and no global client-state library.

| State                                 | Tool                                                                                |
| ------------------------------------- | ----------------------------------------------------------------------------------- |
| Fetched data, cache invalidation      | **TanStack Query 5** — client at `src/app/providers/query-client.ts`                |
| Form values, validation, submit state | **react-hook-form + zodResolver** (`zod/mini` schema inline in the controller hook) |
| Component-local UI                    | **`useState` / `useRef`** in the page's controller hook                             |
| Cross-tree UI preference (theme)      | **`useSyncExternalStore` store in `src/lib/`** — see below                          |

There is no Redux, Zustand, Jotai or React context for app state. The only provider is
`QueryClientProvider` (`src/app/providers/app-providers.tsx`), plus the devtools in dev.
`SessionListener` is mounted alongside it at the router root — it renders `null` and provides
nothing; it only listens for a 401 and sends the browser to `/login`.

## Server state

Reads that are cached go through a query hook next to their domain
(`src/api/process-backend/<domain>/use-<domain>-queries.ts`), never `src/hooks/`. Writes call the
service directly and invalidate by prefix. The full rule and the key-factory shape are in
[`api-layer.md`](./api-layer.md#query-vs-direct-call).

Client defaults: `staleTime: 30_000`, `retry: 1`, `refetchOnWindowFocus: false`; mutations
`retry: 0`.

## Form state

The controller hook owns the `UseFormReturn` and returns it whole; the page destructures
`register`, `formState` and friends from it. `isSubmitting` comes from `formState`, never a
parallel `useState`. Server-side field errors are written back with `setError`. See
[`pages.md`](./pages.md#form-patterns).

## Local UI state

Lives in the page's controller hook, in its `// state` section: the login `step`, the
`showPassword` toggle, the dashboard `date`, the companies-list `search`, the create-company
`createdName`. Components own only state that never leaves them — `WorkspaceShell`'s `collapsed`,
the command palette's `query` / `active`, `useDismissable`'s `open`.

## Shared stores in `src/lib/`

Two preferences outlive a component and are read in more than one place.

| Store                    | File                   | Storage key    | Shape                                                                                                                         |
| ------------------------ | ---------------------- | -------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Theme (`light`/`dark`)   | `src/lib/theme/`       | `pn.colorMode` | `<html data-theme>` is the source of truth; `useTheme()` is a `useSyncExternalStore` over it with a module-level listener set |
| Layout (`sidebar`/`top`) | `src/lib/layout-mode/` | `pn.layout`    | plain `useState` seeded from `localStorage`, written on change                                                                |

Why the difference: the theme toggle exists twice at once (top bar and account sheet), so both
must re-read one value — a `useState` copy in each would drift. The layout switch is rendered in
exactly one place (`WorkspaceShell`), so local state is enough. If a second consumer appears,
promote it to the same `useSyncExternalStore` shape.

Every `localStorage` access is wrapped in `try`/`catch` and falls back to the default, so a
private window or blocked storage never breaks a render. `layout-mode.test.ts` and `theme.test.ts`
both cover that path.

## What is deliberately absent

- No notifications/toast layer. Errors surface in the form, in an `EmptyState` or in `LoadError`.
- No online/offline state. The PWA caches the app shell only; API calls are network-only.
- **No separate session store.** The signed-in user is just another query: `meQueryOptions` under
  the key `['auth', 'me']`. The route guards read it through `loadSession()` with
  `staleTime: 'static'` and the shell reads the same cache entry through `useMe()`, so there is one
  fetch and one source of truth. `src/lib/auth/session.ts` imports the `queryClient` singleton
  directly — the one place React Query is used outside React, because middleware runs before any
  component does.

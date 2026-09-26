# Types

Live as close to their use as possible. Promote only when a second unrelated consumer appears.

## Placement (first match wins)

1. **One component's props** → inline `interface XProps { … }` in the `.tsx`, just above the
   component. Not exported unless a sibling needs it.
2. **A hook's return** → exported `interface Use<Page>Result` in the hook file, and the hook is
   annotated with it. Every controller hook has one.
3. **A zod-inferred form type** → `export type XFormInput = z.infer<typeof schema>` next to the
   schema, inline in the controller hook. The section components import it from there.
4. **Shared by two files in the same folder** → a named export from the file that owns the
   concept, imported sideways. `CompanyRow` and `COMPANY_SKELETON_ROWS` live in
   `sections/admin/company-card.tsx` and are imported by `companies-table.tsx` and the page's
   controller hook.
5. **API wire shape** → `@api/process-backend/<domain>/<domain>.types.ts`, re-exported from the
   domain's `index.ts`. Pages import from the domain, never the deep file.
6. **Cross-cutting primitives (3+ unrelated consumers)** → `src/types/` (alias `@shared`).

> **Today `src/types/` is empty**, and so is `src/assets/`. The `@shared` and `@assets` aliases
> are declared in `tsconfig.app.json` and `vite.config.ts` but nothing uses them. Don't create a
> file there to "organise" types — rule 6 has genuinely not triggered yet.

## Wire types

- Written by hand in `<domain>.types.ts` to match the API's response DTOs. There is no codegen.
- The envelope's own fields are snake_case (`status_code`, `message`, `data`) because that's what
  the API sends; everything inside `data` is camelCase.
- Money and quantities are **strings** (Prisma `Decimal`), and the type comment says so. See
  `dashboard.types.ts`.
- Payload types are separate from response types (`CreateCompanyPayload` vs
  `CreateCompanyResponse`), even when the response is an alias of an existing type.

## Rules

- **Filename**: `<domain>.types.ts` (dot-types) in the api layer. `types.ts` unqualified exists
  only at `src/api/process-backend/types.ts`, the package root, which holds the envelope and the
  error shapes. A contract shared by every domain but belonging to none goes beside it as
  `common.types.ts` — today that is `ListParams` and `Paged<T>`, the list contract.
- **`interface` for object shapes, `type` for unions and aliases.** `type UserRole = 'super_admin'
| 'company_admin'`, `interface Company { … }`.
- **Type-only imports are explicit**: `import type { … }`. Enforced by
  `@typescript-eslint/consistent-type-imports` as an error.
- **Const-assertion unions** where a runtime list and its type must agree:
  `const LETTER_TILE_TONES = [...] as const; type LetterTileTone = (typeof LETTER_TILE_TONES)[number]`.
  Same pattern for the `FIELDS` tuple + `isFieldName` guard in `use-create-company-page.ts`.
- **Generic components carry their type parameter**: `DataTable<T extends RowData>`. Its columns
  are TanStack `ColumnDef`s; it exports `DataTableFeatures` so a call site can type its
  `createColumnHelper`, and `DataTableColumnMeta` for the per-column `className`.

## Strictness the compiler already enforces

`tsconfig.app.json` turns on more than `strict`:

| Flag                                    | What it means in practice                                                                         |
| --------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `noUncheckedIndexedAccess`              | `array[0]` is `T \| undefined`. Hence `?? 'ink'` in `toneFor`, `!` only in tests                  |
| `exactOptionalPropertyTypes`            | An optional prop can't be passed as `undefined`. Spread it conditionally: `{...(x ? { x } : {})}` |
| `verbatimModuleSyntax`                  | `import type` is required for type-only imports                                                   |
| `noUnusedLocals` / `noUnusedParameters` | Dead bindings fail the build, not just the lint                                                   |

## Anti-patterns

- No `src/types/index.ts` barrel.
- No `any`. `unknown` + a type guard (`isRecord`, `isStringRecord` in `safe-api-error.ts`).
- No defining the same shape twice — import it sideways instead.
- No promoting a type to `@shared` because it "feels important".

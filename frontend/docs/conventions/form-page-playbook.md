# Form page playbook

**Start here to build a page.** The recipe below is what
`src/pages/admin/create-company/` and `src/pages/auth/login/` actually do. Mirror the closer of
the two rather than inventing a third shape.

Two kinds recur:

| Kind             | Example                               | Shape                                                                      |
| ---------------- | ------------------------------------- | -------------------------------------------------------------------------- |
| **Single form**  | `admin/create-company/`               | one `<form>`, one submit, a success card replaces it in place              |
| **Stepped form** | `auth/login/`                         | one RHF form, a `step` state, one section component per step               |
| **List / read**  | `admin/companies-list/`, `dashboard/` | no form; a query hook, local filter/date state, table-or-cards + skeletons |

---

## Recipe

### 1. Create the folder

```
src/pages/<group>/<page>/
  <page>-page.tsx
  use-<page>-page.ts
  <page>-page.test.tsx
```

Page-bound child components go in `src/components/sections/<group>/`, never in the page folder.

### 2. Write the schema in the hook file

Above the hook, module scope, using `zod/mini`:

```ts
import * as z from 'zod/mini';

const createCompanySchema = z.object({ … }).check((ctx) => { … });
export type CreateCompanyFormInput = z.infer<typeof createCompanySchema>;
```

Cross-field rules (either-or, conditional) go in the `.check()` block as
`ctx.issues.push({ code: 'custom', path: ['adminPhone'], message, input })`.
Extract to `<page>-schema.ts` only once the hook passes ~250 lines.

Also module scope, beside the schema: the `EMPTY` defaults object, a `toPayload(values)` that
trims / lower-cases / normalises, and a `to<Page>ErrorMessage(err)` that turns a
`NormalizedError` into user-facing copy.

### 3. Write the controller hook

Body order, with the comments kept in the file:

```
// state      useState / useRef
// wiring     useNavigate, useQueryClient, useForm, query hooks
// derived    values computed from the two above (useWatch before anything derived from it)
// callbacks  plain arrows: handleValidSubmit, handleSubmit, toggles, resets
// effects    every useEffect, grouped last
return { … };                       // typed by an exported Use<Page>Result
```

`useForm` config is always
`{ resolver: zodResolver(schema), defaultValues: EMPTY, mode: 'onSubmit' }`
(login adds `reValidateMode: 'onSubmit'` so a failed sign-in doesn't re-validate on every
keystroke).

### 4. Wire the submit

```ts
const handleValidSubmit = async (values: CreateCompanyFormInput) => {
  try {
    const response = await createCompany(toPayload(values));
    if (!isSuccess(response.data)) {
      setError('root', { type: 'server', message: '…' });
      return;
    }
    await queryClient.invalidateQueries({ queryKey: companiesKeys.all });
    setCreatedName(response.data.data.name);
  } catch (error) {
    safeApiError(error, {
      context: { page: 'create-company', action: 'createCompany' },
      onError: (err) => {
        /* err.fields → setError(field), else setError('root') */
      },
    });
  }
};

const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
  void form.handleSubmit(handleValidSubmit)(event);
};
```

Writes call the service **directly** — there is no `useMutation` anywhere in this codebase. The
hook owns the loading state (`formState.isSubmitting`) and invalidates the affected keys itself.
See [`api-layer.md`](./api-layer.md).

### 5. Render

The page destructures the hook in one statement and does nothing else but JSX:

```tsx
export const CreateCompanyPage = () => {
  const { form, isSubmitting, createdName, handleSubmit, … } = useCreateCompanyPage();
  const { register, formState: { errors } } = form;
  …
};
```

- `<title>New company · ProcessNow</title>` inside the page (React 19 hoists it).
- `<PageHeader title subtitle actions />` owns the single `<h1>`.
- Fields go through `FormField` (`@components/shared/form-field`), pick-lists through its
  twin `SelectField` (`@components/shared/select-field`: a native `<select>` with the design's
  chevron), or, for the login steps, `InputShell` + `FieldLabel` + `FieldError` directly. Never a
  hand-rolled `<input>` or `<select>` without label and error wiring.
- `<form noValidate onSubmit={handleSubmit}>` — the schema owns validation.
- `<Button type="submit" loading={isSubmitting}>` with a changed label
  (`Create company` → `Creating company…`). Never a full-page loader on submit.
- Form-level errors render `errors.root?.message` in a `role="alert"` block.

### 6. Test it

One co-located `*.test.tsx` covering the rules a reader can't see from the markup: which fields
are required, what the normalised payload looks like, what a rejected submit says. See
[`testing-and-env.md`](./testing-and-env.md).

---

## Build checklist

- [ ] Folder is `<page>-page.tsx` + `use-<page>-page.ts`; sections live under `components/sections/<group>/`
- [ ] Hook body follows state → wiring → derived → callbacks → effects → return
- [ ] Hook has an exported `Use<Page>Result` and is annotated with it
- [ ] Schema is inline in the hook, `zod/mini`, with cross-field rules in `.check()`
- [ ] `toPayload` trims / normalises; the raw form values never reach the service
- [ ] API result guarded with `if (!isSuccess(response.data)) return;` — negated, early exit
- [ ] `catch` goes through `safeApiError` with a `{ page, action }` context
- [ ] Field errors land on the field; everything else on `root`
- [ ] Writes invalidate the affected query keys through the domain's key factory
- [ ] Submit button: `loading`, changed label, no full-page loader
- [ ] Required fields carry `required`; an either-or pair is a `<fieldset>` with an `sr-only` `<legend>`
- [ ] Loading shows skeletons shaped like the content, not a spinner
- [ ] Empty and error states explain why and offer a way forward
- [ ] Focus is moved deliberately when the form is replaced or a submit fails
- [ ] Only design tokens in class names — no raw hex
- [ ] Memoized only where the identity is consumed (almost never — see [`code-conventions.md`](./code-conventions.md))
- [ ] Comments only for business logic, max 2 lines
- [ ] `yarn verify` passes from the repo root

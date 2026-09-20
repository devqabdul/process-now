# API layer

Everything global lives in `src/setup-app.ts`, which both `main.ts` and the e2e tests call — so a test
exercises the same prefix, pipe, interceptor and filter as the deployed app. Don't add global wiring in
`main.ts`; only things that need `ConfigService` at boot (CORS, trust proxy, Swagger) belong there.

## The envelope

One shape for every response, because the frontend's `isSuccess` and `safeApiError` helpers depend on it.

```json
{
  "status_code": 200,
  "message": "OK",
  "data": { "id": "018f…", "total": "450.00" }
}
```

`EnvelopeInterceptor` (`src/common/interceptors/envelope.interceptor.ts`) wraps whatever the handler
returns and uses the response's own status code; a handler returning nothing yields `"data": null`.

**Controllers return the payload, never the envelope.** Building `{ status_code, … }` by hand in a
handler double-wraps it. `status_code` is the one deliberate snake_case field on the wire; everything
inside `data` is camelCase, matching the Prisma field names.

## Errors

`HttpExceptionFilter` (`src/common/filters/http-exception.filter.ts`) catches everything and returns the
same shape without `data`, plus a flat `fields` map for validation errors:

```json
{
  "status_code": 422,
  "message": "Validation failed",
  "fields": { "items.0.qtyOut": "Can't return more than 15 received" }
}
```

Rules it enforces:

- **Anything unrecognised is a 500 with `"Internal server error"`** — no exception message reaches the
  client unless it came from an `HttpException`.
- **5xx is logged with method, path, `userId` and `companyId`**, or a bug report is "billing is broken"
  with nothing to match it against.
- **Prisma errors are logged as code + `meta` only.** The full error echoes the query arguments, which on
  a user create includes the password hash.

Prisma error mapping:

| Code                          | Status | Message                                   |
| ----------------------------- | ------ | ----------------------------------------- |
| `P2002` unique violation      | 409    | Already exists                            |
| `P2025` record not found      | 404    | Not found                                 |
| `P2003` foreign key violation | 409    | Related record is missing or still in use |
| `P2000` value too long        | 422    | Value is too long for this field          |
| `P2028` transaction timeout   | 503    | The request took too long, try again      |

Anything else from Prisma falls through to the 500 branch on purpose — an unmapped code is a bug to look
at, not a status to guess.

## Validation

The global `ValidationPipe` runs with `whitelist`, `forbidNonWhitelisted` and `transform`, and an
`exceptionFactory` that produces **422** (not Nest's default 400) with the flattened `fields` map. So an
unknown property — `companyId`, a client-supplied `unitPrice` — is a 422, not silently dropped.

- `transform: true` with `@Type(() => Number)` is how query params (always strings) become numbers;
  implicit conversion is deliberately off.
- **Use `@Optional()` from `src/common/validators.ts`, never class-validator's `@IsOptional()`** — the
  built-in one skips every other validator on an explicit `null`, so `{ "gstRate": null }` would pass
  and be written through. `@Optional()` only skips `undefined`.
- Shared field decorators live in `src/common/validators.ts`: `@IsName()`, `@IsPhone()`,
  `@IsEmailAddress()`, `@IsGstNo()`, `@IsAmount()`, `@IsDateOnly()`, plus `ParseDatePipe` for date route
  params. They also normalise — phone to 10 digits, email lowercased, GSTIN uppercased.
- `@IsAmount()` caps values at the `DECIMAL(12,2)` / `DECIMAL(12,3)` column limits, so an extra zero
  comes back as a 422 field error instead of a Postgres numeric overflow 500.
- For a 422 raised inside a service, use `fieldError('amount', 'Only ₹40.00 is due')` — same shape as the
  pipe's, so the frontend handles both identically.

## Paging

List endpoints take `limit` (default 50, max 100) and `cursor` (the id of the last row of the previous
page). Extend `PageQueryDto` and spread `paginate(query)` into the Prisma call. Cursor paging needs a
**total** order, so every list orders by its sort column **and then `id`** — `orderBy: [{ receivedAt:
'desc' }, { id: 'desc' }]`. Without the tiebreaker, rows sharing a timestamp can repeat or vanish
between pages.

## Swagger

Mounted at `/docs` (outside the version prefix) and **only outside production** — the document describes every route, DTO and
validation rule, including how to create an admin. `@ApiTags('<module>')` on each controller; DTOs carry
`@ApiProperty` where the type isn't obvious. Cookie auth is declared with `addCookieAuth('access_token')`.

## Other global setup

- **Prefix `/api/v1`** on everything, with `health/live` and `health/ready` excluded so platform probes
  can find them. Versioned from the start because an installed PWA can run a cached build for weeks.
- `helmet()`, `cookie-parser()`, CORS restricted to `WEB_ORIGIN` with `credentials: true`.
- Request bodies are capped at 256 kb; they're all small, and an unbounded one is a cheap way to exhaust
  memory.
- `ThrottlerModule` gives a loose global floor (300/min); login sets its own tight limit. The store is
  per-instance — it needs a shared store before a second replica runs.
- `enableShutdownHooks()`, plus keep-alive timeouts (65s/66s) set longer than a typical proxy's 60s idle
  timeout so the proxy closes idle connections rather than the app racing it into sporadic 502s.

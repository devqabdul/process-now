# Auth

NestJS issues its own JWT. **Supabase Auth is not used**, and neither is Passport — the main NestJS
authentication chapter uses a plain guard, and Passport is only an optional recipe, so
`@nestjs/passport`, `passport` and `passport-jwt` are not dependencies.

Two roles: `super_admin` and `company_admin`. There is one Company Admin login per company; vendors have
no login at all. Staff roles are deliberately out of scope for the POC.

## Passwords

`bcrypt` (cost 10). `bcrypt` 6 ships prebuilt binaries for macOS, Linux and Windows on x64 and arm64, so
`bcryptjs` isn't needed. Only `password_hash` is stored — nothing in the codebase logs, returns or
selects it into a response shape. Tests hash at cost 4 to stay fast; production code never lowers it.

## The session cookie

| Property   | Value                        | Why                                                      |
| ---------- | ---------------------------- | -------------------------------------------------------- |
| Name       | `access_token`               | `AUTH_COOKIE` in `src/common/auth.constants.ts`          |
| `httpOnly` | true                         | JavaScript can't read it, so XSS can't steal the session |
| `sameSite` | `lax`                        | See the hosting constraint below                         |
| `secure`   | `NODE_ENV === 'production'`  | Why `NODE_ENV` has no default in the env schema          |
| `path`     | `/`                          | —                                                        |
| Lifetime   | 24 h (`SESSION_TTL_SECONDS`) | Short enough that a leaked cookie can't ride for a week  |

The JWT payload is `{ userId, role, companyId, tokenVersion }` — the same object typed as `AuthUser` and
placed on `req.user`.

**`SameSite=Lax` means the PWA and the API must share a registrable domain** (`app.example.com` +
`api.example.com`). On unrelated domains the browser accepts the login cookie and never sends it back, so
every later request 401s. `SameSite=None; Secure` would need CSRF protection, which this codebase does
not have. Hosting is still open; this constraint is a requirement of whatever is chosen.

## Revocation

A 24-hour token that can't be revoked means logout is cosmetic. `users.token_version` fixes that:
`JwtAuthGuard` does one indexed lookup per request and rejects a token whose `tokenVersion` doesn't match
the row. Logout, a password change or a deleted user therefore take effect **immediately**.

That lookup is a deliberate trade — one small query per request in exchange for real revocation.

## Guards

Both are registered globally in `app.module.ts` via `APP_GUARD`, in order: authenticate, check the role,
then the rate limit.

- **`JwtAuthGuard`** — reads the cookie (via `cookie-parser`), `jwt.verifyAsync()`, checks
  `tokenVersion`, sets `req.user`. Skips routes marked `@Public()`.
- **`RolesGuard`** — enforces `@Roles([...])` from the handler or the controller class. No `@Roles` means
  any logged-in user, which is correct only for `/auth/me` and `/auth/password`.

**The guard is global and opt-out**, never opt-in: a new controller is protected by default, and
forgetting a decorator fails closed. Only four routes are `@Public()` — `health/live`, `health/ready`,
`auth/login` and `auth/logout`. Logout is public so a user holding an expired or already-revoked cookie
can still clear it; a still-valid cookie additionally revokes the session server-side.

`@Roles(['company_admin'])` goes on the **controller class**, so a route added later can't miss it.
`@Roles` is a `Reflector.createDecorator<Role[]>()`, so it takes an array.

Company scoping is separate from the role check and is in [`multi-tenancy.md`](./multi-tenancy.md).

## Login identifiers

Users log in with a **10-digit mobile number or an email**, plus a password — **decided**; most users
will use a mobile number.

- `users.phone` and `users.email` are both nullable and unique, with a hand-written check constraint
  requiring at least one (see [`database.md`](./database.md#migrations)).
- **Normalised before saving and before lookup** by `src/common/identifier.ts`: phone to bare 10 digits
  (spaces, dashes and a leading `+91` or `0` removed), email trimmed and lowercased.
- `POST /auth/login` takes `{ identifier, password }`. An identifier containing `@` is looked up as an
  email; anything else as a phone. That is all `parseIdentifier()` does — it returns the unique `where`
  clause.
- Creating a company's first admin (`POST /admin/companies`) requires a phone, an email, or both; the
  service checks both for an existing user and returns a 409 naming the field that clashed.

## One message for a failed login

A wrong password and a nonexistent user both return **401 "Wrong phone/email or password"**. Saying
"no such user" tells an attacker which numbers are registered.

Timing says the same thing, so `AuthService` compares against a module-level `DUMMY_HASH` when the user
doesn't exist — both paths run one bcrypt comparison and take the same time. A miss that skips the
compare is a user-enumeration oracle even with identical wording.

Login is rate-limited to **5 per minute** (`@Throttle`). That bucket is keyed by IP, so `TRUST_PROXY`
must match the number of proxies in front of the app — at 0 behind a proxy, every client shares one
bucket and five failed logins lock out everyone.

## Password change

`PATCH /auth/password` verifies `currentPassword` (a 422 naming the field if wrong), writes the new hash
and increments `tokenVersion` — revoking **every** session — then issues and sets a fresh cookie, so the
admin who just changed it isn't logged out of the device they're using.

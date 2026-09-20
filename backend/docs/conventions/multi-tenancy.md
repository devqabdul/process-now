# Multi-tenancy (the critical rule)

Every business row belongs to a company. Scoping happens **in NestJS**, not in Supabase Row Level
Security — Supabase is only the Postgres host. That makes the service layer the single thing standing
between FuseNow's data and CrushNow's, which is why this is the one rule to get right every time.

Source: [module-design.md → Principles](../../../docs/module-design.md#principles),
[backend-plan.md → Multi-company safety](../../../docs/backend-plan.md#multi-company-safety-the-most-important-rule).

## The five rules

1. **The JWT carries `{ userId, role, companyId, tokenVersion }`**, signed at login.
2. **A global `JwtAuthGuard`** verifies it on every route except `@Public()` ones and puts an `AuthUser`
   on `req.user`. `RolesGuard` then enforces `@Roles(['company_admin'])`.
3. **Services receive `companyId` from `@CompanyId()`** as their first argument. It is **never** read
   from the body, the query string or the URL.
4. **Every query includes `companyId`.**
5. **Another company's record returns 404, not 403**, so the API never confirms that a row exists.

## Getting `companyId`

`@CompanyId()` (`src/common/decorators/current-user.decorator.ts`) reads `req.user.companyId` and throws
`ForbiddenException` when it is null — a super admin has no company, so a super admin hitting a company
route fails closed rather than querying with `companyId: null`.

```ts
@Get(':id')
findOne(@CompanyId() companyId: string, @Param('id', ParseUUIDPipe) id: string) {
  return this.orders.findOne(companyId, id);
}
```

Use `@CurrentUser()` only when you need `userId` or `role` (auth routes). A DTO must never have a
`companyId` field; the global `ValidationPipe` runs with `forbidNonWhitelisted`, so a client that sends
one gets a 422 instead of being quietly ignored.

## Prisma call patterns

```ts
// ✅ single row — both filters, so another company's id simply doesn't match
this.prisma.order.findFirst({ where: { id, companyId } });

// ✅ same, when a miss should become a 404 — P2025 is mapped by the exception filter
this.prisma.order.findUniqueOrThrow({
  where: { id, companyId },
  include: orderInclude,
});

// ✅ list
this.prisma.vendor.findMany({ where: { companyId, ...filters } });

// ✅ write — companyId is in the where, not only in the data
this.prisma.serviceType.update({ where: { id, companyId }, data });

// ✅ child row — scope through the parent relation
tx.orderItem.update({ where: { id: item.id, order: { companyId } }, data });

// ❌ never: a valid uuid from another company returns that company's row
this.prisma.order.findUnique({ where: { id } });
this.prisma.order.update({ where: { id }, data });
```

`findUniqueOrThrow({ where: { id, companyId } })` works because Prisma allows non-unique filters
alongside a unique field in `where`. That is the preferred form for "fetch one or 404": Prisma throws
`P2025`, the exception filter turns it into `404 Not found`, and no branch has to be written by hand.

Raw SQL is the same rule, spelled out — `BillingService.recordPayment` takes its row lock with
`WHERE id = $1::uuid AND company_id = $2::uuid`, and treats an empty result as `NotFoundException`.

## 404, not 403

A 403 tells the caller "this exists but isn't yours", which leaks that FuseNow's competitor has an order
with that id. A 404 tells them nothing. So a wrong-company id must take exactly the path a nonexistent
id takes:

```ts
const vendor = await this.prisma.vendor.findFirst({
  where: { id: dto.vendorId, companyId },
});
if (!vendor) throw fieldError('vendorId', 'Vendor not found');
```

403 is reserved for a genuine role problem — `RolesGuard` rejecting a super admin on a company route, or
`@CompanyId()` finding no company on the token.

## Where the database backs this up

Scoping is enforced in code, but the schema makes mistakes survivable: every business table except
`order_items` has a `company_id` column with a foreign key and an index (`order_items` is scoped
through its order, so a query reaches it as `where: { order: { companyId } }`), `orders` and `bills` are unique on
`(company_id, order_no)` / `(company_id, bill_no)`, and a hand-written check constraint requires
`role = 'super_admin'` exactly when `company_id IS NULL`. None of that replaces filtering in the query.

## The test that proves it

`test/tenant-isolation.e2e-spec.ts` creates companies A and B, seeds B with a vendor, service type,
order and bill, logs in as A's admin and asserts:

| Case                                                                                   | Expected                                             |
| -------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| `GET /orders/:bId`, `/bills/:bId`, `/service-types/:bId` and `POST /orders/:bId/start` | 404                                                  |
| `PATCH /vendors/:bId`, `POST /bills/:bId/payments`                                     | 404                                                  |
| `POST /orders` with B's `vendorId` and `serviceTypeId`                                 | 422 with a `vendorId` field error                    |
| `GET /orders`, `/bills`, `/vendors`, `/service-types`                                  | empty — only A's rows, and A has none                |
| `POST /vendors` with `companyId` in the body                                           | 422 — `forbidNonWhitelisted`, the field is on no DTO |

**Add a case here whenever you add a company-scoped resource.** The spec is `describe.skipIf(!HAS_DB)`,
so it needs `DATABASE_URL` set to run.

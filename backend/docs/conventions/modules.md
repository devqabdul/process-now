# Building a module (start here)

Every feature module has the same shape. Mirror the closest existing one — `orders/` for anything with a
transaction, `vendors/` for plain CRUD — rather than inventing structure.

## File layout

```
src/orders/
  orders.module.ts             wiring only
  orders.controller.ts         routes: DTO in, one service call, result out
  orders.service.ts            business logic; every query filtered by companyId
  dto/
    order.dto.ts               request + query DTOs for this module
```

One DTO file per module is the norm here (`order.dto.ts`, `billing.dto.ts`, `vendor.dto.ts`); split into
`create-x.dto.ts` / `update-x.dto.ts` only when the file gets unwieldy. Pure logic shared by more than
one module lives in `src/common/` (`pricing.ts`, `dates.ts`, `option-groups.ts`), not in the module.

## The recipe

1. **Schema first.** Add the model to `prisma/schema.prisma` with `companyId`, `@@map`, `@map` and an
   index on `companyId`. `yarn prisma migrate dev --name <x>`. See [`database.md`](./database.md).
2. **DTOs.** class-validator decorators plus the shared helpers from `src/common/validators.ts`
   (`@IsName()`, `@IsPhone()`, `@IsAmount()`, `@Optional()`). Query DTOs extend `ListQueryDto` when the
   route lists rows. See [`api-layer.md`](./api-layer.md) and [`types.md`](./types.md).
3. **Service.** `@Injectable()`, constructor-inject `PrismaService`. **`companyId` is the first
   argument** of every method. Every query filters by it. See [`multi-tenancy.md`](./multi-tenancy.md).
4. **Controller.** Thin — see below.
5. **Module.** Register the controller and service. `PrismaModule` is `@Global()`, so don't import it.
6. **Register** the module in `src/app.module.ts`.
7. **Test.** A unit spec if the module owns pure logic; an e2e spec for a new write flow, and a line in
   `test/tenant-isolation.e2e-spec.ts` for a new company-scoped resource. See
   [`testing-and-env.md`](./testing-and-env.md).

## Thin controllers

A controller declares the route, pulls `@CompanyId()` and a validated DTO, calls **one** service method
and returns its result. No Prisma calls, no business logic, no `try/catch`, no envelope building.

```ts
@ApiTags('orders')
@Roles(['company_admin'])
@Controller('orders')
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Get(':id')
  findOne(
    @CompanyId() companyId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.orders.findOne(companyId, id);
  }
}
```

- `@Roles([...])` goes on the **class**, so a new route can't be added without a role.
- `@Param('id', ParseUUIDPipe)` on every uuid param — a malformed id becomes a 400, not a Postgres error.
- `@Post` routes that aren't creating a row get `@HttpCode(200)` (`/start`, `/return`, `/cancel`,
  `/void`, `/logout`, `/login`).
- The controller may hold presentation-only plumbing the service must not know about — `AuthController`
  owns the cookie options, because setting a cookie is an HTTP concern.

## Services

- `companyId` first, always: `findOne(companyId, id)`, `recordPayment(companyId, billId, dto)`.
- A `select` or `include` object shared by several methods is a module-level `const … as const`
  (`orderInclude`, `companySelect`, `detailInclude`), not repeated inline.
- Throw Nest exceptions, not custom ones: `NotFoundException`, `ConflictException`, and `fieldError()`
  from `src/common/validators.ts` for a 422 that names a DTO field. See
  [`code-conventions.md`](./code-conventions.md#errors).
- Pure functions used by a service (`priceItem`, `billTotals`, `dayRange`) live in `src/common/` with no
  Nest and no Prisma imports, so they're testable without a container or a database.

## Transaction boundaries

Multi-step writes run in `prisma.$transaction`. The three that exist:

| Flow                           | Steps in one transaction                                                     |
| ------------------------------ | ---------------------------------------------------------------------------- |
| `OrdersService.create`         | increment `next_order_no` → create order + items                             |
| `OrdersService.returnOrder`    | conditional status update → per-item `qtyOut` + `amount` → create bill       |
| `BillingService.recordPayment` | `SELECT … FOR UPDATE` on the bill → create payment → increment `amount_paid` |

A service called from **inside** another module's transaction takes the `Prisma.TransactionClient` as its
first argument and never opens its own — `BillingService.createForOrder(tx, companyId, orderId, amounts)`.
A long transaction gets an explicit timeout (`RETURN_TX = { maxWait: 5_000, timeout: 20_000 }`); the
default 5s is tight for a 50-item order and an abort would 500 the most important write in the app.

## When a module exports its service

Only when another module needs it, and dependencies go one way:

```
dashboard → billing → orders → service-types / vendors → companies
```

`OrdersModule` imports `ServiceTypesModule` and `BillingModule`, which export their services. Nothing
imports `OrdersModule`. A dependency that would close a cycle means the logic belongs in `src/common/`
instead.

## Checklist

- [ ] Every query filters by `companyId`; no bare `findUnique({ where: { id } })`
- [ ] `companyId` is the service method's first argument, taken from `@CompanyId()`
- [ ] Controller has no Prisma call, no logic, no `try/catch`
- [ ] `@Roles([...])` on the controller class; `@Public()` only where genuinely public
- [ ] DTOs validate every field; uuid params use `ParseUUIDPipe`
- [ ] Multi-step writes are in one `$transaction`
- [ ] Money is `Decimal` in and a string out; quantities are summed per unit
- [ ] Module registered in `app.module.ts`; exported only if another module needs it
- [ ] Tenant-isolation spec covers the new resource

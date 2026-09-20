# Business rules

The rules that make bills correct. Each one exists because getting it wrong costs a real company real
money. Source: [module-design.md](../../../docs/module-design.md) and
[backend-plan.md → Business rules](../../../docs/backend-plan.md#business-rules).

## Pricing is calculated server-side, always

The formula lives in one pure function, `priceItem()` in `src/common/pricing.ts` — no Nest, no Prisma,
fully unit-tested.

```
unit_price   = base_price + sum(chosen option prices)
unit_cost    = base_cost  + sum(chosen option costs)
billable_qty = bill_on === 'out' ? qty_out : qty_in
amount       = unit_price × billable_qty
```

- The server loads the service type from the database and **ignores any price the client sends**. Price
  fields are not on any order DTO, and `forbidNonWhitelisted` rejects them outright.
- Only **active** service types can be ordered — `findActiveByIds(companyId, ids)`.
- Chosen options are validated against the service type: an unknown group, an unknown choice, the same
  choice twice, or two choices in a `multi: false` group each throw `PricingError`, which the service
  converts to a 422 naming `items.<i>.selectedOptions`.
- The two shapes in production: FuseNow bills per `piece` on quantity **in** with add-on options
  (front 20, side 10 → unit price 30, 15 pieces = 450); CrushNow bills per `kg` on quantity **out** with
  a flat base price (8 × 95 kg = 760).
- **Limit, stated honestly:** this covers flat per-unit pricing plus add-ons. A genuinely new shape —
  tiered slabs, "first 100 kg at ₹8 then ₹6" — needs one new branch in `priceItem()`. It needs no change
  to tables or architecture.

## Snapshots

**An order item copies what it was priced with, so later edits never change an old bill.** At creation
time `order_items` stores `unitPrice`, `unitCost`, `selectedOptions` (name + price + cost per choice) and
`billOn`.

`billOn` is the one people forget. Without the snapshot, flipping a service type from `in` to `out` would
silently re-bill every past order and move every past day's dashboard figure. `DashboardService` reads
`it.billOn` from the item, never from the service type.

Service types are therefore **deactivated, never deleted** (`active: false`) — old orders reference them,
and the foreign key is `onDelete: Restrict`. When you add a field that pricing reads, snapshot it too.

## Status only moves forward

```
received → processing → returned
received | processing → cancelled
```

Anything else is **409**. `OrdersService.advance()` enforces it with a conditional `updateMany` filtered
on the allowed source statuses; zero rows updated means it then looks the order up to decide between 404
(missing, or another company's) and 409 (wrong status). The conditional update also makes a concurrent
double-return safe: the second one matches nothing and gets a 409 instead of a second bill.

Cancelling is only allowed **before** a bill exists. Once money is involved it has to be corrected
through the bill — `POST /bills/:id/void`, which is itself refused if the bill has payments, because a
refund has to be reconciled outside the app first.

## Per-company numbering

Order and bill numbers are per-company integers taken from `companies.next_order_no` /
`next_bill_no` — that is what keeps them gapless and unique. The prefix is presentation only:
the API formats them with the company's optional `number_prefix` (`FN` → `FN-0001`, none → `1`)
in `common/document-number.ts`, and a search accepts `FN-0012`, `0012` or `12`.

```ts
const { nextOrderNo } = await tx.company.update({
  where: { id: companyId },
  data: { nextOrderNo: { increment: 1 } },
  select: { nextOrderNo: true },
});
// use nextOrderNo - 1
```

The `UPDATE … RETURNING` locks the company row inside the transaction, so two simultaneous orders get
distinct numbers. `@@unique([companyId, orderNo])` is the backstop. Never read the counter, compute, then
write — that is the race this exists to avoid.

## Money

- `Decimal` throughout; never `number`, never float. See [`database.md`](./database.md#money-and-quantities).
- Round with `.toDecimalPlaces(2, Decimal.ROUND_HALF_UP)`, only at line and total level.
- Money leaves the API as an exact decimal **string**.
- **Pieces and kilograms are never added together.** The dashboard's `itemsProcessed` is a list of
  `{ unit, qty }`, summed per unit.

## GST

One rate per company, `settings.gstRate` (default 18) — **decided**. `gst_amount` is set **only when the
company has a GST number**; without one it is `null`, not zero, so a bill shows no GST line at all.

```
gst_amount = subtotal × gstRate / 100
total      = subtotal + (gst_amount ?? 0)
```

GST is collected for the government, so **profit starts from the pre-GST subtotal**, not the total.

## Amount due and bill status

**Status is computed, never stored.**

```
amount_due = total − amount_paid        (0 when the bill is voided)
status     = voided → 'voided' | amount_due > 0 → 'due' | otherwise 'paid'
```

`bills.amount_paid` is a running total maintained inside the payment transaction so `due` / `paid` can be
filtered in SQL rather than in memory. Recording a payment takes a `SELECT … FOR UPDATE` row lock first,
so two payments on one bill run one after the other and neither can overpay; an amount above what's due
is a 422 naming `amount`.

**Voided bills are excluded everywhere** unless explicitly asked for — the shared
`notVoided = { voidedAt: null }` predicate is exported from `billing.service.ts` and used by the
dashboard too.

## Dates

A business day is an **IST day** (`BUSINESS_TZ = 'Asia/Kolkata'` in `src/common/dates.ts`). Timestamp
columns are filtered with `dayRange(date)`, which converts the IST day to a UTC `[start, end)` pair;
`daily_logs.log_date` is a Postgres `DATE` and uses `toDateColumn` / `fromDateColumn`. Never build a day
boundary with `new Date()` arithmetic in a service.

Daily logs are one entry per company per day (upsert), and **cannot be entered for a future day**.
`GET /daily-logs` defaults to the last 30 days and refuses a range over a year.

## Returns

Quantity out **cannot exceed** quantity in, and every item of the order needs exactly one entry — no
duplicates, no omissions — or the whole return is a 422. The return runs as one transaction: status,
every item's `qtyOut` and `amount`, and the bill.

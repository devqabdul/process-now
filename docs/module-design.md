# Module Design (POC)

Based on [problem-statement.md](problem-statement.md). The data model is independent of the tech stack; it assumes a relational DB with JSON column support (e.g. Postgres `jsonb`).

## Principles

1. **Every row belongs to a company.** Every business table has `company_id`. The API takes `company_id` from the logged-in user's token, **never** from the request body. This scoping is what makes it safe to go from 2 to 10+ companies.
2. **Businesses differ in data, not code.** A new company, service type or price is a row, not a deploy.
3. **Bills are snapshots.** An order item copies its price, cost, chosen options **and `bill_on`** when it is created, so later edits to a service type never change old bills.

## Modules

| Module          | Owns                | POC responsibilities                                                      |
| --------------- | ------------------- | ------------------------------------------------------------------------- |
| `auth`          | users               | Login; two roles: `super_admin`, `company_admin`                          |
| `companies`     | companies           | Super Admin creates companies (optional GST, settings)                    |
| `vendors`       | vendors             | Company Admin adds and lists vendors                                      |
| `service-types` | service_types       | CRUD for service types and their pricing config                           |
| `orders`        | orders, order_items | Create order, set status, record quantity returned, **price calculation** |
| `billing`       | bills, payments     | Generate bill from order; record payments; amount due                     |
| `daily-logs`    | daily_logs          | One entry per company per day: machine hours and electricity units        |
| `bank-accounts` | bank_accounts       | Where the money sits (bank or cash); balance and statement per account    |
| `expenses`      | expenses            | Money paid out of an account, with a free-text category                   |
| `dashboard`     | (no tables)         | Read-only aggregate queries across the modules above                      |

Dependencies go one way: `dashboard` → `billing` → `orders` → `service-types` / `vendors` → `companies`. `bank-accounts` and `expenses` only read the tables they need; the open-account check they share with `billing` lives in `src/common/bank-account.ts`.

## Data model

```
companies
  id, name, gst_no (nullable),
  number_prefix (nullable)  -- shown on orders and bills: "FN" → FN-0001
  settings jsonb            -- { "electricityRate": 9.5, "gstRate": 18 } (camelCase: sent to the client as-is)
  next_order_no, next_bill_no  -- per-company counters, incremented atomically
  created_at

users
  id, company_id (null for super_admin), role, name, password_hash
  token_version             -- bumped on logout and password change; older tokens are rejected
  phone (nullable, unique), email (nullable, unique, stored lowercase)
  check: phone or email must be set

vendors
  id, company_id, name, phone, address (nullable)

service_types
  id, company_id, name, active
  unit          -- 'piece' | 'kg' | ... (label used in UI and bills)
  base_price    -- price per unit charged to the vendor
  base_cost     -- estimated processing cost per unit
  bill_on       -- 'in' | 'out': bill on quantity received or quantity returned
  options jsonb -- optional add-ons, see below

orders
  id, company_id, vendor_id, order_no
  status        -- 'received' | 'processing' | 'returned' | 'cancelled'
  received_at, returned_at (nullable), notes

order_items
  id, order_id, service_type_id
  selected_options jsonb  -- snapshot of chosen options
  bill_on                 -- snapshot: editing the service type later must not change this bill
  qty_in, qty_out (nullable until returned)
  unit_price, unit_cost   -- snapshots at creation time
  amount                  -- computed at return time

bills
  id, company_id, order_id (unique), bill_no, subtotal, gst_amount (nullable), total, issued_at
  amount_paid             -- running total, maintained inside the payment transaction
  voided_at, void_reason  -- a bill raised in error; excluded from dues and the dashboard

payments
  id, company_id, bill_id, amount, method, paid_at
  bank_account_id (nullable) -- the account the money landed in; unset = in no statement

bank_accounts
  id, company_id, name (unique per company), opening_balance, is_active
  -- balance = opening_balance + sum(payments) - sum(expenses); derived, never stored

expenses
  id, company_id, bank_account_id, category (free text), amount, spent_on (date), notes

daily_logs
  id, company_id, log_date, machine_hours, electricity_units, notes
  unique (company_id, log_date)
```

## Pricing: how one model covers both companies

`options` holds groups of add-ons. Each chosen option adds to the unit price and unit cost:

```
unit_price = base_price + sum(chosen option prices)
unit_cost  = base_cost  + sum(chosen option costs)
billable_qty = bill_on == 'out' ? qty_out : qty_in
amount = unit_price * billable_qty
```

**FuseNow: "Sherwani fusing", unit `piece`, bill_on `in`**

```json
{
  "base_price": 0,
  "base_cost": 0,
  "options": [
    {
      "group": "Part",
      "multi": true,
      "choices": [
        { "name": "Front", "price": 20, "cost": 6 },
        { "name": "Side", "price": 10, "cost": 3 }
      ]
    }
  ]
}
```

"15 pcs sherwani, front and side": unit price 30, amount 450.

**CrushNow: "Plastic crushing", unit `kg`, bill_on `out`**

```json
{ "base_price": 8, "base_cost": 3, "options": [] }
```

100 kg received, 95 kg returned: billed on 95 kg = 760.

**Limit (honest):** this covers flat per-unit pricing plus add-ons. A really new _shape_, such as tiered slabs ("first 100 kg at ₹8, then ₹6"), needs one new calculation branch. It needs no change to tables or architecture.

## Dashboard queries

| Metric                  | Source                                                                                                  |
| ----------------------- | ------------------------------------------------------------------------------------------------------- |
| Pending orders          | `orders` where status != 'returned'                                                                     |
| Amount to collect       | `sum(bills.total) - sum(payments.amount)`                                                               |
| Items processed per day | `sum(order_items.qty_out)` per unit (pieces and kg aren't added together), by `orders.returned_at` date |
| Machine hours per day   | `daily_logs.machine_hours`                                                                              |
| Electricity per day     | `daily_logs.electricity_units` (cost = units × `settings.electricityRate`)                              |
| Daily earnings          | `sum(bills.total)` by `issued_at` date                                                                  |
| Expenses per day        | `sum(expenses.amount)` by `spent_on`; shown beside profit, not subtracted (see Decisions 3)             |
| Estimated daily profit  | `sum(bills.subtotal)` (GST excluded) − `sum(unit_cost × billable_qty)` for that day's bills             |

## Tech stack

| Layer    | Choice                              |
| -------- | ----------------------------------- |
| Frontend | React + Vite + TypeScript, as a PWA |
| Backend  | NestJS + TypeScript                 |
| ORM      | Prisma                              |
| Database | Supabase PostgreSQL                 |

Notes:

- Each module in the table above is one NestJS module (`AuthModule`, `CompaniesModule`, and so on). Each has a controller, a service and DTOs.
- **Tenant scoping happens in NestJS**, not in Supabase Row Level Security: a JWT guard puts `companyId` on the request, and every service method filters by it. Supabase is used only as the Postgres host.
- **Auth:** NestJS issues its own JWT (bcrypt passwords in `users`). Supabase Auth is not used.
- **Prisma with Supabase:** the app connects through `@prisma/adapter-pg`. Since the API is a long-running server, the app and the Prisma CLI (migrations) both use the Supavisor session pooler (port 5432), set in `prisma.config.ts`. The transaction pooler (port 6543) is only for serverless hosting. See backend-plan.md.
- `jsonb` columns (`settings`, `options`, `selected_options`) map to Prisma `Json`. Money columns use `Decimal`, never float.

## Decisions

1. **Database:** PostgreSQL (hosted on Supabase).
2. **Machine hours:** entered manually by the Company Admin in the daily log, one entry per company per day. No `machines` table in the POC. Add one (plus `machine_id` on `daily_logs`) if a company later wants hours per machine.
3. **Profit:** the POC shows estimated profit (from service type costs), electricity cost and expenses as **separate** figures. How a company combines them is company-specific, so it is deferred. When needed, store the rule in `companies.settings` so the same code works for every company.

## Open decisions

1. **Hosting** for the NestJS API and the PWA.

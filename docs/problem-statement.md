# Problem Statement: Service Processing Management (POC)

## The problem

Job-work businesses take material from vendors, process it on machines, and return it. Today they can't easily see:

- Which orders are pending
- How much money vendors owe them
- How much they processed each day, how long the machines ran, and how much electricity was used
- Whether they made a profit that day

Every business works differently (per piece, per kg, by garment part), so fixed-field tools don't fit.

## Who it's for

It's built for a **client**. The first two companies are **FuseNow** (cloth fusing) and **CrushNow** (plastic crushing). The backend is **multi-company from day one**.

## Actors (POC)

| Actor         | Role                                                                                                |
| ------------- | --------------------------------------------------------------------------------------------------- |
| Super Admin   | Creates companies (basic features only)                                                             |
| Company Admin | **The only login per company.** Manages service types, orders, bills, daily logs and the dashboard. |
| Vendor        | Brings material and receives goods and a bill. No login.                                            |

## Core flow

1. The vendor brings material.
2. The Company Admin creates an order, e.g. "15 pcs sherwani, front and side".
3. The order is processed on a machine.
4. Goods are returned to the vendor.
5. A bill is generated from the service type's pricing.
6. The payment is tracked until it's collected.

## Service types (the core of the system)

- Each company defines its own service types.
- Each service type has **default values** for:
  - Pricing
  - Processing cost
  - How to handle a mismatch between quantity in and quantity out
- Pricing shapes are different for each company. The POC supports what FuseNow and CrushNow need.

## Daily log

Each day, the Company Admin enters:

- Machine operating hours
- The electricity meter reading (units consumed)

These real numbers are used for the efficiency and actual-cost figures. Service type defaults are used for per-order estimates.

## Company setup

- A GST number is an **optional field** when creating a company.

## Dashboard (POC)

- Pending orders
- Amounts to collect
- Items processed per day
- Machine operating time per day
- Electricity consumed per day
- Daily earnings and profit

## Out of scope (later)

- Vendor login, and sharing bills with vendors
- Multiple roles (owner vs staff)
- Offline mode
- Custom efficiency metrics for each company
- A full Super Admin panel

## Success criteria

- **Scalability:** the system grows from 2 to **10+ companies with no architecture changes**. Adding a company, or a new service type with different pricing, is done through configuration and data, not code.
- Modular design (companies, service types, orders, billing, daily log, dashboard) where every part can be extended later.
- Mobile-first PWA.

// Demo seed: one fully-used company — Shree Ganesh Fusing Works, Surat — with about two months
// of history: vendors, priced services, orders in every state, GST bills, part and full payments,
// a voided bill, bank accounts, expenses and daily logs. Money is priced with the API's own
// pricing functions, so every figure matches what the app would have computed.
// Usage: SEED_PASSWORD=... yarn seed:demo [--reset]
//   --reset deletes the demo company first and seeds it again; otherwise an existing one is kept.
import { PrismaPg } from '@prisma/adapter-pg';
import { Decimal } from '@prisma/client/runtime/client';
import bcrypt from 'bcrypt';
import { config } from 'dotenv';
import { addDays, today, toDateColumn } from '../src/common/dates.js';
import {
  billableQty,
  billTotals,
  lineAmount,
  type OptionGroup,
  priceItem,
} from '../src/common/pricing.js';
import { PrismaClient, type Prisma } from '../src/generated/prisma/client.js';

config({ quiet: true });

const password = process.env.SEED_PASSWORD;
if (!password || password.length < 8) {
  throw new Error('Set SEED_PASSWORD (8+ chars) to seed users.');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const COMPANY = {
  name: 'Shree Ganesh Fusing Works',
  gstNo: '24AAKFS4821M1Z3',
  numberPrefix: 'SGF',
  settings: { electricityRate: 9.25, gstRate: 18 },
};
const ADMIN = {
  name: 'Rakesh Patel',
  phone: '9876500001',
  email: 'rakesh@shreeganesh.demo',
};
const DAYS = 60;
const GST_RATE = COMPANY.settings.gstRate;

// Deterministic, so a re-run with --reset produces the same books.
let seed = 20260926;
const rand = () => {
  seed = (seed * 1_103_515_245 + 12_345) % 2_147_483_648;
  return seed / 2_147_483_648;
};
const between = (min: number, max: number) =>
  min + Math.floor(rand() * (max - min + 1));
const pick = <T>(items: readonly T[]) =>
  items[Math.floor(rand() * items.length)]!;
const chance = (p: number) => rand() < p;
// Regulars first: the top three vendors send most of the work, as in any real shop.
const pickWeighted = <T>(items: readonly T[], weights: readonly number[]) => {
  let r = rand() * weights.reduce((a, b) => a + b, 0);
  return items.find((_, i) => (r -= weights[i] ?? 1) < 0) ?? items[0]!;
};
const VENDOR_WEIGHTS = [6, 5, 4, 3, 3, 2, 2, 2, 1];

/** A moment on a business day, in IST. */
const at = (date: string, hour: number, minute = between(0, 59)) =>
  new Date(
    `${date}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00+05:30`,
  );
const isSunday = (date: string) => toDateColumn(date).getUTCDay() === 0;
const NOW = new Date();
// Nothing in the books may be dated later than the moment the seed runs.
const notAfterNow = (moment: Date) =>
  moment > NOW ? new Date(NOW.getTime() - 60_000) : moment;

/** Fresh lots are still in the shop; older ones have mostly gone back to the vendor. */
const statusFor = (
  age: number,
): 'received' | 'processing' | 'returned' | 'cancelled' => {
  if (age > 3 && chance(0.04)) return 'cancelled';
  if (age <= 1) return 'received';
  if (age <= 4)
    return pick(['received', 'processing', 'processing', 'returned'] as const);
  if (age <= 6 && chance(0.4)) return 'processing';
  return 'returned';
};

/** Two to five days in the shop, never on a Sunday, never past today. */
const returnDate = (received: string, age: number, end: string) => {
  if (age <= 5 && !isSunday(end) && chance(0.45)) return end;
  const day = addDays(received, Math.min(between(2, 5), age));
  if (!isSunday(day)) return day;
  return addDays(day, 1) <= end ? addDays(day, 1) : addDays(day, -1);
};

const VENDORS = [
  {
    name: 'Ravi Textiles',
    phone: '9825011223',
    address: 'Shop 14, Ring Road, Surat 395002',
  },
  {
    name: 'Meher Silk Mills',
    phone: '9824033451',
    address: 'Plot 22, Sachin GIDC, Surat 394230',
  },
  {
    name: 'Shree Balaji Garments',
    phone: '9898045612',
    address: '3rd Floor, Millennium Market, Surat',
  },
  {
    name: 'Laxmi Creations',
    phone: '9879056734',
    address: 'A-108, Varachha Road, Surat 395006',
  },
  {
    name: 'Anand Fashion House',
    phone: '9825067845',
    address: 'Katargam Darwaja, Surat 395004',
  },
  {
    name: 'Patel Tailoring Works',
    phone: '9737078956',
    address: 'Adajan Patiya, Surat 395009',
  },
  {
    name: 'Krishna Ethnic Wear',
    phone: '9909089067',
    address: 'Udhna Main Road, Surat 394210',
  },
  {
    name: 'Royal Sherwani House',
    phone: '9426090178',
    address: 'Chowk Bazaar, Surat 395003',
  },
  {
    name: 'Om Sai Uniforms',
    phone: '9825101289',
    address: 'Pandesara GIDC, Surat 394221',
  },
] as const;
// Retired: has history, takes no new orders.
const RETIRED_VENDOR = {
  name: 'Nakoda Textiles',
  phone: '9824112390',
  address: 'Salabatpura, Surat 395003',
};

interface ServiceSpec {
  name: string;
  unit: string;
  basePrice: number;
  baseCost: number;
  billOn: 'in' | 'out';
  options: OptionGroup[];
  isActive?: boolean;
  // Typical lot size.
  qty: [number, number];
}

const SERVICES: ServiceSpec[] = [
  {
    name: 'Sherwani fusing',
    unit: 'piece',
    basePrice: 25,
    baseCost: 9,
    billOn: 'in',
    qty: [40, 160],
    options: [
      {
        group: 'Part',
        multi: true,
        choices: [
          { name: 'Front', price: 20, cost: 6 },
          { name: 'Side', price: 10, cost: 3 },
          { name: 'Back', price: 15, cost: 5 },
          { name: 'Collar', price: 8, cost: 2 },
        ],
      },
      {
        group: 'Finish',
        multi: false,
        choices: [
          { name: 'Soft', price: 0, cost: 0 },
          { name: 'Stiff', price: 5, cost: 1 },
        ],
      },
    ],
  },
  {
    name: 'Collar fusing',
    unit: 'piece',
    basePrice: 4.5,
    baseCost: 1.4,
    billOn: 'in',
    qty: [300, 1200],
    options: [
      {
        group: 'Finish',
        multi: false,
        choices: [
          { name: 'Soft', price: 0, cost: 0 },
          { name: 'Stiff', price: 1, cost: 0.3 },
        ],
      },
    ],
  },
  {
    name: 'Kurta placket fusing',
    unit: 'piece',
    basePrice: 6,
    baseCost: 2,
    billOn: 'in',
    qty: [150, 600],
    options: [],
  },
  {
    name: 'Blazer front fusing',
    unit: 'piece',
    basePrice: 45,
    baseCost: 16,
    billOn: 'in',
    qty: [25, 120],
    options: [
      {
        group: 'Interlining',
        multi: false,
        choices: [
          { name: 'Standard', price: 0, cost: 0 },
          { name: 'Premium', price: 12, cost: 5 },
        ],
      },
    ],
  },
  {
    name: 'Fabric roll fusing',
    unit: 'metre',
    basePrice: 7.5,
    baseCost: 2.6,
    // Billed on the metres that come out good, not what went in.
    billOn: 'out',
    qty: [250, 1200],
    options: [
      {
        group: 'Interlining',
        multi: false,
        choices: [
          { name: 'Non-woven', price: 0, cost: 0 },
          { name: 'Woven', price: 2, cost: 0.8 },
        ],
      },
    ],
  },
  {
    name: 'Cuff fusing',
    unit: 'piece',
    basePrice: 3,
    baseCost: 1,
    billOn: 'in',
    qty: [200, 800],
    options: [],
    // Retired service: old orders keep it, new ones can't pick it.
    isActive: false,
  },
];

const ACCOUNTS = [
  { name: 'Cash in hand', openingBalance: 18_500 },
  { name: 'HDFC Current A/c', openingBalance: 245_000 },
  { name: 'SBI Savings A/c', openingBalance: 60_000 },
] as const;

async function reset() {
  const existing = await prisma.company.findMany({
    where: { name: COMPANY.name },
    select: { id: true },
  });
  const ids = existing.map((c) => c.id);
  if (!ids.length) return;
  const where = { companyId: { in: ids } };
  await prisma.expense.deleteMany({ where });
  await prisma.payment.deleteMany({ where });
  await prisma.bankAccount.deleteMany({ where });
  await prisma.bill.deleteMany({ where });
  await prisma.order.deleteMany({ where }); // order_items cascade
  await prisma.serviceType.deleteMany({ where });
  await prisma.vendor.deleteMany({ where });
  await prisma.dailyLog.deleteMany({ where });
  await prisma.user.deleteMany({ where });
  await prisma.company.deleteMany({ where: { id: { in: ids } } });
  console.log(`Removed the previous ${COMPANY.name}.`);
}

/** Picks the options a vendor would plausibly ask for on this service. */
const chooseOptions = (options: OptionGroup[]) =>
  options.flatMap(({ group, multi, choices }) => {
    if (multi) {
      const picked = choices.filter(() => chance(0.55));
      return (picked.length ? picked : [choices[0]!]).map((c) => ({
        group,
        choice: c.name,
      }));
    }
    return [{ group, choice: pick(choices).name }];
  });

async function main() {
  if (process.argv.includes('--reset')) await reset();
  if (await prisma.company.findFirst({ where: { name: COMPANY.name } })) {
    console.log(
      `${COMPANY.name} already exists — run with --reset to seed it again.`,
    );
    return;
  }

  const company = await prisma.company.create({ data: COMPANY });
  const companyId = company.id;
  const admin = await prisma.user.create({
    data: {
      ...ADMIN,
      role: 'company_admin',
      companyId,
      passwordHash: await bcrypt.hash(password!, 10),
    },
  });
  const audit = { createdBy: admin.id, updatedBy: admin.id };
  const end = today();
  const start = addDays(end, -DAYS);

  const vendors = await Promise.all(
    VENDORS.map((v) =>
      prisma.vendor.create({
        data: { ...v, companyId, ...audit, createdAt: at(start, 10) },
      }),
    ),
  );
  const retired = await prisma.vendor.create({
    data: {
      ...RETIRED_VENDOR,
      companyId,
      isActive: false,
      ...audit,
      createdAt: at(start, 10),
    },
  });

  const services = await Promise.all(
    SERVICES.map(({ qty: _qty, options, ...s }) =>
      prisma.serviceType.create({
        data: {
          ...s,
          companyId,
          options: options as unknown as Prisma.InputJsonValue,
          ...audit,
          createdAt: at(start, 10),
        },
      }),
    ),
  );
  const serviceSpec = new Map(services.map((s, i) => [s.id, SERVICES[i]!]));

  const accounts = await Promise.all(
    ACCOUNTS.map((a) =>
      prisma.bankAccount.create({
        data: { ...a, companyId, ...audit, createdAt: at(start, 9) },
      }),
    ),
  );
  const [cash, hdfc, sbi] = accounts as [
    (typeof accounts)[0],
    (typeof accounts)[0],
    (typeof accounts)[0],
  ];

  // ── Orders, returns and bills, day by day ──────────────────────────────────
  interface Planned {
    receivedAt: Date;
    returnedAt: Date | null;
    status: 'received' | 'processing' | 'returned' | 'cancelled';
    vendorId: string;
    notes: string | null;
    items: {
      serviceTypeId: string;
      billOn: 'in' | 'out';
      selectedOptions: Prisma.InputJsonValue;
      qtyIn: Decimal;
      qtyOut: Decimal | null;
      unitPrice: string;
      unitCost: string;
      amount: string | null;
    }[];
  }
  const planned: Planned[] = [];
  const activeServices = services.filter((s) => s.isActive);

  for (let d = 0; d <= DAYS; d += 1) {
    const date = addDays(start, d);
    if (isSunday(date)) continue;
    const age = DAYS - d;
    const lots = between(age === 0 ? 1 : 2, 4);
    for (let n = 0; n < lots; n += 1) {
      const receivedAt = notAfterNow(at(date, between(9, 18)));
      // The retired vendor stopped sending work a month ago.
      const vendor =
        age > 35 && chance(0.12)
          ? retired
          : pickWeighted(vendors, VENDOR_WEIGHTS);
      const lineCount = chance(0.65) ? 1 : chance(0.7) ? 2 : 3;
      const pool = age > 30 ? services : activeServices;
      const chosen = [...pool].sort(() => rand() - 0.5).slice(0, lineCount);

      const status = statusFor(age);
      const returnedAt =
        status === 'returned'
          ? notAfterNow(at(returnDate(date, age, end), between(11, 19)))
          : null;

      const items = chosen.map((st) => {
        const spec = serviceSpec.get(st.id)!;
        const {
          unitPrice,
          unitCost,
          chosen: picked,
        } = priceItem(
          {
            basePrice: st.basePrice,
            baseCost: st.baseCost,
            options: spec.options,
          },
          chooseOptions(spec.options),
        );
        const raw = between(spec.qty[0], spec.qty[1]);
        // Pieces come in round-ish counts; metres to one decimal.
        const qtyIn = new Decimal(
          spec.unit === 'piece'
            ? Math.round(raw / 5) * 5 || 5
            : raw + between(0, 9) / 10,
        );
        // A few pieces or metres come back rejected now and then.
        const qtyOut =
          status === 'returned'
            ? chance(0.25)
              ? qtyIn
                  .times(1 - between(1, 4) / 100)
                  .toDecimalPlaces(spec.unit === 'piece' ? 0 : 1)
              : qtyIn
            : null;
        const amount = qtyOut
          ? lineAmount(
              unitPrice,
              billableQty(st.billOn, qtyIn, qtyOut),
            ).toFixed(2)
          : null;
        return {
          serviceTypeId: st.id,
          billOn: st.billOn,
          selectedOptions: picked as unknown as Prisma.InputJsonValue,
          qtyIn,
          qtyOut,
          unitPrice: unitPrice.toFixed(2),
          unitCost: unitCost.toFixed(2),
          amount,
        };
      });

      planned.push({
        receivedAt,
        returnedAt,
        status,
        vendorId: vendor.id,
        notes:
          status === 'cancelled'
            ? 'Cancelled: vendor took the lot back before processing'
            : chance(0.2)
              ? pick([
                  'Urgent — wedding order',
                  'Two bundles, blue tags',
                  'Handle with care, silk',
                  'Deliver by Saturday',
                ])
              : null,
        items,
      });
    }
  }

  // Order numbers follow arrival; bill numbers follow the order they were raised in.
  planned.sort((a, b) => a.receivedAt.getTime() - b.receivedAt.getTime());
  const orders = [];
  for (const [i, p] of planned.entries()) {
    const order = await prisma.order.create({
      data: {
        companyId,
        vendorId: p.vendorId,
        orderNo: i + 1,
        status: p.status,
        receivedAt: p.receivedAt,
        returnedAt: p.returnedAt,
        notes: p.notes,
        ...audit,
        createdAt: p.receivedAt,
        items: { create: p.items.map((item) => ({ ...item, ...audit })) },
      },
    });
    orders.push({ ...p, id: order.id });
  }

  const returned = orders
    .filter((o) => o.status === 'returned')
    .sort((a, b) => a.returnedAt!.getTime() - b.returnedAt!.getTime());
  const bills = [];
  for (const [i, o] of returned.entries()) {
    const { subtotal, gstAmount, total } = billTotals(
      o.items.map((item) => item.amount!),
      GST_RATE,
    );
    const bill = await prisma.bill.create({
      data: {
        companyId,
        orderId: o.id,
        billNo: i + 1,
        subtotal: subtotal.toFixed(2),
        gstAmount: gstAmount?.toFixed(2) ?? null,
        total: total.toFixed(2),
        issuedAt: o.returnedAt!,
        ...audit,
        createdAt: o.returnedAt!,
      },
    });
    bills.push({ ...bill, total, returnedAt: o.returnedAt! });
  }

  await prisma.company.update({
    where: { id: companyId },
    data: { nextOrderNo: orders.length + 1, nextBillNo: bills.length + 1 },
  });

  // ── Payments: old bills mostly settled, recent ones mostly owed ────────────
  const voidIndex = Math.floor(bills.length * 0.45);
  let payments = 0;
  for (const [i, bill] of bills.entries()) {
    if (i === voidIndex) {
      await prisma.bill.update({
        where: { id: bill.id },
        data: {
          voidedAt: new Date(bill.returnedAt.getTime() + 3 * 3_600_000),
          voidReason: 'Rates entered wrongly — raised again on the next bill',
        },
      });
      continue;
    }
    const ageDays = (NOW.getTime() - bill.returnedAt.getTime()) / 86_400_000;
    const settle =
      ageDays > 25
        ? chance(0.85)
          ? 'full'
          : 'part'
        : ageDays > 8
          ? pick(['full', 'full', 'part', 'none'] as const)
          : pick(['none', 'none', 'part', 'full'] as const);
    if (settle === 'none') continue;

    // Bigger bills are often paid half now, half later; a part payment is a round figure.
    const half = bill.total.times(0.5).toDecimalPlaces(0);
    const parts: Decimal[] =
      settle === 'part'
        ? [bill.total.times(between(30, 70) / 100).toDecimalPlaces(0)]
        : chance(0.3) && bill.total.gt(2000)
          ? [half, bill.total.minus(half)]
          : [bill.total];

    let paid = new Decimal(0);
    let when = bill.returnedAt.getTime();
    for (const amount of parts) {
      when += between(1, 9) * 86_400_000;
      if (when > NOW.getTime()) break;
      const method = pick(['upi', 'upi', 'bank', 'cash', 'cheque'] as const);
      const account =
        method === 'cash'
          ? cash
          : method === 'upi'
            ? pick([hdfc, hdfc, sbi])
            : hdfc;
      const paidAt = new Date(when);
      await prisma.payment.create({
        data: {
          companyId,
          billId: bill.id,
          amount: amount.toFixed(2),
          method,
          // A few cash payments were never put into an account.
          bankAccountId: method === 'cash' && chance(0.15) ? null : account.id,
          paidAt,
          ...audit,
          createdAt: paidAt,
        },
      });
      paid = paid.plus(amount);
      payments += 1;
    }
    if (paid.gt(0))
      await prisma.bill.update({
        where: { id: bill.id },
        data: { amountPaid: paid.toFixed(2) },
      });
  }

  // ── Daily logs and expenses ────────────────────────────────────────────────
  const logs: Prisma.DailyLogCreateManyInput[] = [];
  const expenses: Prisma.ExpenseCreateManyInput[] = [];
  let unitsThisMonth = 0;
  const spend = (
    date: string,
    category: string,
    amount: number,
    bankAccountId: string,
    notes?: string,
  ) =>
    expenses.push({
      companyId,
      bankAccountId,
      category,
      amount: amount.toFixed(2),
      spentOn: toDateColumn(date),
      notes: notes ?? null,
      ...audit,
      createdAt: at(date, 17),
    });

  for (let d = 0; d <= DAYS; d += 1) {
    const date = addDays(start, d);
    const dom = Number(date.slice(8, 10));
    // Today's log is left for the admin to fill in, as the dashboard asks them to.
    if (!isSunday(date) && date !== end) {
      const hours = between(80, 110) / 10;
      const units = Math.round(hours * between(100, 130)) / 10;
      unitsThisMonth += units;
      logs.push({
        companyId,
        logDate: toDateColumn(date),
        machineHours: hours.toFixed(2),
        electricityUnits: units.toFixed(2),
        notes: chance(0.08)
          ? pick([
              'Press 2 down 2 hrs — heater coil replaced',
              'Power cut 11–12:30',
              'Extra shift for wedding orders',
            ])
          : null,
        ...audit,
        createdAt: at(date, 20),
      });
    }

    if (dom === 1) spend(date, 'Rent', 35_000, hdfc.id, 'Shed rent, Pandesara');
    if (dom === 5) {
      spend(date, 'Salary', 14_000, hdfc.id, 'Mukesh — press operator');
      spend(date, 'Salary', 12_500, hdfc.id, 'Sanjay — press operator');
      spend(date, 'Salary', 11_000, cash.id, 'Imran — helper');
    }
    if (dom === 8 && unitsThisMonth > 0) {
      spend(
        date,
        'Electricity',
        Math.round(unitsThisMonth * COMPANY.settings.electricityRate),
        hdfc.id,
        'DGVCL bill',
      );
      unitsThisMonth = 0;
    }
    if (isSunday(date)) continue;
    if (d % 7 === 2)
      spend(
        date,
        'Fusing film & interlining',
        between(6_000, 12_000),
        hdfc.id,
        'Weekly stock',
      );
    if (chance(0.55)) spend(date, 'Tea & snacks', between(120, 320), cash.id);
    if (chance(0.25))
      spend(date, 'Transport', between(400, 950), cash.id, 'Tempo — delivery');
    if (chance(0.04))
      spend(
        date,
        'Machine repair',
        between(1_500, 6_500),
        sbi.id,
        'Press maintenance',
      );
  }
  await prisma.dailyLog.createMany({ data: logs });
  await prisma.expense.createMany({ data: expenses });

  const counts = {
    vendors: vendors.length + 1,
    services: services.length,
    orders: orders.length,
    bills: bills.length,
    payments,
    expenses: expenses.length,
    dailyLogs: logs.length,
  };
  console.log(`Seeded ${COMPANY.name}:`, counts);
  console.log(
    `Sign in with ${ADMIN.phone} or ${ADMIN.email} and SEED_PASSWORD.`,
  );
}

try {
  await main();
} finally {
  await prisma.$disconnect();
}

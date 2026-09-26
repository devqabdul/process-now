import { Injectable } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/client';
import { notVoided } from '../billing/billing.service.js';
import { readSettings } from '../common/company-settings.js';
import { dayRange, today, toDateColumn } from '../common/dates.js';
import { formatDocumentNo } from '../common/document-number.js';
import { money } from '../common/money.js';
import { billableQty } from '../common/pricing.js';
import { PrismaService } from '../prisma/prisma.service.js';

const sum = (values: (Decimal | number | string)[]) =>
  values.reduce<Decimal>((acc, v) => acc.plus(v), new Decimal(0));

/** Enough rows for the dashboard preview; the full list lives at /orders. */
const PENDING_PREVIEW = 10;
const PENDING = ['received', 'processing'] as const;

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  /** All tiles for one business day, in one response. */
  async get(companyId: string, date = today()) {
    const range = dayRange(date);
    const [
      pendingOrders,
      pendingOrdersCount,
      totalOrders,
      billed,
      dayBills,
      returnedItems,
      log,
      company,
      dayExpenses,
    ] = await Promise.all([
      this.prisma.order.findMany({
        where: { companyId, status: { in: [...PENDING] } },
        select: {
          id: true,
          orderNo: true,
          status: true,
          receivedAt: true,
          vendor: { select: { name: true } },
          items: {
            select: {
              qtyIn: true,
              serviceType: { select: { name: true, unit: true } },
            },
            orderBy: { id: 'asc' },
          },
        },
        orderBy: [{ receivedAt: 'desc' }, { id: 'desc' }],
        take: PENDING_PREVIEW,
      }),
      this.prisma.order.count({
        where: { companyId, status: { in: [...PENDING] } },
      }),
      this.prisma.order.count({ where: { companyId } }),
      this.prisma.bill.aggregate({
        where: { companyId, ...notVoided },
        _sum: { total: true, amountPaid: true },
      }),
      this.prisma.bill.findMany({
        where: { companyId, issuedAt: range, ...notVoided },
        select: {
          subtotal: true,
          total: true,
          order: {
            select: {
              items: {
                select: {
                  qtyIn: true,
                  qtyOut: true,
                  unitCost: true,
                  billOn: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.orderItem.findMany({
        where: { order: { companyId, returnedAt: range, status: 'returned' } },
        select: { qtyOut: true, serviceType: { select: { unit: true } } },
      }),
      this.prisma.dailyLog.findUnique({
        where: {
          companyId_logDate: { companyId, logDate: toDateColumn(date) },
        },
      }),
      this.prisma.company.findUniqueOrThrow({
        where: { id: companyId },
        select: { settings: true, numberPrefix: true },
      }),
      this.prisma.expense.aggregate({
        where: { companyId, spentOn: toDateColumn(date) },
        _sum: { amount: true },
      }),
    ]);

    // Quantities are summed per unit: adding pieces to kg means nothing.
    const byUnit = new Map<string, Decimal>();
    for (const { qtyOut, serviceType } of returnedItems) {
      byUnit.set(
        serviceType.unit,
        (byUnit.get(serviceType.unit) ?? new Decimal(0)).plus(qtyOut ?? 0),
      );
    }

    // bill_on is the snapshot taken when the order was created, so an edited
    // service type can't change a past day's figures.
    const estimatedCost = sum(
      dayBills.flatMap((b) =>
        b.order.items.map((it) =>
          new Decimal(it.unitCost).times(
            billableQty(it.billOn, it.qtyIn, it.qtyOut ?? 0),
          ),
        ),
      ),
    );
    // GST is collected for the government, so profit starts from the pre-GST subtotal.
    const revenue = sum(dayBills.map((b) => b.subtotal));
    const { electricityRate } = readSettings(company.settings);

    return {
      date,
      pendingOrdersCount,
      hasOrders: totalOrders > 0,
      pendingOrders: pendingOrders.map((order) => ({
        id: order.id,
        orderNo: formatDocumentNo(company.numberPrefix, order.orderNo),
        vendorName: order.vendor.name,
        // The first line stands for the order in this preview; /orders has them all.
        serviceTypeName: order.items[0]?.serviceType.name ?? '',
        qtyIn: order.items[0]?.qtyIn.toString() ?? '0',
        unit: order.items[0]?.serviceType.unit ?? '',
        receivedAt: order.receivedAt.toISOString(),
        status: order.status as (typeof PENDING)[number],
      })),
      amountToCollect: money(
        new Decimal(billed._sum.total ?? 0).minus(billed._sum.amountPaid ?? 0),
      ),
      itemsProcessed: [...byUnit].map(([unit, qty]) => ({
        unit,
        qty: qty.toString(),
      })),
      dailyLog: log && {
        machineHours: log.machineHours.toString(),
        electricityUnits: log.electricityUnits.toString(),
        electricityCost: money(log.electricityUnits.times(electricityRate)),
      },
      earnings: money(sum(dayBills.map((b) => b.total))),
      estimatedCost: money(estimatedCost),
      estimatedProfit: money(revenue.minus(estimatedCost)),
      // Shown beside profit, not subtracted: how a company nets them is its own call.
      expenses: money(dayExpenses._sum.amount ?? 0),
    };
  }
}

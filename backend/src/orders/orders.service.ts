import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/client';
import { BillingService } from '../billing/billing.service.js';
import { fieldError } from '../common/validators.js';
import type { OrderStatus, Prisma } from '../generated/prisma/client.js';
import { companyPrefix } from '../common/company-number.js';
import {
  formatDocumentNo,
  parseDocumentNo,
} from '../common/document-number.js';
import { fitsInMoneyColumn, itemMoney, money } from '../common/money.js';
import {
  listArgs,
  paged,
  type ListSpec,
} from '../common/dto/list-query.dto.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ServiceTypesService } from '../service-types/service-types.service.js';
import type {
  CreateOrderDto,
  ListOrdersQueryDto,
  ReturnOrderDto,
} from './dto/order.dto.js';
import { readOptionGroups } from '../common/option-groups.js';
import {
  billableQty,
  lineAmount,
  PricingError,
  priceItem,
} from '../common/pricing.js';

// One statement per item plus the bill; the default 5s timeout is tight on a slow
// link with a 50-item order, and an abort here would 500 the most important write.
const RETURN_TX = { maxWait: 5_000, timeout: 20_000 };

const orderInclude = {
  vendor: { select: { id: true, name: true, phone: true } },
  items: {
    include: {
      serviceType: {
        select: { id: true, name: true, unit: true, billOn: true },
      },
    },
    orderBy: { id: 'asc' },
  },
  bill: { select: { id: true, billNo: true, total: true } },
} as const satisfies Prisma.OrderInclude;

type ItemMoney = {
  unitPrice: Prisma.Decimal;
  unitCost: Prisma.Decimal;
  amount: Prisma.Decimal | null;
};

/** Numbers carry the company's prefix; money crosses the wire with 2 decimals. */
const toView = <
  T extends {
    orderNo: number;
    items?: ItemMoney[];
    bill?: { billNo: number; total: Prisma.Decimal } | null;
  },
>(
  order: T,
  prefix: string | null,
) => ({
  ...order,
  orderNo: formatDocumentNo(prefix, order.orderNo),
  ...(order.items && { items: order.items.map(itemMoney) }),
  ...(order.bill && {
    bill: {
      ...order.bill,
      billNo: formatDocumentNo(prefix, order.bill.billNo),
      total: money(order.bill.total),
    },
  }),
});

const orderList: ListSpec<
  Prisma.OrderWhereInput,
  Prisma.OrderOrderByWithRelationInput
> = {
  search: (term) => {
    const orderNo = parseDocumentNo(term);
    return [
      { vendor: { name: { contains: term, mode: 'insensitive' } } },
      { notes: { contains: term, mode: 'insensitive' } },
      ...(orderNo !== undefined ? [{ orderNo }] : []),
    ];
  },
  sortable: {
    receivedAt: (dir) => [{ receivedAt: dir }],
    orderNo: (dir) => [{ orderNo: dir }],
    vendor: (dir) => [{ vendor: { name: dir } }],
  },
  defaultSort: '-receivedAt',
};

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly serviceTypes: ServiceTypesService,
    private readonly billing: BillingService,
  ) {}

  async findAll(companyId: string, query: ListOrdersQueryDto) {
    const { status, vendorId } = query;
    const args = listArgs(
      {
        companyId,
        status: status ? { in: status } : { not: 'cancelled' },
        vendorId: vendorId && { in: vendorId },
      },
      query,
      orderList,
    );
    const [prefix, orders, total] = await Promise.all([
      companyPrefix(this.prisma, companyId),
      this.prisma.order.findMany({ ...args, include: orderInclude }),
      this.prisma.order.count({ where: args.where }),
    ]);
    return paged(
      orders.map((order) => toView(order, prefix)),
      total,
      query,
    );
  }

  async findOne(companyId: string, id: string) {
    const [prefix, order] = await Promise.all([
      companyPrefix(this.prisma, companyId),
      this.prisma.order.findUniqueOrThrow({
        where: { id, companyId },
        include: orderInclude,
      }),
    ]);
    return toView(order, prefix);
  }

  async create(companyId: string, actor: string, dto: CreateOrderDto) {
    const vendor = await this.prisma.vendor.findFirst({
      where: { id: dto.vendorId, companyId, isActive: true },
      select: { id: true },
    });
    if (!vendor) throw fieldError('vendorId', 'Vendor not found or retired');

    const types = await this.serviceTypes.findActiveByIds(companyId, [
      ...new Set(dto.items.map((i) => i.serviceTypeId)),
    ]);
    const byId = new Map(types.map((t) => [t.id, t]));

    // Prices come from the DB, snapshotted onto each item.
    const items = dto.items.map((item, i) => {
      const st = byId.get(item.serviceTypeId);
      if (!st) {
        throw fieldError(`items.${i}.serviceTypeId`, 'Service type not found');
      }
      try {
        const { unitPrice, unitCost, chosen } = priceItem(
          { ...st, options: readOptionGroups(st.options) },
          item.selectedOptions,
        );
        // base + options can exceed the column even when each part is valid
        if (!fitsInMoneyColumn(unitPrice) || !fitsInMoneyColumn(unitCost)) {
          throw fieldError(
            `items.${i}.serviceTypeId`,
            'This service type prices out above the maximum this system can bill',
          );
        }
        return {
          serviceTypeId: st.id,
          billOn: st.billOn,
          createdBy: actor,
          updatedBy: actor,
          selectedOptions: chosen as unknown as Prisma.InputJsonValue,
          qtyIn: item.qtyIn,
          unitPrice: unitPrice.toFixed(2),
          unitCost: unitCost.toFixed(2),
        };
      } catch (e) {
        if (e instanceof PricingError) {
          throw fieldError(`items.${i}.selectedOptions`, e.message);
        }
        throw e;
      }
    });

    return this.prisma.$transaction(async (tx) => {
      // The UPDATE locks the company row, so concurrent orders get distinct numbers.
      const { nextOrderNo, numberPrefix } = await tx.company.update({
        where: { id: companyId },
        data: { nextOrderNo: { increment: 1 } },
        select: { nextOrderNo: true, numberPrefix: true },
      });
      const order = await tx.order.create({
        data: {
          companyId,
          vendorId: vendor.id,
          orderNo: nextOrderNo - 1,
          notes: dto.notes,
          createdBy: actor,
          updatedBy: actor,
          items: { create: items },
        },
        include: orderInclude,
      });
      return toView(order, numberPrefix);
    });
  }

  async start(companyId: string, actor: string, id: string) {
    await this.advance(this.prisma, companyId, id, ['received'], {
      status: 'processing',
      updatedBy: actor,
    });
    return this.findOne(companyId, id);
  }

  /**
   * Cancels an order taken in error. Only before it is returned: once a bill
   * exists the money has to be corrected through the bill, not the order.
   */
  async cancel(companyId: string, actor: string, id: string, reason: string) {
    const order = await this.prisma.order.findFirst({
      where: { id, companyId },
      select: { notes: true },
    });
    await this.advance(this.prisma, companyId, id, ['received', 'processing'], {
      status: 'cancelled',
      updatedBy: actor,
      notes: [order?.notes, `Cancelled: ${reason}`].filter(Boolean).join('\n'),
    });
    return this.findOne(companyId, id);
  }

  /** Sets quantity out and amounts, marks the order returned and creates its bill. */
  async returnOrder(
    companyId: string,
    actor: string,
    id: string,
    dto: ReturnOrderDto,
  ) {
    await this.prisma.$transaction(async (tx) => {
      // Conditional update first: a second concurrent return finds 0 rows and gets 409.
      await this.advance(tx, companyId, id, ['processing'], {
        status: 'returned',
        returnedAt: new Date(),
        updatedBy: actor,
      });
      const { items } = await tx.order.findUniqueOrThrow({
        where: { id, companyId },
        select: { items: true },
      });

      const index = new Map(dto.items.map((d, i) => [d.orderItemId, i]));
      if (
        index.size !== dto.items.length ||
        index.size !== items.length ||
        items.some((it) => !index.has(it.id))
      ) {
        throw fieldError(
          'items',
          'Enter the quantity returned for each item of this order, once',
        );
      }

      const amounts: Decimal[] = [];
      for (const item of items) {
        const i = index.get(item.id)!;
        const { qtyOut } = dto.items[i];
        if (new Decimal(qtyOut).gt(item.qtyIn)) {
          throw fieldError(
            `items.${i}.qtyOut`,
            `Can't return more than ${item.qtyIn.toString()} received`,
          );
        }
        const amount = lineAmount(
          item.unitPrice,
          billableQty(item.billOn, item.qtyIn, qtyOut),
        );
        // price × quantity can overflow the column; a 500 here would leave the
        // order stuck in processing with no way to bill it.
        if (!fitsInMoneyColumn(amount)) {
          throw fieldError(
            `items.${i}.qtyOut`,
            'This quantity bills above the maximum this system can handle',
          );
        }
        amounts.push(amount);
        await tx.orderItem.update({
          where: { id: item.id, order: { companyId } },
          data: { qtyOut, amount: amount.toFixed(2), updatedBy: actor },
        });
      }
      await this.billing.createForOrder(tx, companyId, actor, id, amounts);
    }, RETURN_TX);
    return this.findOne(companyId, id);
  }

  /** Status only moves forward. Missing (or another company's) → 404; wrong status → 409. */
  private async advance(
    db: Prisma.TransactionClient,
    companyId: string,
    id: string,
    from: OrderStatus[],
    data: Prisma.OrderUpdateManyMutationInput,
  ) {
    const { count } = await db.order.updateMany({
      where: { id, companyId, status: { in: from } },
      data,
    });
    if (count) return;
    const order = await db.order.findFirst({
      where: { id, companyId },
      select: { status: true },
    });
    if (!order) throw new NotFoundException('Not found');
    throw new ConflictException(
      `Order is ${order.status}; it must be ${from.join(' or ')} for this step`,
    );
  }
}

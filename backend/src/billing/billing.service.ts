import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/client';
import { assertBankAccount } from '../common/bank-account.js';
import { companyPrefix } from '../common/company-number.js';
import { readSettings } from '../common/company-settings.js';
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
import { billableQty, billTotals } from '../common/pricing.js';
import { fieldError } from '../common/validators.js';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { renderBillPdf } from './bill-pdf.js';
import type { ListBillsQueryDto, RecordPaymentDto } from './dto/billing.dto.js';

const listInclude = {
  order: {
    select: {
      id: true,
      orderNo: true,
      vendor: { select: { id: true, name: true } },
    },
  },
} as const;

const detailInclude = {
  payments: {
    include: { bankAccount: { select: { id: true, name: true } } },
    orderBy: { paidAt: 'asc' },
  },
  order: {
    include: {
      vendor: { select: { id: true, name: true, phone: true, address: true } },
      items: {
        include: {
          serviceType: { select: { id: true, name: true, unit: true } },
        },
        orderBy: { id: 'asc' },
      },
    },
  },
} as const satisfies Prisma.BillInclude;

type BillAmounts = {
  subtotal: Decimal;
  gstAmount: Decimal | null;
  total: Decimal;
  amountPaid: Decimal;
  voidedAt: Date | null;
  billNo: number;
  payments?: { amount: Decimal }[];
  order?: {
    orderNo: number;
    items?: {
      unitPrice: Decimal;
      unitCost: Decimal;
      amount: Decimal | null;
    }[];
  } | null;
};

/** "Finish: Stiff, Part: Front" from the options snapshotted on an item; jsonb is parsed, never cast. */
const describeOptions = (json: Prisma.JsonValue) =>
  (Array.isArray(json) ? json : [])
    .filter(
      (o): o is { group: string; name: string } =>
        !!o &&
        typeof o === 'object' &&
        !Array.isArray(o) &&
        typeof o.group === 'string' &&
        typeof o.name === 'string',
    )
    .map((o) => `${o.group}: ${o.name}`)
    .join(', ');

/** Status is derived, never stored: a voided bill owes nothing. */
function withStatus<T extends BillAmounts>(bill: T, prefix: string | null) {
  const amountDue = bill.voidedAt
    ? new Decimal(0)
    : bill.total.minus(bill.amountPaid);
  return {
    ...bill,
    billNo: formatDocumentNo(prefix, bill.billNo),
    subtotal: money(bill.subtotal),
    gstAmount: bill.gstAmount === null ? null : money(bill.gstAmount),
    total: money(bill.total),
    amountPaid: money(bill.amountPaid),
    ...(bill.payments && {
      payments: bill.payments.map((p) => ({ ...p, amount: money(p.amount) })),
    }),
    ...(bill.order && {
      order: {
        ...bill.order,
        orderNo: formatDocumentNo(prefix, bill.order.orderNo),
        ...(bill.order.items && { items: bill.order.items.map(itemMoney) }),
      },
    }),
    amountDue: money(amountDue),
    status: bill.voidedAt
      ? ('voided' as const)
      : amountDue.gt(0)
        ? ('due' as const)
        : ('paid' as const),
  };
}

/** Voided bills are excluded everywhere unless explicitly asked for. */
export const notVoided = { voidedAt: null } satisfies Prisma.BillWhereInput;

const billList: ListSpec<
  Prisma.BillWhereInput,
  Prisma.BillOrderByWithRelationInput
> = {
  search: (term) => {
    const billNo = parseDocumentNo(term);
    return [
      { order: { vendor: { name: { contains: term, mode: 'insensitive' } } } },
      ...(billNo !== undefined ? [{ billNo }] : []),
    ];
  },
  sortable: {
    issuedAt: (dir) => [{ issuedAt: dir }],
    billNo: (dir) => [{ billNo: dir }],
    total: (dir) => [{ total: dir }],
  },
  defaultSort: '-issuedAt',
};

@Injectable()
export class BillingService {
  constructor(private readonly prisma: PrismaService) {}

  /** Called by OrdersService inside the return transaction. */
  async createForOrder(
    tx: Prisma.TransactionClient,
    companyId: string,
    actor: string,
    orderId: string,
    amounts: Decimal[],
  ) {
    // The UPDATE locks the company row, so concurrent bills get distinct numbers.
    const company = await tx.company.update({
      where: { id: companyId },
      data: { nextBillNo: { increment: 1 } },
      select: { nextBillNo: true, gstNo: true, settings: true },
    });
    const gstRate = company.gstNo
      ? readSettings(company.settings).gstRate
      : null;
    const { subtotal, gstAmount, total } = billTotals(amounts, gstRate);
    if (!fitsInMoneyColumn(total)) {
      throw fieldError(
        'items',
        'This order bills above the maximum this system can handle',
      );
    }
    return tx.bill.create({
      data: {
        companyId,
        orderId,
        billNo: company.nextBillNo - 1,
        subtotal: subtotal.toFixed(2),
        gstAmount: gstAmount?.toFixed(2) ?? null,
        total: total.toFixed(2),
        createdBy: actor,
        updatedBy: actor,
      },
    });
  }

  /** due/paid is filtered in SQL against the maintained amount_paid column; several statuses OR together. */
  async findAll(companyId: string, query: ListBillsQueryDto) {
    const byStatus = {
      voided: { voidedAt: { not: null } },
      due: { ...notVoided, amountPaid: { lt: this.prisma.bill.fields.total } },
      paid: {
        ...notVoided,
        amountPaid: { gte: this.prisma.bill.fields.total },
      },
    } satisfies Record<string, Prisma.BillWhereInput>;
    const args = listArgs(
      {
        companyId,
        ...(query.status
          ? { OR: query.status.map((s) => byStatus[s]) }
          : notVoided),
      },
      query,
      billList,
    );
    const [prefix, bills, total] = await Promise.all([
      companyPrefix(this.prisma, companyId),
      this.prisma.bill.findMany({ ...args, include: listInclude }),
      this.prisma.bill.count({ where: args.where }),
    ]);
    return paged(
      bills.map((bill) => withStatus(bill, prefix)),
      total,
      query,
    );
  }

  async findOne(companyId: string, id: string) {
    const [prefix, bill] = await Promise.all([
      companyPrefix(this.prisma, companyId),
      this.prisma.bill.findUniqueOrThrow({
        where: { id, companyId },
        include: detailInclude,
      }),
    ]);
    return withStatus(bill, prefix);
  }

  /**
   * The bill as a PDF, drawn on request from its stored figures and never saved, so it always
   * matches the bill, payments included. Base64 inside the usual envelope.
   */
  async pdf(companyId: string, id: string) {
    const [prefix, company, bill] = await Promise.all([
      companyPrefix(this.prisma, companyId),
      this.prisma.company.findUniqueOrThrow({
        where: { id: companyId },
        select: { name: true, gstNo: true },
      }),
      this.prisma.bill.findUniqueOrThrow({
        where: { id, companyId },
        include: detailInclude,
      }),
    ]);
    const view = withStatus(bill, prefix);
    const { vendor } = bill.order;
    const buffer = await renderBillPdf({
      company,
      vendor,
      billNo: view.billNo,
      orderNo: view.order.orderNo,
      issuedAt: bill.issuedAt,
      status: view.status,
      voidReason: bill.voidReason,
      lines: bill.order.items.map((item) => ({
        service: item.serviceType.name,
        options: describeOptions(item.selectedOptions),
        qty: billableQty(
          item.billOn,
          item.qtyIn,
          item.qtyOut ?? item.qtyIn,
        ).toString(),
        unit: item.serviceType.unit,
        rate: money(item.unitPrice),
        amount: money(item.amount ?? 0),
      })),
      payments: bill.payments.map((p) => ({
        paidAt: p.paidAt,
        method: p.method,
        account: p.bankAccount?.name ?? null,
        amount: money(p.amount),
      })),
      subtotal: view.subtotal,
      gstAmount: view.gstAmount,
      total: view.total,
      amountPaid: view.amountPaid,
      amountDue: view.amountDue,
    });
    return {
      fileName: `bill-${view.billNo}.pdf`,
      contentType: 'application/pdf',
      base64: buffer.toString('base64'),
      // For sharing: WhatsApp opens a chat to this number.
      vendor: { name: vendor.name, phone: vendor.phone },
    };
  }

  async recordPayment(
    companyId: string,
    actor: string,
    billId: string,
    dto: RecordPaymentDto,
  ) {
    await this.prisma.$transaction(async (tx) => {
      // Row lock: two payments on one bill run one after the other, so neither overpays.
      const locked = await tx.$queryRaw<
        { total: Decimal; amount_paid: Decimal; voided_at: Date | null }[]
      >`
        SELECT total, amount_paid, voided_at FROM bills
        WHERE id = ${billId}::uuid AND company_id = ${companyId}::uuid
        FOR UPDATE`;
      if (!locked.length) throw new NotFoundException('Not found');
      const [bill] = locked;
      if (bill.voided_at) {
        throw new ConflictException('This bill is voided');
      }
      const due = new Decimal(bill.total).minus(bill.amount_paid);
      if (new Decimal(dto.amount).gt(due)) {
        throw fieldError(
          'amount',
          due.gt(0)
            ? `Only ₹${due.toFixed(2)} is due`
            : 'This bill is fully paid',
        );
      }
      if (dto.bankAccountId)
        await assertBankAccount(tx, companyId, dto.bankAccountId);
      await tx.payment.create({
        data: { ...dto, companyId, billId, createdBy: actor, updatedBy: actor },
      });
      // Kept in step with the payments inside the same lock, so the list can filter in SQL.
      await tx.bill.update({
        where: { id: billId, companyId },
        data: { amountPaid: { increment: dto.amount }, updatedBy: actor },
      });
    });
    return this.findOne(companyId, billId);
  }

  /**
   * Removes a payment recorded in error and puts the amount back on the bill.
   * Without this a mistyped payment is permanent: the bill can't be voided
   * either, because voiding refuses once money is recorded against it.
   */
  async deletePayment(
    companyId: string,
    actor: string,
    billId: string,
    id: string,
  ) {
    await this.prisma.$transaction(async (tx) => {
      // Same lock the payment path takes, so a delete and a payment can't
      // interleave and leave amount_paid disagreeing with the payment rows.
      const locked = await tx.$queryRaw<{ id: string }[]>`
        SELECT id FROM bills
        WHERE id = ${billId}::uuid AND company_id = ${companyId}::uuid
        FOR UPDATE`;
      if (!locked.length) throw new NotFoundException('Not found');

      const payment = await tx.payment.findFirst({
        where: { id, billId, companyId },
        select: { amount: true },
      });
      if (!payment) throw new NotFoundException('Not found');

      await tx.payment.delete({ where: { id } });
      await tx.bill.update({
        where: { id: billId, companyId },
        data: { amountPaid: { decrement: payment.amount }, updatedBy: actor },
      });
    });
    return this.findOne(companyId, billId);
  }

  /**
   * Voids a bill raised in error. Paid bills must be refunded and reconciled
   * outside the app first, so voiding one with payments is refused rather than
   * silently discarding the money.
   */
  async voidBill(companyId: string, actor: string, id: string, reason: string) {
    await this.prisma.$transaction(async (tx) => {
      // The same FOR UPDATE the payment path takes. Without it a void and a
      // payment can interleave and leave a voided bill holding money.
      const locked = await tx.$queryRaw<
        { amount_paid: Decimal; voided_at: Date | null }[]
      >`
        SELECT amount_paid, voided_at FROM bills
        WHERE id = ${id}::uuid AND company_id = ${companyId}::uuid
        FOR UPDATE`;
      if (!locked.length) throw new NotFoundException('Not found');
      const [bill] = locked;
      if (bill.voided_at) throw new ConflictException('Already voided');
      if (new Decimal(bill.amount_paid).gt(0)) {
        throw new ConflictException(
          'This bill has payments; refund and remove them before voiding',
        );
      }
      await tx.bill.update({
        where: { id, companyId },
        data: { voidedAt: new Date(), voidReason: reason, updatedBy: actor },
      });
    });
    return this.findOne(companyId, id);
  }
}

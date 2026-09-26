import { Injectable } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/client';
import { companyPrefix } from '../common/company-number.js';
import { dayRange } from '../common/dates.js';
import type { DateRangeQueryDto } from '../common/dto/date-range-query.dto.js';
import { resolveRange } from '../common/validators.js';
import {
  listArgs,
  paged,
  type ListSpec,
} from '../common/dto/list-query.dto.js';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type {
  CreateVendorDto,
  ListVendorsQueryDto,
  UpdateVendorDto,
} from './dto/vendor.dto.js';
import { buildStatementEntries } from './vendor-statement.js';

const vendorList: ListSpec<
  Prisma.VendorWhereInput,
  Prisma.VendorOrderByWithRelationInput
> = {
  search: (term) => [
    { name: { contains: term, mode: 'insensitive' } },
    { address: { contains: term, mode: 'insensitive' } },
    // Phones are stored as 10 digits, so "+91 98000" still matches.
    { phone: { contains: term.replace(/\D/g, '') || term } },
  ],
  sortable: {
    name: (dir) => [{ name: dir }],
    createdAt: (dir) => [{ createdAt: dir }],
  },
  defaultSort: 'name',
};

@Injectable()
export class VendorsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(companyId: string, query: ListVendorsQueryDto) {
    const args = listArgs({ companyId }, query, vendorList);
    const [vendors, total] = await Promise.all([
      this.prisma.vendor.findMany(args),
      this.prisma.vendor.count({ where: args.where }),
    ]);
    return paged(vendors, total, query);
  }

  findOne(companyId: string, id: string) {
    return this.prisma.vendor.findUniqueOrThrow({ where: { id, companyId } });
  }

  /**
   * Every order, bill and payment with this vendor in a window, and what they owed going in:
   * bills issued before `from` (voided ones excluded) less payments made before it.
   */
  async statement(companyId: string, id: string, query: DateRangeQueryDto) {
    const { from, to } = resolveRange(query.from, query.to);
    const window = { gte: dayRange(from).gte, lt: dayRange(to).lt };
    const before = { lt: window.gte };
    const ofVendor = { order: { vendorId: id } };
    const [vendor, prefix, orders, bills, payments, billedBefore, paidBefore] =
      await Promise.all([
        this.findOne(companyId, id),
        companyPrefix(this.prisma, companyId),
        this.prisma.order.findMany({
          where: { companyId, vendorId: id, receivedAt: window },
          select: {
            id: true,
            orderNo: true,
            status: true,
            receivedAt: true,
            items: {
              select: {
                qtyIn: true,
                serviceType: { select: { name: true, unit: true } },
              },
            },
          },
        }),
        this.prisma.bill.findMany({
          where: { companyId, ...ofVendor, issuedAt: window },
          select: {
            id: true,
            billNo: true,
            total: true,
            voidedAt: true,
            voidReason: true,
            issuedAt: true,
            order: { select: { id: true, orderNo: true } },
          },
        }),
        this.prisma.payment.findMany({
          where: { companyId, bill: ofVendor, paidAt: window },
          select: {
            id: true,
            amount: true,
            method: true,
            paidAt: true,
            bill: { select: { id: true, billNo: true } },
            bankAccount: { select: { name: true } },
          },
        }),
        this.prisma.bill.aggregate({
          where: { companyId, ...ofVendor, voidedAt: null, issuedAt: before },
          _sum: { total: true },
        }),
        this.prisma.payment.aggregate({
          where: { companyId, bill: ofVendor, paidAt: before },
          _sum: { amount: true },
        }),
      ]);

    const opening = (billedBefore._sum.total ?? new Decimal(0)).minus(
      paidBefore._sum.amount ?? new Decimal(0),
    );
    return {
      vendor,
      from,
      to,
      ...buildStatementEntries(prefix, opening, { orders, bills, payments }),
    };
  }

  create(companyId: string, actor: string, dto: CreateVendorDto) {
    return this.prisma.vendor.create({
      data: { ...dto, companyId, createdBy: actor, updatedBy: actor },
    });
  }

  /** Another company's vendor → P2025 → 404. */
  update(companyId: string, actor: string, id: string, dto: UpdateVendorDto) {
    return this.prisma.vendor.update({
      where: { id, companyId },
      data: { ...dto, updatedBy: actor },
    });
  }
}

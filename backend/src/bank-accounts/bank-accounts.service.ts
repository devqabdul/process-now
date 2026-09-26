import { Injectable } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/client';
import { companyPrefix } from '../common/company-number.js';
import { dayRange, today, toDateColumn } from '../common/dates.js';
import type { DateRangeQueryDto } from '../common/dto/date-range-query.dto.js';
import { formatDocumentNo } from '../common/document-number.js';
import { money } from '../common/money.js';
import { resolveRange } from '../common/validators.js';
import type { BankAccount } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type {
  CreateBankAccountDto,
  UpdateBankAccountDto,
} from './dto/bank-account.dto.js';

type Totals = Map<string | null, Decimal | null>;

/** Balance is derived on every read, so it can't drift from the rows behind it. */
const toView = (account: BankAccount, received: Totals, spent: Totals) => {
  const moneyIn = received.get(account.id) ?? new Decimal(0);
  const moneyOut = spent.get(account.id) ?? new Decimal(0);
  return {
    ...account,
    openingBalance: money(account.openingBalance),
    moneyIn: money(moneyIn),
    moneyOut: money(moneyOut),
    balance: money(account.openingBalance.plus(moneyIn).minus(moneyOut)),
  };
};

const byAccount = (
  rows: { bankAccountId: string | null; _sum: { amount: Decimal | null } }[],
): Totals => new Map(rows.map((r) => [r.bankAccountId, r._sum.amount]));

@Injectable()
export class BankAccountsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(companyId: string) {
    const [accounts, received, spent] = await Promise.all([
      this.prisma.bankAccount.findMany({
        where: { companyId },
        orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
      }),
      this.received(companyId),
      this.spent(companyId),
    ]);
    return accounts.map((a) => toView(a, received, spent));
  }

  async findOne(companyId: string, id: string) {
    const [account, received, spent] = await Promise.all([
      this.prisma.bankAccount.findUniqueOrThrow({ where: { id, companyId } }),
      this.received(companyId, id),
      this.spent(companyId, id),
    ]);
    return toView(account, received, spent);
  }

  /** A duplicate name → P2002 → 409. */
  async create(companyId: string, actor: string, dto: CreateBankAccountDto) {
    const { id } = await this.prisma.bankAccount.create({
      data: { ...dto, companyId, createdBy: actor, updatedBy: actor },
      select: { id: true },
    });
    return this.findOne(companyId, id);
  }

  /** Another company's account → P2025 → 404. */
  async update(
    companyId: string,
    actor: string,
    id: string,
    dto: UpdateBankAccountDto,
  ) {
    await this.prisma.bankAccount.update({
      where: { id, companyId },
      data: { ...dto, updatedBy: actor },
    });
    return this.findOne(companyId, id);
  }

  /** Payments in and expenses out for one account, newest first. */
  async statement(companyId: string, id: string, query: DateRangeQueryDto) {
    const { from, to } = resolveRange(query.from, query.to);
    const [account, prefix, payments, expenses] = await Promise.all([
      this.findOne(companyId, id),
      companyPrefix(this.prisma, companyId),
      this.prisma.payment.findMany({
        where: {
          companyId,
          bankAccountId: id,
          paidAt: { gte: dayRange(from).gte, lt: dayRange(to).lt },
        },
        select: {
          id: true,
          amount: true,
          method: true,
          paidAt: true,
          bill: {
            select: {
              id: true,
              billNo: true,
              order: { select: { vendor: { select: { name: true } } } },
            },
          },
        },
      }),
      this.prisma.expense.findMany({
        where: {
          companyId,
          bankAccountId: id,
          spentOn: { gte: toDateColumn(from), lte: toDateColumn(to) },
        },
        select: {
          id: true,
          amount: true,
          category: true,
          notes: true,
          spentOn: true,
          createdAt: true,
        },
      }),
    ]);

    const entries = [
      ...payments.map((p) => ({
        kind: 'in' as const,
        id: p.id,
        date: today(p.paidAt),
        at: p.paidAt.toISOString(),
        amount: money(p.amount),
        title: p.bill.order.vendor.name,
        detail: `${formatDocumentNo(prefix, p.bill.billNo)} · ${p.method}`,
        billId: p.bill.id,
      })),
      ...expenses.map((e) => ({
        kind: 'out' as const,
        id: e.id,
        date: e.spentOn.toISOString().slice(0, 10),
        at: e.createdAt.toISOString(),
        amount: money(e.amount),
        title: e.category,
        detail: e.notes,
        billId: null,
      })),
    ].sort((a, b) =>
      a.date === b.date
        ? b.at.localeCompare(a.at)
        : b.date.localeCompare(a.date),
    );

    // ponytail: no running balance per row; add one (balance before `from`
    // plus a prefix sum) if the admin asks to reconcile against a passbook.
    return {
      account,
      from,
      to,
      moneyIn: money(
        payments.reduce((s, p) => s.plus(p.amount), new Decimal(0)),
      ),
      moneyOut: money(
        expenses.reduce((s, e) => s.plus(e.amount), new Decimal(0)),
      ),
      entries,
    };
  }

  private async received(companyId: string, id?: string) {
    const rows = await this.prisma.payment.groupBy({
      by: ['bankAccountId'],
      where: { companyId, bankAccountId: id ?? { not: null } },
      _sum: { amount: true },
    });
    return byAccount(rows);
  }

  private async spent(companyId: string, id?: string) {
    const rows = await this.prisma.expense.groupBy({
      by: ['bankAccountId'],
      where: { companyId, ...(id && { bankAccountId: id }) },
      _sum: { amount: true },
    });
    return byAccount(rows);
  }
}

import { Injectable } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/client';
import { assertBankAccount } from '../common/bank-account.js';
import { fromDateColumn, today, toDateColumn } from '../common/dates.js';
import { money } from '../common/money.js';
import { fieldError, resolveRange } from '../common/validators.js';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type {
  CreateExpenseDto,
  ListExpensesQueryDto,
  UpdateExpenseDto,
} from './dto/expense.dto.js';

const expenseInclude = {
  bankAccount: { select: { id: true, name: true } },
} as const satisfies Prisma.ExpenseInclude;

type ExpenseRow = Prisma.ExpenseGetPayload<{ include: typeof expenseInclude }>;

const toView = (e: ExpenseRow) => ({
  ...e,
  amount: money(e.amount),
  spentOn: fromDateColumn(e.spentOn),
});

const spentOnColumn = (date: string) => {
  if (date > today())
    throw fieldError('spentOn', "Can't record a future expense");
  return toDateColumn(date);
};

@Injectable()
export class ExpensesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(companyId: string, query: ListExpensesQueryDto) {
    const { from, to } = resolveRange(query.from, query.to);
    const expenses = await this.prisma.expense.findMany({
      where: {
        companyId,
        spentOn: { gte: toDateColumn(from), lte: toDateColumn(to) },
        bankAccountId: query.bankAccountId,
        category: query.category && {
          equals: query.category,
          mode: 'insensitive',
        },
      },
      include: expenseInclude,
      orderBy: [{ spentOn: 'desc' }, { id: 'desc' }],
    });
    return {
      from,
      to,
      total: money(expenses.reduce((s, e) => s.plus(e.amount), new Decimal(0))),
      expenses: expenses.map(toView),
    };
  }

  /** Categories this company has used, for the form's suggestions. */
  async categories(companyId: string) {
    const rows = await this.prisma.expense.findMany({
      where: { companyId },
      distinct: ['category'],
      select: { category: true },
      orderBy: { category: 'asc' },
      take: 100,
    });
    return rows.map((r) => r.category);
  }

  async create(companyId: string, actor: string, dto: CreateExpenseDto) {
    await assertBankAccount(this.prisma, companyId, dto.bankAccountId);
    const expense = await this.prisma.expense.create({
      data: {
        ...dto,
        spentOn: spentOnColumn(dto.spentOn),
        companyId,
        createdBy: actor,
        updatedBy: actor,
      },
      include: expenseInclude,
    });
    return toView(expense);
  }

  /** Another company's expense → P2025 → 404. */
  async update(
    companyId: string,
    actor: string,
    id: string,
    dto: UpdateExpenseDto,
  ) {
    if (dto.bankAccountId)
      await assertBankAccount(this.prisma, companyId, dto.bankAccountId);
    const expense = await this.prisma.expense.update({
      where: { id, companyId },
      data: {
        ...dto,
        ...(dto.spentOn && { spentOn: spentOnColumn(dto.spentOn) }),
        updatedBy: actor,
      },
      include: expenseInclude,
    });
    return toView(expense);
  }

  /** Removes an expense recorded in error; the account balance follows. */
  async remove(companyId: string, id: string) {
    const expense = await this.prisma.expense.delete({
      where: { id, companyId },
      include: expenseInclude,
    });
    return toView(expense);
  }
}

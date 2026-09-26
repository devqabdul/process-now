import { Injectable } from '@nestjs/common';
import { assertBankAccount } from '../common/bank-account.js';
import {
  listArgs,
  paged,
  type ListSpec,
} from '../common/dto/list-query.dto.js';
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

const expenseList: ListSpec<
  Prisma.ExpenseWhereInput,
  Prisma.ExpenseOrderByWithRelationInput
> = {
  search: (term) => [
    { category: { contains: term, mode: 'insensitive' } },
    { notes: { contains: term, mode: 'insensitive' } },
  ],
  sortable: {
    spentOn: (dir) => [{ spentOn: dir }],
    amount: (dir) => [{ amount: dir }],
    category: (dir) => [{ category: dir }],
  },
  defaultSort: '-spentOn',
};

const spentOnColumn = (date: string) => {
  if (date > today())
    throw fieldError('spentOn', "Can't record a future expense");
  return toDateColumn(date);
};

@Injectable()
export class ExpensesService {
  constructor(private readonly prisma: PrismaService) {}

  /** One page of expenses in the window; `sum` covers every matching row, not just the page. */
  async findAll(companyId: string, query: ListExpensesQueryDto) {
    const { from, to } = resolveRange(query.from, query.to);
    const args = listArgs(
      {
        companyId,
        spentOn: { gte: toDateColumn(from), lte: toDateColumn(to) },
        bankAccountId: query.bankAccountId,
        ...(query.category && {
          OR: query.category.map((category) => ({
            category: { equals: category, mode: 'insensitive' as const },
          })),
        }),
      },
      query,
      expenseList,
    );
    const [expenses, total, sum] = await Promise.all([
      this.prisma.expense.findMany({ ...args, include: expenseInclude }),
      this.prisma.expense.count({ where: args.where }),
      this.prisma.expense.aggregate({
        where: args.where,
        _sum: { amount: true },
      }),
    ]);
    return {
      ...paged(expenses.map(toView), total, query),
      sum: money(sum._sum.amount ?? 0),
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

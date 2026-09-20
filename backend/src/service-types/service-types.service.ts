import { Injectable } from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client.js';
import { money } from '../common/money.js';
import { fieldError } from '../common/validators.js';
import { paginate, type PageQueryDto } from '../common/dto/page-query.dto.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type {
  CreateServiceTypeDto,
  OptionGroupDto,
  UpdateServiceTypeDto,
} from './dto/service-type.dto.js';

const hasDuplicates = (names: string[]) =>
  new Set(names.map((n) => n.toLowerCase())).size !== names.length;

/** Group names, and choice names within a group, must be unique: orders select by name. */
function assertUniqueNames(options: OptionGroupDto[] = []) {
  if (hasDuplicates(options.map((g) => g.group))) {
    throw fieldError('options', 'Option group names must be unique');
  }
  options.forEach((g, i) => {
    if (hasDuplicates(g.choices.map((c) => c.name))) {
      throw fieldError(
        `options.${i}.choices`,
        `Choices in "${g.group}" must be unique`,
      );
    }
  });
}

const toView = <
  T extends { basePrice: Prisma.Decimal; baseCost: Prisma.Decimal },
>(
  serviceType: T,
) => ({
  ...serviceType,
  basePrice: money(serviceType.basePrice),
  baseCost: money(serviceType.baseCost),
});

@Injectable()
export class ServiceTypesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(companyId: string, query: PageQueryDto) {
    const serviceTypes = await this.prisma.serviceType.findMany({
      where: { companyId },
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }, { id: 'asc' }],
      ...paginate(query),
    });
    return serviceTypes.map(toView);
  }

  async findOne(companyId: string, id: string) {
    return toView(
      await this.prisma.serviceType.findUniqueOrThrow({
        where: { id, companyId },
      }),
    );
  }

  /** Active service types by id, for pricing an order. */
  findActiveByIds(companyId: string, ids: string[]) {
    return this.prisma.serviceType.findMany({
      where: { companyId, isActive: true, id: { in: ids } },
    });
  }

  async create(companyId: string, actor: string, dto: CreateServiceTypeDto) {
    assertUniqueNames(dto.options);
    return toView(
      await this.prisma.serviceType.create({
        data: {
          ...dto,
          options: toJson(dto.options ?? []),
          companyId,
          createdBy: actor,
          updatedBy: actor,
        },
      }),
    );
  }

  async update(
    companyId: string,
    actor: string,
    id: string,
    dto: UpdateServiceTypeDto,
  ) {
    assertUniqueNames(dto.options);
    return toView(
      await this.prisma.serviceType.update({
        where: { id, companyId },
        data: {
          ...dto,
          options: dto.options && toJson(dto.options),
          updatedBy: actor,
        },
      }),
    );
  }
}

/** Strips DTO class instances down to plain JSON for the jsonb column. */
const toJson = (options: OptionGroupDto[]) =>
  options.map(({ group, multi, choices }) => ({
    group,
    multi,
    choices: choices.map(({ name, price, cost }) => ({ name, price, cost })),
  }));

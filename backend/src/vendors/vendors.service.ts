import { Injectable } from '@nestjs/common';
import { paginate } from '../common/dto/page-query.dto.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type {
  CreateVendorDto,
  ListVendorsQueryDto,
  UpdateVendorDto,
} from './dto/vendor.dto.js';

@Injectable()
export class VendorsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(companyId: string, query: ListVendorsQueryDto) {
    const term = query.q?.trim();
    return this.prisma.vendor.findMany({
      where: {
        companyId,
        ...(term && {
          OR: [
            { name: { contains: term, mode: 'insensitive' } },
            { phone: { contains: term.replace(/\D/g, '') || term } },
          ],
        }),
      },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
      ...paginate(query),
    });
  }

  findOne(companyId: string, id: string) {
    return this.prisma.vendor.findUniqueOrThrow({ where: { id, companyId } });
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

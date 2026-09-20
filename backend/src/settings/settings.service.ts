import { Injectable, NotFoundException } from '@nestjs/common';
import { readSettings } from '../common/company-settings.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { UpdateSettingsDto } from './dto/update-settings.dto.js';

const select = {
  id: true,
  name: true,
  gstNo: true,
  numberPrefix: true,
  settings: true,
} as const;

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async get(companyId: string) {
    const company = await this.prisma.company.findUniqueOrThrow({
      where: { id: companyId },
      select,
    });
    return { ...company, settings: readSettings(company.settings) };
  }

  async update(
    companyId: string,
    actor: string,
    { settings, ...fields }: UpdateSettingsDto,
  ) {
    // DTO instances carry unset fields as own `undefined` props; drop them before merging.
    const patch = Object.fromEntries(
      Object.entries(
        settings && !Array.isArray(settings) ? settings : {},
      ).filter(([, v]) => v !== undefined),
    );
    await this.prisma.$transaction(async (tx) => {
      await tx.company.update({
        where: { id: companyId },
        data: { ...fields, updatedBy: actor },
      });
      if (Object.keys(patch).length) {
        // Postgres merges the JSON, so two admins saving different rates at the
        // same moment can't drop each other's change.
        const merged = await tx.$executeRaw`
          UPDATE companies SET settings = settings || ${patch}::jsonb
          WHERE id = ${companyId}::uuid`;
        if (!merged) throw new NotFoundException('Not found');
      }
    });
    return this.get(companyId);
  }
}

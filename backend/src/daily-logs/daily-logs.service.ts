import { Injectable } from '@nestjs/common';
import {
  addDays,
  fromDateColumn,
  today,
  toDateColumn,
} from '../common/dates.js';
import { fieldError } from '../common/validators.js';
import type { DailyLog } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { UpsertDailyLogDto } from './dto/daily-log.dto.js';

const toView = (log: DailyLog) => ({
  ...log,
  logDate: fromDateColumn(log.logDate),
});

@Injectable()
export class DailyLogsService {
  constructor(private readonly prisma: PrismaService) {}

  async findRange(companyId: string, from?: string, to = today()) {
    from ??= addDays(to, -29);
    if (from > to) throw fieldError('from', '`from` must be on or before `to`');
    if (from < addDays(to, -366))
      throw fieldError('from', 'Pick at most a year');
    const logs = await this.prisma.dailyLog.findMany({
      where: {
        companyId,
        logDate: { gte: toDateColumn(from), lte: toDateColumn(to) },
      },
      orderBy: { logDate: 'desc' },
    });
    return logs.map(toView);
  }

  /** One day, or null when nothing has been logged for it yet. */
  async findOne(companyId: string, date: string) {
    const log = await this.prisma.dailyLog.findUnique({
      where: { companyId_logDate: { companyId, logDate: toDateColumn(date) } },
    });
    return log && toView(log);
  }

  /** One entry per company per day: creates it or overwrites it. */
  async upsert(
    companyId: string,
    actor: string,
    date: string,
    dto: UpsertDailyLogDto,
  ) {
    if (date > today()) throw fieldError('date', "Can't log a future day");
    const logDate = toDateColumn(date);
    const log = await this.prisma.dailyLog.upsert({
      where: { companyId_logDate: { companyId, logDate } },
      create: {
        ...dto,
        companyId,
        logDate,
        createdBy: actor,
        updatedBy: actor,
      },
      update: { ...dto, notes: dto.notes ?? null, updatedBy: actor },
    });
    return toView(log);
  }
}

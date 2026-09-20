import { Body, Controller, Get, Param, Put, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  CompanyId,
  CurrentUser,
} from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import type { AuthUser } from '../common/types/auth-user.js';
import { ParseDatePipe } from '../common/validators.js';
import { DailyLogsService } from './daily-logs.service.js';
import {
  ListDailyLogsQueryDto,
  UpsertDailyLogDto,
} from './dto/daily-log.dto.js';

@ApiTags('daily-logs')
@Roles(['company_admin'])
@Controller('daily-logs')
export class DailyLogsController {
  constructor(private readonly dailyLogs: DailyLogsService) {}

  @Get()
  findRange(
    @CompanyId() companyId: string,
    @Query() { from, to }: ListDailyLogsQueryDto,
  ) {
    return this.dailyLogs.findRange(companyId, from, to);
  }

  @Get(':date')
  findOne(
    @CompanyId() companyId: string,
    @Param('date', ParseDatePipe) date: string,
  ) {
    return this.dailyLogs.findOne(companyId, date);
  }

  @Put(':date')
  upsert(
    @CompanyId() companyId: string,
    @CurrentUser() user: AuthUser,
    @Param('date', ParseDatePipe) date: string,
    @Body() dto: UpsertDailyLogDto,
  ) {
    return this.dailyLogs.upsert(companyId, user.userId, date, dto);
  }
}

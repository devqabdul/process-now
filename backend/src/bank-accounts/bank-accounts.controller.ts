import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  CompanyId,
  CurrentUser,
} from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { DateRangeQueryDto } from '../common/dto/date-range-query.dto.js';
import type { AuthUser } from '../common/types/auth-user.js';
import { ParseIdPipe } from '../common/validators.js';
import { BankAccountsService } from './bank-accounts.service.js';
import {
  CreateBankAccountDto,
  UpdateBankAccountDto,
} from './dto/bank-account.dto.js';

@ApiTags('bank-accounts')
@Roles(['company_admin'])
@Controller('bank-accounts')
export class BankAccountsController {
  constructor(private readonly accounts: BankAccountsService) {}

  @Get()
  findAll(@CompanyId() companyId: string) {
    return this.accounts.findAll(companyId);
  }

  @Get(':id')
  findOne(
    @CompanyId() companyId: string,
    @Param('id', new ParseIdPipe('id')) id: string,
  ) {
    return this.accounts.findOne(companyId, id);
  }

  /** Payments received into the account and expenses paid from it */
  @Get(':id/statement')
  statement(
    @CompanyId() companyId: string,
    @Param('id', new ParseIdPipe('id')) id: string,
    @Query() query: DateRangeQueryDto,
  ) {
    return this.accounts.statement(companyId, id, query);
  }

  @Post()
  create(
    @CompanyId() companyId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateBankAccountDto,
  ) {
    return this.accounts.create(companyId, user.userId, dto);
  }

  @Patch(':id')
  update(
    @CompanyId() companyId: string,
    @CurrentUser() user: AuthUser,
    @Param('id', new ParseIdPipe('id')) id: string,
    @Body() dto: UpdateBankAccountDto,
  ) {
    return this.accounts.update(companyId, user.userId, id, dto);
  }
}

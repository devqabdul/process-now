import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  CompanyId,
  CurrentUser,
} from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { ParseIdPipe } from '../common/validators.js';
import type { AuthUser } from '../common/types/auth-user.js';
import { BillingService } from './billing.service.js';
import {
  ListBillsQueryDto,
  RecordPaymentDto,
  VoidBillDto,
} from './dto/billing.dto.js';

@ApiTags('bills')
@Roles(['company_admin'])
@Controller('bills')
export class BillingController {
  constructor(private readonly billing: BillingService) {}

  @Get()
  findAll(@CompanyId() companyId: string, @Query() query: ListBillsQueryDto) {
    return this.billing.findAll(companyId, query);
  }

  @Get(':id')
  findOne(
    @CompanyId() companyId: string,
    @Param('id', new ParseIdPipe('id')) id: string,
  ) {
    return this.billing.findOne(companyId, id);
  }

  /** Voids a bill raised in error; refuses if it has payments. */
  @Post(':id/void')
  @HttpCode(200)
  voidBill(
    @CompanyId() companyId: string,
    @CurrentUser() user: AuthUser,
    @Param('id', new ParseIdPipe('id')) id: string,
    @Body() dto: VoidBillDto,
  ) {
    return this.billing.voidBill(companyId, user.userId, id, dto.reason);
  }

  /** Removes a payment recorded in error and restores the amount due. */
  @Delete(':billId/payments/:id')
  @HttpCode(200)
  deletePayment(
    @CompanyId() companyId: string,
    @CurrentUser() user: AuthUser,
    @Param('billId', new ParseIdPipe('billId')) billId: string,
    @Param('id', new ParseIdPipe('id')) id: string,
  ) {
    return this.billing.deletePayment(companyId, user.userId, billId, id);
  }

  @Post(':id/payments')
  recordPayment(
    @CompanyId() companyId: string,
    @CurrentUser() user: AuthUser,
    @Param('id', new ParseIdPipe('id')) id: string,
    @Body() dto: RecordPaymentDto,
  ) {
    return this.billing.recordPayment(companyId, user.userId, id, dto);
  }
}

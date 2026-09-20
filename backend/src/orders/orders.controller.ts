import {
  Body,
  Controller,
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
import {
  CancelOrderDto,
  CreateOrderDto,
  ListOrdersQueryDto,
  ReturnOrderDto,
} from './dto/order.dto.js';
import { OrdersService } from './orders.service.js';

@ApiTags('orders')
@Roles(['company_admin'])
@Controller('orders')
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Get()
  findAll(@CompanyId() companyId: string, @Query() query: ListOrdersQueryDto) {
    return this.orders.findAll(companyId, query);
  }

  @Get(':id')
  findOne(
    @CompanyId() companyId: string,
    @Param('id', new ParseIdPipe('id')) id: string,
  ) {
    return this.orders.findOne(companyId, id);
  }

  @Post()
  create(
    @CompanyId() companyId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateOrderDto,
  ) {
    return this.orders.create(companyId, user.userId, dto);
  }

  /** received → processing */
  @Post(':id/start')
  @HttpCode(200)
  start(
    @CompanyId() companyId: string,
    @CurrentUser() user: AuthUser,
    @Param('id', new ParseIdPipe('id')) id: string,
  ) {
    return this.orders.start(companyId, user.userId, id);
  }

  /** received | processing → cancelled, before any bill exists */
  @Post(':id/cancel')
  @HttpCode(200)
  cancel(
    @CompanyId() companyId: string,
    @CurrentUser() user: AuthUser,
    @Param('id', new ParseIdPipe('id')) id: string,
    @Body() dto: CancelOrderDto,
  ) {
    return this.orders.cancel(companyId, user.userId, id, dto.reason);
  }

  /** processing → returned, and creates the bill */
  @Post(':id/return')
  @HttpCode(200)
  returnOrder(
    @CompanyId() companyId: string,
    @CurrentUser() user: AuthUser,
    @Param('id', new ParseIdPipe('id')) id: string,
    @Body() dto: ReturnOrderDto,
  ) {
    return this.orders.returnOrder(companyId, user.userId, id, dto);
  }
}

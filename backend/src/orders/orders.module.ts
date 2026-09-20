import { Module } from '@nestjs/common';
import { BillingModule } from '../billing/billing.module.js';
import { ServiceTypesModule } from '../service-types/service-types.module.js';
import { OrdersController } from './orders.controller.js';
import { OrdersService } from './orders.service.js';

@Module({
  imports: [ServiceTypesModule, BillingModule],
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}

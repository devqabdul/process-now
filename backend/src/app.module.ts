import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module.js';
import { BankAccountsModule } from './bank-accounts/bank-accounts.module.js';
import { BillingModule } from './billing/billing.module.js';
import { CompaniesModule } from './companies/companies.module.js';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard.js';
import { RolesGuard } from './common/guards/roles.guard.js';
import { envSchema } from './config/env.js';
import { HealthModule } from './health/health.module.js';
import { DailyLogsModule } from './daily-logs/daily-logs.module.js';
import { DashboardModule } from './dashboard/dashboard.module.js';
import { ExpensesModule } from './expenses/expenses.module.js';
import { OrdersModule } from './orders/orders.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { RolesModule } from './roles/roles.module.js';
import { ServiceTypesModule } from './service-types/service-types.module.js';
import { SettingsModule } from './settings/settings.module.js';
import { VendorsModule } from './vendors/vendors.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validationSchema: envSchema }),
    // A loose global floor; login keeps its own tight limit. Per-instance storage:
    // ponytail: move to a shared store before running a second replica.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 300 }]),
    PrismaModule,
    HealthModule,
    AuthModule,
    CompaniesModule,
    SettingsModule,
    VendorsModule,
    ServiceTypesModule,
    OrdersModule,
    BillingModule,
    DailyLogsModule,
    BankAccountsModule,
    ExpensesModule,
    DashboardModule,
    RolesModule,
  ],
  // Application-wide, so they can't be lost by changing what AppModule imports.
  // Order matters: authenticate, then check the role, then the rate limit.
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}

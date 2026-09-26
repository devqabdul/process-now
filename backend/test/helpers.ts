import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import bcrypt from 'bcrypt';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { API_PREFIX } from '../src/setup-app.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { setupApp } from '../src/setup-app.js';

export const HAS_DB = !!process.env.E2E_HAS_DB;

/** Tests hit the same prefixed paths as the deployed app. */
export const api = (path: string) => `/${API_PREFIX}${path}`;
export const PASSWORD = 'e2e-password-123';

export async function createApp(
  override?: (b: ReturnType<typeof Test.createTestingModule>) => void,
) {
  const builder = Test.createTestingModule({ imports: [AppModule] });
  override?.(builder);
  const app: INestApplication = (
    await builder.compile()
  ).createNestApplication();
  setupApp(app);
  await app.init();
  return app;
}

/** Random 10-digit phone that won't collide with seed users (9000000000–2). */
export const randomPhone = () =>
  `8${Math.floor(Math.random() * 1e9)
    .toString()
    .padStart(9, '0')}`;

/** A company with one admin, created straight in the DB. */
export async function createCompany(
  prisma: PrismaService,
  gstNo?: string,
  numberPrefix?: string,
) {
  const phone = randomPhone();
  const company = await prisma.company.create({
    data: {
      name: `E2E ${phone}`,
      gstNo,
      numberPrefix,
      settings: { electricityRate: 10, gstRate: 18 },
      users: {
        create: {
          role: 'company_admin',
          name: 'E2E Admin',
          phone,
          passwordHash: await bcrypt.hash(PASSWORD, 4),
        },
      },
    },
  });
  return { company, phone };
}

export async function login(app: INestApplication, identifier: string) {
  const agent = request.agent(app.getHttpServer());
  await agent
    .post(api('/auth/login'))
    .send({ identifier, password: PASSWORD })
    .expect(200);
  return agent;
}

/** Deletes everything the tests created, children first. */
export async function deleteCompanies(prisma: PrismaService, ids: string[]) {
  const where = { companyId: { in: ids } };
  await prisma.expense.deleteMany({ where });
  await prisma.payment.deleteMany({ where });
  await prisma.bankAccount.deleteMany({ where });
  await prisma.bill.deleteMany({ where });
  await prisma.order.deleteMany({ where }); // order_items cascade
  await prisma.serviceType.deleteMany({ where });
  await prisma.vendor.deleteMany({ where });
  await prisma.dailyLog.deleteMany({ where });
  await prisma.user.deleteMany({ where });
  await prisma.company.deleteMany({ where: { id: { in: ids } } });
}

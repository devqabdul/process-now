// Money in and out of an account: payment → account, expense ← account, balance derived from both.
import type { INestApplication } from '@nestjs/common';
import type TestAgent from 'supertest/lib/agent.js';
import { addDays, today } from '../src/common/dates.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import {
  api,
  createApp,
  createCompany,
  deleteCompanies,
  HAS_DB,
  login,
} from './helpers.js';

describe.skipIf(!HAS_DB)('bank accounts and expenses (e2e, DB)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let agent: TestAgent;
  let billId: string;
  const ids: string[] = [];

  beforeAll(async () => {
    app = await createApp();
    prisma = app.get(PrismaService);
    const { company, phone } = await createCompany(prisma);
    ids.push(company.id);
    const vendor = await prisma.vendor.create({
      data: { companyId: company.id, name: 'Ravi', phone: '9333333333' },
    });
    const st = await prisma.serviceType.create({
      data: {
        companyId: company.id,
        name: 'Crushing',
        unit: 'kg',
        basePrice: 8,
        baseCost: 3,
        billOn: 'out',
      },
    });
    const order = await prisma.order.create({
      data: {
        companyId: company.id,
        vendorId: vendor.id,
        orderNo: 1,
        status: 'returned',
        items: {
          create: {
            serviceTypeId: st.id,
            billOn: 'out',
            qtyIn: 100,
            qtyOut: 100,
            unitPrice: 8,
            unitCost: 3,
            amount: 800,
          },
        },
      },
    });
    billId = (
      await prisma.bill.create({
        data: {
          companyId: company.id,
          orderId: order.id,
          billNo: 1,
          subtotal: 800,
          total: 800,
        },
      })
    ).id;
    agent = await login(app, phone);
  });

  afterAll(async () => {
    await deleteCompanies(prisma, ids);
    await app.close();
  });

  it('tracks a payment in and an expense out', async () => {
    const account = (
      await agent
        .post(api('/bank-accounts'))
        .send({ name: 'HDFC Current', openingBalance: 1000 })
        .expect(201)
    ).body.data;
    expect(account).toMatchObject({ balance: '1000.00', moneyIn: '0.00' });
    await agent
      .post(api('/bank-accounts'))
      .send({ name: 'HDFC Current' })
      .expect(409);

    const bill = (
      await agent
        .post(api(`/bills/${billId}/payments`))
        .send({ amount: 500, method: 'bank', bankAccountId: account.id })
        .expect(201)
    ).body.data;
    expect(bill.payments[0].bankAccount).toEqual({
      id: account.id,
      name: 'HDFC Current',
    });
    // An unassigned payment counts toward the bill but no account.
    await agent
      .post(api(`/bills/${billId}/payments`))
      .send({ amount: 100, method: 'cash' })
      .expect(201);

    await agent
      .post(api('/expenses'))
      .send({
        bankAccountId: account.id,
        category: 'Electricity',
        amount: 200,
        spentOn: addDays(today(), 1),
      })
      .expect(422);
    const expense = (
      await agent
        .post(api('/expenses'))
        .send({
          bankAccountId: account.id,
          category: 'Electricity',
          amount: 200,
          spentOn: today(),
        })
        .expect(201)
    ).body.data;
    expect(expense).toMatchObject({ amount: '200.00', spentOn: today() });

    const [listed] = (await agent.get(api('/bank-accounts')).expect(200)).body
      .data;
    expect(listed).toMatchObject({
      moneyIn: '500.00',
      moneyOut: '200.00',
      balance: '1300.00',
    });

    const statement = (
      await agent.get(api(`/bank-accounts/${account.id}/statement`)).expect(200)
    ).body.data;
    expect(statement).toMatchObject({ moneyIn: '500.00', moneyOut: '200.00' });
    expect(
      statement.entries.map((e: { kind: string }) => e.kind).sort(),
    ).toEqual(['in', 'out']);

    const expenses = (await agent.get(api('/expenses')).expect(200)).body.data;
    expect(expenses.total).toBe('200.00');
    expect(
      (await agent.get(api('/expenses/categories')).expect(200)).body.data,
    ).toEqual(['Electricity']);
    expect(
      (await agent.get(api('/dashboard')).expect(200)).body.data.expenses,
    ).toBe('200.00');

    await agent.delete(api(`/expenses/${expense.id}`)).expect(200);
    expect(
      (await agent.get(api(`/bank-accounts/${account.id}`)).expect(200)).body
        .data.balance,
    ).toBe('1500.00');

    // A closed account takes no new money.
    await agent
      .patch(api(`/bank-accounts/${account.id}`))
      .send({ isActive: false })
      .expect(200);
    const closed = await agent
      .post(api('/expenses'))
      .send({
        bankAccountId: account.id,
        category: 'Rent',
        amount: 1,
        spentOn: today(),
      })
      .expect(422);
    expect(closed.body.fields).toHaveProperty('bankAccountId');
  });
});

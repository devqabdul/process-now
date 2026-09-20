// Company A's admin must not see or touch Company B's records: 404, never 403.
import type { INestApplication } from '@nestjs/common';
import type TestAgent from 'supertest/lib/agent.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import {
  api,
  createApp,
  createCompany,
  deleteCompanies,
  HAS_DB,
  login,
} from './helpers.js';

describe.skipIf(!HAS_DB)('tenant isolation (e2e, DB)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let agentA: TestAgent;
  const ids: string[] = [];
  let b: {
    vendorId: string;
    serviceTypeId: string;
    orderId: string;
    billId: string;
  };

  beforeAll(async () => {
    app = await createApp();
    prisma = app.get(PrismaService);
    const A = await createCompany(prisma);
    const B = await createCompany(prisma);
    ids.push(A.company.id, B.company.id);

    const vendor = await prisma.vendor.create({
      data: { companyId: B.company.id, name: 'B vendor', phone: '9111111111' },
    });
    const st = await prisma.serviceType.create({
      data: {
        companyId: B.company.id,
        name: 'B service',
        unit: 'kg',
        basePrice: 8,
        baseCost: 3,
        billOn: 'out',
      },
    });
    const order = await prisma.order.create({
      data: {
        companyId: B.company.id,
        vendorId: vendor.id,
        orderNo: 1,
        status: 'returned',
        items: {
          create: {
            serviceTypeId: st.id,
            billOn: 'out',
            qtyIn: 10,
            qtyOut: 10,
            unitPrice: 8,
            unitCost: 3,
            amount: 80,
          },
        },
      },
    });
    const bill = await prisma.bill.create({
      data: {
        companyId: B.company.id,
        orderId: order.id,
        billNo: 1,
        subtotal: 80,
        total: 80,
      },
    });
    b = {
      vendorId: vendor.id,
      serviceTypeId: st.id,
      orderId: order.id,
      billId: bill.id,
    };
    agentA = await login(app, A.phone);
  });

  afterAll(async () => {
    await deleteCompanies(prisma, ids);
    await app.close();
  });

  it.each([
    ['get', () => api(`/orders/${b.orderId}`)],
    ['post', () => api(`/orders/${b.orderId}/start`)],
    ['get', () => api(`/bills/${b.billId}`)],
    ['get', () => api(`/service-types/${b.serviceTypeId}`)],
  ] as const)('%s %s → 404', async (method, path) => {
    await agentA[method](path()).expect(404);
  });

  it('cannot read or delete B payments through its own bill path', async () => {
    await agentA
      .delete(api(`/bills/${b.billId}/payments/${b.orderId}`))
      .expect(404);
    await agentA.get(api(`/vendors/${b.vendorId}`)).expect(404);
  });

  it('cannot edit B vendor or pay B bill', async () => {
    await agentA
      .patch(api(`/vendors/${b.vendorId}`))
      .send({ name: 'x' })
      .expect(404);
    await agentA
      .post(api(`/bills/${b.billId}/payments`))
      .send({ amount: 1, method: 'cash' })
      .expect(404);
  });

  it("cannot order with B's vendor or service type", async () => {
    const res = await agentA
      .post(api('/orders'))
      .send({
        vendorId: b.vendorId,
        items: [
          { serviceTypeId: b.serviceTypeId, selectedOptions: [], qtyIn: 1 },
        ],
      })
      .expect(422);
    expect(res.body.fields).toHaveProperty('vendorId');
  });

  it('lists only its own records', async () => {
    for (const path of ['/orders', '/bills', '/vendors', '/service-types']) {
      const res = await agentA.get(api(path)).expect(200);
      expect(res.body.data).toEqual([]);
    }
  });

  it('ignores a companyId sent in the body', async () => {
    await agentA
      .post(api('/vendors'))
      .send({ name: 'v', phone: '9222222222', companyId: ids[1] })
      .expect(422); // forbidNonWhitelisted
  });
});

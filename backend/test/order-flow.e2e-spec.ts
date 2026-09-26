// The core flow against the real DB: vendor → service type → order → return → bill → payment → dashboard.
import type { INestApplication } from '@nestjs/common';
import type TestAgent from 'supertest/lib/agent.js';
import { today } from '../src/common/dates.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import request from 'supertest';
import bcrypt from 'bcrypt';

import {
  api,
  createApp,
  createCompany,
  deleteCompanies,
  HAS_DB,
  login,
  PASSWORD,
  randomPhone,
} from './helpers.js';

describe.skipIf(!HAS_DB)('order → bill → payment (e2e, DB)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let agent: TestAgent;
  let companyId: string;
  const ids: string[] = [];

  beforeAll(async () => {
    app = await createApp();
    prisma = app.get(PrismaService);
    const { company, phone } = await createCompany(
      prisma,
      '27ABCDE1234F1Z5',
      'FN',
    );
    companyId = company.id;
    ids.push(company.id);
    agent = await login(app, `+91 ${phone}`);
  });

  afterAll(async () => {
    await deleteCompanies(prisma, ids);
    await app.close();
  });

  it('runs the whole flow', async () => {
    const me = await agent.get(api('/auth/me')).expect(200);
    expect(me.body.data.user).toMatchObject({
      role: 'company_admin',
      // the caller's own role metadata, so the UI needs no second request
      roleMeta: { label: 'Company Admin', accent: 'warning' },
      company: { id: companyId },
    });
    expect(me.body.data.user).not.toHaveProperty('passwordHash');

    const vendor = (
      await agent
        .post(api('/vendors'))
        .send({ name: 'Ravi Textiles', phone: '+91 98000 22222' })
        .expect(201)
    ).body.data;
    expect(vendor.phone).toBe('9800022222');

    const st = (
      await agent
        .post(api('/service-types'))
        .send({
          name: 'Sherwani fusing',
          unit: 'piece',
          basePrice: 0,
          baseCost: 0,
          billOn: 'in',
          options: [
            {
              group: 'Part',
              multi: true,
              choices: [
                { name: 'Front', price: 20, cost: 6 },
                { name: 'Side', price: 10, cost: 3 },
              ],
            },
          ],
        })
        .expect(201)
    ).body.data;

    const order = (
      await agent
        .post(api('/orders'))
        .send({
          vendorId: vendor.id,
          items: [
            {
              serviceTypeId: st.id,
              qtyIn: 15,
              selectedOptions: [
                { group: 'Part', choice: 'Front' },
                { group: 'Part', choice: 'Side' },
              ],
            },
          ],
        })
        .expect(201)
    ).body.data;
    // Numbers carry the company's prefix; the stored integer is still 1.
    expect(order).toMatchObject({ orderNo: 'FN-0001', status: 'received' });
    expect(order.items[0].unitPrice).toBe('30.00');
    expect(order.items[0].unitCost).toBe('9.00');

    // Can't return before processing; can't start twice.
    const itemsOut = {
      items: [{ orderItemId: order.items[0].id, qtyOut: 15 }],
    };
    await agent
      .post(api(`/orders/${order.id}/return`))
      .send(itemsOut)
      .expect(409);
    await agent.post(api(`/orders/${order.id}/start`)).expect(200);
    await agent.post(api(`/orders/${order.id}/start`)).expect(409);

    await agent
      .post(api(`/orders/${order.id}/return`))
      .send({ items: [{ orderItemId: order.items[0].id, qtyOut: 16 }] })
      .expect(422);
    const returned = (
      await agent
        .post(api(`/orders/${order.id}/return`))
        .send(itemsOut)
        .expect(200)
    ).body.data;
    expect(returned.status).toBe('returned');
    expect(returned.items[0].amount).toBe('450.00');
    // Rolled-back attempt above must not have used up an order/bill number.
    const billId = returned.bill.id;
    expect(returned.bill.billNo).toBe('FN-0001');

    const bill = (await agent.get(api(`/bills/${billId}`)).expect(200)).body
      .data;
    expect(bill).toMatchObject({
      subtotal: '450.00',
      gstAmount: '81.00',
      total: '531.00',
      amountDue: '531.00',
      status: 'due',
    });

    const over = await agent
      .post(api(`/bills/${billId}/payments`))
      .send({ amount: 600, method: 'upi' })
      .expect(422);
    expect(over.body.fields.amount).toMatch(/531\.00/);

    await agent
      .post(api(`/bills/${billId}/payments`))
      .send({ amount: 500, method: 'upi' })
      .expect(201);
    const paid = (
      await agent
        .post(api(`/bills/${billId}/payments`))
        .send({ amount: 31, method: 'cash' })
        .expect(201)
    ).body.data;
    expect(paid).toMatchObject({ amountDue: '0.00', status: 'paid' });
    expect(
      (await agent.get(api('/bills?status=due')).expect(200)).body.data.items,
    ).toEqual([]);
    const paidOrDue = (
      await agent.get(api('/bills?status=due&status=paid')).expect(200)
    ).body.data.items;
    expect(paidOrDue.map((b: { id: string }) => b.id)).toContain(billId);

    await agent
      .put(api(`/daily-logs/${today()}`))
      .send({ machineHours: 7.5, electricityUnits: 40 })
      .expect(200);

    const dash = (await agent.get(api('/dashboard')).expect(200)).body.data;
    expect(dash).toMatchObject({
      date: today(),
      pendingOrdersCount: 0,
      amountToCollect: '0.00',
      itemsProcessed: [{ unit: 'piece', qty: '15' }],
      dailyLog: {
        machineHours: '7.5',
        electricityUnits: '40',
        electricityCost: '400.00',
      },
      earnings: '531.00',
      estimatedCost: '135.00',
      estimatedProfit: '315.00',
    });
  });

  it('updates one rate without resetting the other', async () => {
    const res = await agent
      .patch(api('/settings'))
      .send({ settings: { gstRate: 12 } })
      .expect(200);
    expect(res.body.data.settings).toEqual({
      electricityRate: 10,
      gstRate: 12,
    });
    const cleared = await agent
      .patch(api('/settings'))
      .send({ gstNo: null })
      .expect(200);
    expect(cleared.body.data.gstNo).toBeNull();

    // Settings are company-wide: leaving GST off here silently removes it from
    // every bill the later tests raise, so put it back.
    const restored = await agent
      .patch(api('/settings'))
      .send({ gstNo: '27ABCDE1234F1Z5', settings: { gstRate: 18 } })
      .expect(200);
    expect(restored.body.data).toMatchObject({
      gstNo: '27ABCDE1234F1Z5',
      settings: { electricityRate: 10, gstRate: 18 },
    });
  });

  it('bills an order the way it was taken, after the service type changes', async () => {
    const vendor = await prisma.vendor.findFirstOrThrow({
      where: { companyId },
    });
    const st = (
      await agent
        .post(api('/service-types'))
        .send({
          name: 'Crushing',
          unit: 'kg',
          basePrice: 8,
          baseCost: 3,
          billOn: 'in',
          options: [],
        })
        .expect(201)
    ).body.data;

    const order = (
      await agent
        .post(api('/orders'))
        .send({
          vendorId: vendor.id,
          items: [{ serviceTypeId: st.id, qtyIn: 100, selectedOptions: [] }],
        })
        .expect(201)
    ).body.data;
    await agent.post(api(`/orders/${order.id}/start`)).expect(200);

    // The admin switches the service type to bill on the returned quantity.
    await agent
      .patch(api(`/service-types/${st.id}`))
      .send({ billOn: 'out' })
      .expect(200);

    const returned = (
      await agent
        .post(api(`/orders/${order.id}/return`))
        .send({ items: [{ orderItemId: order.items[0].id, qtyOut: 95 }] })
        .expect(200)
    ).body.data;
    // Billed on the 100 kg received, as agreed when the order was taken.
    expect(returned.items[0].amount).toBe('800.00');
  });

  it('cancels an order taken in error, and hides it from lists and the dashboard', async () => {
    const vendor = await prisma.vendor.findFirstOrThrow({
      where: { companyId },
    });
    const st = await prisma.serviceType.findFirstOrThrow({
      where: { companyId },
    });
    const order = (
      await agent
        .post(api('/orders'))
        .send({
          vendorId: vendor.id,
          items: [{ serviceTypeId: st.id, qtyIn: 1, selectedOptions: [] }],
        })
        .expect(201)
    ).body.data;

    const pendingBefore = (await agent.get(api('/dashboard')).expect(200)).body
      .data.pendingOrdersCount;
    const cancelled = (
      await agent
        .post(api(`/orders/${order.id}/cancel`))
        .send({ reason: 'Duplicate of the previous order' })
        .expect(200)
    ).body.data;
    expect(cancelled.status).toBe('cancelled');

    const list = (await agent.get(api('/orders')).expect(200)).body.data.items;
    expect(list.map((o: { id: string }) => o.id)).not.toContain(order.id);
    const withCancelled = (
      await agent
        .get(api('/orders?status=received&status=cancelled'))
        .expect(200)
    ).body.data.items;
    expect(withCancelled.map((o: { id: string }) => o.id)).toContain(order.id);
    expect(
      (await agent.get(api('/dashboard')).expect(200)).body.data
        .pendingOrdersCount,
    ).toBe(pendingBefore - 1);
    // A cancelled order can't then be started or returned.
    await agent.post(api(`/orders/${order.id}/start`)).expect(409);
  });

  it('voids an unpaid bill and drops it from the amount to collect', async () => {
    const vendor = await prisma.vendor.findFirstOrThrow({
      where: { companyId },
    });
    // Priced per unit: a zero-priced service type bills 0, and voiding 0 proves nothing.
    const st = await prisma.serviceType.findFirstOrThrow({
      where: { companyId, basePrice: { gt: 0 } },
    });
    const order = (
      await agent
        .post(api('/orders'))
        .send({
          vendorId: vendor.id,
          items: [{ serviceTypeId: st.id, qtyIn: 2, selectedOptions: [] }],
        })
        .expect(201)
    ).body.data;
    await agent.post(api(`/orders/${order.id}/start`)).expect(200);
    const returned = (
      await agent
        .post(api(`/orders/${order.id}/return`))
        .send({ items: [{ orderItemId: order.items[0].id, qtyOut: 2 }] })
        .expect(200)
    ).body.data;
    const billId = returned.bill.id;

    const owedBefore = Number(
      (await agent.get(api('/dashboard')).expect(200)).body.data
        .amountToCollect,
    );
    const voided = (
      await agent
        .post(api(`/bills/${billId}/void`))
        .send({ reason: 'Wrong quantity entered' })
        .expect(200)
    ).body.data;
    expect(voided).toMatchObject({ status: 'voided', amountDue: '0.00' });

    expect(
      Number(
        (await agent.get(api('/dashboard')).expect(200)).body.data
          .amountToCollect,
      ),
    ).toBeLessThan(owedBefore);
    // A voided bill takes no further payments, and can't be voided twice.
    await agent
      .post(api(`/bills/${billId}/payments`))
      .send({ amount: 1, method: 'cash' })
      .expect(409);
    await agent
      .post(api(`/bills/${billId}/void`))
      .send({ reason: 'again' })
      .expect(409);
  });

  it('refuses to void a bill that has payments', async () => {
    const bill = await prisma.bill.findFirstOrThrow({
      where: { companyId, amountPaid: { gt: 0 }, voidedAt: null },
    });
    await agent
      .post(api(`/bills/${bill.id}/void`))
      .send({ reason: 'oops' })
      .expect(409);
  });

  it('changes the password and invalidates the old session', async () => {
    const stale = await login(
      app,
      (await prisma.user.findFirstOrThrow({ where: { companyId } })).phone!,
    );
    await agent
      .patch(api('/auth/password'))
      .send({ currentPassword: PASSWORD, newPassword: 'a-new-password-1' })
      .expect(200);

    // The session that changed it stays usable; the other one is revoked.
    await agent.get(api('/auth/me')).expect(200);
    await stale.get(api('/auth/me')).expect(401);
    // And the old password no longer works.
    await request(app.getHttpServer())
      .post(api('/auth/login'))
      .send({
        identifier: (
          await prisma.user.findFirstOrThrow({ where: { companyId } })
        ).phone,
        password: PASSWORD,
      })
      .expect(401);
  });

  it('finds an order by its printed number', async () => {
    const [order] = (await agent.get(api('/orders')).expect(200)).body.data
      .items;
    for (const term of [order.orderNo, order.orderNo.replace('FN-', '')]) {
      const found = (await agent.get(api(`/orders?q=${term}`)).expect(200)).body
        .data.items;
      expect(found.map((o: { id: string }) => o.id)).toContain(order.id);
    }
  });

  it('still searches by vendor name', async () => {
    const found = (await agent.get(api('/orders?q=Ravi')).expect(200)).body.data
      .items;
    expect(found.length).toBeGreaterThan(0);
    const none = (await agent.get(api('/orders?q=Nobody')).expect(200)).body
      .data;
    expect(none).toMatchObject({ items: [], total: 0 });
  });

  it('pages vendors with a total that counts every match', async () => {
    const { company, phone } = await createCompany(prisma);
    ids.push(company.id);
    const own = await login(app, phone);
    await prisma.vendor.createMany({
      data: Array.from({ length: 16 }, (_, i) => ({
        companyId: company.id,
        name: `${i < 13 ? 'Alpha' : 'Beta'} ${String.fromCharCode(97 + i)}`,
        phone: randomPhone(),
      })),
    });

    const first = (await own.get(api('/vendors')).expect(200)).body.data;
    expect(first).toMatchObject({ total: 16, page: 1, pageSize: 15 });
    expect(first.items).toHaveLength(15);
    const second = (await own.get(api('/vendors?page=2')).expect(200)).body
      .data;
    expect(second).toMatchObject({ total: 16, page: 2, pageSize: 15 });
    expect(second.items).toHaveLength(1);
    const firstIds = first.items.map((v: { id: string }) => v.id);
    expect(firstIds).not.toContain(second.items[0].id);

    // Search narrows the total too.
    const filtered = (
      await own.get(api('/vendors?q=beta&sort=-name&pageSize=25')).expect(200)
    ).body.data;
    expect(filtered).toMatchObject({ total: 3, pageSize: 25 });
    expect(filtered.items.map((v: { name: string }) => v.name)).toEqual([
      'Beta p',
      'Beta o',
      'Beta n',
    ]);

    await own.get(api('/vendors?pageSize=7')).expect(422);
    await own.get(api('/vendors?page=0')).expect(422);
    await own.get(api('/orders?status=bogus')).expect(422);
    const badSort = await own.get(api('/vendors?sort=phone')).expect(422);
    expect(badSort.body.fields).toHaveProperty('sort');
  });

  it('stops a deactivated user signing in, and ends their session', async () => {
    const { company, phone } = await createCompany(prisma);
    ids.push(company.id);
    const theirAgent = await login(app, phone);
    await theirAgent.get(api('/auth/me')).expect(200);

    await prisma.user.updateMany({
      where: { companyId: company.id },
      data: { isActive: false },
    });

    // The existing session dies on the next request, not at token expiry.
    await theirAgent.get(api('/auth/me')).expect(401);
    // And the same 401 as a wrong password: no way to tell the two apart.
    await request(app.getHttpServer())
      .post(api('/auth/login'))
      .send({ identifier: phone, password: PASSWORD })
      .expect(401);
  });

  it('suspends every login of a suspended company', async () => {
    const { company, phone } = await createCompany(prisma);
    ids.push(company.id);
    const theirAgent = await login(app, phone);

    await prisma.company.update({
      where: { id: company.id },
      data: { isActive: false },
    });

    await theirAgent.get(api('/auth/me')).expect(401);
  });

  it('refuses to raise an order against a retired vendor', async () => {
    const vendor = await prisma.vendor.findFirstOrThrow({
      where: { companyId },
    });
    const st = await prisma.serviceType.findFirstOrThrow({
      where: { companyId },
    });
    await prisma.vendor.update({
      where: { id: vendor.id },
      data: { isActive: false },
    });

    const res = await agent
      .post(api('/orders'))
      .send({
        vendorId: vendor.id,
        items: [{ serviceTypeId: st.id, qtyIn: 1, selectedOptions: [] }],
      })
      .expect(422);
    expect(res.body.fields.vendorId).toMatch(/retired/i);

    await prisma.vendor.update({
      where: { id: vendor.id },
      data: { isActive: true },
    });
  });

  it('lets a super admin reset a company admin password', async () => {
    const { company, phone } = await createCompany(prisma);
    ids.push(company.id);
    const theirAgent = await login(app, phone);

    const superAdmin = await prisma.user.create({
      data: {
        role: 'super_admin',
        name: 'Platform',
        phone: randomPhone(),
        passwordHash: await bcrypt.hash(PASSWORD, 4),
      },
    });
    const platform = await login(app, superAdmin.phone!);

    await platform
      .patch(api(`/admin/companies/${company.id}/admin-password`))
      .send({ password: 'reset-by-platform-1' })
      .expect(200);

    // Their old session is gone and the old password no longer works.
    await theirAgent.get(api('/auth/me')).expect(401);
    await request(app.getHttpServer())
      .post(api('/auth/login'))
      .send({ identifier: phone, password: PASSWORD })
      .expect(401);
    await request(app.getHttpServer())
      .post(api('/auth/login'))
      .send({ identifier: phone, password: 'reset-by-platform-1' })
      .expect(200);

    // A company admin cannot do this to anyone.
    await agent
      .patch(api(`/admin/companies/${company.id}/admin-password`))
      .send({ password: 'not-allowed-12345' })
      .expect(403);

    await prisma.user.delete({ where: { id: superAdmin.id } });
  });

  it('reverses a payment recorded in error', async () => {
    const vendor = await prisma.vendor.findFirstOrThrow({
      where: { companyId },
    });
    const st = await prisma.serviceType.findFirstOrThrow({
      where: { companyId, basePrice: { gt: 0 } },
    });
    const order = (
      await agent
        .post(api('/orders'))
        .send({
          vendorId: vendor.id,
          items: [{ serviceTypeId: st.id, qtyIn: 3, selectedOptions: [] }],
        })
        .expect(201)
    ).body.data;
    await agent.post(api(`/orders/${order.id}/start`)).expect(200);
    const bill = (
      await agent
        .post(api(`/orders/${order.id}/return`))
        .send({ items: [{ orderItemId: order.items[0].id, qtyOut: 3 }] })
        .expect(200)
    ).body.data.bill;

    const due = (await agent.get(api(`/bills/${bill.id}`)).expect(200)).body
      .data.amountDue;
    const paid = (
      await agent
        .post(api(`/bills/${bill.id}/payments`))
        .send({ amount: 5, method: 'cash' })
        .expect(201)
    ).body.data;
    const payment = paid.payments[0];

    const after = (
      await agent
        .delete(api(`/bills/${bill.id}/payments/${payment.id}`))
        .expect(200)
    ).body.data;
    // Back exactly where it started, and the bill can be voided again.
    expect(after.amountDue).toBe(due);
    expect(after.payments).toEqual([]);
    await agent
      .post(api(`/bills/${bill.id}/void`))
      .send({ reason: 'raised in error' })
      .expect(200);
  });

  it('keeps the role catalogue away from a company admin', async () => {
    // Its own role comes from /auth/me; which other roles exist is not its business.
    await agent.get(api('/roles')).expect(403);
  });

  it('gives concurrent orders distinct numbers', async () => {
    const vendor = await prisma.vendor.findFirstOrThrow({
      where: { companyId },
    });
    const st = await prisma.serviceType.findFirstOrThrow({
      where: { companyId },
    });
    const body = {
      vendorId: vendor.id,
      items: [{ serviceTypeId: st.id, qtyIn: 1, selectedOptions: [] }],
    };
    const results = await Promise.all(
      Array.from({ length: 5 }, () =>
        agent.post(api('/orders')).send(body).expect(201),
      ),
    );
    const numbers = results.map((r) => r.body.data.orderNo as string);
    expect(new Set(numbers).size).toBe(5);
  });
});

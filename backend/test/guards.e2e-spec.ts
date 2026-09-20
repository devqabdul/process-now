// Runs without a database: PrismaService is stubbed, tokens are signed directly.
import type { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { api, createApp } from './helpers.js';

describe('auth guards (e2e, no DB)', () => {
  let app: INestApplication;
  let cookie: (role: 'super_admin' | 'company_admin') => Promise<string>;
  let currentRole: 'super_admin' | 'company_admin' = 'company_admin';

  beforeAll(async () => {
    app = await createApp((b) =>
      b.overrideProvider(PrismaService).useValue({
        // The guard checks the token against the stored version on every request.
        user: {
          findUnique: ({ where }: { where: { id: string } }) => ({
            id: where.id,
            role: currentRole,
            companyId:
              currentRole === 'company_admin'
                ? '00000000-0000-7000-8000-000000000002'
                : null,
            tokenVersion: 0,
            isActive: true,
            company:
              currentRole === 'company_admin' ? { isActive: true } : null,
          }),
        },
      }),
    );
    const jwt = app.get(JwtService);
    cookie = async (role) => {
      currentRole = role;
      return `access_token=${await jwt.signAsync({
        userId: '00000000-0000-7000-8000-000000000001',
        role,
        companyId:
          role === 'company_admin'
            ? '00000000-0000-7000-8000-000000000002'
            : null,
        tokenVersion: 0,
      })}`;
    };
  });

  afterAll(() => app.close());

  it('rejects requests without a session', async () => {
    const res = await request(app.getHttpServer())
      .get(api('/orders'))
      .expect(401);
    expect(res.body.status_code).toBe(401);
  });

  it('rejects a forged token', () =>
    request(app.getHttpServer())
      .get(api('/orders'))
      .set('Cookie', 'access_token=not.a.jwt')
      .expect(401));

  it('keeps super admins out of company routes', async () =>
    request(app.getHttpServer())
      .get(api('/orders'))
      .set('Cookie', await cookie('super_admin'))
      .expect(403));

  it('keeps company admins out of admin routes', async () =>
    request(app.getHttpServer())
      .get(api('/admin/companies'))
      .set('Cookie', await cookie('company_admin'))
      .expect(403));

  it('validates the body before touching the DB', async () => {
    const res = await request(app.getHttpServer())
      .post(api('/orders'))
      .set('Cookie', await cookie('company_admin'))
      .send({ vendorId: 'x', items: [{ qtyIn: -1, unitPrice: 1 }] })
      .expect(422);
    expect(Object.keys(res.body.fields)).toEqual(
      expect.arrayContaining([
        'vendorId',
        'items.0.serviceTypeId',
        'items.0.qtyIn',
        'items.0.unitPrice',
      ]),
    );
  });

  it('rejects a malformed id and a bad date in one shape', async () => {
    const c = await cookie('company_admin');
    // A bad id in the path reports like a bad field in the body: 422 + fields.
    const bad = await request(app.getHttpServer())
      .get(api('/orders/123'))
      .set('Cookie', c)
      .expect(422);
    expect(bad.body.fields).toHaveProperty('id');
    await request(app.getHttpServer())
      .put(api('/daily-logs/2026-02-30'))
      .set('Cookie', c)
      .send({ machineHours: 1, electricityUnits: 1 })
      .expect(422);
  });

  it('rejects an explicit null where a value is optional', async () => {
    const c = await cookie('company_admin');
    const res = await request(app.getHttpServer())
      .patch(api('/settings'))
      .set('Cookie', c)
      .send({ settings: { gstRate: null, electricityRate: null } })
      .expect(422);
    expect(Object.keys(res.body.fields).sort()).toEqual([
      'settings.electricityRate',
      'settings.gstRate',
    ]);
    // null is still how a GST number is cleared
    await request(app.getHttpServer())
      .patch(api('/vendors/00000000-0000-7000-8000-000000000003'))
      .set('Cookie', c)
      .send({ name: null })
      .expect(422);
  });

  it('rejects an amount beyond the column, as a field error not a 500', async () => {
    const res = await request(app.getHttpServer())
      .post(api('/service-types'))
      .set('Cookie', await cookie('company_admin'))
      .send({
        name: 'X',
        unit: 'kg',
        basePrice: 1e15,
        baseCost: 0,
        billOn: 'in',
      })
      .expect(422);
    expect(res.body.fields).toHaveProperty('basePrice');
  });

  it('serves health checks unprefixed and unauthenticated', async () => {
    const res = await request(app.getHttpServer())
      .get('/health/live')
      .expect(200);
    expect(res.body.data).toEqual({ status: 'ok' });
  });

  it('logout is public and clears the cookie', async () => {
    const res = await request(app.getHttpServer())
      .post(api('/auth/logout'))
      .expect(200);
    expect(res.headers['set-cookie']?.[0]).toMatch(/^access_token=;/);
  });
});

// Dev seed: a super admin plus FuseNow and CrushNow, each with an admin and a
// sample service type. Safe to re-run: existing rows (matched by phone or
// company name) are left alone.
// Usage: SEED_PASSWORD=... yarn prisma db seed
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcrypt';
import { config } from 'dotenv';
import { PrismaClient, type Prisma } from '../src/generated/prisma/client.js';

config({ quiet: true });

const password = process.env.SEED_PASSWORD;
if (!password || password.length < 8) {
  throw new Error('Set SEED_PASSWORD (8+ chars) to seed users.');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});
const passwordHash = await bcrypt.hash(password, 10);

async function upsertUser(
  data: Omit<Prisma.UserUncheckedCreateInput, 'passwordHash'> & {
    phone: string;
  },
) {
  await prisma.user.upsert({
    where: { phone: data.phone },
    update: {},
    create: { ...data, passwordHash },
  });
}

async function seedCompany(
  company: Prisma.CompanyCreateInput,
  admin: { name: string; phone: string; email?: string },
  serviceType: Omit<Prisma.ServiceTypeUncheckedCreateInput, 'companyId'>,
) {
  const existing = await prisma.company.findFirst({
    where: { name: company.name },
  });
  const { id } = existing ?? (await prisma.company.create({ data: company }));
  await upsertUser({ ...admin, role: 'company_admin', companyId: id });
  if (!existing) {
    await prisma.serviceType.create({
      data: { ...serviceType, companyId: id },
    });
  }
}

await upsertUser({
  name: 'Super Admin',
  phone: '9000000000',
  email: 'admin@process-now.local',
  role: 'super_admin',
});

await seedCompany(
  {
    name: 'FuseNow',
    gstNo: '27ABCDE1234F1Z5',
    numberPrefix: 'FN',
    settings: { electricityRate: 9.5, gstRate: 18 },
  },
  { name: 'FuseNow Admin', phone: '9000000001', email: 'admin@fusenow.local' },
  {
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
  },
);

await seedCompany(
  {
    name: 'CrushNow',
    numberPrefix: 'CN',
    settings: { electricityRate: 8, gstRate: 18 },
  },
  { name: 'CrushNow Admin', phone: '9000000002' },
  {
    name: 'Plastic crushing',
    unit: 'kg',
    basePrice: 8,
    baseCost: 3,
    billOn: 'out',
    options: [],
  },
);

await prisma.$disconnect();
console.log(
  'Seeded: super admin 9000000000, FuseNow 9000000001, CrushNow 9000000002',
);

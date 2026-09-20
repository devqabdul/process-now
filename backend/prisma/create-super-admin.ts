/**
 * Creates (or updates) a super admin against whatever DATABASE_URL points at.
 *
 * This is how a fresh production database gets its first login: the seed is
 * sample data and must not be run there. Every other user is created through
 * the API, so this is the only account made by hand.
 *
 *   yarn create:super-admin --name "Abdul" --email a@b.com [--phone 9800011111]
 *
 * The password comes from --password, or is generated and printed once.
 */
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcrypt';
import { randomBytes } from 'node:crypto';
import { config } from 'dotenv';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { normalizeEmail, toMobileDigits } from '../src/common/identifier.js';

config({ quiet: true });

const arg = (flag: string) => {
  const i = process.argv.indexOf(`--${flag}`);
  return i === -1 ? undefined : process.argv[i + 1];
};

const fail = (message: string): never => {
  console.error(`✖ ${message}`);
  process.exit(1);
};

const name = arg('name')?.trim() ?? '';
const phone = arg('phone') ? toMobileDigits(arg('phone')!) : undefined;
const email = arg('email') ? normalizeEmail(arg('email')!) : undefined;
const password = arg('password') ?? randomBytes(12).toString('base64url');

if (!name) fail('--name is required');
if (!phone && !email)
  fail('Give --phone, --email, or both: the admin signs in with one of them');
if (phone && !/^\d{10}$/.test(phone))
  fail('--phone must be a 10-digit mobile number');
if (email && !/^\S+@\S+\.\S+$/.test(email))
  fail('--email is not a valid address');
if (password.length < 8) fail('--password must be at least 8 characters');

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const existing = await prisma.user.findFirst({
  where: { OR: [...(phone ? [{ phone }] : []), ...(email ? [{ email }] : [])] },
  select: { id: true, role: true, name: true },
});

if (existing && existing.role !== 'super_admin') {
  fail(
    `That phone or email already belongs to ${existing.name}, a ${existing.role}`,
  );
}

const passwordHash = await bcrypt.hash(password, 10);
const user = existing
  ? await prisma.user.update({
      where: { id: existing.id },
      // A rerun rotates the password; bumping tokenVersion signs out the old sessions.
      data: {
        name,
        phone,
        email,
        passwordHash,
        tokenVersion: { increment: 1 },
      },
    })
  : await prisma.user.create({
      data: { role: 'super_admin', name, phone, email, passwordHash },
    });

console.log(`${existing ? 'Updated' : 'Created'} super admin: ${user.name}`);
console.log(
  `  signs in with: ${[user.phone, user.email].filter(Boolean).join(' or ')}`,
);
if (!arg('password')) {
  console.log(`  password: ${password}`);
  console.log('  (generated — shown once, store it now)');
}
await prisma.$disconnect();

import { config } from 'dotenv';
import { defineConfig } from 'prisma/config';

config({ quiet: true });

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  // Not env('DATABASE_URL'): that throws when unset, which would break
  // `prisma generate` on a fresh clone. Commands that need the DB fail on their own.
  datasource: {
    url: process.env.DATABASE_URL,
  },
});

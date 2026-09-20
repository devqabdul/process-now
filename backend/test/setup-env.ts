// Loads backend/.env for e2e tests. Tests that need the database are skipped
// (describe.skipIf(!HAS_DB)) until DATABASE_URL is set; the rest run without one.
import { config } from 'dotenv';

config({ quiet: true });

process.env.E2E_HAS_DB = process.env.DATABASE_URL ? '1' : '';
process.env.DATABASE_URL ||= 'postgresql://placeholder@127.0.0.1:1/none';
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  process.env.JWT_SECRET = 'e2e-secret-that-is-at-least-32-characters';
}
process.env.WEB_ORIGIN ||= 'http://localhost:5173';
process.env.NODE_ENV ||= 'test';
// The suite signs in far more often than a person would, from one IP.
process.env.LOGIN_RATE_LIMIT ||= '1000';
// Supabase's session pooler caps total clients at 15; a test run has to leave
// room for the dev server and anything else pointed at the same project.
process.env.DB_POOL_MAX ||= '3';

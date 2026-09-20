import type { Env } from './env-schema';

/*
 * The schema in env-schema.ts runs at build time (vite.config.ts), so a bad env never
 * ships. Reading the values here keeps zod off the runtime path entirely.
 */
export const env: Env = {
  VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
  VITE_APP_ENV: import.meta.env.VITE_APP_ENV,
  VITE_VITALS_URL: import.meta.env.VITE_VITALS_URL || undefined,
};

import type { Prisma } from '../generated/prisma/client.js';

/** Shape of companies.settings. Keys are camelCase because the JSON goes to the client as-is. */
export interface CompanySettings {
  /** ₹ per electricity unit */
  electricityRate: number;
  /** percent; applied only when the company has a GST number */
  gstRate: number;
}

export const DEFAULT_SETTINGS: CompanySettings = {
  electricityRate: 0,
  gstRate: 18,
};

/**
 * Parsed, not cast: a row written by a seed script, a migration or psql can hold
 * anything, and a null rate here would silently drop GST from every bill.
 */
export const readSettings = (json: Prisma.JsonValue): CompanySettings => {
  const raw: Record<string, unknown> =
    json && typeof json === 'object' && !Array.isArray(json) ? json : {};
  const num = (key: keyof CompanySettings) =>
    typeof raw[key] === 'number' && Number.isFinite(raw[key])
      ? raw[key]
      : DEFAULT_SETTINGS[key];
  return { electricityRate: num('electricityRate'), gstRate: num('gstRate') };
};
